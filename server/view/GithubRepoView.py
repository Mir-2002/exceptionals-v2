from fastapi import APIRouter, Depends, HTTPException
from controller.AuthController import get_current_user
from utils.db import get_db
import httpx
import os

router = APIRouter(prefix="/github", tags=["github"]) 

GITHUB_API = "https://api.github.com"

async def _get_token(user):
    if user.auth_provider != "github" or not user.github_token_enc:
        raise HTTPException(status_code=400, detail="User not connected to GitHub")
    from utils.crypto import decrypt_text
    return decrypt_text(user.github_token_enc)

@router.get("/repos/{owner}/{repo}/branches", summary="List branches for a repo")
async def list_branches(owner: str, repo: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    token = await _get_token(current_user)
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/branches?per_page=100", headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch branches")
        data = resp.json()
        return [{"name": b.get("name"), "commit": b.get("commit", {}).get("sha")} for b in data]
