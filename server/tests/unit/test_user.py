import pytest
from bson import ObjectId
from controller.UserController import create_user, get_user_by_id, update_user, delete_user
from model.UserModel import UserCreate, UserUpdate


@pytest.mark.asyncio
async def test_user_crud(db):
    u = await create_user(UserCreate(username="john", email="john@example.com", password="supersecret"), db)
    assert u.id and u.username == "john"

    got = await get_user_by_id(u.id, db)
    assert got.email == "john@example.com"

    upd = await update_user(u.id, UserUpdate(username="johnny"), db)
    assert upd.username == "johnny"

    res = await delete_user(u.id, db)
    assert "deleted" in res["detail"].lower()

@pytest.mark.asyncio
async def test_create_user_duplicate(db):
    await create_user(UserCreate(username="jane", email="jane@example.com", password="pw"), db)
    with pytest.raises(Exception):
        await create_user(UserCreate(username="jane", email="jane@example.com", password="pw"), db)

@pytest.mark.asyncio
async def test_get_user_not_found(db):
    with pytest.raises(Exception):
        await get_user_by_id(str(ObjectId()), db)

@pytest.mark.asyncio
async def test_update_user_not_found(db):
    with pytest.raises(Exception):
        await update_user(str(ObjectId()), UserUpdate(username="ghost"), db)

@pytest.mark.asyncio
async def test_delete_user_not_found(db):
    with pytest.raises(Exception):
        await delete_user(str(ObjectId()), db)
