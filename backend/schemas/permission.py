from pydantic import BaseModel

class PermissionBase(BaseModel):
    name: str
    description: str | None = None

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(PermissionBase):
    pass


class Permission(PermissionBase):
    id: int

    class Config:
        orm_mode = True
