from db.models import Role
from schemas.role import RoleCreate, RoleUpdate
from .base_repository import BaseRepository

class RoleRepository(BaseRepository[Role, RoleCreate, RoleUpdate]):
    pass

role_repository = RoleRepository(Role)
