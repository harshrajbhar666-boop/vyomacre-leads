"""Request/response models with validation."""

import re
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


class LeadInterest(str, Enum):
    investor = "investor"
    owner = "owner"
    company = "company"
    student = "student"
    other = "other"


class LeadStatusUpdate(str, Enum):
    contacted = "contacted"
    qualified = "qualified"
    converted = "converted"
    closed = "closed"


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=255)
    phone: str = Field(max_length=20)
    city: str = Field(min_length=2, max_length=100)

    interest_type: LeadInterest = LeadInterest.other
    wants_to_invest: bool = False
    investment_range: Optional[str] = Field(default=None, max_length=40)
    message: Optional[str] = Field(default=None, max_length=2000)
    consent_given: bool = False
    source: Optional[str] = Field(default="partner_page", max_length=60)
    website: Optional[str] = Field(default=None, max_length=200)  # honeypot

    @field_validator("name", "city")
    @classmethod
    def _clean(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Please enter at least 2 characters.")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address.")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        d = re.sub(r"\D", "", v or "")
        if len(d) == 12 and d.startswith("91"):
            d = d[2:]
        elif len(d) == 11 and d.startswith("0"):
            d = d[1:]
        if not (10 <= len(d) <= 15):
            raise ValueError("Please enter a valid 10-digit phone number.")
        return d

    @field_validator("message")
    @classmethod
    def _message(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip() or None

    @field_validator("consent_given")
    @classmethod
    def _consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please confirm that you are sharing your details of your own accord.")
        return True

    @field_validator("investment_range")
    @classmethod
    def _range(cls, v: Optional[str], info):
        if not info.data.get("wants_to_invest"):
            return None
        return v


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str
    city: str
    interest_type: str
    wants_to_invest: bool
    investment_range: Optional[str] = None
    message: Optional[str] = None
    consent_given: bool = False
    status: str
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    email: str
    password: str


class LeadStatusPayload(BaseModel):
    status: str
