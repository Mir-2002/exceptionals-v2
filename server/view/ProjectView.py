from fastapi import APIRouter, Depends

from controller.ProjectController import apply_preferences_and_update_project, create_project, delete_project, get_project_by_id,  update_project
from model.ProjectModel import ProjectCreate, ProjectResponse, ProjectUpdate
from utils.db import get_db


router = APIRouter()

@router.post("/projects", summary="Create a project.",response_model=ProjectResponse)
async def create(project: ProjectCreate, db=Depends(get_db)):
    return await create_project(project, db)

@router.get("/projects/{project_id}", summary="Get a project by ID.",response_model=ProjectResponse)
async def get(project_id: str, db=Depends(get_db)):
    return await get_project_by_id(project_id, db)

@router.patch("/projects/{project_id}", summary="Update project details.",response_model=ProjectResponse)
async def update(project_id: str, project: ProjectUpdate, db=Depends(get_db)):
    return await update_project(project_id, project, db)

@router.delete("/projects/{project_id}", summary="Delete a project.")
async def delete(project_id: str, db=Depends(get_db)):
    return await delete_project(project_id, db)

@router.post("/projects/{project_id}/apply-preferences")
async def apply_prefs(project_id: str, db=Depends(get_db)):
    return await apply_preferences_and_update_project(project_id, db)