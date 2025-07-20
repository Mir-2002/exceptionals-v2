from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field, model_validator

from utils.custom_type import PyObjectId


class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class UserInDB(UserBase):
    id: Optional[PyObjectId] =  Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    is_admin: bool = False

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class UserResponse(UserBase):
    id: str

    model_config = {
        "from_attributes": True,
    }

    @model_validator(mode="before")
    @classmethod
    def from_mongo(cls, data):
        # Convert _id to id and remove hashed_password if present
        if "_id" in data:
            data["id"] = str(data["_id"])
        data.pop("_id", None)
        data.pop("hashed_password", None)
        return data
