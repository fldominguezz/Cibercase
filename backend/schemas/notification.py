from datetime import datetime
from pydantic import BaseModel

class NotificationBase(BaseModel):
    message: str
    is_read: bool = False
    link: str | None = None

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True