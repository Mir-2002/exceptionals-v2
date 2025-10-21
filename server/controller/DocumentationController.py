from typing import List, Dict, Optional, Set
from fastapi import HTTPException
from model.DocumentationModel import DocumentationPlan, DocstringItem, DocumentationResult, DocumentationGenerationResponse
from utils.hf_client import hf_generate_batch_async
import time
# from utils.doc_templates import render_html, render_markdown, render_pdf  # no rendering here anymore
from bson import ObjectId, Binary
import asyncio
from datetime import datetime
from utils.doc_cleaner import clean_results_docstrings
import os
import httpx

def normalize_path(p: Optional[str]) -> str:
    # Remove leading './', '/', and 'root/' for consistency
    p = (p or "").replace("\\", "/")
    if p.startswith("root/"):
        p = p[len("root/") :]
    return p.lstrip("./").lstrip("/")

def is_file_excluded(file_path: str, exclude_files: List[str], exclude_dirs: List[str]) -> bool:
    npath = normalize_path(file_path)
    files = {normalize_path(f) for f in (exclude_files or [])}
    dirs = [normalize_path(d) for d in (exclude_dirs or [])]
    if npath in files:
        return True
    for d in dirs:
        if npath == d or npath.startswith(d + "/"):
            return True
    return False

def build_per_file_exclusion_map(per_file_exclusion: List[dict]) -> Dict[str, dict]:
    m: Dict[str, dict] = {}
    for e in per_file_exclusion or []:
        fn = normalize_path(e.get("filename", ""))
        if not fn:
            continue
        m[fn] = {
            "exclude_functions": set(e.get("exclude_functions") or []),
            "exclude_classes": set(e.get("exclude_classes") or []),
            "exclude_methods": set(e.get("exclude_methods") or []),
        }
    return m

def apply_preferences_filter(items: List[DocstringItem], preferences: dict) -> tuple[List[DocstringItem], List[str], List[str]]:
    """
    Retained for item-level filtering. File-level inclusion is now computed separately.
    """
    dir_ex = preferences.get("directory_exclusion", {}) or {}
    exclude_files = dir_ex.get("exclude_files", []) or []
    exclude_dirs = dir_ex.get("exclude_dirs", []) or []
    per_file = build_per_file_exclusion_map(preferences.get("per_file_exclusion") or [])

    filtered: List[DocstringItem] = []
    included_files: Set[str] = set()
    excluded_files: Set[str] = set()

    for it in items:
        nfile = normalize_path(it.file)
        if is_file_excluded(nfile, exclude_files, exclude_dirs):
            excluded_files.add(nfile)
            continue

        pf = per_file.get(nfile, {
            "exclude_functions": set(),
            "exclude_classes": set(),
            "exclude_methods": set(),
        })

        drop = False
        if it.type == "function" and it.name in pf["exclude_functions"]:
            drop = True
        elif it.type == "class" and it.name in pf["exclude_classes"]:
            drop = True
        elif it.type == "method":
            if (it.parent_class and it.parent_class in pf["exclude_classes"]) or (it.name in pf["exclude_methods"]):
                drop = True

        if drop:
            continue

        filtered.append(it)
        included_files.add(nfile)

    return filtered, sorted(excluded_files), sorted(included_files)

async def get_project_preferences(db, project_id: str) -> dict:
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        prefs = await db.project_preferences.find_one({"project_id": project_id})
    if not prefs:
        return {
            "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
            "per_file_exclusion": [],
            "format": "HTML",
        }
    return {
        "directory_exclusion": prefs.get("directory_exclusion", {"exclude_files": [], "exclude_dirs": []}),
        "per_file_exclusion": prefs.get("per_file_exclusion", []),
        "format": prefs.get("format") or prefs.get("project_settings", {}).get("format", "HTML"),
    }

