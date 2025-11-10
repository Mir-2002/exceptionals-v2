import pytest
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from controller.ProjectController import (
    create_project,
    get_user_projects,
    update_project,
    apply_preferences_and_update_project,
    process_single_file,
    process_project_files,
    process_multiple_files,
    calculate_project_status,
)
from model.ProjectModel import ProjectCreate, ProjectUpdate
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_create_project_duplicate_name(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "puser", "email": "p@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    await create_project(ProjectCreate(name="Dup", description="", tags=[]), db, user)
    with pytest.raises(HTTPException):
        await create_project(ProjectCreate(name="Dup", description="", tags=[]), db, user)


@pytest.mark.asyncio
async def test_get_user_projects_objectid_string_dual(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "uobj", "email": "u@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="PZ", description="", tags=[]), db, user)
    # create historical style project with objectId user_id
    await db.projects.update_one({"_id": ObjectId(p.id)}, {"$set": {"user_id": str(uid)}})
    projects = await get_user_projects(str(uid), db)
    assert any(pr.id == p.id for pr in projects)


@pytest.mark.asyncio
async def test_update_project_name_conflict_and_no_change(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "uup", "email": "up@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p1 = await create_project(ProjectCreate(name="P1", description="", tags=[]), db, user)
    p2 = await create_project(ProjectCreate(name="P2", description="", tags=[]), db, user)
    with pytest.raises(HTTPException):
        await update_project(p1.id, ProjectUpdate(name="P2"), db)
    # Updating with identical values should succeed because updated_at always changes
    resp = await update_project(p1.id, ProjectUpdate(name="P1", description="", tags=[]), db)
    assert resp.name == "P1"
    assert resp.description == ""


@pytest.mark.asyncio
async def test_apply_preferences_missing_prefs(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "pfuser", "email": "pf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="NP", description="", tags=[]), db, user)
    # Remove preferences to simulate missing
    await db.preferences.delete_one({"project_id": p.id})
    with pytest.raises(HTTPException):
        await apply_preferences_and_update_project(p.id, db)


@pytest.mark.asyncio
async def test_process_single_file_invalid_and_not_found(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "psf", "email": "sf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="PF", description="", tags=[]), db, user)
    # invalid ObjectId format
    with pytest.raises(InvalidId):
        await process_single_file(p.id, "not_an_id", db)
    # valid but not found
    with pytest.raises(HTTPException):
        await process_single_file(p.id, str(ObjectId()), db)


@pytest.mark.asyncio
async def test_process_project_files_missing_prefs(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "ppf", "email": "ppf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="MP", description="", tags=[]), db, user)
    # Remove preferences to simulate missing
    await db.preferences.delete_one({"project_id": p.id})
    with pytest.raises(HTTPException):
        await process_project_files(p.id, db)


@pytest.mark.asyncio
async def test_process_multiple_files_aggregates(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "pmf", "email": "pmf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="Agg", description="", tags=[]), db, user)
    # prefs
    await db.preferences.insert_one({
        "project_id": p.id,
        "directory_exclusion": {"exclude_dirs": [], "exclude_files": []},
        "per_file_exclusion": [],
        "format": "HTML"
    })
    # files
    ids = []
    for fn in ["a.py", "b.py"]:
        res = await db.files.insert_one({"project_id": p.id, "filename": fn, "functions": [{"name": "f"}], "classes": []})
        ids.append(str(res.inserted_id))
    summary = await process_multiple_files(p.id, ids, db)
    assert len(summary.processed_files) == 2


def test_calculate_project_status_variants():
    # empty list
    assert calculate_project_status([]) == "empty"
    # files with no content
    assert calculate_project_status([{"functions": [], "classes": []}]) == "empty"
    # in progress
    assert calculate_project_status([
        {"functions": [{"name": "f"}], "classes": []},
        {"functions": [], "classes": []}
    ]) == "in_progress"
    # completed
    assert calculate_project_status([
        {"functions": [{"name": "f"}], "processed_functions": [{"name": "f"}], "classes": [], "processed_classes": []}
    ]) == "completed"
