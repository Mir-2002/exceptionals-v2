from fastapi import APIRouter, Depends, HTTPException
from controller.AuthController import get_current_user
from utils.db import get_db
import httpx
import os

router = APIRouter(prefix="/github", tags=["github"]) 

GITHUB_API = "https://api.github.com"

async def _get_installation_token_for_repo(owner: str, repo: str) -> str:
    from utils.github_app import get_installation_token_for_repo
    try:
        return await get_installation_token_for_repo(owner, repo)
    except Exception:
        raise HTTPException(
            status_code=403,
            detail="GitHub App is not installed on this repository or lacks Contents: Read access. Please install the app and grant access to this repository.",
        )

@router.get("/repos/{owner}/{repo}/branches", summary="List branches for a repo")
async def list_branches(owner: str, repo: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    token = await _get_installation_token_for_repo(owner, repo)
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/branches?per_page=100", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return [{"name": b.get("name"), "commit": b.get("commit", {}).get("sha")} for b in data]
        if resp.status_code == 404:
            raise HTTPException(404, "Repository not found or not accessible with the app permissions")
        if resp.status_code == 403:
            raise HTTPException(403, "Insufficient permissions. Ensure the app has Contents: Read and access to this repository.")
        raise HTTPException(resp.status_code, "Failed to fetch branches")
