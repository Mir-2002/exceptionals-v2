from fastapi import Depends, HTTPException
from model.PreferencesModel import Preferences, UpdatePreferences, PreferencesResponse
from utils.db import get_db
from utils.timestamp_helper import update_project_timestamp
from bson import ObjectId

# CREATE preferences
async def create_preferences(project_id: str, prefs: Preferences, db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    prefs_data = prefs.model_dump()
    prefs_data["project_id"] = project_id
    result = await db.preferences.insert_one(prefs_data)
    prefs_data["_id"] = str(result.inserted_id)
    
    # Update project timestamp when preferences are created
    await update_project_timestamp(project_id, db)
    
    return PreferencesResponse(**prefs_data)

# GET preferences
async def get_preferences(project_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    prefs["_id"] = str(prefs["_id"])
    return PreferencesResponse(**prefs)

# UPDATE preferences (partial update)
async def update_preferences(project_id: str, prefs_update: UpdatePreferences, db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    update_data = {k: v for k, v in prefs_update.model_dump(exclude_unset=True).items()}
    result = await db.preferences.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Preferences not found")
    
    # Update project timestamp when preferences are updated
    await update_project_timestamp(project_id, db)
    
    return await get_preferences(project_id, db)

# DELETE preferences
async def delete_preferences(project_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    result = await db.preferences.delete_one({"project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return {"detail": "Preferences deleted"}
