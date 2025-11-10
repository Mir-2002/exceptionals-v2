from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging
import os

# Use the test DB for unit tests
from tests.mock_db import get_db, db

# Import the same routers as production server
from view.UserView import router as user_router
from view.ProjectView import router as project_router
from view.FileView import router as file_router
from view.PreferencesView import router as preferences_router
from view.AuthView import router as auth_router
from view.DocumentationView import router as documentation_router
from view.AdminView import router as admin_router
from view.GithubAuthView import router as github_auth_router
from view.GithubImportView import router as github_import_router
from view.GithubRepoView import router as github_repo_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mock_server")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Ensure indexes similar to server.py
        await db.documentations.create_index(
            [("project_id", 1), ("created_at", -1)], name="doc_project_created"
        )
        await db.files.create_index(
            [("project_id", 1), ("filename", 1)], name="file_project_filename"
        )
        await db.projects.create_index(
            [("user_id", 1), ("updated_at", -1)], name="proj_user_updated"
        )
        logging.getLogger("db").info("Test MongoDB indexes ensured")
    except Exception as e:
        logging.getLogger("db").exception("Failed to ensure test MongoDB indexes: %s", e)
    yield

app = FastAPI(
    title="Exceptionals Test Server",
    description="Test API using real MongoDB test database",
    version="1.0.0-test",
    lifespan=lifespan,
)

# Enable gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Configure relaxed CORS for tests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test server running"}

# Readiness endpoint with DB ping (uses test DB)
@app.get("/ready")
async def ready(db_conn=Depends(get_db)):
    try:
        await db.command("ping")
        return {"status": "ready"}
    except Exception as e:
        logger.exception("Readiness check failed: %s", e)
        return {"status": "degraded", "error": str(e)}

# Include all routers
app.include_router(user_router, prefix="/api", tags=["users"])
app.include_router(project_router, prefix="/api", tags=["projects"])
app.include_router(file_router, prefix="/api", tags=["files"])
app.include_router(preferences_router, prefix="/api", tags=["preferences"])
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(documentation_router, prefix="/api", tags=["documentation"])
app.include_router(admin_router, prefix="/api", tags=["admin"])
app.include_router(github_auth_router, prefix="/api", tags=["auth"])
app.include_router(github_import_router, prefix="/api", tags=["github"])
app.include_router(github_repo_router, prefix="/api", tags=["github"])