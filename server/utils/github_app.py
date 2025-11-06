# filepath: server/utils/github_app.py
import os
import time
from typing import Optional
import httpx
from jose import jwt

GITHUB_API = "https://api.github.com"

class GithubAppConfigError(Exception):
    pass


def _get_app_config():
    app_id = os.getenv("GITHUB_APP_ID")
    private_key = os.getenv("GITHUB_APP_PRIVATE_KEY")
    if not app_id or not private_key:
        raise GithubAppConfigError("Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY")
    # Support \n-escaped PEM in env vars
    private_key = private_key.replace("\\n", "\n")
    return app_id, private_key


def create_app_jwt() -> str:
    app_id, private_key = _get_app_config()
    now = int(time.time())
    payload = {
        "iat": now - 60,  # backdate to allow clock skew
        "exp": now + 9 * 60,  # max 10 minutes
        "iss": app_id,
    }
    token = jwt.encode(payload, private_key, algorithm="RS256")
    return token


async def get_app_slug() -> str:
    """Fetch the app slug dynamically from the GitHub API."""
    jwt_token = create_app_jwt()
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {jwt_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{GITHUB_API}/app", headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to fetch GitHub App details: {resp.status_code} {resp.text}")
        data = resp.json() or {}
        slug = data.get("slug")
        if not slug:
            raise RuntimeError("GitHub App slug not found in /app response")
        return slug


async def get_installation_token(installation_id: int) -> str:
    jwt_token = create_app_jwt()
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {jwt_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers=headers,
        )
        if resp.status_code != 201:
            raise RuntimeError(
                f"Failed to create installation access token: {resp.status_code} {resp.text}"
            )
        data = resp.json()
        return data.get("token")


async def get_installation_id_for_repo(owner: str, repo: str) -> int:
    jwt_token = create_app_jwt()
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {jwt_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/installation",
            headers=headers,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Failed to resolve installation for repo {owner}/{repo}: {resp.status_code} {resp.text}"
            )
        return resp.json().get("id")


async def get_installation_token_for_repo(owner: str, repo: str) -> str:
    installation_id = await get_installation_id_for_repo(owner, repo)
    return await get_installation_token(installation_id)


async def list_all_repos_for_user_installations(user_token: str) -> list[dict]:
    """Return repositories the app can access across all of the user's installations."""
    headers_user = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {user_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    repos: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        # List installations accessible to the user
        resp = await client.get(f"{GITHUB_API}/user/installations", headers=headers_user)
        if resp.status_code != 200:
            raise RuntimeError(
                f"Failed to list user installations: {resp.status_code} {resp.text}"
            )
        installations = resp.json().get("installations", [])

        for inst in installations:
            inst_id = inst.get("id")
            if not inst_id:
                continue
            token = await get_installation_token(inst_id)
            headers_inst = {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            }
            # Fetch repos for this installation
            r = await client.get(
                f"{GITHUB_API}/installation/repositories?per_page=100",
                headers=headers_inst,
            )
            if r.status_code != 200:
                # Skip this installation but continue
                continue
            data = r.json() or {}
            for repo in (data.get("repositories") or []):
                repos.append(repo)
    return repos
