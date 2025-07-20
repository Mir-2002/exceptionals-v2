from fastapi import APIRouter, Depends
from model.PreferencesModel import Preferences, UpdatePreferences, PreferencesResponse
from controller.PreferencesController import (
    create_preferences,
    get_preferences,
    update_preferences,
    delete_preferences,
)
from utils.db import get_db
from controller.AuthController import get_current_user
from utils.project_verification import get_and_check_project_ownership

router = APIRouter(prefix="/projects/{project_id}/preferences", tags=["preferences"])

@router.post("/", response_model=PreferencesResponse, summary="Create preferences for a project")
async def create_prefs_view(project_id: str, prefs: Preferences, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await create_preferences(project_id, prefs, db)

@router.get("/", response_model=PreferencesResponse, summary="Get preferences for a project")
async def get_prefs_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await get_preferences(project_id, db)

@router.patch("/", response_model=PreferencesResponse, summary="Update preferences for a project")
async def update_prefs_view(project_id: str, prefs: UpdatePreferences, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await update_preferences(project_id, prefs, db)

@router.delete("/", summary="Delete preferences for a project")
async def delete_prefs_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await delete_preferences(project_id, db)