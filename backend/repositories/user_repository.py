from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional, List
from datetime import datetime

from db.base import BaseRepository
from db.models import User
from schemas.user import UserCreate, UserUpdate # Assuming you'll create a UserUpdate schema

class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def get_users_with_birthday_today(self, db: Session) -> List[User]:
        today = datetime.utcnow()
        return db.query(User).filter(
            extract('month', User.date_of_birth) == today.month,
            extract('day', User.date_of_birth) == today.day
        ).all()

# Instantiate the repository
user_repository = UserRepository(User)

