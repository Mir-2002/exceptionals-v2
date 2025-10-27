from typing import Optional, Literal
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
    # Make hashed_password optional to support OAuth accounts without local password
    hashed_password: Optional[str] = None
    is_admin: bool = False
    # OAuth fields
    auth_provider: Literal["local", "github"] = "local"
    provider_id: Optional[str] = None  # e.g., GitHub user id
    github_token_enc: Optional[str] = None  # encrypted GitHub access token

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class UserResponse(UserBase):
    id: str
    is_admin: bool = False
    auth_provider: Literal["local", "github"] = "local"

    model_config = {
        "from_attributes": True,
    }

    @model_validator(mode="before")
    @classmethod
    def from_mongo(cls, data):
        # Ensure data is a dict
        if not isinstance(data, dict):
            data = data.dict(by_alias=True)
        # Convert _id to id and remove sensitive fields if present
        if "_id" in data:
            data["id"] = str(data["_id"])
        data.pop("_id", None)
        data.pop("hashed_password", None)
        data.pop("github_token_enc", None)
        return data
