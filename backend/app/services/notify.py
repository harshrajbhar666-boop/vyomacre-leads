"""
Notifications for a new lead.

  • Telegram ping            → TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
  • Alert email to the team  → SMTP_* + NOTIFY_EMAIL_TO (comma-separated)
  • Thank-you email to lead  → same SMTP settings

Everything runs in a FastAPI BackgroundTask, so the visitor's submit never waits.
No send can ever raise into the request path — the lead is already saved.
Standard library only (smtplib, urllib).
"""

import json
import logging
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

from app.config import settings

logger = logging.getLogger("leads.notify")
TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"

INTEREST_LABELS = {
    "investor": "Investor / funder",
    "owner": "Property owner",
    "company": "Company / brand",
    "student": "Student / community",
    "other": "Other",
}
RANGE_LABELS = {
    "under_50k": "Under ₹50,000",
    "50k_2l": "₹50,000 – ₹2 lakh",
    "2l_10l": "₹2 – 10 lakh",
    "10l_50l": "₹10 – 50 lakh",
    "50l_plus": "₹50 lakh +",
    "undecided": "Not decided yet",
}


def _telegram_ready() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)


def _smtp_ready() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def acknowledgement_available() -> bool:
    return _smtp_ready()


def notify_recipients() -> list[str]:
    raw = settings.NOTIFY_EMAIL_TO or ""
    return [a.strip() for a in raw.split(",") if a.strip()]


def _phone(p: str) -> str:
    return f"+91 {p[:5]} {p[5:]}" if len(p or "") == 10 else (p or "—")


def _range(lead: dict) -> str:
    if not lead.get("wants_to_invest"):
        return "No"
    return RANGE_LABELS.get(lead.get("investment_range") or "", lead.get("investment_range") or "Yes")


def _telegram_ids() -> list[str]:
    return [c.strip() for c in (settings.TELEGRAM_CHAT_ID or "").split(",") if c.strip()]


def send_telegram(text: str) -> bool:
    if not _telegram_ready():
        return False
    ok = False
    for chat_id in _telegram_ids():
        payload = json.dumps({"chat_id": chat_id, "text": text, "disable_web_page_preview": True}).encode()
        req = urllib.request.Request(
            TELEGRAM_API.format(token=settings.TELEGRAM_BOT_TOKEN),
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                ok = 200 <= resp.status < 300 or ok
        except Exception as exc:  # noqa: BLE001
            logger.warning("Telegram send failed (%s): %s", chat_id, exc)
    return ok


def send_email(to_email: str, subject: str, html: str) -> bool:
    if not _smtp_ready():
        return False
    sender = settings.SMTP_FROM or settings.SMTP_USER
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME or "VyomAcre", sender))
    msg["To"] = to_email
    msg.set_content("Please view this email in an HTML-capable client.")
    msg.add_alternative(html, subtype="html")
    try:
        if settings.SMTP_PORT == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=12) as s:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as s:
                s.ehlo()
                if settings.SMTP_PORT != 25:
                    s.starttls(context=ssl.create_default_context())
                    s.ehlo()
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Email to %s failed: %s", to_email, exc)
        return False


def _shell(headline: str, intro: str, rows: str, footer: str) -> str:
    return f"""\
<!doctype html><html><body style="margin:0;padding:0;background:#0B0A18;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0A18;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14102A;border:1px solid #2A2350;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:26px 28px 0 28px;">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8B7CF6;font-weight:700;">VyomAcre · Team Devdoots</div>
<h1 style="margin:14px 0 0 0;font-size:24px;line-height:1.25;color:#F6F4FF;font-weight:700;">{headline}</h1>
<p style="margin:12px 0 0 0;font-size:14.5px;line-height:1.65;color:#B6B0D6;">{intro}</p>
</td></tr>
<tr><td style="padding:22px 28px 0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0C22;border:1px solid #2A2350;border-radius:14px;">
<tr><td style="padding:16px 18px;font-size:13.5px;line-height:1.9;color:#DCD8F2;">{rows}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 28px 26px 28px;"><p style="margin:0;font-size:12.5px;line-height:1.7;color:#6F6892;">{footer}</p></td></tr>
<tr><td style="padding:14px 28px;background:#0F0C22;border-top:1px solid #2A2350;">
<p style="margin:0;font-size:11.5px;color:#6F6892;">VyomAcre — AI-verified rooftop leasing · Built by Team Devdoots</p>
</td></tr>
</table></td></tr></table></body></html>"""


