from fastapi import APIRouter, Depends

from controller.UserController import create_user, get_user_by_id, update_user, delete_user
from controller.ProjectController import get_user_projects
from model.ProjectModel import ProjectResponse
from model.UserModel import UserCreate, UserResponse, UserUpdate
from utils.db import get_db


router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create(user: UserCreate, db=Depends(get_db)):
    return await create_user(user,db)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get(user_id: str, db=Depends(get_db)):
    return await get_user_by_id(user_id, db)

@router.get("/users/{user_id}/projects", response_model=list[ProjectResponse])
async def user_projects(user_id: str, db=Depends(get_db)):
    return await get_user_projects(user_id, db)

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update(user_id: str, user: UserUpdate, db=Depends(get_db)):
    return await update_user(user_id, user, db)

@router.delete("/users/{user_id}")
async def delete(user_id: str, db=Depends(get_db)):
    return await delete_user(user_id, db)