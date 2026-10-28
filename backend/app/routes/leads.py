"""
Lead capture API.

  POST   /api/leads            public  — submit the form
  GET    /api/leads            admin   — list / filter / search
  GET    /api/leads/stats      admin   — counters
  GET    /api/leads/export.csv admin   — download as spreadsheet
  PATCH  /api/leads/{id}       admin   — move through the pipeline
"""

import csv
import hashlib
import io
import logging
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Lead, LeadStatus
from app.schemas import LeadCreate, LeadOut, LeadStatusPayload, LeadStatusUpdate
from app.security import require_admin
from app.services import notify

logger = logging.getLogger("leads.api")
router = APIRouter(prefix="/api/leads", tags=["Leads"])


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _resp(message: str, data=None, code: int = 200) -> JSONResponse:
    """Standard envelope with the matching HTTP status code."""
    return JSONResponse(
        status_code=code,
        content={
            "status": "success" if code < 400 else "error",
            "code": code,
            "message": message,
            "data": jsonable_encoder(data),
        },
    )


# --- rate limit: 6 submissions per IP per hour (in-process) ----------------
_WINDOW = 3600
_MAX = 6
_lock = threading.Lock()
_buckets: dict[str, list[float]] = {}


def _fingerprint(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
    salt = (settings.SECRET_KEY or "leads")[:12]
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:64]


def _rate_limited(fp: str) -> bool:
    now = time.time()
    cutoff = now - _WINDOW
    with _lock:
        hits = [t for t in _buckets.get(fp, []) if t > cutoff]
        if len(hits) >= _MAX:
            _buckets[fp] = hits
            return True
        hits.append(now)
        _buckets[fp] = hits
        if len(_buckets) > 5000:
            for k in [k for k, v in _buckets.items() if not v or v[-1] < cutoff]:
                _buckets.pop(k, None)
    return False


def _snapshot(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "city": lead.city,
        "interest_type": lead.interest_type,
        "wants_to_invest": bool(lead.wants_to_invest),
        "investment_range": lead.investment_range,
        "message": lead.message,
        "consent_given": bool(lead.consent_given),
        "source": lead.source,
        "status": lead.status,
    }


@router.post("")
def create_lead(
    payload: LeadCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # honeypot — accept and drop silently so bots learn nothing
    if (payload.website or "").strip():
        logger.info("Honeypot triggered; submission dropped.")
        return _resp("Thanks — your details are with us.", {"id": str(uuid.uuid4())}, 201)

    fp = _fingerprint(request)
    if _rate_limited(fp):
        return _resp(
            "Too many submissions from this connection. Please try again later.", code=429
        )

    try:
        cutoff = _now() - timedelta(days=7)
        existing = (
            db.query(Lead)
            .filter(Lead.email == payload.email, Lead.created_at >= cutoff)
            .order_by(Lead.created_at.desc())
            .first()
        )

        if existing is not None:
            existing.name = payload.name
            existing.phone = payload.phone
            existing.city = payload.city
            existing.interest_type = payload.interest_type.value
            existing.wants_to_invest = payload.wants_to_invest
            existing.investment_range = payload.investment_range
            existing.message = payload.message or existing.message
            existing.consent_given = True
            existing.consent_at = _now()
            db.commit()
            db.refresh(existing)
            background_tasks.add_task(notify.notify_team_new_lead, _snapshot(existing))
            return _resp(
                "We already had your details — updated them just now.",
                {"id": str(existing.id), "updated": True, "acknowledgement_sent": False},
                200,
            )

        lead = Lead(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            city=payload.city,
            interest_type=payload.interest_type.value,
            wants_to_invest=payload.wants_to_invest,
            investment_range=payload.investment_range,
            message=payload.message,
            consent_given=True,
            consent_at=_now(),
            source=payload.source or "partner_page",
            ip_hash=fp,
            user_agent=(request.headers.get("user-agent") or "")[:255] or None,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        snap = _snapshot(lead)
        background_tasks.add_task(notify.notify_team_new_lead, snap)
        background_tasks.add_task(notify.send_lead_acknowledgement, snap)

        return _resp(
            "Thanks — your details are with us. Our team will reach out shortly.",
            {
                "id": str(lead.id),
                "updated": False,
                "acknowledgement_sent": notify.acknowledgement_available(),
            },
            201,
        )

    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("DB error saving lead")
        return _resp(
            "We couldn't save your details right now. Please try again.",
            {"reason": str(exc)},
            500,
        )


@router.get("")
def list_leads(
    status_filter: Optional[LeadStatus] = Query(default=None, alias="status"),
    wants_to_invest: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)
    if status_filter is not None:
        query = query.filter(Lead.status == status_filter.value)
    if wants_to_invest is not None:
        query = query.filter(Lead.wants_to_invest.is_(wants_to_invest))
    if q:
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            func.lower(Lead.name).like(term)
            | func.lower(Lead.email).like(term)
            | Lead.phone.like(term)
            | func.lower(Lead.city).like(term)
        )
    leads = query.order_by(Lead.created_at.desc()).limit(limit).all()
    return _resp(f"Fetched {len(leads)} lead(s).", [LeadOut.model_validate(l) for l in leads])


@router.get("/stats")
def stats(_admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    total = db.query(func.count(Lead.id)).scalar() or 0
    new = db.query(func.count(Lead.id)).filter(Lead.status == LeadStatus.new.value).scalar() or 0
    investing = db.query(func.count(Lead.id)).filter(Lead.wants_to_invest.is_(True)).scalar() or 0
    week = (
        db.query(func.count(Lead.id))
        .filter(Lead.created_at >= _now() - timedelta(days=7))
        .scalar()
        or 0
    )
    return _resp("Stats fetched.", {"total": total, "new": new, "investing": investing, "last_7_days": week})


@router.get("/export.csv")
def export_csv(_admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "Lead ID", "Name", "Email", "Phone", "City", "Type",
            "Wants to invest", "Investment range", "Message",
            "Status", "Consent given", "Consent at (UTC)", "Source", "Created at (UTC)",
        ]
    )
    for l in leads:
        w.writerow(
            [
                str(l.id), l.name, l.email,
                f"+91{l.phone}" if len(l.phone or "") == 10 else (l.phone or ""),
                l.city, l.interest_type, "Yes" if l.wants_to_invest else "No",
                l.investment_range or "",
                (l.message or "").replace("\r", " ").replace("\n", " "),
                l.status, "Yes" if l.consent_given else "No",
                l.consent_at.isoformat() if l.consent_at else "",
                l.source or "", l.created_at.isoformat() if l.created_at else "",
            ]
        )
    buf.seek(0)
    filename = f"leads-{_now():%Y-%m-%d}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{lead_id}")
def update_status(
    lead_id: uuid.UUID,
    payload: LeadStatusPayload,
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        new_status = LeadStatusUpdate(payload.status)
    except (ValueError, TypeError):
        return _resp(
            "Invalid status. Use: contacted, qualified, converted, closed.", code=422
        )

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead is None:
        return _resp("Lead not found.", code=404)

    lead.status = new_status.value
    db.commit()
    db.refresh(lead)
    return _resp(f"Lead marked as {new_status.value}.", LeadOut.model_validate(lead))
