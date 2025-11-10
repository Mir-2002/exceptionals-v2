# filepath: c:\Users\orfia\Documents\School Files\Thesis\Thesis v2\server\tests\conftest.py
import pytest
from bson import ObjectId
from datetime import datetime

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class UpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count

class DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count

class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, length=None):
        return list(self._docs)

class FakeCollection:
    def __init__(self):
        self.docs = []  # list of dicts

    async def create_index(self, *args, **kwargs):
        # No-op for tests
        return None

    def _match(self, doc, filter_):
        # Very small subset of Mongo filter logic used in code under test
        for k, v in filter_.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._match(doc, sub) for sub in v):
                    return False
                continue
            if k == "_id" and isinstance(v, dict) and "$ne" in v:
                if doc.get("_id") == v["$ne"]:
                    return False
                continue
            if doc.get(k) != v:
                return False
        return True

    async def find_one(self, filter_: dict):
        for d in self.docs:
            if self._match(d, filter_):
                return d
        return None

    async def insert_one(self, doc: dict):
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.docs.append(doc)
        return InsertOneResult(doc["_id"])

    async def update_one(self, filter_: dict, update: dict, upsert: bool = False):
        modified = 0
        found = False
        for d in self.docs:
            if self._match(d, filter_):
                found = True
                if "$set" in update:
                    for k, v in update["$set"].items():
                        d[k] = v
                if "$setOnInsert" in update and not upsert: # $setOnInsert only applies on insert
                    pass
                modified += 1
                break
        
        if not found and upsert:
            new_doc = filter_.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            if "$setOnInsert" in update:
                new_doc.update(update["$setOnInsert"])
            if "_id" not in new_doc:
                new_doc["_id"] = ObjectId()
            self.docs.append(new_doc)
            modified = 1 # In reality, this would be an upserted_id

        return UpdateResult(modified)

    async def delete_one(self, filter_: dict):
        for i, d in enumerate(self.docs):
            if self._match(d, filter_):
                del self.docs[i]
                return DeleteResult(1)
        return DeleteResult(0)

    async def delete_many(self, filter_: dict):
        to_delete = [d for d in self.docs if self._match(d, filter_)]
        for d in to_delete:
            self.docs.remove(d)
        return DeleteResult(len(to_delete))

    def find(self, filter_: dict):
        results = [d for d in self.docs if self._match(d, filter_)]
        return FakeCursor(results)

    async def command(self, name):
        if name == "ping":
            return {"ok": 1}
        return {"ok": 0}

class FakeDB:
    def __init__(self):
        self.projects = FakeCollection()
        self.files = FakeCollection()
        self.preferences = FakeCollection()
        self.documentations = FakeCollection()

    # Support db.command("ping") used in readiness endpoint
    async def command(self, name):
        return await self.projects.command(name)

@pytest.fixture
def fakedb():
    return FakeDB()

@pytest.fixture
def project_with_files(fakedb):
    # Insert a project
    proj_id = str(ObjectId())
    fakedb.projects.docs.append({
        "_id": ObjectId(proj_id),
        "name": "TestProj",
        "description": "Desc",
        "user_id": "user123",
        "tags": [],
        "status": "empty",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    })
    # Preferences document
    fakedb.preferences.docs.append({
        "_id": ObjectId(),
        "project_id": proj_id,
        "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
        "per_file_exclusion": [
            {
                "filename": "src/module.py",
                "exclude_functions": ["helper_fn"],
                "exclude_classes": ["HelperClass"],
                "exclude_methods": ["skip_method"]
            }
        ],
        "format": "HTML",
        "current_Step": 1,
    })
    # File doc with functions/classes/methods
    file_id = ObjectId()
    fakedb.files.docs.append({
        "_id": file_id,
        "project_id": proj_id,
        "filename": "src/module.py",
        "functions": [
            {"name": "main_fn"},
            {"name": "helper_fn"},
        ],
        "classes": [
            {"name": "MainClass", "methods": [
                {"name": "run"}, {"name": "skip_method"}
            ]},
            {"name": "HelperClass", "methods": [
                {"name": "assist"}, {"name": "skip_method"}
            ]}
        ],
        # processed_* will be added by logic
    })
    return proj_id, str(file_id)

# Async marker configuration for pytest-asyncio (Python 3.13 compatibility)
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
