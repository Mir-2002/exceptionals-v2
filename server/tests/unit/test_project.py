import pytest
from bson import ObjectId
from datetime import datetime

from controller.ProjectController import create_project, get_project_by_id, update_project, delete_project, calculate_project_status
from model.ProjectModel import ProjectCreate, ProjectUpdate
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_project_crud_and_status(db):
    uid = ObjectId()
    await db.users.insert_one({
        "_id": uid,
        "username": "owner",
        "email": "owner@example.com",
        "auth_provider": "local",
        "is_admin": False,
    })
    user = UserInDB(**(await db.users.find_one({"_id": uid})))

    p = await create_project(ProjectCreate(name="P1", description="D", tags=["t1"]), db, user)
    assert p.id and p.status == "empty"

    got = await get_project_by_id(p.id, db)
    assert got.id == p.id

    up = await update_project(p.id, ProjectUpdate(description="D2"), db)
    assert up.description == "D2"

    await db.files.insert_many([
        {"project_id": p.id, "filename": "a.py", "functions": [], "classes": []},
        {"project_id": p.id, "filename": "b.py", "functions": [{"name": "f"}], "classes": []},
    ])
    files = await db.files.find({"project_id": p.id}).to_list(length=None)
    status = calculate_project_status(files)
    assert status in ("empty", "in_progress")

    res = await delete_project(p.id, db)
    assert "deleted" in res["detail"].lower()


@pytest.mark.asyncio
async def test_create_project_invalid_user(db):
    with pytest.raises(Exception):
        await create_project(ProjectCreate(name="P2", description="D", tags=["t2"]), db, None)

@pytest.mark.asyncio
async def test_get_project_not_found(db):
    with pytest.raises(Exception):
        await get_project_by_id(str(ObjectId()), db)

@pytest.mark.asyncio
async def test_update_project_not_found(db):
    with pytest.raises(Exception):
        await update_project(str(ObjectId()), ProjectUpdate(description="D3"), db)

@pytest.mark.asyncio
async def test_delete_project_not_found(db):
    with pytest.raises(Exception):
        await delete_project(str(ObjectId()), db)
