"""The one table this app needs: leads."""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    converted = "converted"
    closed = "closed"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    interest_type: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    wants_to_invest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    investment_range: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consent_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=LeadStatus.new.value, server_default="new"
    )
    source: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)

    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_leads_email_created", "email", "created_at"),
        Index("ix_leads_status_created", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Lead {self.email} status={self.status}>"
