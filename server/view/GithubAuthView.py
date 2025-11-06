from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from utils.db import get_db
from controller.GithubAuthController import handle_github_callback, list_github_repos
from controller.AuthController import create_access_token
from model.TokenModel import Token
from model.UserModel import UserInDB
from controller.AuthController import get_current_user
import os
from urllib.parse import urlencode
import httpx
from utils.crypto import decrypt_text

router = APIRouter(prefix="/auth/github", tags=["auth"]) 

@router.get("/login", summary="Start GitHub App login (user-to-server)")
def github_login():
    client_id = os.getenv("GITHUB_OAUTH_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    # GitHub App OAuth web flow does not use OAuth scopes; permissions are set on the app
    base = "https://github.com/login/oauth/authorize"
    params = {"client_id": client_id, "allow_signup": "true"}

    redirect_uri = os.getenv("GITHUB_OAUTH_REDIRECT_URI")
    if redirect_uri:
        params["redirect_uri"] = redirect_uri

    url = f"{base}?{urlencode(params)}"
    return RedirectResponse(url)

@router.get("/install", summary="Redirect to install the GitHub App")
def github_install(request: Request):
    slug = os.getenv("GITHUB_APP_SLUG")
    if not slug:
        try:
            from utils.github_app import get_app_slug
            # Note: this requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to be configured
            import anyio
            slug = anyio.run(get_app_slug)
        except Exception:
            raise HTTPException(status_code=500, detail="Unable to resolve GitHub App slug. Configure GITHUB_APP_SLUG or GITHUB_APP_PRIVATE_KEY.")

    # Optional `next` param to carry through as `state`, so GitHub will append it to your Setup URL
    next_param = request.query_params.get("next")
    base = f"https://github.com/apps/{slug}/installations/new"
    if next_param:
        from urllib.parse import urlencode
        return RedirectResponse(f"{base}?{urlencode({'state': next_param})}")
    return RedirectResponse(base)

@router.get("/callback", response_model=Token, summary="GitHub OAuth callback")
async def github_callback(code: str, db=Depends(get_db)):
    user_doc = await handle_github_callback(code, db)
    # Create JWT for our app
    user = UserInDB(**user_doc)
    token_data = {"sub": str(user.id), "is_admin": user.is_admin}
    jwt_token = create_access_token(token_data)
    return Token(access_token=jwt_token)

@router.get("/repos", summary="List authenticated user's GitHub repositories")
async def github_repos(current_user=Depends(get_current_user), db=Depends(get_db)):
    repos = await list_github_repos(current_user, db)
    simplified = [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "private": r.get("private"),
            "html_url": r.get("html_url"),
            "description": r.get("description"),
            "updated_at": r.get("updated_at"),
            "language": r.get("language"),
            "app_installed": bool(r.get("app_installed")),
        }
        for r in repos
    ]
    return simplified

@router.get("/installed", summary="Check if the GitHub App is already installed for this user")
async def github_installed(current_user=Depends(get_current_user)):
    if getattr(current_user, "auth_provider", None) != "github" or not getattr(current_user, "github_token_enc", None):
        # Not a GitHub-auth user
        return {"installed": False, "installations": []}

    user_token = decrypt_text(current_user.github_token_enc)
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {user_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get("https://api.github.com/user/installations", headers=headers)
        if resp.status_code != 200:
            # On error, default to not installed (prevents redirect loops)
            return {"installed": False, "installations": []}
        data = resp.json() or {}
        total = data.get("total_count") or len(data.get("installations") or [])
        return {"installed": total > 0, "installations": data.get("installations") or []}