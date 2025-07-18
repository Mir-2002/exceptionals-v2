from fastapi import Depends, HTTPException
from model.ProjectModel import ProjectCreate, ProjectInDB, ProjectResponse, ProjectUpdate
from utils.db import get_db
from bson import ObjectId


async def create_project(project: ProjectCreate, db=Depends(get_db)):
    existing_project = await db.projects.find_one({"name": project.name})
    if existing_project:
        raise HTTPException(
            status_code=400,
            detail="A project with that name already exists."
        )
    
    try:
        project_data = ProjectInDB(**project.model_dump())
        result = await db.projects.insert_one(project_data.model_dump(by_alias=True))

        response_data = project_data.model_dump(by_alias=True)
        return ProjectResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while creating the project: {str(e)}"
        )
    
async def get_project_by_id(project_id: str, db=Depends(get_db)):
    project_id = ObjectId(project_id)
    try: 
        project_data = await db.projects.find_one({"_id": project_id})
        if not project_data:
            raise HTTPException(
                status_code=404,
                detail="Project not found."
            )
        return ProjectResponse(**project_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while retrieving the project: {str(e)}"
        )
    
async def get_user_projects(user_id: str, db=Depends(get_db)):
    user_id = ObjectId(user_id)
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )
    try:
        projects = await db.projects.find({"user_id": user_id}).to_list(length=None)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while retrieving the user's projects: {str(e)}"
        )
    if not projects:
        raise HTTPException(
            status_code=404,
            detail="No projects found for this user."
        )
    return [ProjectResponse(**project) for project in projects]
    
async def update_project(project_id: str, project: ProjectUpdate, db=Depends(get_db)):
    project_id = ObjectId(project_id)
    existing_project = await db.projects.find_one({"_id": project_id})
    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found."
        )
    
    try:
        update_data = project.model_dump(exclude_unset=True)
        if "name" in update_data:
            name_exists = await db.projects.find_one({"name": update_data["name"], "_id": {"$ne": project_id}})
            if name_exists:
                raise HTTPException(
                    status_code=400,
                    detail="A project with that name already exists."
                )

        result = await db.projects.update_one({"_id": project_id}, {"$set": update_data})
        if result.modified_count == 0:
            raise HTTPException(
                status_code=400,
                detail="No changes made to the project."
            )
        
        updated_project = await db.projects.find_one({"_id": project_id})
        return ProjectResponse(**updated_project)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while updating the project: {str(e)}"
        )
    
async def delete_project(project_id: str, db=Depends(get_db)):
    project_id = ObjectId(project_id)
    existing_project = await db.projects.find_one({"_id": project_id})
    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found."
        )
    
    try:
        result = await db.projects.delete_one({"_id": project_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Failed to delete the project."
            )
        return {"detail": "Project deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the project: {str(e)}"
        )
    
async def apply_preferences_and_update_project(project_id: str, db=Depends(get_db)):
    # 1. Fetch preferences
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found for this project.")

    # 2. Fetch all files for the project
    files = await db.files.find({"project_id": project_id}).to_list(length=None)

    # 3. Prepare exclusion lists
    dir_ex = prefs.get("directory_exclusion", {})
    per_file_ex = prefs.get("per_file_exclusion", [])

    exclude_files = set(dir_ex.get("exclude_files", []))
    exclude_dirs = set(dir_ex.get("exclude_dirs", []))

    # For reporting missing exclusions
    missing_exclusions = []

    for file in files:
        filename = file["filename"]

        # Directory/file exclusion
        if filename in exclude_files or any(filename.startswith(d + "/") for d in exclude_dirs):
            # Instead of deleting, just set processed_functions/classes to empty
            await db.files.update_one(
                {"_id": file["_id"]},
                {"$set": {
                    "processed_functions": [],
                    "processed_classes": []
                }}
            )
            continue

        # Per-file exclusion
        file_ex = next((ex for ex in per_file_ex if ex["filename"] == filename), None)
        filtered_functions = file.get("functions", [])
        filtered_classes = file.get("classes", [])

        if file_ex:
            # Remove excluded functions
            if "exclude_functions" in file_ex and file_ex["exclude_functions"]:
                filtered_functions = [
                    f for f in filtered_functions
                    if f["name"] not in file_ex["exclude_functions"]
                ]
            # Remove excluded classes
            if "exclude_classes" in file_ex and file_ex["exclude_classes"]:
                filtered_classes = [
                    c for c in filtered_classes
                    if c["name"] not in file_ex["exclude_classes"]
                ]
            # Remove excluded methods from classes
            if "exclude_methods" in file_ex and file_ex["exclude_methods"]:
                for c in filtered_classes:
                    c["methods"] = [
                        m for m in c.get("methods", [])
                        if m["name"] not in file_ex["exclude_methods"]
                    ]

        # Update the file in the DB with processed content
        await db.files.update_one(
            {"_id": file["_id"]},
            {"$set": {
                "processed_functions": filtered_functions,
                "processed_classes": filtered_classes
            }}
        )

    return {
        "detail": "Project files updated according to preferences.",
        "missing_exclusions": missing_exclusions
    }