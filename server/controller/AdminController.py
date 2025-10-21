from fastapi import HTTPException
from bson import ObjectId
from utils.db import get_db
from utils.auth import hash_password

# Helper: ensure current_user is admin; if no admins exist, bootstrap by promoting current user
async def _ensure_admin_or_bootstrap(db, current_user):
    if getattr(current_user, "is_admin", False):
        return
    # If no admin exists, promote current user (bootstrap first admin)
    admin_exists = await db.users.count_documents({"is_admin": True}) > 0
    if not admin_exists and getattr(current_user, "id", None):
        await db.users.update_one({"_id": ObjectId(str(current_user.id))}, {"$set": {"is_admin": True}})
        current_user.is_admin = True
        return
    raise HTTPException(status_code=403, detail="Admin only")

# Users
async def list_users(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    users = await db.users.find({}).to_list(length=None)
    for u in users:
        u["id"] = str(u.pop("_id"))
        u.pop("hashed_password", None)
    return users

async def admin_update_user(user_id: str, payload: dict, db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    oid = ObjectId(user_id)
    allowed = {k: v for k, v in payload.items() if k in {"username", "email", "is_admin", "password"}}
    if "password" in allowed:
        allowed["hashed_password"] = hash_password(allowed.pop("password"))
    if not allowed:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    res = await db.users.update_one({"_id": oid}, {"$set": allowed})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": oid})
    user["id"] = str(user.pop("_id"))
    user.pop("hashed_password", None)
    return user

async def admin_delete_user(user_id: str, db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    oid = ObjectId(user_id)
    res = await db.users.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User deleted"}

# Projects
async def list_projects(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    projects = await db.projects.find({}).to_list(length=None)
    for p in projects:
        p["id"] = str(p.pop("_id"))
    return projects

async def admin_delete_project(project_id: str, db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    oid = ObjectId(project_id)
    await db.files.delete_many({"project_id": project_id})
    res = await db.projects.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"detail": "Project and files deleted"}

# Files
async def list_files(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    files = await db.files.find({}).to_list(length=None)
    projects = await db.projects.find({}, {"_id": 1, "name": 1}).to_list(length=None)
    project_map = {str(p["_id"]): p.get("name", "") for p in projects}
    for f in files:
        f["id"] = str(f.pop("_id"))
        f["project_name"] = project_map.get(f.get("project_id"), None)
    return files

async def cleanup_orphaned_files(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    project_ids = set(str(p["_id"]) for p in await db.projects.find({}, {"_id": 1}).to_list(length=None))
    orphans = await db.files.find({}).to_list(length=None)
    orphan_ids = [f["_id"] for f in orphans if f.get("project_id") not in project_ids]
    if orphan_ids:
        await db.files.delete_many({"_id": {"$in": orphan_ids}})
    return {"detail": f"Removed {len(orphan_ids)} orphaned files"}

async def cleanup_orphaned_projects(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    # Build valid user id set
    user_ids = set(str(u["_id"]) for u in await db.users.find({}, {"_id": 1}).to_list(length=None))
    # Find projects with missing owner
    projects = await db.projects.find({}, {"_id": 1, "user_id": 1}).to_list(length=None)
    orphan_project_ids = [str(p["_id"]) for p in projects if p.get("user_id") not in user_ids]
    deleted_projects = 0
    deleted_files = 0
    deleted_docs = 0
    if orphan_project_ids:
        # Delete files of those projects
        res_files = await db.files.delete_many({"project_id": {"$in": orphan_project_ids}})
        deleted_files = res_files.deleted_count or 0
        # Delete docs of those projects
        res_docs = await db.documentations.delete_many({"project_id": {"$in": orphan_project_ids}})
        deleted_docs = res_docs.deleted_count or 0
        # Delete projects
        res_proj = await db.projects.delete_many({"_id": {"$in": [ObjectId(pid) for pid in orphan_project_ids]}})
        deleted_projects = res_proj.deleted_count or 0
    return {
        "detail": f"Removed {deleted_projects} orphaned projects, {deleted_files} files, {deleted_docs} docs"
    }

async def cleanup_orphaned_documentations(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    project_ids = set(str(p["_id"]) for p in await db.projects.find({}, {"_id": 1}).to_list(length=None))
    docs = await db.documentations.find({}, {"_id": 1, "project_id": 1}).to_list(length=None)
    orphan_doc_ids = [d["_id"] for d in docs if d.get("project_id") not in project_ids]
    deleted_docs = 0
    if orphan_doc_ids:
        res = await db.documentations.delete_many({"_id": {"$in": orphan_doc_ids}})
        deleted_docs = res.deleted_count or 0
    return {"detail": f"Removed {deleted_docs} orphaned documentation revisions"}

# Documentations
async def list_documentations(db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    docs = await db.documentations.find({}).sort("created_at", -1).to_list(length=None)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("binary", None)
    return docs

async def admin_get_documentation(revision_id: str, db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    oid = ObjectId(revision_id)
    doc = await db.documentations.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation revision not found")
    doc["id"] = str(doc.pop("_id"))
    # Avoid sending binary in JSON
    if "binary" in doc:
        doc.pop("binary", None)
    return doc

async def admin_delete_documentation(revision_id: str, db, current_user):
    await _ensure_admin_or_bootstrap(db, current_user)
    oid = ObjectId(revision_id)
    res = await db.documentations.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documentation revision not found")
    return {"detail": "Documentation revision deleted"}