async def plan_documentation_generation(project_id: str, db) -> DocumentationPlan:
    """
    Compute:
    - included_files/excluded_files from directory_exclusion over ALL files.
    - total_items from item-level filtering on included files.
    """
    prefs = await get_project_preferences(db, project_id)

    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    if not files:
        raise HTTPException(status_code=404, detail="No files found for this project")

    dir_ex = prefs.get("directory_exclusion", {}) or {}
    exclude_files = dir_ex.get("exclude_files", []) or []
    exclude_dirs = dir_ex.get("exclude_dirs", []) or []

    # 1) Determine included/excluded files purely from directory rules
    included_file_paths: List[str] = []
    excluded_file_paths: List[str] = []
    for f in files:
        filename = normalize_path(f.get("filename") or f.get("path") or "")
        if not filename:
            continue
        if is_file_excluded(filename, exclude_files, exclude_dirs):
            excluded_file_paths.append(filename)
        else:
            included_file_paths.append(filename)

    # 2) Build items only from included files for efficiency
    items: List[DocstringItem] = []
    included_set = set(included_file_paths)
    for f in files:
        filename = normalize_path(f.get("filename") or f.get("path") or "")
        if not filename or filename not in included_set:
            continue

        for func in (f.get("functions") or []):
            items.append(DocstringItem(
                name=func.get("name", ""),
                type="function",
                file=filename,
                code=func.get("code", ""),
            ))

        for cls in (f.get("classes") or []):
            items.append(DocstringItem(
                name=cls.get("name", ""),
                type="class",
                file=filename,
                code=cls.get("code", ""),
            ))
            for method in (cls.get("methods") or []):
                items.append(DocstringItem(
                    name=method.get("name", ""),
                    type="method",
                    file=filename,
                    code=method.get("code", ""),
                    parent_class=cls.get("name", ""),
                ))

    # 3) Apply per-file exclusions to items (does NOT affect included/excluded files)
    filtered_items, _, _ = apply_preferences_filter(items, prefs)

    return DocumentationPlan(
        project_id=project_id,
        format=prefs["format"],
        total_items=len(filtered_items),
        items=filtered_items,
        excluded_files=sorted(set(excluded_file_paths)),
        included_files=sorted(set(included_file_paths)),
    )

def _make_prompt_for_item(it: DocstringItem) -> str:
    """
    Create a concise prompt for the HF model to generate docstrings.
    Keep it short due to MAX_INPUT_LENGTH=256 tokens in your handler.
    """
    header = f"{it.type.upper()}: {it.name}"
    if it.parent_class:
        header += f" (class {it.parent_class})"
    
    # Truncate code if too long to fit within token limit
    code = it.code
    if len(code) > 800:  # Rough character limit to stay under 256 tokens
        code = code[:800] + "..."
    
    return f"""Generate a clear docstring for this {it.type}:

{header}
```python
{code}
```

Docstring:"""

