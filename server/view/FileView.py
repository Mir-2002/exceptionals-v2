from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from controller.FileController import delete_project_files, get_file_by_project, get_project_file_tree, upload_file, get_file, delete_file, upload_project_zip
from model.FileModel import FileResponse
from controller.AuthController import get_current_user
from utils.db import get_db
from utils.project_verification import get_and_check_project_ownership

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])

@router.post("/", summary="Upload a file to a project")
async def upload_file_view(
    project_id: str,
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await upload_file(project_id, file, db)

@router.get("/tree", summary="Get the project file tree")
async def get_file_tree_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await get_project_file_tree(project_id, db)

@router.get("/all", summary="Get all files in a project", response_model=list[FileResponse])
async def get_all_files_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await get_file_by_project(project_id, db)

@router.post("/upload-zip", summary="Upload a zipped Python project")
async def upload_zip_view(project_id: str, zip_file: UploadFile = File(...), db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await upload_project_zip(project_id, zip_file, db)

@router.get("/{file_id}", summary="Get a file from a project", response_model=FileResponse)
async def get_file_view(project_id: str, file_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await get_file(project_id, file_id, db)

@router.delete("/{file_id}", summary="Delete a file from a project")
async def delete_file_view(project_id: str, file_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await delete_file(project_id, file_id, db)

@router.delete("/", summary="Delete all files in a project")
async def delete_project_files_view(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    return await delete_project_files(project_id, db)