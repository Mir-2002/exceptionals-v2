import pytest
from bson import ObjectId

from controller.ProjectController import apply_preferences_and_update_project, process_single_file, process_project_files, calculate_project_status
from model.UserModel import UserInDB
from model.ProjectModel import ProjectCreate
from controller.ProjectController import create_project

@pytest.mark.asyncio
async def test_apply_preferences_exclusions(db):
    # Setup user & project
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "owner", "email": "o@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="PrefProj", description="", tags=[]), db, user)

    # Insert files with functions/classes/methods
    await db.files.insert_many([
        {"project_id": project.id, "filename": "a.py", "functions": [{"name": "fa"}], "classes": [{"name": "CA", "methods": [{"name": "ma"}, {"name": "mb"}]}]},
        {"project_id": project.id, "filename": "dir/b.py", "functions": [{"name": "fb"}], "classes": [{"name": "CB", "methods": [{"name": "mb1"}, {"name": "mb2"}]}]},
    ])

    # Create preferences with exclusions on directory and per-file
    await db.preferences.insert_one({
        "project_id": project.id,
        "directory_exclusion": {"exclude_dirs": ["dir"], "exclude_files": []},
        "per_file_exclusion": [
            {"filename": "a.py", "exclude_functions": ["fa"], "exclude_classes": ["CA"], "exclude_methods": []},
        ],
        "format": "HTML"
    })

    result = await apply_preferences_and_update_project(project.id, db)
    assert result["detail"].startswith("Project files updated")

    # Validate processed data for a.py (should still contain 'fa' and 'CA')
    a_doc = await db.files.find_one({"project_id": project.id, "filename": "a.py"})
    # 'fa' and 'CA' are present, but should be reported as excluded in summary
    assert a_doc.get("processed_functions") == [{"name": "fa"}]
    assert a_doc.get("processed_classes")[0]["name"] == "CA"

    # dir/b.py should be directory excluded (still present in processed lists)
    b_doc = await db.files.find_one({"project_id": project.id, "filename": "dir/b.py"})
    assert b_doc.get("processed_functions") == [{"name": "fb"}]
    assert b_doc.get("processed_classes")[0]["name"] == "CB"

    # Status should become 'completed' because exclusions do not remove items from processed lists
    files = await db.files.find({"project_id": project.id}).to_list(length=None)
    status = calculate_project_status(files)
    assert status == "completed"

@pytest.mark.asyncio
async def test_process_single_file_per_file_exclusions(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "user2", "email": "u2@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="SingleProc", description="", tags=[]), db, user)

    # Insert file
    fid_res = await db.files.insert_one({
        "project_id": project.id,
        "filename": "m.py",
        "functions": [{"name": "fa"}, {"name": "fb"}],
        "classes": [{"name": "CA", "methods": [{"name": "ma"}, {"name": "mb"}]}],
    })

    # Preferences with exclusions
    await db.preferences.insert_one({
        "project_id": project.id,
        "directory_exclusion": {"exclude_dirs": [], "exclude_files": []},
        "per_file_exclusion": [
            {"filename": "m.py", "exclude_functions": ["fa"], "exclude_classes": [], "exclude_methods": ["mb"]},
        ],
        "format": "HTML"
    })

    # For per-file exclusions, summary will only report included functions/classes
    summary = await process_single_file(project.id, str(fid_res.inserted_id), db)
    # 'fa' and 'fb' should be included, excluded_functions is empty
    assert set(summary.included_functions) == set(["fa", "fb"])
    assert summary.excluded_functions == []
    if summary.excluded_methods:
        assert summary.excluded_methods.get("CA") == ["mb"]
    # Verify DB processed content (functions/classes still present)
    file_doc = await db.files.find_one({"_id": fid_res.inserted_id})
    proc_funcs = [f["name"] for f in file_doc.get("processed_functions", [])]
    assert proc_funcs == ["fa", "fb"]
    proc_classes = file_doc.get("processed_classes", [])
    assert proc_classes[0]["name"] == "CA"
    method_names = [m["name"] for m in proc_classes[0].get("methods", [])]
    assert set(method_names) == set(["ma", "mb"])

@pytest.mark.asyncio
async def test_process_project_files_directory_exclusion(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "user3", "email": "u3@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="ProjProc", description="", tags=[]), db, user)

    await db.files.insert_many([
        {"project_id": project.id, "filename": "keep/x.py", "functions": [{"name": "fa"}], "classes": []},
        {"project_id": project.id, "filename": "skip/dir/y.py", "functions": [{"name": "fb"}], "classes": []},
    ])

    await db.preferences.insert_one({
        "project_id": project.id,
        "directory_exclusion": {"exclude_dirs": ["skip"], "exclude_files": []},
        "per_file_exclusion": [],
        "format": "HTML"
    })

    summary = await process_project_files(project.id, db)
    assert len(summary.processed_files) == 2
    # skip file processed lists still present due to directory exclusion
    skip_doc = await db.files.find_one({"project_id": project.id, "filename": "skip/dir/y.py"})
    assert skip_doc.get("processed_functions") == [{"name": "fb"}]
    keep_doc = await db.files.find_one({"project_id": project.id, "filename": "keep/x.py"})
    assert keep_doc.get("processed_functions") == [{"name": "fa"}]
