from fastapi import APIRouter, Depends
from controller.AuthController import get_current_user
from utils.db import get_db
from controller.AdminController import (
    list_users as ctl_list_users,
    admin_update_user as ctl_update_user,
    admin_delete_user as ctl_delete_user,
    list_projects as ctl_list_projects,
    admin_delete_project as ctl_delete_project,
    list_files as ctl_list_files,
    cleanup_orphaned_files as ctl_cleanup_orphans,
    cleanup_orphaned_projects as ctl_cleanup_orphaned_projects,
    cleanup_orphaned_documentations as ctl_cleanup_orphaned_docs,
    list_documentations as ctl_list_documentations,
    admin_delete_documentation as ctl_delete_documentation,
    admin_get_documentation as ctl_get_documentation,
    admin_delete_all_users as ctl_delete_all_users,
    admin_delete_all_projects as ctl_delete_all_projects,
    admin_delete_all_files as ctl_delete_all_files,
    admin_delete_all_documentations as ctl_delete_all_documentations,
)

router = APIRouter(prefix="/admin", tags=["admin"])

# Users
@router.get("/users")
async def list_users(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_list_users(db, current_user)

@router.patch("/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_update_user(user_id, payload, db, current_user)

@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_user(user_id, db, current_user)

@router.delete("/users")
async def admin_delete_all_users(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_all_users(db, current_user)

# Projects
@router.get("/projects")
async def list_projects(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_list_projects(db, current_user)

@router.delete("/projects/{project_id}")
async def admin_delete_project(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_project(project_id, db, current_user)

@router.delete("/projects")
async def admin_delete_all_projects(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_all_projects(db, current_user)

@router.post("/projects/cleanup-orphans")
async def cleanup_orphaned_projects(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_cleanup_orphaned_projects(db, current_user)

# Files
@router.get("/files")
async def list_files(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_list_files(db, current_user)

@router.delete("/files")
async def admin_delete_all_files(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_all_files(db, current_user)

@router.post("/files/cleanup-orphans")
async def cleanup_orphaned_files(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_cleanup_orphans(db, current_user)

# Documentations
@router.get("/documentations")
async def list_documentations(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_list_documentations(db, current_user)

@router.get("/documentations/{revision_id}")
async def get_documentation(revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_get_documentation(revision_id, db, current_user)

@router.delete("/documentations/{revision_id}")
async def delete_documentation(revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_documentation(revision_id, db, current_user)

@router.delete("/documentations")
async def admin_delete_all_documentations(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_delete_all_documentations(db, current_user)

@router.post("/documentations/cleanup-orphans")
async def cleanup_orphaned_documentations(db=Depends(get_db), current_user=Depends(get_current_user)):
    return await ctl_cleanup_orphaned_docs(db, current_user)
