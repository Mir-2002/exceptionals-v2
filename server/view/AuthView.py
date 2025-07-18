from fastapi import APIRouter, Depends, HTTPException, status
from model.UserModel import UserCreate, UserLogin
from model.TokenModel import Token
from controller.AuthController import authenticate_user, get_password_hash, login_user
from utils.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", summary="Register a new user")
async def register(user: UserCreate, db=Depends(get_db)):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    user_data = user.model_dump()
    user_data["hashed_password"] = hashed_password
    del user_data["password"]
    await db.users.insert_one(user_data)
    return {"detail": "User registered successfully."}

@router.post("/login", response_model=Token, summary="Login and get access token")
async def login(user: UserLogin, db=Depends(get_db)):
    return await login_user(user.username, user.password, db)