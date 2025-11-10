import pytest
from bson import ObjectId

import controller.GithubAuthController as gh_auth
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_exchange_code_for_token_env_missing(monkeypatch):
    # Force missing env config at module level
    monkeypatch.setattr(gh_auth, "GITHUB_OAUTH_CLIENT_ID", None)
    monkeypatch.setattr(gh_auth, "GITHUB_OAUTH_CLIENT_SECRET", None)
    with pytest.raises(Exception):
        await gh_auth._exchange_code_for_token("code")


@pytest.mark.asyncio
async def test_get_github_user_non_200(monkeypatch):
    class DummyResp:
        def __init__(self):
            self.status_code = 401
        def json(self):
            return {"message": "Unauthorized"}
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
    with pytest.raises(Exception):
        await gh_auth._get_github_user("tok")


@pytest.mark.asyncio
async def test_handle_github_callback_email_none_fetch_emails(monkeypatch, db):
    async def fake_exchange(code: str) -> str:
        return "tok"
    async def fake_get_user(access_token: str) -> dict:
        return {"id": 99, "login": "octo", "email": None}

    class EmailResp:
        def __init__(self):
            self.status_code = 200
        def json(self):
            return [{"email": "p1@example.com", "primary": True}, {"email": "p2@example.com", "primary": False}]
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return EmailResp()

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)

    user_doc = await gh_auth.handle_github_callback("any", db)
    assert user_doc.get("email") == "p1@example.com"


@pytest.mark.asyncio
async def test_list_github_repos_fallback_to_installations(monkeypatch, db):
    # Prepare a GitHub user
    await db.users.insert_one({
        "username": "ghextra", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "ghextra"})))

    # Decrypt token
    monkeypatch.setattr("utils.crypto.decrypt_text", lambda t: "plain-token")

    # Installation repos available
    async def fake_list_all(access_token):
        return [{"id": 7, "name": "r7"}]
    monkeypatch.setattr("utils.github_app.list_all_repos_for_user_installations", fake_list_all)

    # User repos fetch fails -> should return installation repos annotated
    class DummyResp:
        def __init__(self):
            self.status_code = 500
        def json(self):
            return []
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
    assert len(repos) == 1 and repos[0].get("app_installed") is True
