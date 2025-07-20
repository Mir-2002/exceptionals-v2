from fastapi import APIRouter, Depends, HTTPException, status
from model.UserModel import UserCreate, UserLogin, UserResponse
from model.TokenModel import Token
from controller.AuthController import get_current_user, login_user
from controller.UserController import create_user
from utils.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", summary="Register a new user")
async def register(user: UserCreate, db=Depends(get_db)):
    return await create_user(user, db)

@router.post("/login", response_model=Token, summary="Login and get access token")
async def login(user: UserLogin, db=Depends(get_db)):
    return await login_user(user.username, user.password, db)

@router.get("/me", response_model=UserResponse, summary="Get current user information")
async def get_me(current_user=Depends(get_current_user)):
    return await current_user