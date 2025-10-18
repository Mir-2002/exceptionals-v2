from typing import List
from fastapi import Depends, HTTPException
from model.ProjectModel import FileProcessSummary, ProcessFilesSummaryResponse, ProjectCreate, ProjectInDB, ProjectResponse, ProjectUpdate
from utils.db import get_db
from bson import ObjectId

def calculate_project_status(files):
    if not files:
        return "empty"
    
    # If files exist but have no functions/classes (non-Python or empty files)
    if all(not f.get("functions") and not f.get("classes") for f in files):
        return "empty"
    
    # If all files with content have been fully processed
    if all(
        (f.get("functions") == f.get("processed_functions", [])) and
        (f.get("classes") == f.get("processed_classes", []))
        for f in files if f.get("functions") or f.get("classes")
    ):
        return "complete"
    
    # Files exist with content but not fully processed
    return "in_progress"

async def create_project(project: ProjectCreate, db, current_user):
    existing_project = await db.projects.find_one({"name": project.name})
    if existing_project:
        raise HTTPException(
            status_code=400,
            detail="A project with that name already exists."
        )
    
    try:
        project_data = ProjectInDB(
            name=project.name,
            description=project.description,
            user_id=str(current_user.id),
            tags=project.tags or [],
        )
        result = await db.projects.insert_one(project_data.model_dump(by_alias=True))

        response_data = project_data.model_dump(by_alias=True)
        return ProjectResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while creating the project: {str(e)}"
        )
    
async def get_project_by_id(project_id: str, db):
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
    
async def get_user_projects(user_id: str, db):
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )
    try:
        projects = await db.projects.find({"user_id": user_id}).to_list(length=None)
        # Return empty array instead of 404
        return [ProjectResponse(**project) for project in projects]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while retrieving the user's projects: {str(e)}"
        )
    
async def update_project(project_id: str, project: ProjectUpdate, db):
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
    
async def delete_project(project_id: str, db):
    project_oid = ObjectId(project_id)
    existing_project = await db.projects.find_one({"_id": project_oid})
    if not existing_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found."
        )
    
    try:
        # 1. Delete all associated files from the 'files' collection
        # The project_id is stored as a string in the files collection
        await db.files.delete_many({"project_id": project_id})

        # 2. Delete associated preferences from the 'preferences' collection
        await db.preferences.delete_one({"project_id": project_id})

        # 3. Delete the project itself from the 'projects' collection
        result = await db.projects.delete_one({"_id": project_oid})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Failed to delete the project."
            )
        return {"detail": "Project and all associated files and preferences deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the project: {str(e)}"
        )

    
async def apply_preferences_and_update_project(project_id: str, db):
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

    # After processing, update project status
    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    new_status = calculate_project_status(files)
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": new_status}}
    )

    return {
        "detail": "Project files updated according to preferences.",
        "missing_exclusions": missing_exclusions
    }

async def process_multiple_files(project_id: str, file_ids: List[str], db):
    results = []
    for file_id in file_ids:
        result = await process_single_file(project_id, file_id, db)
        results.append(result)
    return ProcessFilesSummaryResponse(processed_files=results)

async def process_single_file(project_id: str, file_id: str, db):
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found for this project.")

    file = await db.files.find_one({"_id": ObjectId(file_id), "project_id": project_id})
    if not file:
        raise HTTPException(status_code=404, detail="File not found.")

    dir_ex = prefs.get("directory_exclusion", {})
    per_file_ex = prefs.get("per_file_exclusion", [])
    exclude_files = set(dir_ex.get("exclude_files", []))
    exclude_dirs = set(dir_ex.get("exclude_dirs", []))

    filename = file["filename"]
    original_functions = {f["name"] for f in file.get("functions", [])}
    original_classes = {c["name"]: c for c in file.get("classes", [])}

    included_functions = []
    excluded_functions = []
    included_classes = []
    excluded_classes = []
    excluded_methods = {}

    # Directory/file exclusion
    if filename in exclude_files or any(filename.startswith(d + "/") for d in exclude_dirs):
        excluded_functions = list(original_functions)
        excluded_classes = list(original_classes.keys())
        await db.files.update_one(
            {"_id": file["_id"]},
            {"$set": {"processed_functions": [], "processed_classes": []}}
        )
        processed_functions = []
        processed_classes = []
    else:
        file_ex = next((ex for ex in per_file_ex if ex["filename"] == filename), None)
        filtered_functions = file.get("functions", [])
        filtered_classes = file.get("classes", [])

        # Functions
        if file_ex and "exclude_functions" in file_ex and file_ex["exclude_functions"]:
            ex_funcs = set(file_ex["exclude_functions"])
            included_functions = [f["name"] for f in filtered_functions if f["name"] not in ex_funcs]
            excluded_functions = [f for f in original_functions if f in ex_funcs]
            filtered_functions = [f for f in filtered_functions if f["name"] not in ex_funcs]
        else:
            included_functions = [f["name"] for f in filtered_functions]

        # Classes
        if file_ex and "exclude_classes" in file_ex and file_ex["exclude_classes"]:
            ex_classes = set(file_ex["exclude_classes"])
            included_classes = [c["name"] for c in filtered_classes if c["name"] not in ex_classes]
            excluded_classes = [c for c in original_classes if c in ex_classes]
            filtered_classes = [c for c in filtered_classes if c["name"] not in ex_classes]
        else:
            included_classes = [c["name"] for c in filtered_classes]

        # Methods
        if file_ex and "exclude_methods" in file_ex and file_ex["exclude_methods"]:
            ex_methods = set(file_ex["exclude_methods"])
            for c in filtered_classes:
                orig_methods = {m["name"] for m in original_classes[c["name"]].get("methods", [])}
                filtered_method_names = {m["name"] for m in c.get("methods", [])}
                excluded = list(orig_methods & ex_methods)
                if excluded:
                    excluded_methods[c["name"]] = excluded
                c["methods"] = [
                    m for m in c.get("methods", [])
                    if m["name"] not in ex_methods
                ]

        await db.files.update_one(
            {"_id": file["_id"]},
            {"$set": {
                "processed_functions": filtered_functions,
                "processed_classes": filtered_classes
            }}
        )
        processed_functions = filtered_functions
        processed_classes = filtered_classes

    return FileProcessSummary(
        filename=filename,
        included_functions=included_functions,
        excluded_functions=excluded_functions,
        included_classes=included_classes,
        excluded_classes=excluded_classes,
        excluded_methods=excluded_methods or None
    )

