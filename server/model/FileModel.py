from typing import List
from pydantic import BaseModel, Field, model_validator


class FunctionInfo(BaseModel):
    name: str
    code: str

class ClassInfo(BaseModel):
    name: str
    code: str
    methods: List[FunctionInfo] = Field(default_factory=list)

class FileBase(BaseModel):
    project_id: str
    filename: str
    functions: List[FunctionInfo] = Field(default_factory=list)
    classes: List[ClassInfo] = Field(default_factory=list)

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