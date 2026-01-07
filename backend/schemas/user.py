from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field, root_validator
from typing import Optional
from enum import Enum
from urllib.parse import quote_plus

from .role import Role



class UserRole(str, Enum):
    analista = "Analista"
    lider = "Lider"
    auditor = "Auditor"
    admin = "Admin"


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    date_of_birth: date
    is_active: Optional[bool] = True
    avatar_url: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole  # Use Enum for roles


class UserUpdate(UserBase):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None  # Use Enum for roles
    date_of_birth: Optional[date] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(
        None, min_length=8, max_length=100
    )  # For password change


class UserInDBBase(UserBase):
    id: int
    creado_en: datetime
    date_of_birth: Optional[date]  # Make it optional for existing users in DB
    role: Role  # Use the Role schema for output

    class Config:
        orm_mode = True


class User(UserInDBBase):
    pass


class UserPublic(UserInDBBase):
    # This schema is for public display, excludes sensitive info like password_hash

    @root_validator(pre=False, skip_on_failure=True)
    def generate_avatar_url(cls, values):
        if not values.get("avatar_url"):
            first_name = values.get("first_name", "")
            last_name = values.get("last_name", "")

            # Use initials if names are available
            if first_name and last_name:
                name = f"{first_name} {last_name}"
            else:
                # Fallback to username or a generic character
                name = values.get("username", "G")

            values["avatar_url"] = (
                f"https://ui-avatars.com/api/?name={quote_plus(name)}&background=random"
            )
        return values


class UserPasswordUpdate(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=100)


class UserPasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
