import pytest
from bson import ObjectId
from fastapi import HTTPException

from controller.UserController import get_user_by_id, update_user, delete_user
from model.UserModel import UserUpdate

pytestmark = pytest.mark.asyncio

class FakeDB:
    def __init__(self, users):
        self.users = users

class FakeUsersCollection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query):
        for d in self.docs:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return d
        return None
    
    async def update_one(self, filter_query, update_data):
        for doc in self.docs:
            match = True
            for k, v in filter_query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                doc.update(update_data.get("$set", {}))
                return type("UpdateResult", (), {"matched_count": 1})
        return type("UpdateResult", (), {"matched_count": 0})

    async def delete_one(self, query):
        for i, doc in enumerate(self.docs):
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                del self.docs[i]
                return type("DeleteResult", (), {"deleted_count": 1})
        return type("DeleteResult", (), {"deleted_count": 0})


@pytest.fixture
def fake_user_db():
    users = FakeUsersCollection()
    users.docs.append({
        "_id": ObjectId(),
        "username": "testuser",
        "email": "test@example.com",
        "hashed_password": "hashed_password",
        "is_admin": False,
    })
    users.docs.append({
        "_id": ObjectId(),
        "username": "adminuser",
        "email": "admin@example.com",
        "hashed_password": "hashed_password",
        "is_admin": True,
    })
    return FakeDB(users)

# Tests for get_user_by_id
async def test_get_user_by_id_success(fake_user_db):
    user_id = str(fake_user_db.users.docs[0]["_id"])
    user = await get_user_by_id(user_id, fake_user_db)
    assert user.username == "testuser"

async def test_get_user_by_id_invalid_id(fake_user_db):
    with pytest.raises(HTTPException) as excinfo:
        await get_user_by_id("invalid-id", fake_user_db)
    assert excinfo.value.status_code == 400

async def test_get_user_by_id_not_found(fake_user_db):
    with pytest.raises(HTTPException) as excinfo:
        await get_user_by_id(str(ObjectId()), fake_user_db)
    assert excinfo.value.status_code == 404

# Tests for update_user
async def test_update_user_success(fake_user_db):
    user_id = str(fake_user_db.users.docs[0]["_id"])
    update_data = UserUpdate(username="updateduser")
    updated_user = await update_user(user_id, update_data, fake_user_db)
    assert updated_user.username == "updateduser"

async def test_update_user_partial_update(fake_user_db):
    user_id = str(fake_user_db.users.docs[0]["_id"])
    update_data = UserUpdate(email="newemail@example.com")
    updated_user = await update_user(user_id, update_data, fake_user_db)
    assert updated_user.email == "newemail@example.com"
    assert updated_user.username == "testuser" # Should not change

async def test_update_user_invalid_id(fake_user_db):
    update_data = UserUpdate(username="updateduser")
    with pytest.raises(HTTPException) as excinfo:
        await update_user("invalid-id", update_data, fake_user_db)
    assert excinfo.value.status_code == 400

async def test_update_user_not_found(fake_user_db):
    update_data = UserUpdate(username="updateduser")
    with pytest.raises(HTTPException) as excinfo:
        await update_user(str(ObjectId()), update_data, fake_user_db)
    assert excinfo.value.status_code == 404

# Tests for delete_user
async def test_delete_user_success(fake_user_db):
    user_id = str(fake_user_db.users.docs[0]["_id"])
    response = await delete_user(user_id, fake_user_db)
    assert response == {"detail": "User deleted successfully"}
    assert len(fake_user_db.users.docs) == 1

async def test_delete_user_invalid_id(fake_user_db):
    with pytest.raises(HTTPException) as excinfo:
        await delete_user("invalid-id", fake_user_db)
    assert excinfo.value.status_code == 400

async def test_delete_user_not_found(fake_user_db):
    with pytest.raises(HTTPException) as excinfo:
        await delete_user(str(ObjectId()), fake_user_db)
    assert excinfo.value.status_code == 404
