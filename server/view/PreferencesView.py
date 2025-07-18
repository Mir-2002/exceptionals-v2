from fastapi import APIRouter, Depends
from model.PreferencesModel import Preferences, UpdatePreferences, PreferencesResponse
from controller.PreferencesController import (
    create_preferences,
    get_preferences,
    update_preferences,
    delete_preferences,
)
from utils.db import get_db

router = APIRouter(prefix="/projects/{project_id}/preferences", tags=["preferences"])

@router.post("/", response_model=PreferencesResponse, summary="Create preferences for a project")
async def create_prefs_view(project_id: str, prefs: Preferences, db=Depends(get_db)):
    return await create_preferences(project_id, prefs, db)

@router.get("/", response_model=PreferencesResponse, summary="Get preferences for a project")
async def get_prefs_view(project_id: str, db=Depends(get_db)):
    return await get_preferences(project_id, db)

@router.patch("/", response_model=PreferencesResponse, summary="Update preferences for a project")
async def update_prefs_view(project_id: str, prefs: UpdatePreferences, db=Depends(get_db)):
    return await update_preferences(project_id, prefs, db)

@router.delete("/", summary="Delete preferences for a project")
async def delete_prefs_view(project_id: str, db=Depends(get_db)):
    return await delete_preferences(project_id, db)