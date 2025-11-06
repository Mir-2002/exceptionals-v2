import os
from typing import Optional
from fastapi import HTTPException, status
from utils.db import get_db
from utils.crypto import encrypt_text
import httpx

GITHUB_OAUTH_CLIENT_ID = os.getenv("GITHUB_OAUTH_CLIENT_ID")
GITHUB_OAUTH_CLIENT_SECRET = os.getenv("GITHUB_OAUTH_CLIENT_SECRET")

GITHUB_API = "https://api.github.com"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"

async def _exchange_code_for_token(code: str) -> str:
    if not GITHUB_OAUTH_CLIENT_ID or not GITHUB_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "client_id": GITHUB_OAUTH_CLIENT_ID,
        "client_secret": GITHUB_OAUTH_CLIENT_SECRET,
        "code": code,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(GITHUB_TOKEN_URL, headers=headers, data=payload)
        print("GitHub token exchange response:", resp.status_code, resp.text)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to exchange code for token: {resp.text}")
        data = resp.json()
        access_token = data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=f"No access token from GitHub: {data}")
        return access_token

async def _get_github_user(access_token: str) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {access_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GITHUB_API}/user", headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch GitHub user")
        return resp.json()

async def _ensure_unique_username_email(db, username: str, email: Optional[str]) -> tuple[str, str]:
    base_username = username
    candidate = username
    i = 0
    while await db.users.find_one({"username": candidate}):
        i += 1
        candidate = f"{base_username}-{i}"
    username_final = candidate
    if not email:
        email_final = f"{username_final}@users.noreply.github.com"
    else:
        email_final = email
        if await db.users.find_one({"email": email_final}):
            email_final = f"{username_final}@users.noreply.github.com"
    return username_final, email_final

async def handle_github_callback(code: str, db):
    token = await _exchange_code_for_token(code)
    gh_user = await _get_github_user(token)
    gh_id = str(gh_user.get("id"))
    username = gh_user.get("login")
    email = gh_user.get("email")
    if not email:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{GITHUB_API}/user/emails", headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            })
            if resp.status_code == 200:
                emails = resp.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = (primary or (emails[0] if emails else {})).get("email")
    if not username:
        raise HTTPException(status_code=400, detail="GitHub user missing login")

    existing = await db.users.find_one({"auth_provider": "github", "provider_id": gh_id})
    enc_token = encrypt_text(token)
    if existing:
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {
            "username": username,
            "email": email or existing.get("email") or f"{username}@users.noreply.github.com",
            "github_token_enc": enc_token,
        }})
        user = await db.users.find_one({"_id": existing["_id"]})
    else:
        username_final, email_final = await _ensure_unique_username_email(db, username, email)
        new_user = {
            "username": username_final,
            "email": email_final,
            "auth_provider": "github",
            "provider_id": gh_id,
            "github_token_enc": enc_token,
            "is_admin": False,
        }
        result = await db.users.insert_one(new_user)
        user = await db.users.find_one({"_id": result.inserted_id})

    return user

async def list_github_repos(user, db):
    # Return all repos for the user, annotated with whether the app is installed on each repo
    if user.auth_provider != "github" or not user.github_token_enc:
        raise HTTPException(status_code=400, detail="User is not connected with GitHub")
    from utils.crypto import decrypt_text
    access_token = decrypt_text(user.github_token_enc)

    # 1) Repos accessible via the GitHub App installations
    accessible_ids: set[int] = set()
    installation_repos: list[dict] = []
    try:
        from utils.github_app import list_all_repos_for_user_installations
        installation_repos = await list_all_repos_for_user_installations(access_token)
        for r in installation_repos:
            rid = r.get("id")
            if isinstance(rid, int):
                accessible_ids.add(rid)
    except Exception:
        # If app config is missing or request fails, continue without installation repos
        pass

    # 2) All user repos (for listing)
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {access_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    all_user_repos: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        url = f"{GITHUB_API}/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member"
        resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            all_user_repos = resp.json() or []
        else:
            # If we cannot list user repos, at least return installation repos (marked accessible)
            return [dict(r, app_installed=True) for r in (installation_repos or [])]

    # 3) Annotate each user repo with app_installed flag
    annotated: list[dict] = []
    for repo in all_user_repos:
        rid = repo.get("id")
        repo["app_installed"] = bool(rid in accessible_ids)
        annotated.append(repo)

    return annotated
