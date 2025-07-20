# Helper function (place at the top or import if in another file)
from fastapi import HTTPException
from bson import ObjectId


async def get_and_check_project_ownership(project_id: str, db, current_user):
    project_id = ObjectId(project_id)
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not (str(project["user_id"]) == str(current_user.id) or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Not authorized")
    return project