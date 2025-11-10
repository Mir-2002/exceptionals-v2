import pytest
from bson import ObjectId

import controller.DocumentationController as doc_ctrl
from controller.DocumentationController import (
    normalize_path,
    is_file_excluded,
    apply_preferences_filter,
    plan_documentation_generation,
    generate_documentation_with_hf,
)
from model.DocumentationModel import DocstringItem


def test_normalize_and_file_excluded_helpers():
    # normalize_path
    assert normalize_path("./root/a/b.py") == "a/b.py"
    assert normalize_path("/root/x.py") == "root/x.py".replace("root/", "")
    assert normalize_path("root/dir/z.py") == "dir/z.py"
    # is_file_excluded
    assert is_file_excluded("dir/z.py", ["a.py"], ["dir"]) is True
    assert is_file_excluded("keep/z.py", ["a.py"], ["dir"]) is False


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
