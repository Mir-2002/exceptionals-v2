from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from utils.db import get_db
from controller.GithubAuthController import handle_github_callback, list_github_repos
from controller.AuthController import create_access_token
from model.TokenModel import Token
from model.UserModel import UserInDB
from controller.AuthController import get_current_user
import os
from urllib.parse import quote

router = APIRouter(prefix="/auth/github", tags=["auth"]) 

@router.get("/login", summary="Start GitHub OAuth login")
def github_login():
    client_id = os.getenv("GITHUB_OAUTH_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    scope_raw = "read:user user:email repo"
    scope = quote(scope_raw, safe="")
    
    # Let GitHub use the OAuth App's configured callback URL - NO redirect_uri parameter
    base = "https://github.com/login/oauth/authorize"
    url = f"{base}?client_id={client_id}&scope={scope}&allow_signup=true"
    return RedirectResponse(url)

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
    # Return subset fields
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
        }
        for r in repos
    ]
    return simplified