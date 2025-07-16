from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from bson import ObjectId

from utils.custom_type import PyObjectId


class ProjectBase(BaseModel):
    name: str 
    description: str
    user_id: str 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated name of the project")
    description: Optional[str] = Field(None, description="Updated description of the project")

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
        data.pop("_id", None)
        return data