from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from view.UserView import router as user_router
from view.ProjectView import router as project_router
from view.FileView import router as file_router
from view.PreferencesView import router as preferences_router
from view.AuthView import router as auth_router
from view.DocumentationView import router as documentation_router

app = FastAPI(
    title="Exceptionals",
    description="Backend API for Exceptionals",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the Exceptionals API!"}

app.include_router(user_router, prefix="/api", tags=["users"])
app.include_router(project_router, prefix="/api", tags=["projects"])
app.include_router(file_router, prefix="/api", tags=["files"])
app.include_router(preferences_router, prefix="/api", tags=["preferences"])
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(documentation_router, prefix="/api", tags=["documentation"])
