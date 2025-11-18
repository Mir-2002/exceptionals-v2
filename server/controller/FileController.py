from datetime import datetime
from fastapi import Depends, File, UploadFile, HTTPException
from bson import ObjectId
from fastapi.responses import JSONResponse
from model.FileModel import FileResponse
from controller.ProjectController import calculate_project_status
from utils.build_tree import build_file_tree
from utils.db import get_db
from utils.timestamp_helper import update_project_timestamp
from utils.parser import extract_functions_classes_from_content, extract_py_files_from_zip

MAX_FILES_PER_UPLOAD = 100
MAX_ITEMS_PER_UPLOAD = 500  # functions + classes + methods

async def upload_file(project_id: str, file: UploadFile = File(...), db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    try:
        content = (await file.read()).decode("utf-8")
        parsed = extract_functions_classes_from_content(content)
        # Count items (functions + classes + methods)
        methods_count = sum(len(c.get("methods") or []) for c in (parsed.get("classes") or []))
        total_items = len(parsed.get("functions") or []) + len(parsed.get("classes") or []) + methods_count
        if total_items > MAX_ITEMS_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Upload rejected: total items ({total_items}) exceed limit of {MAX_ITEMS_PER_UPLOAD}.")

        file_data = {
            "project_id": project_id,
            "filename": file.filename,
            "functions": parsed["functions"],
            "classes": parsed["classes"]
        }
        result = await db.files.insert_one(file_data)
        
        try:
            all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
            new_status = calculate_project_status(all_project_files)
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"status": new_status, "updated_at": datetime.now()}}
            )
        except Exception as e:
            print(f"Warning: Could not update project status for {project_id}. Error: {e}")
        return {"file_id": str(result.inserted_id), "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading the file: {str(e)}"
        )
    
async def upload_project_files(project_id: str, files: list[UploadFile], db=Depends(get_db)):
    """
    Upload multiple individual Python files to a project.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    try:
        # Enforce file count limit
        py_files = [f for f in files if f.filename.endswith('.py')]
        if len(py_files) > MAX_FILES_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Upload rejected: maximum {MAX_FILES_PER_UPLOAD} files per upload.")

        docs = []
        total_items = 0
        uploaded_files = []
        for file in py_files:
            content = (await file.read()).decode("utf-8")
            parsed = extract_functions_classes_from_content(content)
            methods_count = sum(len(c.get("methods") or []) for c in (parsed.get("classes") or []))
            total_items += len(parsed.get("functions") or []) + len(parsed.get("classes") or []) + methods_count
            docs.append({
                "project_id": project_id,
                "filename": file.filename,
                "functions": parsed["functions"],
                "classes": parsed["classes"],
            })
            uploaded_files.append({"filename": file.filename})

        if total_items > MAX_ITEMS_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Upload rejected: total items ({total_items}) exceed limit of {MAX_ITEMS_PER_UPLOAD}.")

        if docs:
            res = await db.files.insert_many(docs)
            # backfill ids
            for i, _id in enumerate(res.inserted_ids):
                uploaded_files[i]["file_id"] = str(_id)

        # Update project status after all uploads
        try:
            all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
            new_status = calculate_project_status(all_project_files)
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"status": new_status, "updated_at": datetime.now()}}
            )
        except Exception as e:
            print(f"Warning: Could not update project status for {project_id}. Error: {e}")
        
        return uploaded_files
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading files: {str(e)}"
        )
    
async def upload_project_zip(project_id: str, zip_file: UploadFile = File(...), db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    try:
        zip_bytes = await zip_file.read()
        extracted_files = extract_py_files_from_zip(zip_bytes)
        # Enforce max files limit
        if len(extracted_files) > MAX_FILES_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Upload rejected: maximum {MAX_FILES_PER_UPLOAD} files per upload.")
        # Compute total items across extracted files
        total_items = 0
        for f in extracted_files:
            methods_count = sum(len(c.get("methods") or []) for c in (f.get("classes") or []))
            total_items += len(f.get("functions") or []) + len(f.get("classes") or []) + methods_count
        if total_items > MAX_ITEMS_PER_UPLOAD:
            raise HTTPException(status_code=400, detail=f"Upload rejected: total items ({total_items}) exceed limit of {MAX_ITEMS_PER_UPLOAD}.")
        # Batch insert for speed
        docs = []
        for file_data in extracted_files:
            docs.append({
                "project_id": project_id,
                "filename": file_data["filename"],
                "functions": file_data["functions"],
                "classes": file_data["classes"],
            })
        if docs:
            await db.files.insert_many(docs)
        
        try:
            all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
            new_status = calculate_project_status(all_project_files)
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"status": new_status, "updated_at": datetime.now()}}
            )
        except Exception as e:
            print(f"Warning: Could not update project status for {project_id} after zip upload. Error: {e}")
        return {"detail": "Project uploaded and processed", "files_processed": len(extracted_files)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading the project zip: {str(e)}"
        )
    
async def get_file(project_id: str, file_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID format.")

    file_id = ObjectId(file_id)
    file_data = await db.files.find_one({"_id": file_id, "project_id": project_id})
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(**file_data)

async def get_file_tree(project_id: str, db=Depends(get_db)):
    """
    Returns a nested directory tree of all files in a project.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    if not files:
        # Return empty tree instead of 404 for better UX
        empty_tree = {"name": "root", "children": []}
        return JSONResponse(
            content=empty_tree,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    
    tree = build_file_tree(files)
    return JSONResponse(
        content=tree,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache", 
            "Expires": "0"
        }
    )

async def get_files_in_project(project_id: str, db=Depends(get_db)):
    """
    Retrieves all files associated with a project.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    
    if not files:
        raise HTTPException(status_code=404, detail="No files found for this project")
    
    return [FileResponse(**file) for file in files]

async def delete_file(project_id: str, file_id: str, db=Depends(get_db)):
    """
    Deletes a file by its ID.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID format.")

    file_id_obj = ObjectId(file_id)
    
    result = await db.files.delete_one({"_id": file_id_obj, "project_id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
        new_status = calculate_project_status(all_project_files)
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"status": new_status, "updated_at": datetime.now()}}
        )
    except Exception as e:
        print(f"Warning: Could not update project status for {project_id} after file deletion. Error: {e}")

    return JSONResponse(content={"message": "File deleted successfully"})

async def delete_project_files(project_id: str, db=Depends(get_db)):
    """
    Deletes all files associated with a project.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    result = await db.files.delete_many({"project_id": project_id})    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No files found for this project")
    # Recalculate project status and update timestamp
    try:
        all_project_files = await db.files.find({"project_id": project_id}).to_list(length=None)
        new_status = calculate_project_status(all_project_files)
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"status": new_status, "updated_at": datetime.now()}}
        )
    except Exception as e:
        print(f"Warning: Could not update project status after bulk file deletion for {project_id}. Error: {e}")
    return {"detail": f"{result.deleted_count} files deleted successfully"}