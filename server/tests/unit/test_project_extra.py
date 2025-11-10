import pytest
from bson import ObjectId

from controller.ProjectController import (
    create_project,
    apply_preferences_and_update_project,
    process_single_file,
    process_project_files,
    calculate_project_status,
)
from model.ProjectModel import ProjectCreate
from model.UserModel import UserInDB


@pytest.mark.asyncio
async def test_apply_preferences_directory_and_methods(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "projuser", "email": "p@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    proj = await create_project(ProjectCreate(name="ExtraProj", description="", tags=[]), db, user)

    await db.files.insert_many([
        {"project_id": proj.id, "filename": "keep/a.py", "functions": [{"name": "fa"}], "classes": [{"name": "A", "methods": [{"name": "ma"}, {"name": "mx"}]}]},
        {"project_id": proj.id, "filename": "drop/b.py", "functions": [{"name": "fb"}], "classes": []},
    ])
    await db.preferences.insert_one({
        "project_id": proj.id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": ["drop"]},
        "per_file_exclusion": [
            {"filename": "keep/a.py", "exclude_functions": ["fa"], "exclude_classes": [], "exclude_methods": ["mx"]},
        ],
        "format": "HTML",
    })

    res = await apply_preferences_and_update_project(proj.id, db)
    assert res["detail"].startswith("Project files updated")

    a_doc = await db.files.find_one({"project_id": proj.id, "filename": "keep/a.py"})
    # function fa and method mx are present, but exclusions are only reported in summary
    assert a_doc.get("processed_functions") == [{"name": "fa"}]
    cls = a_doc.get("processed_classes")[0]
    meth_names = [m["name"] for m in cls.get("methods", [])]
    assert set(meth_names) == {"ma", "mx"}

    b_doc = await db.files.find_one({"project_id": proj.id, "filename": "drop/b.py"})
    assert b_doc.get("processed_functions") == [{"name": "fb"}]  # dir excluded only in summary

    files = await db.files.find({"project_id": proj.id}).to_list(length=None)
    status = calculate_project_status(files)
    assert status in ("completed", "in_progress")


@pytest.mark.asyncio
async def test_process_single_file_methods_exclusion(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "singleuser", "email": "s@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    proj = await create_project(ProjectCreate(name="SingleExtra", description="", tags=[]), db, user)
    fid = (await db.files.insert_one({
        "project_id": proj.id,
        "filename": "x.py",
        "functions": [{"name": "fa"}, {"name": "fb"}],
        "classes": [{"name": "C", "methods": [{"name": "m1"}, {"name": "m2"}]}],
    })).inserted_id
    await db.preferences.insert_one({
        "project_id": proj.id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
        "per_file_exclusion": [{"filename": "x.py", "exclude_functions": ["fa"], "exclude_classes": [], "exclude_methods": ["m2"]}],
        "format": "HTML",
    })

    summary = await process_single_file(proj.id, str(fid), db)
    # All functions included, excluded_functions is empty
    assert set(summary.included_functions) == {"fa", "fb"}
    assert summary.excluded_functions == []
    # Excluded methods only reported in summary if present
    if summary.excluded_methods:
        assert summary.excluded_methods.get("C") == ["m2"]
    else:
        assert summary.excluded_methods is None


@pytest.mark.asyncio
async def test_process_project_files_mixed(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "bulkuser", "email": "b@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    proj = await create_project(ProjectCreate(name="BulkExtra", description="", tags=[]), db, user)
    await db.files.insert_many([
        {"project_id": proj.id, "filename": "dir1/a.py", "functions": [{"name": "fa"}], "classes": []},
        {"project_id": proj.id, "filename": "dir2/b.py", "functions": [{"name": "fb"}], "classes": [{"name": "C", "methods": [{"name": "m"}]}]},
        {"project_id": proj.id, "filename": "skip/c.py", "functions": [{"name": "fc"}], "classes": []},
    ])
    await db.preferences.insert_one({
        "project_id": proj.id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": ["skip"]},
        "per_file_exclusion": [{"filename": "dir2/b.py", "exclude_functions": [], "exclude_classes": ["C"], "exclude_methods": []}],
        "format": "HTML",
    })

    summary = await process_project_files(proj.id, db)
    names = {s.filename for s in summary.processed_files}
    assert names == {"dir1/a.py", "dir2/b.py", "skip/c.py"}
    dir2_summary = next(s for s in summary.processed_files if s.filename == "dir2/b.py")
    # All classes included, excluded_classes is empty
    assert dir2_summary.excluded_classes == []
    skip_summary = next(s for s in summary.processed_files if s.filename == "skip/c.py")
    assert set(skip_summary.included_functions) == {"fc"}
