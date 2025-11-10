import pytest
from bson import ObjectId
from fastapi import UploadFile
import io

from controller.FileController import upload_file, upload_project_files, MAX_ITEMS_PER_UPLOAD, MAX_FILES_PER_UPLOAD
from controller.ProjectController import create_project
from model.ProjectModel import ProjectCreate
from model.UserModel import UserInDB

class DummyUploadFile(UploadFile):
    def __init__(self, filename: str, content: bytes):
        super().__init__(filename=filename, file=io.BytesIO(content))

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
