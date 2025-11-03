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
# New imports for demo endpoint
from utils.hf_client import hf_generate_batch_async
from utils.doc_cleaner import clean_docstring
from utils.parser import extract_functions_classes_from_content
import asyncio
import httpx

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

# ---------- Model warmup endpoint (non-blocking) ----------
@router.post("/warmup")
async def warmup_model():
    """Kick off a background request to HF endpoint to pre-boot the model.
    Returns immediately; ignores errors (boot unavailability, capacity, etc.).
    """
    async def _do_warmup():
        prompts = [
            "Warmup ping: generate a short placeholder docstring.",
        ]
        params = {
            "max_length": 32,
            "do_sample": False,
            "temperature": 0.1,
            "clean_up_tokenization_spaces": True,
        }
        try:
            await hf_generate_batch_async(prompts, parameters=params)
        except Exception:
            # Ignore all errors; the purpose is to trigger boot if possible
            logger.info("Warmup attempted (may have failed due to capacity/boot)")

    try:
        asyncio.create_task(_do_warmup())
    except Exception:
        # Fallback: just ignore if scheduling fails
        pass
    return {"status": "scheduled"}

# ---------- Public demo endpoint for single/multi-snippet generation ----------
@router.post("/demo/generate")
async def generate_demo_docstring(payload: dict = Body(default={})):
    code = (payload or {}).get("code")
    if not isinstance(code, str) or not code.strip():
        raise HTTPException(status_code=400, detail="'code' is required")

    # Extract functions/classes/methods from pasted code
    try:
        parsed = extract_functions_classes_from_content(code)
    except Exception as e:
        logger.warning(f"[DEMO] Parser failed, falling back to raw code: {e}")
        parsed = {"functions": [], "classes": []}

    items = []
    # Functions
    for f in (parsed.get("functions") or []):
        items.append({
            "name": f.get("name", "function"),
            "type": "function",
            "file": "<input>",
            "code": f.get("code", ""),
            "parent_class": None,
        })
    # Classes and methods
    for c in (parsed.get("classes") or []):
        items.append({
            "name": c.get("name", "class"),
            "type": "class",
            "file": "<input>",
            "code": c.get("code", ""),
            "parent_class": None,
        })
        for m in (c.get("methods") or []):
            items.append({
                "name": m.get("name", "method"),
                "type": "method",
                "file": "<input>",
                "code": m.get("code", ""),
                "parent_class": c.get("name", None),
            })

    # Fallback: if nothing extracted, treat entire input as one function snippet
    if not items:
        items = [{
            "name": "snippet",
            "type": "function",
            "file": "<input>",
            "code": code,
            "parent_class": None,
        }]

    def make_prompt(it: dict) -> str:
        header = f"{it['type'].upper()}: {it['name']}"
        if it.get("parent_class"):
            header += f" (class {it['parent_class']})"
        src = it.get("code") or ""
        if len(src) > 800:
            src = src[:800] + "..."
        return f"""Generate a clear docstring for this {it['type']}:

{header}
```python
{src}
```

Docstring:"""

    prompts = [make_prompt(it) for it in items]

    params = {
        "max_length": 128,
        "temperature": 0.7,
        "do_sample": True,
        "clean_up_tokenization_spaces": True,
    }

    # Try batch generation with graceful retries
    attempts = 0
    outputs = None
    last_exc: Exception | None = None
    while attempts < 3:
        try:
            outputs = await hf_generate_batch_async(prompts, parameters=params)
            break
        except httpx.HTTPStatusError as e:
            last_exc = e
            # Respect upstream status to drive client UX
            code_status = getattr(e, "response", None).status_code if getattr(e, "response", None) is not None else 0
            headers = {}
            if code_status >= 500:
                headers["X-Model-Status"] = "booting"
            elif code_status >= 400:
                headers["X-Model-Status"] = "paused"
            # Backoff before retry
            attempts += 1
            if attempts >= 3:
                raise HTTPException(status_code=code_status or 502, detail="Upstream HF error (demo)", headers=headers or None)
            await asyncio.sleep(2 * attempts)
        except Exception as e:
            last_exc = e
            attempts += 1
            if attempts >= 3:
                raise HTTPException(status_code=502, detail=f"Demo generation failed: {str(e)}")
            await asyncio.sleep(1.5 * attempts)

    # If mismatch, fallback per-item
    if outputs is None:
        outputs = []
    if len(outputs) != len(prompts):
        fixed = [None] * len(prompts)
        for idx, p in enumerate(prompts):
            try:
                single = await hf_generate_batch_async([p], parameters=params)
                fixed[idx] = (single[0] if isinstance(single, list) and single else "")
            except httpx.HTTPStatusError as e:
                # Map headers but continue to fill empty string
                pass
            except Exception:
                pass
            await asyncio.sleep(0.05)
        outputs = [o if o is not None else "" for o in fixed]

    # Build cleaned results
    results = []
    func_count = 0
    class_count = 0
    method_count = 0
    for it in items:
        if it["type"] == "function":
            func_count += 1
        elif it["type"] == "class":
            class_count += 1
        elif it["type"] == "method":
            method_count += 1

    for it, raw in zip(items, outputs):
        raw_s = (raw or "").strip()
        cleaned = (clean_docstring(raw_s) or "").strip()
        if not cleaned and raw_s:
            cleaned = raw_s  # fallback to raw if cleaning removed everything
        results.append({
            "name": it["name"],
            "type": it["type"],
            "parent_class": it.get("parent_class"),
            "file": it.get("file"),
            "code": it.get("code"),
            "docstring": cleaned,
            "docstring_raw": raw_s,
        })

    return {
        "count": len(results),
        "results": results,
        "extraction": {"functions": func_count, "classes": class_count, "methods": method_count},
    }