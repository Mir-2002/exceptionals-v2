import os
import pytest
from datetime import timedelta
from bson import ObjectId
from fastapi import HTTPException
from jose import jwt

from controller.AuthController import authenticate_user, create_access_token, get_current_user, login_user
from model.UserModel import UserInDB

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


@pytest.fixture(autouse=True)
def set_env_keys(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "testsecret")
    monkeypatch.setenv("ALGORITHM", "HS256")


@pytest.fixture
def fake_user_db():
    users = FakeUsersCollection()
    # Add: OAuth-only user (no password)
    users.docs.append({
        "_id": ObjectId(),
        "username": "oauthuser",
        "email": "o@example.com",
        "hashed_password": None,
        "is_admin": False,
    })
    # Add: Normal user with a bcrypt-like hash for 'password' => we won't verify real hash here;
    # the controller uses utils.auth.verify_password; ideally we monkeypatch it.
    users.docs.append({
        "_id": ObjectId(),
        "username": "jane",
        "email": "j@example.com",
        "hashed_password": "$2b$12$abcdefghijklmnopqrstuv1234567890abcdef1234567890abcdef12",  # fake
        "is_admin": True,
    })
    return FakeDB(users)


async def test_authenticate_user_non_existent(monkeypatch, fake_user_db):
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: True)
    user = await authenticate_user("nonexistent", "password", fake_user_db)
    assert user is None

async def test_authenticate_user_wrong_password(monkeypatch, fake_user_db):
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: False)
    user = await authenticate_user("jane", "wrongpassword", fake_user_db)
    assert user is None

async def test_authenticate_user_rejects_oauth_only(monkeypatch, fake_user_db):
    # Monkeypatch verify_password to avoid bcrypt dependency in unit test
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: False)

    user = await authenticate_user("oauthuser", "password", fake_user_db)
    assert user is None


async def test_authenticate_user_success(monkeypatch, fake_user_db):
    # For user 'jane', make verify_password return True when password == 'password'
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: p == "password")

    user = await authenticate_user("jane", "password", fake_user_db)
    assert user is not None
    assert isinstance(user, UserInDB)


async def test_login_user_success(monkeypatch, fake_user_db):
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: p == "password")
    
    token = await login_user("jane", "password", fake_user_db)
    assert token.token_type == "bearer"
    assert "access_token" in token.model_dump()

async def test_login_user_failure(monkeypatch, fake_user_db):
    from utils import auth as auth_utils
    monkeypatch.setattr(auth_utils, "verify_password", lambda p, h: False)

    with pytest.raises(HTTPException) as excinfo:
        await login_user("jane", "wrongpassword", fake_user_db)
    assert excinfo.value.status_code == 401


async def test_get_current_user_with_token(monkeypatch, fake_user_db):
    # Import module after env fixture; then patch module-level constants directly
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"

    # Choose existing user's id
    uid = str(fake_user_db.users.docs[1]["_id"])  # jane

    # Build a token
    token = AC.create_access_token({"sub": uid, "is_admin": True}, expires_delta=timedelta(minutes=5))

    # Call underlying logic: simulate FastAPI injection by passing db and token explicitly
    user = await AC.get_current_user(db=fake_user_db, token=token)
    assert user.username == "jane"
    assert user.is_admin is True

async def test_get_current_user_invalid_token(fake_user_db):
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"

    with pytest.raises(HTTPException) as excinfo:
        await AC.get_current_user(db=fake_user_db, token="invalidtoken")
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Could not validate credentials"

async def test_get_current_user_no_sub(fake_user_db):
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"
    
    token = AC.create_access_token({"is_admin": True}, expires_delta=timedelta(minutes=5))
    
    with pytest.raises(HTTPException) as excinfo:
        await AC.get_current_user(db=fake_user_db, token=token)
    assert excinfo.value.status_code == 401

async def test_get_current_user_invalid_objectid(fake_user_db):
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"
    
    token = AC.create_access_token({"sub": "invalid-id"}, expires_delta=timedelta(minutes=5))
    
    with pytest.raises(HTTPException) as excinfo:
        await AC.get_current_user(db=fake_user_db, token=token)
    assert excinfo.value.status_code == 401

async def test_get_current_user_non_existent_user(fake_user_db):
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"
    
    token = AC.create_access_token({"sub": str(ObjectId())}, expires_delta=timedelta(minutes=5))
    
    with pytest.raises(HTTPException) as excinfo:
        await AC.get_current_user(db=fake_user_db, token=token)
    assert excinfo.value.status_code == 401

async def test_get_current_user_no_token(fake_user_db):
    from controller import AuthController as AC
    AC.SECRET_KEY = "testsecret"
    AC.ALGORITHM = "HS256"

    with pytest.raises(HTTPException) as excinfo:
        await AC.get_current_user(db=fake_user_db, token=None)
    assert excinfo.value.status_code == 401