def render_lead_acknowledgement(lead: dict) -> tuple[str, str]:
    first = (lead.get("name") or "").split(" ")[0] or "there"
    ref = str(lead.get("id", ""))[:8].upper()
    rows = [
        f"<strong style='color:#F6F4FF;'>Name</strong> &nbsp; {lead.get('name')}",
        f"<strong style='color:#F6F4FF;'>City</strong> &nbsp; {lead.get('city')}",
        f"<strong style='color:#F6F4FF;'>You are</strong> &nbsp; {INTEREST_LABELS.get(lead.get('interest_type',''), 'Other')}",
        f"<strong style='color:#F6F4FF;'>Funding interest</strong> &nbsp; {_range(lead)}",
        f"<strong style='color:#F6F4FF;'>Reference</strong> &nbsp; <span style='color:#F4B740;'>#{ref}</span>",
    ]
    if lead.get("message"):
        rows.append(f"<strong style='color:#F6F4FF;'>Your note</strong> &nbsp; {lead.get('message')}")
    rows += [
        "<br/><strong style='color:#F4B740;'>What happens next</strong><br/>",
        "1. We read your details today and match them to the right conversation.<br/>",
        f"2. Someone from the team calls or messages you on {_phone(lead.get('phone',''))} within 48 hours.<br/>",
        "3. You get the numbers, the documents and the timeline in writing — no pressure.",
    ]
    html = _shell(
        f"Thank you, {first} — you're on the list.",
        "Your details reached us safely. This is the part where most forms go quiet — we won't. "
        "Here is exactly what you shared, and what we do with it.",
        "<br/>".join(rows),
        "Not you? Ignore this email and nothing else will arrive. You're receiving this because you "
        "filled the VyomAcre Partner / Invest form.",
    )
    return f"You're on the VyomAcre partner list · #{ref}", html


def render_team_alert(lead: dict) -> tuple[str, str]:
    ref = str(lead.get("id", ""))[:8].upper()
    rows = [
        f"<strong style='color:#F6F4FF;'>Name</strong> &nbsp; {lead.get('name')}",
        f"<strong style='color:#F6F4FF;'>Email</strong> &nbsp; {lead.get('email')}",
        f"<strong style='color:#F6F4FF;'>Phone</strong> &nbsp; {_phone(lead.get('phone',''))}",
        f"<strong style='color:#F6F4FF;'>City</strong> &nbsp; {lead.get('city')}",
        f"<strong style='color:#F6F4FF;'>Type</strong> &nbsp; {INTEREST_LABELS.get(lead.get('interest_type',''), 'Other')}",
        f"<strong style='color:#F6F4FF;'>Funding</strong> &nbsp; {_range(lead)}",
        f"<strong style='color:#F6F4FF;'>Reference</strong> &nbsp; <span style='color:#F4B740;'>#{ref}</span>",
        "<strong style='color:#F6F4FF;'>Consent</strong> &nbsp; "
        + ("Given voluntarily ✓" if lead.get("consent_given") else "not recorded"),
    ]
    if lead.get("message"):
        rows.append(f"<strong style='color:#F6F4FF;'>Message</strong> &nbsp; {lead.get('message')}")
    if settings.APP_BASE_URL:
        rows.append(
            f"<br/><a href='{settings.APP_BASE_URL.rstrip('/')}/admin' style='color:#8B7CF6;'>Open the Lead Inbox →</a>"
        )
    funding = " · funding interest" if lead.get("wants_to_invest") else ""
    html = _shell(
        f"New lead: {lead.get('name')} — {lead.get('city')}",
        "Someone just submitted the Partner / Invest form. Reach out while it's fresh.",
        "<br/>".join(rows),
        "Reply to this email to answer them directly.",
    )
    return f"New lead: {lead.get('name')} ({lead.get('city')}){funding}", html


def notify_team_new_lead(lead: dict) -> None:
    logger.info("New lead: %s (%s) invest=%s", lead.get("name"), lead.get("city"), lead.get("wants_to_invest"))
    send_telegram(
        "🚀  NEW LEAD — VyomAcre\n\n"
        f"👤  {lead.get('name')}\n"
        f"📍  {lead.get('city')}\n"
        f"📞  {_phone(lead.get('phone',''))}\n"
        f"✉️  {lead.get('email')}\n\n"
        f"🎯  {INTEREST_LABELS.get(lead.get('interest_type',''), 'Other')}\n"
        f"💰  Funding: {_range(lead)}"
        + (f"\n\n💬  {lead.get('message')[:400]}" if lead.get("message") else "")
    )
    recipients = notify_recipients()
    if not _smtp_ready() or not recipients:
        return
    subject, html = render_team_alert(lead)
    for address in recipients:
        send_email(address, subject, html)


def send_lead_acknowledgement(lead: dict) -> bool:
    if not _smtp_ready():
        return False
    subject, html = render_lead_acknowledgement(lead)
    return send_email(lead.get("email", ""), subject, html)
