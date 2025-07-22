from typing import List
import uuid
import httpx
import asyncio
from datetime import datetime
from fastapi import HTTPException
from model.DocumentationModel import DocstringInfo, Documentation, DocumentationResponse, DocumentationRevisionListResponse, SingleDocstringRequest, SingleDocstringResponse
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

HUGGINGFACE_ENDPOINT = os.getenv("HF_ENDPOINT")
HUGGINGFACE_TOKEN = os.getenv("HF_TOKEN")

async def call_hf_with_retry(payload, max_retries=10, delay=5):
    headers = {"Authorization": f"Bearer {HUGGINGFACE_TOKEN}"}
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(
                    HUGGINGFACE_ENDPOINT,
                    json=payload,
                    headers=headers
                )
                if response.status_code in (502, 503):
                    await asyncio.sleep(delay)
                    continue
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (502, 503) and attempt < max_retries - 1:
                    await asyncio.sleep(delay)
                    continue
                raise
    raise HTTPException(status_code=503, detail="HuggingFace endpoint unavailable after retries.")

async def generate_docstring(request: SingleDocstringRequest) -> SingleDocstringResponse:
    payload = {"inputs": request.code}
    try:
        result = await call_hf_with_retry(payload)
        # If result is a list, get the first item
        if isinstance(result, list) and result:
            docstring = result[0].get("docstring") or result[0].get("generated_text")
        else:
            docstring = result.get("docstring") if isinstance(result, dict) else None
        return SingleDocstringResponse(
            docstring=docstring,
            status="completed" if docstring else "failed",
            error=None if docstring else "No docstring generated"
        )
    except Exception as e:
        return SingleDocstringResponse(
            docstring=None,
            status="failed",
            error=str(e)
        )

async def generate_docstrings_for_project(project_id: str, db):
    # 1. Gather all processed functions/classes/methods
    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    items = []
    for file in files:
        filename = file["filename"]
        for func in file.get("processed_functions", []):
            items.append(DocstringInfo(
                name=func["name"],
                type="function",
                file=filename,
                code=func["code"],
            ))
        for cls in file.get("processed_classes", []):
            items.append(DocstringInfo(
                name=cls["name"],
                type="class",
                file=filename,
                code=cls["code"],
            ))
            for method in cls.get("methods", []):
                items.append(DocstringInfo(
                    name=method["name"],
                    type="method",
                    file=filename,
                    code=method["code"],
                ))

    documented = []
    failed = []

    # 2. Send each item to HuggingFace endpoint
    for item in items:
        payload = {"inputs": item.code}
        try:
            result = await call_hf_with_retry(payload)
            if isinstance(result, list) and result:
                docstring = result[0].get("docstring") or result[0].get("generated_text")
            else:
                docstring = result.get("docstring") if isinstance(result, dict) else None
            item.docstring = docstring
            item.status = "completed"
            item.generated_at = datetime.utcnow()
            documented.append(item)
        except Exception as e:
            item.status = "failed"
            item.error = str(e)
            failed.append(item)

    return DocumentationResponse(
        project_id=str(project_id),
        documented=documented,
        failed=failed if failed else None
    )

async def save_documentation_revision(
    project_id: str,
    format: str,
    content: str,
    documented: List[DocstringInfo],
    db,
    created_by: str = None,
    notes: str = None
):
    revision_id = str(uuid.uuid4())
    doc = Documentation(
        project_id=project_id,
        revision_id=revision_id,
        format=format,
        content=content,
        documented=documented,
        created_by=created_by,
        created_at=datetime.utcnow(),
        notes=notes
    )
    await db.documentation_revisions.insert_one(doc.model_dump())
    return doc

async def list_documentation_revisions(project_id: str, db):
    cursor = db.documentation_revisions.find({"project_id": project_id}).sort("created_at", -1)
    revisions = [Documentation(**doc) async for doc in cursor]
    return DocumentationRevisionListResponse(project_id=project_id, revisions=revisions)

async def get_documentation_revision(project_id: str, revision_id: str, db):
    doc = await db.documentation_revisions.find_one({"project_id": project_id, "revision_id": revision_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Revision not found")
    return Documentation(**doc)