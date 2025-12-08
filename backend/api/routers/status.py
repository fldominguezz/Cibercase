from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def get_status():
    """
    Endpoint to check the status of the backend.
    """
    return {"status": "Backend funcionando correctamente"}
