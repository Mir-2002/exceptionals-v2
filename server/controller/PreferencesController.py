from fastapi import Depends, HTTPException
from model.PreferencesModel import Preferences, UpdatePreferences, PreferencesResponse
from utils.db import get_db
from bson import ObjectId

# CREATE preferences
async def create_preferences(project_id: str, prefs: Preferences, db=Depends(get_db)):
    prefs_data = prefs.model_dump()
    prefs_data["project_id"] = project_id
    result = await db.preferences.insert_one(prefs_data)
    prefs_data["_id"] = str(result.inserted_id)
    return PreferencesResponse(**prefs_data)

# GET preferences
async def get_preferences(project_id: str, db=Depends(get_db)):
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    prefs["_id"] = str(prefs["_id"])
    return PreferencesResponse(**prefs)

# UPDATE preferences (partial update)
async def update_preferences(project_id: str, prefs_update: UpdatePreferences, db=Depends(get_db)):
    update_data = {k: v for k, v in prefs_update.model_dump(exclude_unset=True).items()}
    result = await db.preferences.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return await get_preferences(project_id, db)

# DELETE preferences
async def delete_preferences(project_id: str, db=Depends(get_db)):
    result = await db.preferences.delete_one({"project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return {"detail": "Preferences deleted"}
