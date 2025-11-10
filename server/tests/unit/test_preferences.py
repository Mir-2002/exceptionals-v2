import pytest
from bson import ObjectId

from controller.PreferencesController import create_preferences, get_preferences, update_preferences, delete_preferences
from model.PreferencesModel import Preferences, UpdatePreferences


@pytest.mark.asyncio
async def test_preferences_crud(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PX", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    prefs = await create_preferences(pid, Preferences(format="HTML"), db)
    assert prefs.project_id == pid
    got = await get_preferences(pid, db)
    assert got.format.upper() in ("HTML", "MARKDOWN", "PDF")
    upd = await update_preferences(pid, UpdatePreferences(directory_exclusion={"exclude_files": ["a.py"]}), db)
    assert "a.py" in upd.directory_exclusion.exclude_files
    res = await delete_preferences(pid, db)
    assert "deleted" in res.body.decode().lower()

@pytest.mark.asyncio
async def test_create_preferences_invalid_project(db):
    with pytest.raises(Exception):
        await create_preferences("invalid_pid", Preferences(format="HTML"), db)

@pytest.mark.asyncio
async def test_get_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PZ", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await get_preferences(pid, db)

@pytest.mark.asyncio
async def test_update_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PY", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await update_preferences(pid, UpdatePreferences(directory_exclusion={"exclude_files": ["b.py"]}), db)

@pytest.mark.asyncio
async def test_delete_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PW", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await delete_preferences(pid, db)
