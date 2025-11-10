import io
import zipfile
import pytest
from bson import ObjectId

from controller.GithubImportController import import_github_repo
from model.GithubModel import GithubImportRequest
from model.UserModel import UserInDB
import controller.GithubImportController as gh_imp


@pytest.mark.asyncio
async def test_import_github_repo(monkeypatch, db):
    uid = ObjectId()
    await db.users.insert_one({
        "_id": uid,
        "username": "owner",
        "email": "owner@example.com",
        "auth_provider": "local",
        "is_admin": False,
    })
    user = UserInDB(**(await db.users.find_one({"_id": uid})))

    async def fake_inst(owner, repo):
        return "inst-token"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_inst)

    async def fake_download(owner, repo, ref, token, dest):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("repo/a.py", "def x():\n  return 1\n")
            z.writestr("repo/b.py", "class C:\n  def m(self):\n    return 2\n")
        with open(dest, "wb") as f:
            f.write(buf.getvalue())
    monkeypatch.setattr(gh_imp, "_download_repo_zip", fake_download)

    req = GithubImportRequest(name="GProj", description="", repo_full_name="own/repo", ref="main", tags=["g"])
    proj = await import_github_repo(req, db, user)
    assert proj.id
    files = await db.files.find({"project_id": proj.id}).to_list(length=None)
    assert len(files) == 2
