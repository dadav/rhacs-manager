from datetime import datetime

from pydantic import BaseModel


class CveSubscriptionState(BaseModel):
    cve_id: str
    subscribed: bool


class CveSubscriptionItem(BaseModel):
    cve_id: str
    created_at: datetime
