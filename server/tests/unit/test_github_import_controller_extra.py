import pytest
from bson import ObjectId

import controller.GithubImportController as gh_imp
from model.GithubModel import GithubImportRequest
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_import_repo_missing_app_install(monkeypatch, db):
    # user
    await db.users.insert_one({"username": "u1x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u1x"})))

    async def fake_token(owner, repo):
        raise Exception("no install")
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    req = GithubImportRequest(name="X", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)


@pytest.mark.asyncio
async def test_import_repo_default_branch_non_200(monkeypatch, db):
    await db.users.insert_one({"username": "u2x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u2x"})))

    async def fake_token(owner, repo):
        return "inst"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    class DummyResp:
        def __init__(self):
            self.status_code = 404
        def json(self):
            return {}
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_imp.httpx, "AsyncClient", DummyClient)

    req = GithubImportRequest(name="X2", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)


@pytest.mark.asyncio
async def test_download_repo_zip_non_200(monkeypatch, db):
    await db.users.insert_one({"username": "u3x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u3x"})))

    async def fake_token(owner, repo):
        return "inst"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    class StreamResp:
        def __init__(self):
            self.status_code = 500
        async def aread(self):
            return b"fail"
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def aiter_bytes(self):
            if False:
                yield b""
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        def stream(self, *args, **kwargs):
            return StreamResp()
    monkeypatch.setattr(gh_imp.httpx, "AsyncClient", DummyClient)

    req = GithubImportRequest(name="X3", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)
