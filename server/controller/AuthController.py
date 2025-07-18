from fastapi import Depends, HTTPException, status
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from model.UserModel import UserInDB
from model.TokenModel import Token, TokenData
from utils.db import get_db

# Secret key and algorithm for JWT
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

async def authenticate_user(username: str, password: str, db):
    user = await db.users.find_one({"username": username})
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return UserInDB(**user)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def login_user(username: str, password: str, db):
    user = await authenticate_user(username, password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    token_data = {"sub": user.username, "is_admin": user.is_admin}
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type="bearer")

async def get_current_user(token: str, db):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, is_admin=is_admin)
    except JWTError:
        raise credentials_exception
    user = await db.users.find_one({"username": token_data.username})
    if user is None:
        raise credentials_exception
    return UserInDB(**user)