import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from bson import ObjectId
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_LOCAL_URI", "mongodb://localhost:27017")
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "test-db")

@pytest.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URI)
    database = client[TEST_DB_NAME]
    for name in ["projects", "files", "preferences", "documentations", "documentation_results", "users"]:
        await database[name].delete_many({})
    yield database
    for name in ["projects", "files", "preferences", "documentations", "documentation_results", "users"]:
        await database[name].delete_many({})
    client.close()

@pytest.fixture
async def project_with_files(db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({
        "_id": ObjectId(proj_id),
        "name": "TestProj",
        "description": "Desc",
        "user_id": "user123",
        "tags": [],
        "status": "empty",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    })
    await db.preferences.insert_one({
        "project_id": proj_id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
        "per_file_exclusion": [
            {
                "filename": "src/module.py",
                "exclude_functions": ["helper_fn"],
                "exclude_classes": ["HelperClass"],
                "exclude_methods": ["skip_method"],
            }
        ],
        "format": "HTML",
        "current_Step": 1,
    })
    file_id = ObjectId()
    await db.files.insert_one({
        "_id": file_id,
        "project_id": proj_id,
        "filename": "src/module.py",
        "functions": [
            {"name": "main_fn"},
            {"name": "helper_fn"},
        ],
        "classes": [
            {"name": "MainClass", "methods": [
                {"name": "run"}, {"name": "skip_method"}
            ]},
            {"name": "HelperClass", "methods": [
                {"name": "assist"}, {"name": "skip_method"}
            ]}
        ],
    })
    return proj_id, str(file_id)
