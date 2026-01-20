from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.base import Base

class UpdateRequest(Base):
    __tablename__ = "update_requests"

    id = Column(Integer, primary_key=True, index=True)
    current_version = Column(String, nullable=False)
    target_version = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False) # pending, approved, rejected, in_progress, completed, failed, reverted
    details = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Optional: Link to a user who requested/approved
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    requested_by = relationship("User", foreign_keys=[requested_by_id], backref="requested_updates")
    approved_by = relationship("User", foreign_keys=[approved_by_id], backref="approved_updates")
