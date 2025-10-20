from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import JSONResponse, Response
from controller.DocumentationController import plan_documentation_generation, generate_documentation_with_hf
from model.DocumentationModel import DocumentationPlan, DocumentationGenerationResponse, SingleDocstringRequest, SingleDocstringResponse, DemoBatchRequest, DemoBatchResponse, DemoGeneratedItem
from controller.AuthController import get_current_user
from utils.db import get_db
from utils.project_verification import get_and_check_project_ownership
import logging
from utils.hf_client import hf_generate_batch_async
from utils.parser import extract_functions_classes_from_content
from bson import ObjectId
from utils.doc_templates import render_html, render_markdown, render_pdf

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
      resp = await generate_documentation_with_hf(project_id, db, batch_size=batch_size, parameters=params, created_by=created_by)
      logger.info(f"[GEN] Completed generation for project={project_id}, items={len(resp.results)}")
      return resp
    except Exception as e:
      logger.exception(f"[GEN] Generation failed for project={project_id}: {e}")
      raise

@router.post("/demo", response_model=SingleDocstringResponse)
async def demo_generate_single(req: SingleDocstringRequest) -> SingleDocstringResponse:
    """
    Public demo/test endpoint: generate a single docstring from raw code.
    Bypasses preferences and project ownership.
    """
    logger.info("[DEMO] Demo generation request received")
    if not req.code or not req.code.strip():
        return SingleDocstringResponse(status="failed", error="Code is required")
    try:
        prompt = f"Generate a clear docstring for this {req.type or 'function'} (if applicable).\n\n```python\n{req.code}\n```\n\nDocstring:"
        outputs = await hf_generate_batch_async([prompt], parameters={
            "max_length": 128,
            "temperature": 0.7,
            "do_sample": True,
        })
        doc = (outputs[0] if outputs else "").strip()
        logger.info("[DEMO] Demo generation succeeded")
        return SingleDocstringResponse(docstring=doc, status="completed")
    except Exception as e:
        logger.exception(f"[DEMO] Demo generation failed: {e}")
        return SingleDocstringResponse(status="failed", error=str(e))

@router.post("/demo/batch", response_model=DemoBatchResponse)
async def demo_generate_batch(req: DemoBatchRequest) -> DemoBatchResponse:
    """
    Public demo/test endpoint: split provided code into functions/classes/methods and generate docstrings for each.
    This bypasses project preferences and storage; intended for debugging HF endpoint.
    """
    logger.info("[DEMO-BATCH] Batch demo request received")
    if not req.code or not req.code.strip():
        return DemoBatchResponse(total_items=0, results=[])
    try:
        parsed = extract_functions_classes_from_content(req.code)
        items = []
        for f in parsed.get("functions", []) or []:
            items.append(("function", f["name"], f["code"], None))
        for c in parsed.get("classes", []) or []:
            items.append(("class", c["name"], c["code"], None))
            for m in c.get("methods", []) or []:
                items.append(("method", m["name"], m["code"], c["name"]))
        logger.info(f"[DEMO-BATCH] Parsed {len(items)} items from code")
        if not items:
            return DemoBatchResponse(total_items=0, results=[])
        prompts = []
        for t, name, code, parent in items:
            header = f"{t.upper()}: {name}"
            if parent:
                header += f" (class {parent})"
            prompts.append(
                f"Generate a clear docstring for this {t}:\n\n{header}\n```python\n{code}\n```\n\nDocstring:"
            )
        outputs = await hf_generate_batch_async(prompts, parameters={
            "max_length": 128,
            "temperature": 0.7,
            "do_sample": True,
        })
        results: list[DemoGeneratedItem] = []
        for (t, name, code, parent), out in zip(items, outputs):
            results.append(DemoGeneratedItem(
                name=name,
                type=t,
                file=req.filename,
                parent_class=parent,
                original_code=code,
                generated_docstring=str(out).strip(),
            ))
        logger.info(f"[DEMO-BATCH] Demo generation succeeded for {len(results)} items")
        return DemoBatchResponse(total_items=len(results), results=results)
    except Exception as e:
        logger.exception(f"[DEMO-BATCH] Demo generation failed: {e}")
        return DemoBatchResponse(total_items=0, results=[])

@router.get("/projects/{project_id}/revisions")
async def list_revisions(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    docs = await db.documentations.find({"project_id": project_id}).sort("created_at", -1).to_list(length=None)
    for d in docs:
        d["id"] = str(d.pop("_id"))
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

    # Generate content on the fly for preview (non-PDF)
    if fmt == "PDF":
        doc.pop("binary", None)
        doc["download_url"] = f"/api/documentation/projects/{project_id}/revisions/{revision_id}/download"
    elif fmt == "MARKDOWN":
        # Render markdown text (no binary)
        content = render_markdown(project_id, doc.get("results") or [], project_name=doc.get("project_name"), project_description=(doc.get("preferences_snapshot") or {}).get("project_description"), revision_id=revision_id)
        doc["content"] = content
        doc["content_type"] = "text/markdown"
    else:
        html = render_html(project_id, doc.get("results") or [], project_name=doc.get("project_name"), project_description=(doc.get("preferences_snapshot") or {}).get("project_description"), revision_id=revision_id)
        doc["content"] = html
        doc["content_type"] = "text/html"
    return doc

@router.get("/projects/{project_id}/revisions/{revision_id}/download")
async def download_revision(project_id: str, revision_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await get_and_check_project_ownership(project_id, db, current_user)
    doc = await db.documentations.find_one({"_id": ObjectId(revision_id), "project_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Revision not found")
    fmt = (doc.get("format") or "HTML").upper()
    filename = f"documentation_{project_id}_{revision_id}.{ 'pdf' if fmt == 'PDF' else ('md' if fmt == 'MARKDOWN' else 'html') }"

    if fmt == "PDF":
        pdf_bytes = render_pdf(project_id, doc.get("results") or [], project_name=doc.get("project_name"), project_description=(doc.get("preferences_snapshot") or {}).get("project_description"), revision_id=revision_id)
        return Response(content=pdf_bytes or b"", media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    elif fmt == "MARKDOWN":
        content = render_markdown(project_id, doc.get("results") or [], project_name=doc.get("project_name"), project_description=(doc.get("preferences_snapshot") or {}).get("project_description"), revision_id=revision_id)
        return Response(content=content or "", media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={filename}"})
    else:
        html = render_html(project_id, doc.get("results") or [], project_name=doc.get("project_name"), project_description=(doc.get("preferences_snapshot") or {}).get("project_description"), revision_id=revision_id)
        return Response(content=html or "", media_type="text/html", headers={"Content-Disposition": f"attachment; filename={filename}"})