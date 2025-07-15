from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")

client = AsyncIOMotorClient(MONGODB_URI)  # Singleton instance
db = client[DB_NAME]

async def get_db():
    return db