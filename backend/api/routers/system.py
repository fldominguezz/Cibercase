from fastapi import APIRouter
from core.config import VERSION

router = APIRouter()

@router.get("/version", summary="Get application version", response_model=str)
def get_version():
    """
    Retrieves the current version of the backend application.
    """
    return VERSION