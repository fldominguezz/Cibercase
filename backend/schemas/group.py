from pydantic import BaseModel
from typing import Optional

class GroupBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupInDB(GroupBase):
    id: int
    class Config:
        from_attributes = True

class SubgroupBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    group_id: int

class SubgroupCreate(SubgroupBase):
    pass

class SubgroupInDB(SubgroupBase):
    id: int
    class Config:
        from_attributes = True
