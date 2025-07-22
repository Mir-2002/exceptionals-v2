from typing import List
from fastapi import APIRouter, Depends
from model.DocumentationModel import DocstringInfo, Documentation, DocumentationResponse, DocumentationRevisionListResponse, SingleDocstringRequest, SingleDocstringResponse
from controller.DocumentationController import generate_docstring, generate_docstrings_for_project, get_documentation_revision, list_documentation_revisions, save_documentation_revision
from controller.AuthController import get_current_user
from utils.db import get_db
from utils.project_verification import get_and_check_project_ownership

router = APIRouter(prefix="/documentation", tags=["documentation"])

@router.post("/demo", response_model=SingleDocstringResponse)
async def demo_docstring(request: SingleDocstringRequest):
    return await generate_docstring(request)

@router.post("/projects/{project_id}/generate", response_model=DocumentationResponse)
async def generate_project_docstrings(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await generate_docstrings_for_project(project_id, db)

@router.post("/projects/{project_id}/revisions", response_model=Documentation)
async def save_revision(
    project_id: str,
    format: str,
    content: str,
    documented: List[DocstringInfo],
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    notes: str = None
):
    return await save_documentation_revision(
        project_id, format, content, documented, db, current_user.id, notes
    )

@router.get("/projects/{project_id}/revisions", response_model=DocumentationRevisionListResponse)
async def list_revisions(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await list_documentation_revisions(project_id, db)

@router.get("/projects/{project_id}/revisions/{revision_id}", response_model=Documentation)
async def get_revision(project_id: str, revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await get_documentation_revision(project_id, revision_id, db)