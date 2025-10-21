from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

load_dotenv()

logger = logging.getLogger("db")

# Support both env var names and provide a sensible local default
_primary_uri = os.getenv("MONGODB_URI")
_fallback_uri = os.getenv("MONGO_URI")
MONGODB_URI = _primary_uri or _fallback_uri or "mongodb://localhost:27017"

if not _primary_uri and _fallback_uri:
    logger.warning("MONGODB_URI not set; using MONGO_URI fallback")
if not _primary_uri and not _fallback_uri:
    logger.warning("No MONGODB_URI/MONGO_URI set; defaulting to mongodb://localhost:27017")

DB_NAME = os.getenv("DB_NAME") or "exceptionals"
if not os.getenv("DB_NAME"):
    logger.warning("DB_NAME not set; defaulting to 'exceptionals'")

client = AsyncIOMotorClient(MONGODB_URI)  # Singleton instance
db = client[DB_NAME]

async def get_db():
    logger.debug("get_db called")
    yield db