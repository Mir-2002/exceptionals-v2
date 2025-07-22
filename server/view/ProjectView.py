from fastapi import APIRouter, Depends, HTTPException, Body
from controller.ProjectController import apply_preferences_and_update_project, create_project, delete_project, get_project_by_id , process_multiple_files, process_project_files, process_single_file,  update_project
from model.ProjectModel import ProjectCreate, ProjectResponse, ProjectUpdate
from utils.db import get_db
from controller.AuthController import get_current_user
from utils.project_verification import get_and_check_project_ownership
from typing import List


router = APIRouter()

@router.post("/projects", summary="Create a project.", response_model=ProjectResponse)
async def create(project: ProjectCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await create_project(project, db)

@router.get("/projects/{project_id}", summary="Get a project by ID.",response_model=ProjectResponse)
async def get(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await get_project_by_id(project_id, db)

@router.patch("/projects/{project_id}", summary="Update project details.",response_model=ProjectResponse)
async def update(project_id: str, project: ProjectUpdate, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await update_project(project_id, project, db)

@router.delete("/projects/{project_id}", summary="Delete a project.")
async def delete(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await delete_project(project_id, db)

@router.post("/projects/{project_id}/apply-preferences")
async def apply_prefs(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await apply_preferences_and_update_project(project_id, db)

@router.post("/projects/{project_id}/files/{file_id}/process", summary="Process a single file according to preferences.")
async def process_single_file_view(project_id: str, file_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await process_single_file(project_id, file_id, db)

@router.post("/projects/{project_id}/files/process", summary="Process multiple files according to preferences.")
async def process_multiple_files_view(
    project_id: str,
    file_ids: List[str] = Body(..., embed=True),  # expects {"file_ids": [...]}
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await process_multiple_files(project_id, file_ids, db)

@router.post("/projects/{project_id}/process-files", summary="Process all files in the project according to preferences.")
async def process_project_files_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await process_project_files(project_id, db)


