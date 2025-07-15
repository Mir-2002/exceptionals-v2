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