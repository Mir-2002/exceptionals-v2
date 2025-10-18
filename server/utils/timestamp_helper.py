"""
Helper functions for updating project timestamps
"""
from datetime import datetime
from bson import ObjectId

async def update_project_timestamp(project_id: str, db):
    """
    Updates the updated_at timestamp for a project
    """
    try:
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"updated_at": datetime.now()}}
        )
    except Exception as e:
        # Log the error but don't fail the operation
        print(f"Warning: Could not update timestamp for project {project_id}. Error: {e}")
