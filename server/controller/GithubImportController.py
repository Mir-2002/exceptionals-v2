import os
import tempfile
import shutil
from fastapi import HTTPException
from model.GithubModel import GithubImportRequest
from model.ProjectModel import ProjectCreate
from controller.ProjectController import create_project
from utils.db import get_db
from utils.crypto import decrypt_text
from bson import ObjectId
import httpx

GITHUB_API = "https://api.github.com"

async def _get_user_token(user) -> str:
    if user.auth_provider != "github" or not user.github_token_enc:
        raise HTTPException(status_code=400, detail="User not connected to GitHub")
    return decrypt_text(user.github_token_enc)

async def _download_repo_zip(owner: str, repo: str, ref: str, token: str, dest_path: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/zipball/{ref}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=None) as client:
        # Follow 302 redirect to archive storage and stream to disk
        async with client.stream("GET", url, headers=headers, follow_redirects=True) as resp:
            if resp.status_code != 200:
                text = await resp.aread()
                raise HTTPException(status_code=resp.status_code, detail=f"Failed to download repo: {text.decode('utf-8', 'ignore')}")
            with open(dest_path, "wb") as f:
                async for chunk in resp.aiter_bytes():
                    f.write(chunk)

async def import_github_repo(req: GithubImportRequest, db, current_user):
    # 1) Create project
    project = await create_project(
        ProjectCreate(name=req.name, description=req.description, tags=req.tags or []),
        db,
        current_user,
    )
    project_id = project.id

    # 2) Resolve default branch if ref not provided
    token = await _get_user_token(current_user)
    owner, repo = req.repo_full_name.split("/", 1)
    ref = req.ref
    if not ref:
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            repo_resp = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=headers)
            if repo_resp.status_code != 200:
                raise HTTPException(status_code=repo_resp.status_code, detail="Failed to fetch repository info")
            ref = repo_resp.json().get("default_branch") or "main"

    # 3) Download zip to temp path
    tmp_dir = tempfile.mkdtemp(prefix="gh-import-")
    zip_path = os.path.join(tmp_dir, f"{repo}-{ref}.zip")
    try:
        await _download_repo_zip(owner, repo, ref, token, zip_path)
        # 4) Upload zip to existing flow
        from fastapi import UploadFile
        from controller.FileController import upload_project_zip
        class DummyUploadFile(UploadFile):
            def __init__(self, filename, file):
                super().__init__(filename=filename, file=file)
        with open(zip_path, "rb") as f:
            upload_file = DummyUploadFile(filename=os.path.basename(zip_path), file=f)
            await upload_project_zip(project_id, upload_file, db)
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass

    return project
