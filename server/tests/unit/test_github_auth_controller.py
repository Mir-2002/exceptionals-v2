import pytest
from bson import ObjectId

import controller.GithubAuthController as gh_auth
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_handle_github_callback_creates_user_and_updates_existing(monkeypatch, db):
    # Monkeypatch helpers to avoid real HTTP
    async def fake_exchange(code: str) -> str:
        assert code == "good-code"
        return "token123"

    async def fake_get_user(access_token: str) -> dict:
        assert access_token == "token123"
        return {"id": 42, "login": "octocat", "email": "octo@example.com"}

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)

    # First time -> creates user
    user_doc = await gh_auth.handle_github_callback("good-code", db)
    assert user_doc.get("auth_provider") == "github"
    assert user_doc.get("provider_id") == "42"

    # Second time -> updates existing user token/fields
    user_doc2 = await gh_auth.handle_github_callback("good-code", db)
    assert user_doc2["_id"] == user_doc["_id"]


@pytest.mark.asyncio
async def test_handle_github_callback_username_email_uniqueness(monkeypatch, db):
    # Pre-insert a user to force username collision
    await db.users.insert_one({
        "username": "octocat", "email": "used@example.com", "auth_provider": "local", "is_admin": False
    })

    async def fake_exchange(code: str) -> str:
        return "tok"

    async def fake_get_user(access_token: str) -> dict:
        return {"id": 55, "login": "octocat", "email": "used@example.com"}

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)

    user_doc = await gh_auth.handle_github_callback("any", db)
    assert user_doc.get("username").startswith("octocat-")
    assert user_doc.get("email").endswith("@users.noreply.github.com")


@pytest.mark.asyncio
async def test_list_github_repos_and_flags(monkeypatch, db):
    # Create a github user with token
    await db.users.insert_one({
        "username": "ghuser", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "ghuser"})))

    # decrypt token
    monkeypatch.setattr("utils.crypto.decrypt_text", lambda t: "plain-token")

    # installations: repos 1 and 3
    async def fake_list_all_repos(access_token):
        return [{"id": 1, "name": "r1"}, {"id": 3, "name": "r3"}]
    monkeypatch.setattr("utils.github_app.list_all_repos_for_user_installations", fake_list_all_repos)

    # user repos: 1,2
    class DummyResp:
        def __init__(self):
            self.status_code = 200
        def json(self):
            return [{"id": 1, "name": "r1"}, {"id": 2, "name": "r2"}]
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)

    repos = await gh_auth.list_github_repos(user, db)
    r1 = next(r for r in repos if r["id"] == 1)
    r2 = next(r for r in repos if r["id"] == 2)
    assert r1["app_installed"] is True
    assert r2["app_installed"] is False


@pytest.mark.asyncio
async def test_list_github_repos_user_not_connected(db):
    await db.users.insert_one({
        "username": "nogh", "email": "e@e.com", "auth_provider": "local", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "nogh"})))
    with pytest.raises(Exception):
        await gh_auth.list_github_repos(user, db)
