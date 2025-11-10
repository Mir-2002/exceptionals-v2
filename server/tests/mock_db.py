from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

load_dotenv()

logger = logging.getLogger("db")

# Support both env var names and provide a sensible local default
_primary_uri = os.getenv("MONGO_LOCAL_URI")

MONGODB_URI = _primary_uri or "mongodb://localhost:27017"

if not _primary_uri:
    logger.warning("MONGO_LOCAL_URI not set; using default 'mongodb://localhost:27017'")

DB_NAME = os.getenv("TEST_DB_NAME") or "test-db"
if not os.getenv("TEST_DB_NAME"):
    logger.warning("TEST_DB_NAME not set; defaulting to 'test-db'")

client = AsyncIOMotorClient(MONGODB_URI)  # Singleton instance
db = client[DB_NAME]

async def get_db():
    logger.debug("get_db called for test DB '%s'", DB_NAME)
    yield db