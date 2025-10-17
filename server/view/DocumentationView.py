from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from controller.DocumentationController import plan_documentation_generation
from model.DocumentationModel import DocumentationPlan
from controller.AuthController import get_current_user
from utils.db import get_db
from utils.project_verification import get_and_check_project_ownership

router = APIRouter(prefix="/documentation", tags=["documentation"])

@router.get("/projects/{project_id}/plan", response_model=DocumentationPlan)
async def get_documentation_plan(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    plan = await plan_documentation_generation(project_id, db)
    # Disable caching so client always gets fresh counts
    return JSONResponse(
        content=plan.model_dump(),
        headers={
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )