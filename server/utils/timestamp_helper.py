"""
Helper functions for updating project timestamps
"""
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger("timestamp")

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
        logger.warning("Could not update timestamp for project %s. Error: %s", project_id, e)
