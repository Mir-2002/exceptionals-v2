from fastapi import Depends, HTTPException, status
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from model.UserModel import UserInDB
from model.TokenModel import Token, TokenData
from utils.db import get_db
from utils.auth import verify_password
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from dotenv import load_dotenv
import os

load_dotenv()

# Secret key and algorithm for JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def authenticate_user(username: str, password: str, db):
    user = await db.users.find_one({"username": username})
    # If user missing or has no local password (OAuth-only), fail auth
    if not user or not user.get("hashed_password"):
        return None
    if not verify_password(password, user["hashed_password"]):
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
    token_data = {"sub": str(user.id), "is_admin": user.is_admin}
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type="bearer")

async def get_current_user(db=Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(username=user_id, is_admin=is_admin)
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except JWTError:
        raise credentials_exception
    if user is None:
        raise credentials_exception
    return UserInDB(**user)