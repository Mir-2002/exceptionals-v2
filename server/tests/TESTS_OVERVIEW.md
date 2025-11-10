# Test Suites Overview

This document catalogs all unit tests in the repository, grouped by domain. Each test entry includes a short description and the actual test code.

Generated on: 2025-11-11

---

## Projects

### File: `tests/unit/test_project_controller_extra.py`

- Test: `test_create_project_duplicate_name`
  - Description: Ensures creating a project with a duplicate name raises an HTTPException.
  - Code:

```python
@pytest.mark.asyncio
async def test_create_project_duplicate_name(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "puser", "email": "p@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    await create_project(ProjectCreate(name="Dup", description="", tags=[]), db, user)
    with pytest.raises(HTTPException):
        await create_project(ProjectCreate(name="Dup", description="", tags=[]), db, user)
```

- Test: `test_get_user_projects_objectid_string_dual`
  - Description: Verifies user projects can be fetched regardless of whether `user_id` is stored as string or ObjectId.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_user_projects_objectid_string_dual(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "uobj", "email": "u@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="PZ", description="", tags=[]), db, user)
    # create historical style project with objectId user_id
    await db.projects.update_one({"_id": ObjectId(p.id)}, {"$set": {"user_id": str(uid)}})
    projects = await get_user_projects(str(uid), db)
    assert any(pr.id == p.id for pr in projects)
```

- Test: `test_update_project_name_conflict_and_no_change`
  - Description: Confirms updating to an existing project name raises, and updating with identical values succeeds (timestamp update).
  - Code:

```python
@pytest.mark.asyncio
async def test_update_project_name_conflict_and_no_change(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "uup", "email": "up@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p1 = await create_project(ProjectCreate(name="P1", description="", tags=[]), db, user)
    p2 = await create_project(ProjectCreate(name="P2", description="", tags=[]), db, user)
    with pytest.raises(HTTPException):
        await update_project(p1.id, ProjectUpdate(name="P2"), db)
    # Updating with identical values should succeed because updated_at always changes
    resp = await update_project(p1.id, ProjectUpdate(name="P1", description="", tags=[]), db)
    assert resp.name == "P1"
    assert resp.description == ""
```

- Test: `test_apply_preferences_missing_prefs`
  - Description: Verifies applying preferences without existing prefs raises HTTPException.
  - Code:

```python
@pytest.mark.asyncio
async def test_apply_preferences_missing_prefs(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "pfuser", "email": "pf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="NP", description="", tags=[]), db, user)
    # Remove preferences to simulate missing
    await db.preferences.delete_one({"project_id": p.id})
    with pytest.raises(HTTPException):
        await apply_preferences_and_update_project(p.id, db)
```

- Test: `test_process_single_file_invalid_and_not_found`
  - Description: Ensures invalid ObjectId results in InvalidId, and non-existent file raises HTTPException.
  - Code:

```python
@pytest.mark.asyncio
async def test_process_single_file_invalid_and_not_found(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "psf", "email": "sf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="PF", description="", tags=[]), db, user)
    # invalid ObjectId format
    with pytest.raises(InvalidId):
        await process_single_file(p.id, "not_an_id", db)
    # valid but not found
    with pytest.raises(HTTPException):
        await process_single_file(p.id, str(ObjectId()), db)
```

- Test: `test_process_project_files_missing_prefs`
  - Description: Verifies batch processing fails when preferences are missing.
  - Code:

```python
@pytest.mark.asyncio
async def test_process_project_files_missing_prefs(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "ppf", "email": "ppf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="MP", description="", tags=[]), db, user)
    # Remove preferences to simulate missing
    await db.preferences.delete_one({"project_id": p.id})
    with pytest.raises(HTTPException):
        await process_project_files(p.id, db)
```

- Test: `test_process_multiple_files_aggregates`
  - Description: Confirms processing multiple files returns a summary for all provided files.
  - Code:

```python
@pytest.mark.asyncio
async def test_process_multiple_files_aggregates(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "pmf", "email": "pmf@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    p = await create_project(ProjectCreate(name="Agg", description="", tags=[]), db, user)
    # prefs
    await db.preferences.insert_one({
        "project_id": p.id,
        "directory_exclusion": {"exclude_dirs": [], "exclude_files": []},
        "per_file_exclusion": [],
        "format": "HTML"
    })
    # files
    ids = []
    for fn in ["a.py", "b.py"]:
        res = await db.files.insert_one({"project_id": p.id, "filename": fn, "functions": [{"name": "f"}], "classes": []})
        ids.append(str(res.inserted_id))
    summary = await process_multiple_files(p.id, ids, db)
    assert len(summary.processed_files) == 2
```

- Test: `test_calculate_project_status_variants`
  - Description: Validates project status calculation across empty, in-progress, and completed scenarios.
  - Code:

```python
def test_calculate_project_status_variants():
    # empty list
    assert calculate_project_status([]) == "empty"
    # files with no content
    assert calculate_project_status([{"functions": [], "classes": []}]) == "empty"
    # in progress
    assert calculate_project_status([
        {"functions": [{"name": "f"}], "classes": []},
        {"functions": [], "classes": []}
    ]) == "in_progress"
    # completed
    assert calculate_project_status([
        {"functions": [{"name": "f"}], "processed_functions": [{"name": "f"}], "classes": [], "processed_classes": []}
    ]) == "completed"
```

### File: `tests/unit/test_project.py`

- Test: `test_project_crud_and_status`
  - Description: Full CRUD flow for project and initial status calculation.
  - Code:

```python
@pytest.mark.asyncio
async def test_project_crud_and_status(db):
    uid = ObjectId()
    await db.users.insert_one({
        "_id": uid,
        "username": "owner",
        "email": "owner@example.com",
        "auth_provider": "local",
        "is_admin": False,
    })
    user = UserInDB(**(await db.users.find_one({"_id": uid})))

    p = await create_project(ProjectCreate(name="P1", description="D", tags=["t1"]), db, user)
    assert p.id and p.status == "empty"

    got = await get_project_by_id(p.id, db)
    assert got.id == p.id

    up = await update_project(p.id, ProjectUpdate(description="D2"), db)
    assert up.description == "D2"

    await db.files.insert_many([
        {"project_id": p.id, "filename": "a.py", "functions": [], "classes": []},
        {"project_id": p.id, "filename": "b.py", "functions": [{"name": "f"}], "classes": []},
    ])
    files = await db.files.find({"project_id": p.id}).to_list(length=None)
    status = calculate_project_status(files)
    assert status in ("empty", "in_progress")

    res = await delete_project(p.id, db)
    assert "deleted" in res["detail"].lower()
```

- Test: `test_create_project_invalid_user`
  - Description: Expects error when creating project without a valid user.
  - Code:

```python
@pytest.mark.asyncio
async def test_create_project_invalid_user(db):
    with pytest.raises(Exception):
        await create_project(ProjectCreate(name="P2", description="D", tags=["t2"]), db, None)
```

- Test: `test_get_project_not_found`
  - Description: Fetching a non-existent project should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_project_not_found(db):
    with pytest.raises(Exception):
        await get_project_by_id(str(ObjectId()), db)
```

- Test: `test_update_project_not_found`
  - Description: Updating a non-existent project should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_update_project_not_found(db):
    with pytest.raises(Exception):
        await update_project(str(ObjectId()), ProjectUpdate(description="D3"), db)
```

- Test: `test_delete_project_not_found`
  - Description: Deleting a non-existent project should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_delete_project_not_found(db):
    with pytest.raises(Exception):
        await delete_project(str(ObjectId()), db)
```

### File: `tests/unit/test_project_extra.py`

- Test: `test_apply_preferences_directory_and_methods`
  - Description: Applies directory and per-file method exclusions; verifies processed data and status.
  - Code:

```python
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
```

- Test: `test_process_single_file_methods_exclusion`
  - Description: Per-file exclusions for functions and methods are reflected only in summary; DB keeps original.
  - Code:

```python
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
```

- Test: `test_process_project_files_mixed`
  - Description: Batch processing with dir exclusion and per-file class exclusion; validates summary structure.
  - Code:

```python
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
```

### File: `tests/unit/test_project_preferences_processing.py`

- Test: `test_apply_preferences_exclusions`
  - Description: Applies directory and per-file exclusions and validates processed DB content and status.
  - Code:

```python
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
```

- Test: `test_process_single_file_per_file_exclusions`
  - Description: Validates that per-file exclusions only affect the summary and not stored processed content.
  - Code:

```python
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
```

- Test: `test_process_project_files_directory_exclusion`
  - Description: Directory exclusion path still keeps processed lists; validates both kept and skipped files.
  - Code:

```python
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
```

---

## Documentation

### File: `tests/unit/test_documentation.py`

- Test: `test_plan_generation_basic`
  - Description: Basic planning checks that helper items are excluded and method items are created.
  - Code:

```python
@pytest.mark.asyncio
async def test_plan_generation_basic(db, project_with_files):
    proj_id, file_id = project_with_files
    plan = await plan_documentation_generation(proj_id, db)
    assert plan.project_id == proj_id
    names = {it.name for it in plan.items}
    assert "helper_fn" not in names
    assert "HelperClass" not in names
    assert any(it.type == "method" and it.name == "run" for it in plan.items)
```

- Test: `test_generate_documentation_with_mock_hf`
  - Description: Generates documentation with a mocked HF client; verifies storage and response shape.
  - Code:

```python
@pytest.mark.asyncio
async def test_generate_documentation_with_mock_hf(monkeypatch, db, project_with_files):
    proj_id, _ = project_with_files

    async def fake_hf_batch(prompts, parameters=None):
        return [f"Doc for: {p.split('\n')[0][:30]}" for p in prompts]

    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", fake_hf_batch)

    resp = await generate_documentation_with_hf(proj_id, db, batch_size=2)
    assert resp.total_items == len(resp.results)
    assert resp.included_files
    assert resp.format == "HTML"
    stored = await db.documentations.find({"project_id": proj_id}).to_list(length=None)
    assert stored and stored[0].get("results")
```

- Test: `test_plan_generation_no_files`
  - Description: Planning raises when project has no files.
  - Code:

```python
@pytest.mark.asyncio
async def test_plan_generation_no_files(db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "Empty", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception) as exc:
        await plan_documentation_generation(proj_id, db)
    assert "No files found" in str(exc.value)
```

- Test: `test_generate_documentation_with_empty_project`
  - Description: Generator raises when project has no files.
  - Code:

```python
@pytest.mark.asyncio
async def test_generate_documentation_with_empty_project(monkeypatch, db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "Empty2", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", lambda prompts, parameters=None: ["No doc" for _ in prompts])
    with pytest.raises(Exception) as exc:
        await generate_documentation_with_hf(proj_id, db, batch_size=2)
    assert "No files found" in str(exc.value)
```

- Test: `test_generate_documentation_with_invalid_project`
  - Description: Generator raises for invalid project id.
  - Code:

```python
@pytest.mark.asyncio
async def test_generate_documentation_with_invalid_project(monkeypatch, db):
    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", lambda prompts, parameters=None: ["No doc" for _ in prompts])
    with pytest.raises(Exception):
        await generate_documentation_with_hf("nonexistent_proj", db, batch_size=2)
```

- Test: `test_plan_generation_with_multiple_files`
  - Description: Planning builds items across multiple files with functions and methods.
  - Code:

```python
@pytest.mark.asyncio
async def test_plan_generation_with_multiple_files(db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "Multi", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    # Insert files with functions and classes as expected by the controller
    await db.files.insert_many([
        {
            "project_id": proj_id,
            "filename": "a.py",
            "functions": [{"name": "f", "code": "def f():\n    pass"}],
            "classes": [{
                "name": "D",
                "code": "class D:\n    def m(self):\n        pass",
                "methods": [{"name": "m", "code": "def m(self):\n    pass"}]
            }]
        },
        {
            "project_id": proj_id,
            "filename": "b.py",
            "functions": [{"name": "g", "code": "def g():\n    pass"}],
            "classes": [{
                "name": "E",
                "code": "class E:\n    def n(self):\n        pass",
                "methods": [{"name": "n", "code": "def n(self):\n    pass"}]
            }]
        }
    ])
    plan = await plan_documentation_generation(proj_id, db)
    assert plan.project_id == proj_id
    if len(plan.items) < 1:
        print('DEBUG plan.items:', plan.items)
    assert len(plan.items) >= 1  # At least one item if code objects are found
```

### File: `tests/unit/test_documentation_extra.py`

- Test: `test_normalize_and_file_excluded_helpers`
  - Description: Validates helper functions for path normalization and file exclusion.
  - Code:

```python
def test_normalize_and_file_excluded_helpers():
    # normalize_path
    assert normalize_path("./root/a/b.py") == "a/b.py"
    assert normalize_path("/root/x.py") == "root/x.py".replace("root/", "")
    assert normalize_path("root/dir/z.py") == "dir/z.py"
    # is_file_excluded
    assert is_file_excluded("dir/z.py", ["a.py"], ["dir"]) is True
    assert is_file_excluded("keep/z.py", ["a.py"], ["dir"]) is False
```

- Test: `test_apply_preferences_filter_item_level`
  - Description: Confirms that per-file exclusions filter out specific items and directory exclusions drop files.
  - Code:

```python
def test_apply_preferences_filter_item_level():
    items = [
        DocstringItem(name="fa", type="function", file="a.py", code=""),
        DocstringItem(name="A", type="class", file="a.py", code=""),
        DocstringItem(name="ma", type="method", file="a.py", code="", parent_class="A"),
        DocstringItem(name="fb", type="function", file="sub/b.py", code=""),
    ]
    prefs = {
        "directory_exclusion": {"exclude_files": ["ignore.py"], "exclude_dirs": ["sub"]},
        "per_file_exclusion": [
            {"filename": "a.py", "exclude_functions": ["fa"], "exclude_classes": ["A"], "exclude_methods": ["ma"]},
        ],
    }
    filtered, excluded_files, included_files = apply_preferences_filter(items, prefs)
    names = {(it.type, it.name) for it in filtered}
    assert ("function", "fa") not in names
    assert ("class", "A") not in names
    assert ("method", "ma") not in names
    # b.py should be dropped via dir exclusion
    assert ("function", "fb") not in names
    assert "sub/b.py" not in included_files
```

- Test: `test_plan_generation_included_excluded_files`
  - Description: Planner respects directory and per-file exclusions; total items reduced accordingly.
  - Code:

```python
@pytest.mark.asyncio
async def test_plan_generation_included_excluded_files(db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "DocProj", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    await db.files.insert_many([
        {"project_id": proj_id, "filename": "keep/x.py", "functions": [{"name": "f", "code": "def f():\n  pass"}], "classes": []},
        {"project_id": proj_id, "filename": "skip/y.py", "functions": [{"name": "g", "code": "def g():\n  pass"}], "classes": []},
    ])
    await db.preferences.insert_one({
        "project_id": proj_id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": ["skip"]},
        "per_file_exclusion": [{"filename": "keep/x.py", "exclude_functions": ["f"], "exclude_classes": [], "exclude_methods": []}],
        "format": "HTML",
    })

    plan = await plan_documentation_generation(proj_id, db)
    assert "keep/x.py" in plan.included_files
    assert "skip/y.py" in plan.excluded_files
    # per-file exclusion should reduce total items
    assert plan.total_items == 0
```

- Test: `test_generate_documentation_partial_batch_fallback`
  - Description: Mocked HF returns fewer docs than prompts; generator falls back to smaller batches and completes.
  - Code:

```python
@pytest.mark.asyncio
async def test_generate_documentation_partial_batch_fallback(monkeypatch, db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "GenProj", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    await db.files.insert_one({
        "project_id": proj_id,
        "filename": "a.py",
        "functions": [{"name": "f", "code": "def f():\n  return 1"}],
        "classes": [{"name": "C", "code": "class C:\n  def m(self):\n    pass", "methods": [{"name": "m", "code": "def m(self):\n  pass"}]}],
    })
    await db.preferences.insert_one({
        "project_id": proj_id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
        "per_file_exclusion": [],
        "format": "HTML",
    })

    # First call with batch of size >1 returns fewer outputs -> triggers fallback per missing prompt
    async def fake_hf(prompts, parameters=None):
        if len(prompts) > 1:
            return ["ok"]  # shorter than prompts
        return ["ok-single"]

    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", fake_hf)

    resp = await generate_documentation_with_hf(proj_id, db, batch_size=3)
    assert resp.total_items == len(resp.results)
    # Project should be marked completed by generator
    proj = await db.projects.find_one({"_id": ObjectId(proj_id)})
    assert proj.get("status") == "completed"
```

---

## Files

### File: `tests/unit/test_file.py`

- Test: `test_single_file_upload_and_get`
  - Description: Uploads a single file, fetches it, lists files, builds tree, deletes it.
  - Code:

```python
@pytest.mark.asyncio
async def test_single_file_upload_and_get(db):
    # project
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P", "description": "", "user_id": "u", "tags": [], "status": "empty"})

    py_code = b"def foo():\n    return 1\nclass A:\n    def m(self):\n        return 2\n"

    f = DummyUploadFile("mod.py", py_code)
    out = await upload_file(pid, f, db)
    assert out["file_id"]

    file_doc = await get_file(pid, out["file_id"], db)
    assert file_doc.filename == "mod.py"

    all_files = await get_files_in_project(pid, db)
    assert len(all_files) == 1

    tree = await get_file_tree(pid, db)
    assert tree.body  # JSONResponse

    res = await delete_file(pid, out["file_id"], db)
    assert "deleted" in res.body.decode().lower()
```

- Test: `test_multiple_files_and_limits`
  - Description: Upload multiple files; then exceed per-upload file count to assert failure.
  - Code:

```python
@pytest.mark.asyncio
async def test_multiple_files_and_limits(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P2", "description": "", "user_id": "u", "tags": [], "status": "empty"})

    files = [DummyUploadFile(f"f{i}.py", b"def a():\n  return i\n") for i in range(3)]
    uploaded = await upload_project_files(pid, files, db)
    assert len(uploaded) == 3

    # Exceed file limit
    too_many = [DummyUploadFile(f"f{i}.py", b"def a():\n  return i\n") for i in range(MAX_FILES_PER_UPLOAD + 1)]
    with pytest.raises(Exception):
        await upload_project_files(pid, too_many, db)
```

- Test: `test_zip_upload_and_item_limit`
  - Description: Upload a zip containing two python files and verify processed count.
  - Code:

```python
@pytest.mark.asyncio
async def test_zip_upload_and_item_limit(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P3", "description": "", "user_id": "u", "tags": [], "status": "empty"})

    # Build a zip with two python files
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("pkg/a.py", "def x():\n  return 1\n")
        z.writestr("pkg/b.py", "class C:\n  def m(self):\n    return 2\n")
    up = DummyUploadFile("proj.zip", buf.getvalue())
    res = await upload_project_zip(pid, up, db)
    assert res["files_processed"] == 2
```

- Test: `test_upload_file_invalid_project`
  - Description: Uploading to an invalid project should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_file_invalid_project(db):
    f = DummyUploadFile("bad.py", b"print('bad')\n")
    with pytest.raises(Exception):
        await upload_file("invalid_project_id", f, db)
```

- Test: `test_get_file_not_found`
  - Description: Getting a non-existent file should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_file_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P4", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await get_file(pid, "nonexistent_file_id", db)
```

- Test: `test_delete_file_not_found`
  - Description: Deleting a non-existent file should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_delete_file_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P5", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await delete_file(pid, "nonexistent_file_id", db)
```

- Test: `test_file_tree_empty_project`
  - Description: File tree API should respond even when project has no files.
  - Code:

```python
@pytest.mark.asyncio
async def test_file_tree_empty_project(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P6", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    tree = await get_file_tree(pid, db)
    assert tree.body  # Should still return a valid response
```

### File: `tests/unit/test_file_limits.py`

- Test: `test_upload_file_items_limit_exceeded`
  - Description: Single file exceeding items count limit should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_file_items_limit_exceeded(db):
    # Create user & project
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "user1", "email": "u1@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="BigSingle", description="", tags=[]), db, user)

    # Build one huge python file with > MAX_ITEMS_PER_UPLOAD functions
    fn_count = MAX_ITEMS_PER_UPLOAD + 5
    code = "\n".join([f"def f{i}():\n    return {i}" for i in range(fn_count)])
    up = DummyUploadFile("big.py", code.encode("utf-8"))
    with pytest.raises(Exception) as exc:
        await upload_file(project.id, up, db)
    assert "exceed limit" in str(exc.value)
```

- Test: `test_upload_project_files_total_items_limit`
  - Description: Total items across many files exceeding limit should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_project_files_total_items_limit(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "user2", "email": "u2@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="BigMulti", description="", tags=[]), db, user)

    # Create many small files so cumulative functions > limit
    # Each file has 15 functions, create enough to exceed limit
    funcs_per_file = 15
    needed_files = (MAX_ITEMS_PER_UPLOAD // funcs_per_file) + 2
    files = []
    for fidx in range(needed_files):
        code = "\n".join([f"def f{fidx}_{i}():\n    return {i}" for i in range(funcs_per_file)])
        files.append(DummyUploadFile(f"m{fidx}.py", code.encode("utf-8")))
    with pytest.raises(Exception) as exc:
        await upload_project_files(project.id, files, db)
    assert "exceed limit" in str(exc.value)
```

- Test: `test_upload_project_files_file_count_limit`
  - Description: Exceeding number of files per upload should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_project_files_file_count_limit(db):
    uid = ObjectId()
    await db.users.insert_one({"_id": uid, "username": "user3", "email": "u3@example.com", "auth_provider": "local", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"_id": uid})))
    project = await create_project(ProjectCreate(name="TooManyFiles", description="", tags=[]), db, user)

    # Create MAX_FILES_PER_UPLOAD + 1 trivial python files
    files = [DummyUploadFile(f"f{i}.py", b"def x():\n    return 1\n") for i in range(MAX_FILES_PER_UPLOAD + 1)]
    with pytest.raises(Exception) as exc:
        await upload_project_files(project.id, files, db)
    assert "maximum" in str(exc.value)
```

### File: `tests/unit/test_file_controller_extra.py`

- Test: `test_upload_file_too_many_items`
  - Description: Uploading a single file exceeding item limit returns HTTPException.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_file_too_many_items(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "LimProj", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    big_code_parts = []
    # Create enough functions to exceed MAX_ITEMS_PER_UPLOAD
    for i in range(MAX_ITEMS_PER_UPLOAD + 5):
        big_code_parts.append(f"def f{i}():\n    pass\n")
    big_code = ("".join(big_code_parts)).encode()
    f = DummyUploadFile("big.py", big_code)
    with pytest.raises(fastapi.HTTPException):
        await upload_file(pid, f, db)
```

- Test: `test_delete_project_files`
  - Description: Bulk delete all files in a project; subsequent get_files_in_project should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_delete_project_files(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "DelProj", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    files = [DummyUploadFile(f"f{i}.py", b"def a():\n  return i\n") for i in range(3)]
    await upload_project_files(pid, files, db)
    res = await delete_project_files(pid, db)
    assert "deleted" in res["detail"].lower()
    with pytest.raises(Exception):
        await get_files_in_project(pid, db)
```

- Test: `test_upload_project_zip_exceeds_limits`
  - Description: Zip upload that would exceed item limits should raise HTTPException.
  - Code:

```python
@pytest.mark.asyncio
async def test_upload_project_zip_exceeds_limits(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "ZipLim", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    # Build a zip with many small python files to exceed item limit
    import zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        # Enough files each with several functions to exceed limit
        for i in range(MAX_ITEMS_PER_UPLOAD + 10):
            z.writestr(f"pkg/f{i}.py", "def a():\n  pass\nclass C:\n  def m(self):\n    pass\n")
    up = DummyUploadFile("many.zip", buf.getvalue())
    with pytest.raises(fastapi.HTTPException):
        await upload_project_zip(pid, up, db)
```

---

## Preferences

### File: `tests/unit/test_preferences.py`

- Test: `test_preferences_crud`
  - Description: Full CRUD lifecycle for preferences on a project.
  - Code:

```python
@pytest.mark.asyncio
async def test_preferences_crud(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PX", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    prefs = await create_preferences(pid, Preferences(format="HTML"), db)
    assert prefs.project_id == pid
    got = await get_preferences(pid, db)
    assert got.format.upper() in ("HTML", "MARKDOWN", "PDF")
    upd = await update_preferences(pid, UpdatePreferences(directory_exclusion={"exclude_files": ["a.py"]}), db)
    assert "a.py" in upd.directory_exclusion.exclude_files
    res = await delete_preferences(pid, db)
    assert "deleted" in res.body.decode().lower()
```

- Test: `test_create_preferences_invalid_project`
  - Description: Creating preferences for invalid project id should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_create_preferences_invalid_project(db):
    with pytest.raises(Exception):
        await create_preferences("invalid_pid", Preferences(format="HTML"), db)
```

- Test: `test_get_preferences_not_found`
  - Description: Getting preferences for a project with none stored should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PZ", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await get_preferences(pid, db)
```

- Test: `test_update_preferences_not_found`
  - Description: Updating non-existent preferences should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_update_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PY", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await update_preferences(pid, UpdatePreferences(directory_exclusion={"exclude_files": ["b.py"]}), db)
```

- Test: `test_delete_preferences_not_found`
  - Description: Deleting non-existent preferences should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_delete_preferences_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "PW", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await delete_preferences(pid, db)
```

---

## Auth and Users

### File: `tests/unit/test_auth.py`

- Test: `test_register_and_login_local_user`
  - Description: Create local user, login, and validate JWT-based get_current_user.
  - Code:

```python
@pytest.mark.asyncio
async def test_register_and_login_local_user(db):
    user = UserCreate(username="alice", email="alice@example.com", password="supersecret")
    created = await create_user(user, db)
    assert created.id

    token = await login_user("alice", "supersecret", db)
    assert token.access_token

    user_data = UserInDB(**(await db.users.find_one({"username": "alice"})))
    app_token = create_access_token({"sub": str(user_data.id), "is_admin": False})
    current = await get_current_user(db=db, token=app_token)
    assert current.username == "alice"
```

- Test: `test_github_oauth_callback_creates_user`
  - Description: GitHub OAuth callback creates a user via mocked token exchange and user fetch.
  - Code:

```python
@pytest.mark.asyncio
async def test_github_oauth_callback_creates_user(monkeypatch, db):
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_ID", "cid")
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_SECRET", "csecret")

    async def fake_exchange(code: str) -> str:
        assert code == "dummy-code"
        return "gh-access-token"

    async def fake_get_user(access_token: str) -> dict:
        assert access_token == "gh-access-token"
        return {"id": 12345, "login": "bobhub", "email": "bob@example.com"}

    monkeypatch.setattr(gh_ctrl, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_ctrl, "_get_github_user", fake_get_user)

    user_doc = await gh_ctrl.handle_github_callback("dummy-code", db)
    assert user_doc
    assert user_doc.get("auth_provider") == "github"
    assert user_doc.get("provider_id") == "12345"

    user = UserInDB(**user_doc)
    jwt_token = create_access_token({"sub": str(user.id), "is_admin": user.is_admin})
    assert isinstance(jwt_token, str) and len(jwt_token) > 10
```

- Test: `test_register_duplicate_user`
  - Description: Registering a duplicate username/email should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_register_duplicate_user(db):
    user = UserCreate(username="bob", email="bob@example.com", password="pw123456")
    await create_user(user, db)
    with pytest.raises(Exception):
        await create_user(user, db)
```

- Test: `test_login_wrong_password`
  - Description: Login with incorrect password should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_login_wrong_password(db):
    user = UserCreate(username="carol", email="carol@example.com", password="pw123456")
    await create_user(user, db)
    with pytest.raises(Exception):
        await login_user("carol", "wrongpw", db)
```

- Test: `test_create_access_token_and_decode`
  - Description: Creating an access token returns a non-empty JWT string.
  - Code:

```python
@pytest.mark.asyncio
async def test_create_access_token_and_decode(db):
    user = UserCreate(username="dave", email="dave@example.com", password="pw123456")
    created = await create_user(user, db)
    token = create_access_token({"sub": str(created.id), "is_admin": False})
    assert isinstance(token, str) and len(token) > 10
```

- Test: `test_get_current_user_invalid_token`
  - Description: Invalid token should raise when fetching the current user.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_current_user_invalid_token(db):
    with pytest.raises(Exception):
        await get_current_user(db=db, token="invalid.token.here")
```

### File: `tests/unit/test_user.py`

- Test: `test_user_crud`
  - Description: Full CRUD flow for a user.
  - Code:

```python
@pytest.mark.asyncio
async def test_user_crud(db):
    u = await create_user(UserCreate(username="john", email="john@example.com", password="supersecret"), db)
    assert u.id and u.username == "john"

    got = await get_user_by_id(u.id, db)
    assert got.email == "john@example.com"

    upd = await update_user(u.id, UserUpdate(username="johnny"), db)
    assert upd.username == "johnny"

    res = await delete_user(u.id, db)
    assert "deleted" in res["detail"].lower()
```

- Test: `test_create_user_duplicate`
  - Description: Duplicate user creation should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_create_user_duplicate(db):
    await create_user(UserCreate(username="jane", email="jane@example.com", password="pw"), db)
    with pytest.raises(Exception):
        await create_user(UserCreate(username="jane", email="jane@example.com", password="pw"), db)
```

- Test: `test_get_user_not_found`
  - Description: Fetching a non-existent user should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_user_not_found(db):
    with pytest.raises(Exception):
        await get_user_by_id(str(ObjectId()), db)
```

- Test: `test_update_user_not_found`
  - Description: Updating a non-existent user should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_update_user_not_found(db):
    with pytest.raises(Exception):
        await update_user(str(ObjectId()), UserUpdate(username="ghost"), db)
```

- Test: `test_delete_user_not_found`
  - Description: Deleting a non-existent user should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_delete_user_not_found(db):
    with pytest.raises(Exception):
        await delete_user(str(ObjectId()), db)
```

---

## GitHub Integration

### GitHub Auth Controller

#### File: `tests/unit/test_github_auth_controller.py`

- Test: `test_handle_github_callback_creates_user_and_updates_existing`
  - Description: GitHub OAuth flow creates a new user, then updates existing on repeat callback.
  - Code:

```python
@pytest.mark.asyncio
async def test_handle_github_callback_creates_user_and_updates_existing(monkeypatch, db):
    # Monkeypatch helpers to avoid real HTTP
    async def fake_exchange(code: str) -> str:
        assert code == "good-code"
        return "token123"

    async def fake_get_user(access_token: str) -> dict:
        assert access_token == "token123"
        return {"id": 42, "login": "octocat", "email": "octo@example.com"}

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)

    # First time -> creates user
    user_doc = await gh_auth.handle_github_callback("good-code", db)
    assert user_doc.get("auth_provider") == "github"
    assert user_doc.get("provider_id") == "42"

    # Second time -> updates existing user token/fields
    user_doc2 = await gh_auth.handle_github_callback("good-code", db)
    assert user_doc2["_id"] == user_doc["_id"]
```

- Test: `test_handle_github_callback_username_email_uniqueness`
  - Description: Username/email collisions are resolved by suffixing username and falling back to no-reply email.
  - Code:

```python
@pytest.mark.asyncio
async def test_handle_github_callback_username_email_uniqueness(monkeypatch, db):
    # Pre-insert a user to force username collision
    await db.users.insert_one({
        "username": "octocat", "email": "used@example.com", "auth_provider": "local", "is_admin": False
    })

    async def fake_exchange(code: str) -> str:
        return "tok"

    async def fake_get_user(access_token: str) -> dict:
        return {"id": 55, "login": "octocat", "email": "used@example.com"}

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)

    user_doc = await gh_auth.handle_github_callback("any", db)
    assert user_doc.get("username").startswith("octocat-")
    assert user_doc.get("email").endswith("@users.noreply.github.com")
```

- Test: `test_list_github_repos_and_flags`
  - Description: Lists user repos and annotates those installed by the GitHub App.
  - Code:

```python
@pytest.mark.asyncio
async def test_list_github_repos_and_flags(monkeypatch, db):
    # Create a github user with token
    await db.users.insert_one({
        "username": "ghuser", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "ghuser"})))

    # decrypt token
    monkeypatch.setattr("utils.crypto.decrypt_text", lambda t: "plain-token")

    # installations: repos 1 and 3
    async def fake_list_all_repos(access_token):
        return [{"id": 1, "name": "r1"}, {"id": 3, "name": "r3"}]
    monkeypatch.setattr("utils.github_app.list_all_repos_for_user_installations", fake_list_all_repos)

    # user repos: 1,2
    class DummyResp:
        def __init__(self):
            self.status_code = 200
        def json(self):
            return [{"id": 1, "name": "r1"}, {"id": 2, "name": "r2"}]
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)

    repos = await gh_auth.list_github_repos(user, db)
    r1 = next(r for r in repos if r["id"] == 1)
    r2 = next(r for r in repos if r["id"] == 2)
    assert r1["app_installed"] is True
    assert r2["app_installed"] is False
```

- Test: `test_list_github_repos_user_not_connected`
  - Description: Listing repos for non-GitHub-authenticated user should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_list_github_repos_user_not_connected(db):
    await db.users.insert_one({
        "username": "nogh", "email": "e@e.com", "auth_provider": "local", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "nogh"})))
    with pytest.raises(Exception):
        await gh_auth.list_github_repos(user, db)
```

#### File: `tests/unit/test_github_auth_controller_extra.py`

- Test: `test_exchange_code_for_token_env_missing`
  - Description: Missing OAuth env config should cause token exchange to raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_exchange_code_for_token_env_missing(monkeypatch):
    # Force missing env config at module level
    monkeypatch.setattr(gh_auth, "GITHUB_OAUTH_CLIENT_ID", None)
    monkeypatch.setattr(gh_auth, "GITHUB_OAUTH_CLIENT_SECRET", None)
    with pytest.raises(Exception):
        await gh_auth._exchange_code_for_token("code")
```

- Test: `test_get_github_user_non_200`
  - Description: Non-200 response when fetching GitHub user should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_get_github_user_non_200(monkeypatch):
    class DummyResp:
        def __init__(self):
            self.status_code = 401
        def json(self):
            return {"message": "Unauthorized"}
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)
    with pytest.raises(Exception):
        await gh_auth._get_github_user("tok")
```

- Test: `test_handle_github_callback_email_none_fetch_emails`
  - Description: When GitHub user email is None, controller fetches primary email from emails API.
  - Code:

```python
@pytest.mark.asyncio
async def test_handle_github_callback_email_none_fetch_emails(monkeypatch, db):
    async def fake_exchange(code: str) -> str:
        return "tok"
    async def fake_get_user(access_token: str) -> dict:
        return {"id": 99, "login": "octo", "email": None}

    class EmailResp:
        def __init__(self):
            self.status_code = 200
        def json(self):
            return [{"email": "p1@example.com", "primary": True}, {"email": "p2@example.com", "primary": False}]
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return EmailResp()

    monkeypatch.setattr(gh_auth, "_exchange_code_for_token", fake_exchange)
    monkeypatch.setattr(gh_auth, "_get_github_user", fake_get_user)
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)

    user_doc = await gh_auth.handle_github_callback("any", db)
    assert user_doc.get("email") == "p1@example.com"
```

- Test: `test_list_github_repos_fallback_to_installations`
  - Description: If user repos request fails, fall back to installations list.
  - Code:

```python
@pytest.mark.asyncio
async def test_list_github_repos_fallback_to_installations(monkeypatch, db):
    # Prepare a GitHub user
    await db.users.insert_one({
        "username": "ghextra", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False
    })
    user = UserInDB(**(await db.users.find_one({"username": "ghextra"})))

    # Decrypt token
    monkeypatch.setattr("utils.crypto.decrypt_text", lambda t: "plain-token")

    # Installation repos available
    async def fake_list_all(access_token):
        return [{"id": 7, "name": "r7"}]
    monkeypatch.setattr("utils.github_app.list_all_repos_for_user_installations", fake_list_all)

    # User repos fetch fails -> should return installation repos annotated
    class DummyResp:
        def __init__(self):
            self.status_code = 500
        def json(self):
            return []
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_auth.httpx, "AsyncClient", DummyClient)

    repos = await gh_auth.list_github_repos(user, db)
    assert len(repos) == 1 and repos[0].get("app_installed") is True
```

### GitHub Import Controller

#### File: `tests/unit/test_github.py`

- Test: `test_import_github_repo`
  - Description: Imports a GitHub repository via mocked zip download; ensures files are stored.
  - Code:

```python
@pytest.mark.asyncio
async def test_import_github_repo(monkeypatch, db):
    uid = ObjectId()
    await db.users.insert_one({
        "_id": uid,
        "username": "owner",
        "email": "owner@example.com",
        "auth_provider": "local",
        "is_admin": False,
    })
    user = UserInDB(**(await db.users.find_one({"_id": uid})))

    async def fake_inst(owner, repo):
        return "inst-token"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_inst)

    async def fake_download(owner, repo, ref, token, dest):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("repo/a.py", "def x():\n  return 1\n")
            z.writestr("repo/b.py", "class C:\n  def m(self):\n    return 2\n")
        with open(dest, "wb") as f:
            f.write(buf.getvalue())
    monkeypatch.setattr(gh_imp, "_download_repo_zip", fake_download)

    req = GithubImportRequest(name="GProj", description="", repo_full_name="own/repo", ref="main", tags=["g"])
    proj = await import_github_repo(req, db, user)
    assert proj.id
    files = await db.files.find({"project_id": proj.id}).to_list(length=None)
    assert len(files) == 2
```

#### File: `tests/unit/test_github_import_controller_extra.py`

- Test: `test_import_repo_missing_app_install`
  - Description: Missing GitHub App installation token causes import to raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_import_repo_missing_app_install(monkeypatch, db):
    # user
    await db.users.insert_one({"username": "u1x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u1x"})))

    async def fake_token(owner, repo):
        raise Exception("no install")
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    req = GithubImportRequest(name="X", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)
```

- Test: `test_import_repo_default_branch_non_200`
  - Description: Non-200 from default-branch API should raise during import.
  - Code:

```python
@pytest.mark.asyncio
async def test_import_repo_default_branch_non_200(monkeypatch, db):
    await db.users.insert_one({"username": "u2x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u2x"})))

    async def fake_token(owner, repo):
        return "inst"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    class DummyResp:
        def __init__(self):
            self.status_code = 404
        def json(self):
            return {}
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def get(self, url, headers=None):
            return DummyResp()
    monkeypatch.setattr(gh_imp.httpx, "AsyncClient", DummyClient)

    req = GithubImportRequest(name="X2", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)
```

- Test: `test_download_repo_zip_non_200`
  - Description: Zip download stream non-200 should raise.
  - Code:

```python
@pytest.mark.asyncio
async def test_download_repo_zip_non_200(monkeypatch, db):
    await db.users.insert_one({"username": "u3x", "email": "e@e.com", "auth_provider": "github", "github_token_enc": "ENC", "is_admin": False})
    user = UserInDB(**(await db.users.find_one({"username": "u3x"})))

    async def fake_token(owner, repo):
        return "inst"
    monkeypatch.setattr("utils.github_app.get_installation_token_for_repo", fake_token)

    class StreamResp:
        def __init__(self):
            self.status_code = 500
        async def aread(self):
            return b"fail"
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def aiter_bytes(self):
            if False:
                yield b""
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        def stream(self, *args, **kwargs):
            return StreamResp()
    monkeypatch.setattr(gh_imp.httpx, "AsyncClient", DummyClient)

    req = GithubImportRequest(name="X3", description="", repo_full_name="o/r", ref="main")
    with pytest.raises(Exception):
        await gh_imp.import_github_repo(req, db, user)
```

---

## Utilities

### File: `tests/unit/test_build_tree_utils.py`

- Test: `test_build_tree_nested_and_duplicates`
  - Description: Builds a nested file tree; duplicate file path updates node in place.
  - Code:

```python
def test_build_tree_nested_and_duplicates():
    files = [
        {"filename": "src/utils/a.py", "functions": [{"name": "fa"}], "classes": []},
        {"filename": "src/utils/b.py", "functions": [], "classes": [{"name": "C"}]},
        {"filename": "src/core/c.py", "functions": [], "classes": []},
        {"filename": "src/utils/a.py", "functions": [{"name": "fa2"}], "classes": []},  # duplicate path updates
        {"filename": "top.py", "functions": [], "classes": []},
        {"filename": "", "functions": [], "classes": []},  # ignored
    ]
    tree = build_file_tree(files)
    assert tree["name"] == "root"
    # Ensure directories created
    src_dir = next(ch for ch in tree["children"] if ch["name"] == "src")
    utils_dir = next(ch for ch in src_dir["children"] if ch["name"] == "utils")
    a_file = next(ch for ch in utils_dir["children"] if ch["name"] == "a.py")
    # duplicate should have updated functions list length
    assert len(a_file["functions"]) == 1
    # top-level file
    top = next(ch for ch in tree["children"] if ch["name"] == "top.py")
    assert top["type"] == "file"
```

- Test: `test_build_tree_sorting`
  - Description: Root children are sorted by name.
  - Code:

```python
def test_build_tree_sorting():
    files = [
        {"filename": "z_dir/a.py", "functions": [], "classes": []},
        {"filename": "a_dir/z.py", "functions": [], "classes": []},
        {"filename": "a_dir/a.py", "functions": [], "classes": []},
    ]
    tree = build_file_tree(files)
    # root children sorted by directory then name
    names = [c["name"] for c in tree["children"]]
    assert names == sorted(names)
```

### File: `tests/utils/test_parser.py`

- Test: `test_extract_functions_and_classes`
  - Description: Extracts functions, classes, and methods from source code.
  - Code:

```python
def test_extract_functions_and_classes():
    code = """
async def af():
    return 1

def f(x: int) -> int:
    return x

class A:
    def m(self):
        pass
"""
    res = extract_functions_classes_from_content(code)
    fn_names = {f["name"] for f in res["functions"]}
    cls_names = {c["name"] for c in res["classes"]}
    assert {"af", "f"}.issubset(fn_names)
    assert "A" in cls_names
    m_names = {m["name"] for m in res["classes"][0]["methods"]}
    assert "m" in m_names
```

- Test: `test_extract_py_files_from_zip`
  - Description: Filters Python files from a zip archive for parsing.
  - Code:

```python
def test_extract_py_files_from_zip(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("pkg/a.py", "def x():\n  return 1\n")
        z.writestr("pkg/b.txt", "not python\n")
    out = extract_py_files_from_zip(buf.getvalue())
    names = {f["filename"] for f in out}
    assert "pkg/a.py" in names
```

### File: `tests/utils/test_doc_cleaner.py`

- Test: `test_strip_examples_sections`
  - Description: Removes "Examples" sections with code blocks from text.
  - Code:

````python
def test_strip_examples_sections():
    text = """Line\nExamples:\n```python\nprint('hi')\n```\nEnd"""
    cleaned = strip_examples_sections(text)
    assert "Examples" not in cleaned
    assert "print" not in cleaned  # code block removed with examples
````

- Test: `test_clean_for_markdown_param_formatting`
  - Description: Formats parameters in markdown docstrings with bullets.
  - Code:

```python
def test_clean_for_markdown_param_formatting():
    raw = """Args:\n value (int): number\n name: person\n"""
    out = clean_for_markdown(raw)
    assert "- value (int):" in out
    assert "- name:" in out
```

- Test: `test_clean_for_html_removes_backticks_and_asterisks`
  - Description: HTML cleaner removes backticks and asterisks.
  - Code:

```python
def test_clean_for_html_removes_backticks_and_asterisks():
    raw = "``code``\n*param*: value"  # backticks & asterisks
    out = clean_for_html(raw)
    assert "`" not in out
    assert "*" not in out
```

- Test: `test_clean_for_pdf_basic`
  - Description: PDF cleaner strips fenced code blocks and keeps headings as text.
  - Code:

````python
def test_clean_for_pdf_basic():
    raw = "# Title\n```python\nprint('x')\n```\n"  # heading + fenced code
    out = clean_for_pdf(raw)
    assert "Title" in out  # heading kept as plain text (not markdown style)
    assert "```" not in out
````

### File: `tests/utils/test_doc_templates.py`

- Note: This test file exists but currently contains no tests.

---

## End
