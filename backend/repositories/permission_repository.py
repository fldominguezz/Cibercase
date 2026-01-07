from db.models import Permission
from schemas.permission import PermissionCreate, PermissionUpdate
from .base_repository import BaseRepository

class PermissionRepository(BaseRepository[Permission, PermissionCreate, PermissionUpdate]):
    pass

permission_repository = PermissionRepository(Permission)
