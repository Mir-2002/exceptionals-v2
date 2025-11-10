import os
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

from controller.UserController import create_user
from controller import AuthController as auth_ctrl
from controller.AuthController import login_user, get_current_user, create_access_token
from controller import GithubAuthController as gh_ctrl
from model.UserModel import UserCreate, UserInDB

MONGO_URI = os.getenv("MONGO_LOCAL_URI", "mongodb://localhost:27017")
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "test-db")


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setattr(auth_ctrl, "SECRET_KEY", "test-secret", raising=False)
    monkeypatch.setattr(auth_ctrl, "ALGORITHM", "HS256", raising=False)


@pytest.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URI)
    database = client[TEST_DB_NAME]
    # clean before
    for name in ["projects", "files", "preferences", "documentations", "users"]:
        await database[name].delete_many({})
    yield database
    # clean after
    for name in ["projects", "files", "preferences", "documentations", "users"]:
        await database[name].delete_many({})
    client.close()


@pytest.mark.asyncio
async def test_register_and_login_local_user(db):
    user = UserCreate(username="alice", email="alice@example.com", password="supersecret")
    created = await create_user(user, db)
    assert created.id

    token = await login_user("alice", "supersecret", db)
    assert token.access_token

    user_data = UserInDB(**(await db.users.find_one({"username": "alice"})))
    app_token = create_access_token({"sub": str(user_data.id), "is_admin": False})
    current = await get_current_user(db=db, token=app_token)
    assert current.username == "alice"


@pytest.mark.asyncio
async def test_github_oauth_callback_creates_user(monkeypatch, db):
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_ID", "cid")
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_SECRET", "csecret")

    async def fake_exchange(code: str) -> str:
        assert code == "dummy-code"
        return "gh-access-token"

    async def fake_get_user(access_token: str) -> dict:
        assert access_token == "gh-access-token"
        return {"id": 12345, "login": "bobhub", "email": "bob@example.com"}

    monkeypatch.setattr(gh_ctrl, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_ctrl, "_get_github_user", fake_get_user)

    user_doc = await gh_ctrl.handle_github_callback("dummy-code", db)
    assert user_doc
    assert user_doc.get("auth_provider") == "github"
    assert user_doc.get("provider_id") == "12345"

    user = UserInDB(**user_doc)
    jwt_token = create_access_token({"sub": str(user.id), "is_admin": user.is_admin})
    assert isinstance(jwt_token, str) and len(jwt_token) > 10


@pytest.mark.asyncio
async def test_register_duplicate_user(db):
    user = UserCreate(username="bob", email="bob@example.com", password="pw123456")
    await create_user(user, db)
    with pytest.raises(Exception):
        await create_user(user, db)


@pytest.mark.asyncio
async def test_login_wrong_password(db):
    user = UserCreate(username="carol", email="carol@example.com", password="pw123456")
    await create_user(user, db)
    with pytest.raises(Exception):
        await login_user("carol", "wrongpw", db)


@pytest.mark.asyncio
async def test_create_access_token_and_decode(db):
    user = UserCreate(username="dave", email="dave@example.com", password="pw123456")
    created = await create_user(user, db)
    token = create_access_token({"sub": str(created.id), "is_admin": False})
    assert isinstance(token, str) and len(token) > 10


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(db):
    with pytest.raises(Exception):
        await get_current_user(db=db, token="invalid.token.here")
