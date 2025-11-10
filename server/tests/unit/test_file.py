import io
import zipfile
import pytest
from fastapi import UploadFile
from bson import ObjectId

from controller.FileController import upload_file, upload_project_files, upload_project_zip, get_file, get_files_in_project, delete_file, get_file_tree, MAX_FILES_PER_UPLOAD


class DummyUploadFile(UploadFile):
    def __init__(self, filename: str, content: bytes):
        super().__init__(filename=filename, file=io.BytesIO(content))


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


@pytest.mark.asyncio
async def test_upload_file_invalid_project(db):
    f = DummyUploadFile("bad.py", b"print('bad')\n")
    with pytest.raises(Exception):
        await upload_file("invalid_project_id", f, db)

@pytest.mark.asyncio
async def test_get_file_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P4", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await get_file(pid, "nonexistent_file_id", db)

@pytest.mark.asyncio
async def test_delete_file_not_found(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P5", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    with pytest.raises(Exception):
        await delete_file(pid, "nonexistent_file_id", db)

@pytest.mark.asyncio
async def test_file_tree_empty_project(db):
    pid = str(ObjectId())
    await db.projects.insert_one({"_id": ObjectId(pid), "name": "P6", "description": "", "user_id": "u", "tags": [], "status": "empty"})
    tree = await get_file_tree(pid, db)
    assert tree.body  # Should still return a valid response
