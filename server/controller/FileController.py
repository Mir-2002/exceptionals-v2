from fastapi import Depends, File, UploadFile, HTTPException
from bson import ObjectId
from model.FileModel import FileResponse
from controller.ProjectController import calculate_project_status
from utils.build_tree import build_file_tree
from utils.db import get_db
from utils.parser import extract_functions_classes_from_content, extract_py_files_from_zip

async def upload_file(project_id: str, file: UploadFile = File(...), db=Depends(get_db)):
    try:
        content = (await file.read()).decode("utf-8")
        parsed = extract_functions_classes_from_content(content)
        file_data = {
            "project_id": project_id,
            "filename": file.filename,
            "functions": parsed["functions"],
            "classes": parsed["classes"]
        }
        result = await db.files.insert_one(file_data)
        
        try:
            # 1. Fetch all files for the project to get a complete list
            all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
            
            # 2. Calculate the new status using the function from ProjectController
            new_status = calculate_project_status(all_project_files)
            
            # 3. Update the project document with the new status
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"status": new_status}}
            )
        except Exception as e:
            # Optional: Log this error, but don't fail the whole upload because of it
            print(f"Warning: Could not update project status for {project_id}. Error: {e}")
        return {"file_id": str(result.inserted_id), "filename": file.filename}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading the file: {str(e)}"
        )
    
    
async def upload_project_zip(project_id: str, zip_file: UploadFile = File(...), db=Depends(get_db)):
    try:
        zip_bytes = await zip_file.read()
        extracted_files = extract_py_files_from_zip(zip_bytes)
        for file_data in extracted_files:
            file_data["project_id"] = project_id
            await db.files.insert_one(file_data)
        try:
            all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
            new_status = calculate_project_status(all_project_files)
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"status": new_status}}
            )
        except Exception as e:
            print(f"Warning: Could not update project status for {project_id} after zip upload. Error: {e}")
        return {"detail": "Project uploaded and processed", "files_processed": len(extracted_files)}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading the project zip: {str(e)}"
        )
    
async def get_file(project_id: str, file_id: str, db=Depends(get_db)):
    file_id = ObjectId(file_id)
    file_data = await db.files.find_one({"_id": file_id, "project_id": project_id})
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(**file_data)

async def get_project_file_tree(project_id: str, db=Depends(get_db)):
    """
    Returns a nested directory tree of all files in a project.
    """
    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    if not files:
        raise HTTPException(status_code=404, detail="No files found for this project")
    tree = build_file_tree(files)
    return tree

async def get_file_by_project(project_id: str, db=Depends(get_db)):
    """
    Retrieves all files associated with a project.
    """
    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    
    if not files:
        raise HTTPException(status_code=404, detail="No files found for this project")
    
    return [FileResponse(**file) for file in files]

async def delete_file(project_id: str, file_id: str, db=Depends(get_db)):
    """
    Deletes a file by its ID.
    """
    file_id = ObjectId(file_id)
    result = await db.files.delete_one({"_id": file_id, "project_id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"detail": "File deleted successfully"}

async def delete_project_files(project_id: str, db=Depends(get_db)):
    """
    Deletes all files associated with a project.
    """
    result = await db.files.delete_many({"project_id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No files found for this project")
    
    return {"detail": f"{result.deleted_count} files deleted successfully"}