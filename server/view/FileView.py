from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from controller.FileController import delete_project_files, get_project_file_tree, upload_file, get_file, delete_file, upload_project_zip
from utils.db import get_db

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])

@router.post("/", summary="Upload a file to a project")
async def upload_file_view(project_id: str, file: UploadFile = File(...), db=Depends(get_db)):
    return await upload_file(project_id, file, db)

@router.post("/upload-zip", summary="Upload a zipped Python project")
async def upload_zip_view(project_id: str, zip_file: UploadFile = File(...), db=Depends(get_db)):
    return await upload_project_zip(project_id, zip_file, db)

@router.get("/tree", summary="Get the project file tree")
async def get_file_tree_view(project_id: str, db=Depends(get_db)):
    return await get_project_file_tree(project_id, db)

@router.get("/{file_id}", summary="Get a file from a project")
async def get_file_view(project_id: str, file_id: str, db=Depends(get_db)):
    return await get_file(file_id, db)

@router.delete("/{file_id}", summary="Delete a file from a project")
async def delete_file_view(project_id: str, file_id: str, db=Depends(get_db)):
    return await delete_file(file_id, db)

@router.delete("/", summary="Delete all files in a project")
async def delete_project_files_view(project_id: str, db=Depends(get_db)):
    return await delete_project_files(project_id, db)