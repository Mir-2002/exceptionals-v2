import pytest
from bson import ObjectId
from fastapi import UploadFile, HTTPException
import fastapi
import io

from controller.FileController import (
    upload_file,
    upload_project_files,
    upload_project_zip,
    get_files_in_project,
    delete_project_files,
    MAX_ITEMS_PER_UPLOAD,
)

class DummyUploadFile(UploadFile):
    def __init__(self, filename: str, content: bytes):
        super().__init__(filename=filename, file=io.BytesIO(content))


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
