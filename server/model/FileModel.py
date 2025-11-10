from typing import List
from pydantic import BaseModel, Field, model_validator, field_validator
from bson import ObjectId


class FunctionInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str

class ClassInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str
    methods: List[FunctionInfo] = Field(default_factory=list)

class FileBase(BaseModel):
    project_id: str
    filename: str = Field(..., min_length=1, max_length=255)
    functions: List[FunctionInfo] = Field(default_factory=list)
    classes: List[ClassInfo] = Field(default_factory=list)
    processed_functions: List[FunctionInfo] = Field(default_factory=list)
    processed_classes: List[ClassInfo] = Field(default_factory=list)

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid project_id format")
        return v

class FileCreate(FileBase):
    pass

class FileInDB(FileBase):
    id: str = Field(..., alias="_id")

class FileResponse(FileBase):
    id: str

    @model_validator(mode="before")
    @classmethod
    def from_mongo(cls, data):
        # Convert _id to id and remove sensitive fields if present
        if "_id" in data:
            data["id"] = str(data["_id"])
        data.pop("_id", None)
        return data