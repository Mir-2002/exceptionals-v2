from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
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
import logging
import os
from utils.db import get_db, db
from uuid import uuid4
import time
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("server")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await db.documentations.create_index(
            [("project_id", 1), ("created_at", -1)], name="doc_project_created"
        )
        await db.files.create_index(
            [("project_id", 1), ("filename", 1)], name="file_project_filename"
        )
        await db.projects.create_index(
            [("user_id", 1), ("updated_at", -1)], name="proj_user_updated"
        )
        logging.getLogger("db").info("MongoDB indexes ensured")
    except Exception as e:
        logging.getLogger("db").exception("Failed to ensure MongoDB indexes: %s", e)
    yield
    # (Optional) Add shutdown logic here

app = FastAPI(
    title="Exceptionals",
    description="Backend API for Exceptionals",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable gzip compression (reverse proxy should also compress)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Request ID + access logging middleware
@app.middleware("http")
async def request_id_logger(request, call_next):
    rid = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = rid
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error for %s %s rid=%s", request.method, request.url.path, rid)
        raise
    duration_ms = int((time.time() - start) * 1000)
    response.headers["X-Request-ID"] = rid
    logger.info("%s %s -> %s %dms rid=%s", request.method, request.url.path, getattr(response, 'status_code', 'n/a'), duration_ms, rid)
    return response

# Configure CORS from environment
origins_env = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ALLOWED_ORIGINS")
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Dev defaults only; override in production with ALLOWED_ORIGINS
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the Exceptionals API!"}

# Basic health endpoint
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# Readiness endpoint with DB ping
@app.get("/ready")
async def ready(db_conn=Depends(get_db)):
    try:
        # motor database has an async command helper
        await db.command("ping")
        return {"status": "ready"}
    except Exception as e:
        logger.exception("Readiness check failed: %s", e)
        return {"status": "degraded", "error": str(e)}

@app.get("/public/test-zip", include_in_schema=True)
async def download_test_zip_root():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "extras", "test-zip.zip")
    if not os.path.exists(file_path):
        alt_path = os.path.join(os.path.dirname(base_dir), "server", "extras", "test-zip.zip")
        if os.path.exists(alt_path):
            file_path = alt_path
        else:
            return {"detail": "test-zip not found"}
    return FileResponse(path=file_path, filename="test-zip.zip", media_type="application/zip")

@app.get("/api/public/test-zip", include_in_schema=False)
async def download_test_zip_api_alias():
    return await download_test_zip_root()

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
