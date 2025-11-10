from model.UserModel import UserCreate, UserInDB, UserResponse, UserUpdate
from utils.db import get_db
from fastapi import Depends, HTTPException
from utils.auth import hash_password
from bson import ObjectId


async def create_user(user: UserCreate, db=Depends(get_db)):
    existing_user = await db.users.find_one({"$or": [{"email": user.email}, {"username": user.username}]})
    if (existing_user):
        raise HTTPException(
            status_code=400,
            detail="A user with that email or username already exists."
        )
    try:
        hashed_password = hash_password(user.password)
        user_data = UserInDB(**user.model_dump(), hashed_password=hashed_password)
        await db.users.insert_one(user_data.model_dump(by_alias=True))
        response_data = user_data.model_dump(by_alias=True)
        return UserResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while creating the user: {str(e)}"
        )
    
async def get_user_by_id(user_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")
    user_id = ObjectId(user_id)
    try: 
        user_data = await db.users.find_one({"_id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found.")
        return UserResponse(**user_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while retrieving the user: {str(e)}"
        )

async def update_user(user_id: str, user: UserUpdate, db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")
    user_id = ObjectId(user_id)
    existing_user = await db.users.find_one({"_id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found.")
    try:
        update_data = user.model_dump(exclude_unset=True)
        if "password" in update_data:
            update_data["hashed_password"] = hash_password(update_data.pop("password"))
        if "email" in update_data:
            email_exists = await db.users.find_one({"email": update_data["email"], "_id": {"$ne": user_id}})
            if email_exists:
                raise HTTPException(status_code=400, detail="Email already in use")
        if "username" in update_data:
            username_exists = await db.users.find_one({"username": update_data["username"], "_id": {"$ne": user_id}})
            if username_exists:
                raise HTTPException(status_code=400, detail="Username already in use")
        result = await db.users.update_one({"_id": user_id}, {"$set": update_data})
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes made to the user.")
        updated_user = await db.users.find_one({"_id": user_id})
        return UserResponse(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while updating the user: {str(e)}"
        )
    
async def delete_user(user_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")
    user_id = ObjectId(user_id)
    try:
        result = await db.users.delete_one({"_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"detail": "User deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the user: {str(e)}"
        )