async def generate_documentation_with_hf(project_id: str, db, batch_size: int = 4, parameters: dict = None, created_by: Optional[dict] = None) -> DocumentationGenerationResponse:
    start_time = time.time()

    plan = await plan_documentation_generation(project_id, db)
    items = plan.items or []

    if not items:
        raise HTTPException(status_code=400, detail="No items available to generate documentation.")

    # Fetch project metadata
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    project_name = (project or {}).get("name") or f"Project {project_id}"
    project_description = (project or {}).get("description") or None

    prompts = [_make_prompt_for_item(it) for it in items]
    outputs: List[str] = []

    default_params = {
        "max_length": 128,
        "temperature": 0.7,
        "do_sample": True,
    }
    if parameters:
        default_params.update(parameters)

    # Limit concurrency (configurable) to fully utilize GPU/CPU
    try:
        max_conc = int(os.getenv("HF_MAX_CONCURRENCY", "6"))
    except Exception:
        max_conc = 6
    max_conc = max(1, min(32, max_conc))
    semaphore = asyncio.Semaphore(max_conc)

    async def generate_batch(batch):
        async with semaphore:
            return await hf_generate_batch_async(batch, parameters=default_params)

    # Create batched tasks
    tasks = [
        generate_batch(prompts[i:i + batch_size])
        for i in range(0, len(prompts), batch_size)
    ]

    try:
        all_outputs = await asyncio.gather(*tasks)
        for batch_output in all_outputs:
            outputs.extend(batch_output)
    except httpx.HTTPStatusError as e:
        code = getattr(e, "response", None).status_code if getattr(e, "response", None) is not None else 502
        # Try to extract a meaningful message
        detail = None
        try:
            detail = e.response.json()
        except Exception:
            try:
                detail = e.response.text
            except Exception:
                detail = str(e)
        # Map to explicit model status for the client
        headers = {}
        text = str(detail).lower() if detail is not None else ""
        if code >= 500:
            headers["X-Model-Status"] = "booting"
        elif 400 <= code < 500:
            headers["X-Model-Status"] = "paused"
        raise HTTPException(status_code=code, detail=f"Upstream HF error: {detail}", headers=headers or None)
    except Exception as e:
        # Preserve original error in detail but mark as 502
        raise HTTPException(status_code=502, detail=f"Model generation failed: {str(e)}")

    # Fallback if output count mismatched
    if len(outputs) != len(items):
        fallback_outputs: List[str] = []
        for p in prompts:
            try:
                single = await hf_generate_batch_async([p], parameters=default_params)
                if isinstance(single, list) and len(single) > 0:
                    fallback_outputs.append(str(single[0]).strip())
                else:
                    fallback_outputs.append("")
            except httpx.HTTPStatusError as e:
                # On upstream error during fallback, propagate status to client
                code = getattr(e, "response", None).status_code if getattr(e, "response", None) is not None else 502
                headers = {}
                if code >= 500:
                    headers["X-Model-Status"] = "booting"
                elif 400 <= code < 500:
                    headers["X-Model-Status"] = "paused"
                raise HTTPException(status_code=code, detail="Upstream HF error during fallback generation", headers=headers or None)
            except Exception:
                fallback_outputs.append("")
            await asyncio.sleep(0.1)
        outputs = fallback_outputs

    if len(outputs) != len(items):
        raise HTTPException(
            status_code=502,
            detail=f"Mismatch in generation results: expected {len(items)}, got {len(outputs)}"
        )

    results = []
    for item, generated_text in zip(items, outputs):
        results.append(DocumentationResult(
            name=item.name,
            type=item.type,
            file=item.file,
            parent_class=item.parent_class,
            original_code=item.code,
            generated_docstring=str(generated_text).strip()
        ))

    # Clean docstrings to remove special characters/markup
    results_dicts = [r.dict() for r in results]
    results_dicts = clean_results_docstrings(results_dicts)

    generation_time = time.time() - start_time

    # Save revision first to obtain its id for templates
    fmt = (plan.format or "HTML").upper()

    # Preferences snapshot for auditing/admin display
    prefs_raw = await db.preferences.find_one({"project_id": project_id})
    if not prefs_raw:
        prefs_raw = await db.project_preferences.find_one({"project_id": project_id})
    if prefs_raw and "_id" in prefs_raw:
        prefs_raw = {k: v for k, v in prefs_raw.items() if k != "_id"}
    if not prefs_raw:
        prefs_raw = await get_project_preferences(db, project_id)

    doc_record = {
        "project_id": project_id,
        "format": fmt,
        # Do not persist rendered content/binary; generate on the fly instead
        "content": None,
        "content_type": None,
        "binary": None,
        "results": results_dicts,
        "included_files": plan.included_files,
        "excluded_files": plan.excluded_files,
        "created_at": time.time(),
        "created_at_iso": datetime.utcnow().isoformat() + "Z",
        "preferences_snapshot": prefs_raw,
        "created_by": created_by or None,
        "user_id": (created_by.get("id") if isinstance(created_by, dict) else None),
        # Persist elapsed time for UI counters
        "generation_time_seconds": round(generation_time, 2),
    }
    inserted = await db.documentations.insert_one(doc_record)
    revision_id = str(inserted.inserted_id)

    # Rendering is deferred to retrieval/download time to save storage.

    # Mark project as completed once a documentation is generated
    try:
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
        )
    except Exception:
        pass

    return DocumentationGenerationResponse(
        project_id=project_id,
        format=plan.format,
        total_items=len(items),
        included_files=plan.included_files,
        excluded_files=plan.excluded_files,
        results=[DocumentationResult(**r) for r in results_dicts],
        generation_time_seconds=round(generation_time, 2)
    )