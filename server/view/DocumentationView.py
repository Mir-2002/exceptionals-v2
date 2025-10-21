from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import JSONResponse, Response
from controller.DocumentationController import plan_documentation_generation, generate_documentation_with_hf
from model.DocumentationModel import DocumentationPlan, DocumentationGenerationResponse
from controller.AuthController import get_current_user
from utils.db import get_db
from utils.project_verification import get_and_check_project_ownership
import logging
from bson import ObjectId
from utils.doc_templates import render_html, render_markdown, render_pdf
import os

logger = logging.getLogger("documentation")

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

@router.post("/projects/{project_id}/generate", response_model=DocumentationGenerationResponse)
async def generate_documentation(
    project_id: str,
    batch_size: int = 4,
    opts: dict = Body(default={}),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Generate documentation using HF endpoint for all items in the project."""
    await get_and_check_project_ownership(project_id, db, current_user)
    logger.info(f"[GEN] Starting generation for project={project_id}, batch_size={batch_size}")
    try:
      created_by = {
        "id": str(getattr(current_user, 'id', '')),
        "username": getattr(current_user, 'username', None),
        "email": getattr(current_user, 'email', None),
        "is_admin": bool(getattr(current_user, 'is_admin', False)),
      }
      params = None
      if isinstance(opts, dict):
        gp = opts.get("generate_parameters") or opts.get("parameters") or None
        if isinstance(gp, dict):
          # Map into HF parameters; include both direct keys and nested for compatibility
          params = {k: v for k, v in gp.items() if v is not None}
          params["generate_parameters"] = {k: v for k, v in gp.items() if v is not None}
          # Optional HF flags
          if "clean_up_tokenization_spaces" in opts:
            params["clean_up_tokenization_spaces"] = bool(opts.get("clean_up_tokenization_spaces"))

      # Allow server to pick an effective batch size when client doesn't specify
      try:
        env_bs = int(os.getenv("HF_BATCH_SIZE", "8"))
      except Exception:
        env_bs = 8
      eff_bs = batch_size or env_bs
      eff_bs = max(1, min(64, eff_bs))

      resp = await generate_documentation_with_hf(project_id, db, batch_size=eff_bs, parameters=params, created_by=created_by)
      logger.info(f"[GEN] Completed generation for project={project_id}, items={len(resp.results)}")
      return resp
    except Exception as e:
      logger.exception(f"[GEN] Generation failed for project={project_id}: {e}")
      raise

@router.get("/projects/{project_id}/revisions")
async def list_revisions(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    docs = await db.documentations.find({"project_id": project_id}).sort("created_at", -1).to_list(length=None)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        # include elapsed time if present
        if "generation_time_seconds" in d:
            d["generation_time_seconds"] = d.get("generation_time_seconds")
        # do not send binary content in the list
        d.pop("binary", None)
        # trim content in list view
        if isinstance(d.get("content"), str) and len(d["content"]) > 500:
            d["content"] = d["content"][:500] + "..."
    return {"project_id": project_id, "revisions": docs}

@router.get("/projects/{project_id}/revisions/{revision_id}")
async def get_revision(project_id: str, revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    doc = await db.documentations.find_one({"_id": ObjectId(revision_id), "project_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Revision not found")
    doc["id"] = str(doc.pop("_id"))
    fmt = (doc.get("format") or "HTML").upper()

    # pass through elapsed time if stored
    if "generation_time_seconds" in doc:
        doc["generation_time_seconds"] = doc.get("generation_time_seconds")

    # Determine title/description to use
    title_override = doc.get("title") or doc.get("project_name")
    desc_override = doc.get("description") or (doc.get("preferences_snapshot") or {}).get("project_description")

    # Generate content on the fly for preview (non-PDF)
    if fmt == "PDF":
        doc.pop("binary", None)
        doc["download_url"] = f"/api/documentation/projects/{project_id}/revisions/{revision_id}/download"
    elif fmt == "MARKDOWN":
        content = render_markdown(project_id, doc.get("results") or [], project_name=title_override, project_description=desc_override, revision_id=revision_id)
        doc["content"] = content
        doc["content_type"] = "text/markdown"
    else:
        html = render_html(project_id, doc.get("results") or [], project_name=title_override, project_description=desc_override, revision_id=revision_id)
        doc["content"] = html
        doc["content_type"] = "text/html"
    return doc

@router.patch("/projects/{project_id}/revisions/{revision_id}")
async def update_revision_metadata(project_id: str, revision_id: str, payload: dict = Body(default={}), db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    allowed = {"title", "filename", "description"}
    update = {k: v for k, v in (payload or {}).items() if k in allowed and isinstance(v, str)}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    res = await db.documentations.update_one({"_id": ObjectId(revision_id), "project_id": project_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Revision not found")
    return {"updated": True, "fields": list(update.keys())}

@router.get("/projects/{project_id}/revisions/{revision_id}/download")
async def download_revision(project_id: str, revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    doc = await db.documentations.find_one({"_id": ObjectId(revision_id), "project_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Revision not found")
    fmt = (doc.get("format") or "HTML").upper()
    default_name = f"documentation_{project_id}_{revision_id}.{ 'pdf' if fmt == 'PDF' else ('md' if fmt == 'MARKDOWN' else 'html') }"
    filename = doc.get("filename") or default_name

    # Determine title/description
    title_override = (doc.get("title") or doc.get("project_name"))
    desc_override = doc.get("description") or (doc.get("preferences_snapshot") or {}).get("project_description")

    if fmt == "PDF":
        pdf_bytes = render_pdf(project_id, doc.get("results") or [], project_name=title_override, project_description=desc_override, revision_id=revision_id)
        return Response(content=pdf_bytes or b"", media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    elif fmt == "MARKDOWN":
        content = render_markdown(project_id, doc.get("results") or [], project_name=title_override, project_description=desc_override, revision_id=revision_id)
        return Response(content=content or "", media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={filename}"})
    else:
        html = render_html(project_id, doc.get("results") or [], project_name=title_override, project_description=desc_override, revision_id=revision_id)
        return Response(content=html or "", media_type="text/html", headers={"Content-Disposition": f"attachment; filename={filename}"})