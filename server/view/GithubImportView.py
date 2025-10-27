from fastapi import APIRouter, Depends
from controller.GithubImportController import import_github_repo
from model.GithubModel import GithubImportRequest
from controller.AuthController import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/github", tags=["github"]) 

@router.post("/import", summary="Import a GitHub repo as a project")
async def import_repo(req: GithubImportRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await import_github_repo(req, db, current_user)