async def process_project_files(project_id: str, db):
    # 1. Fetch preferences for the project
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

    summary = []

    for file in files:
        filename = file["filename"]
        original_functions = {f["name"] for f in file.get("functions", [])}
        original_classes = {c["name"]: c for c in file.get("classes", [])}

        included_functions = []
        excluded_functions = []
        included_classes = []
        excluded_classes = []
        excluded_methods = {}

        # Directory/file exclusion
        if filename in exclude_files or any(filename.startswith(d + "/") for d in exclude_dirs):
            excluded_functions = list(original_functions)
            excluded_classes = list(original_classes.keys())
            await db.files.update_one(
                {"_id": file["_id"]},
                {"$set": {"processed_functions": [], "processed_classes": []}}
            )
        else:
            file_ex = next((ex for ex in per_file_ex if ex["filename"] == filename), None)
            filtered_functions = file.get("functions", [])
            filtered_classes = file.get("classes", [])

            # Functions
            if file_ex and "exclude_functions" in file_ex and file_ex["exclude_functions"]:
                ex_funcs = set(file_ex["exclude_functions"])
                included_functions = [f["name"] for f in filtered_functions if f["name"] not in ex_funcs]
                excluded_functions = [f for f in original_functions if f in ex_funcs]
                filtered_functions = [f for f in filtered_functions if f["name"] not in ex_funcs]
            else:
                included_functions = [f["name"] for f in filtered_functions]

            # Classes
            if file_ex and "exclude_classes" in file_ex and file_ex["exclude_classes"]:
                ex_classes = set(file_ex["exclude_classes"])
                included_classes = [c["name"] for c in filtered_classes if c["name"] not in ex_classes]
                excluded_classes = [c for c in original_classes if c in ex_classes]
                filtered_classes = [c for c in filtered_classes if c["name"] not in ex_classes]
            else:
                included_classes = [c["name"] for c in filtered_classes]

            # Methods
            if file_ex and "exclude_methods" in file_ex and file_ex["exclude_methods"]:
                ex_methods = set(file_ex["exclude_methods"])
                for c in filtered_classes:
                    orig_methods = {m["name"] for m in original_classes[c["name"]].get("methods", [])}
                    filtered_method_names = {m["name"] for m in c.get("methods", [])}
                    excluded = list(orig_methods & ex_methods)
                    if excluded:
                        excluded_methods[c["name"]] = excluded
                    c["methods"] = [
                        m for m in c.get("methods", [])
                        if m["name"] not in ex_methods
                    ]

            # Update the file in the DB with processed content
            await db.files.update_one(
                {"_id": file["_id"]},
                {"$set": {
                    "processed_functions": filtered_functions,
                    "processed_classes": filtered_classes
                }}
            )

        summary.append(FileProcessSummary(
            filename=filename,
            included_functions=included_functions,
            excluded_functions=excluded_functions,
            included_classes=included_classes,
            excluded_classes=excluded_classes,
            excluded_methods=excluded_methods or None
        ))

    # After processing, update project status
    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    new_status = calculate_project_status(files)
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": new_status}}
    )

    return ProcessFilesSummaryResponse(processed_files=summary)