from datetime import datetime
from pydantic import BaseModel, Field
from .user import UserPublic # Import UserPublic

# Schema for creating a comment
class TicketCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

# Schema for displaying a comment (including user info)
class TicketComment(BaseModel):
    id: int
    content: str
    created_at: datetime
    ticket_id: int
    user_id: int
    owner: UserPublic # Include the full public user object

    class Config:
        orm_mode = True
