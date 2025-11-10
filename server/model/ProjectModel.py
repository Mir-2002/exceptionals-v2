from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, model_validator
from bson import ObjectId

from utils.custom_type import PyObjectId

class ProjectStatus(str, Enum):
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    EMPTY = "empty"
    
class ProjectBase(BaseModel):
    name: str 
    description: str
    user_id: str 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    tags: Optional[List[str]] = []
    status: ProjectStatus = ProjectStatus.EMPTY

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    tags: Optional[List[str]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated name of the project", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="Updated description of the project", max_length=500)
    status: Optional[ProjectStatus] = Field(None, description="Updated status of the project")

class ProjectInDB(ProjectBase):
    id: Optional[PyObjectId] =  Field(default_factory=PyObjectId, alias="_id")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class ProjectResponse(ProjectBase):
    id: str

    model_config = {
        "from_attributes": True,
    }

    @model_validator(mode="before")
    @classmethod
    def from_mongo(cls, data):
        # Convert _id to id and remove sensitive fields if present
        if "_id" in data:
            data["id"] = str(data["_id"])
        # Normalize status variants from legacy values
        status = data.get("status")
        if isinstance(status, str):
            s = status.strip().lower()
            if s == "complete":
                data["status"] = "completed"
            elif s in ("in-progress", "inprogress"):
                data["status"] = "in_progress"
        data.pop("_id", None)
        return data
    
class FileProcessSummary(BaseModel):
    filename: str
    included_functions: List[str]
    excluded_functions: List[str]
    included_classes: List[str]
    excluded_classes: List[str]
    excluded_methods: Optional[Dict[str, List[str]]] = None  # {class_name: [method_names]}

class ProcessFilesSummaryResponse(BaseModel):
    processed_files: List[FileProcessSummary]