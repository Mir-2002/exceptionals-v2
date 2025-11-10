import pytest

from controller.DocumentationController import plan_documentation_generation, generate_documentation_with_hf
import controller.DocumentationController as doc_ctrl
from bson import ObjectId


@pytest.mark.asyncio
async def test_plan_generation_basic(db, project_with_files):
    proj_id, file_id = project_with_files
    plan = await plan_documentation_generation(proj_id, db)
    assert plan.project_id == proj_id
    names = {it.name for it in plan.items}
    assert "helper_fn" not in names
    assert "HelperClass" not in names
    assert any(it.type == "method" and it.name == "run" for it in plan.items)


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


@pytest.mark.asyncio
async def test_plan_generation_no_files(db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "Empty", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception) as exc:
        await plan_documentation_generation(proj_id, db)
    assert "No files found" in str(exc.value)


@pytest.mark.asyncio
async def test_generate_documentation_with_empty_project(monkeypatch, db):
    proj_id = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(proj_id), "name": "Empty2", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", lambda prompts, parameters=None: ["No doc" for _ in prompts])
    with pytest.raises(Exception) as exc:
        await generate_documentation_with_hf(proj_id, db, batch_size=2)
    assert "No files found" in str(exc.value)


@pytest.mark.asyncio
async def test_generate_documentation_with_invalid_project(monkeypatch, db):
    monkeypatch.setattr(doc_ctrl, "hf_generate_batch_async", lambda prompts, parameters=None: ["No doc" for _ in prompts])
    with pytest.raises(Exception):
        await generate_documentation_with_hf("nonexistent_proj", db, batch_size=2)


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
