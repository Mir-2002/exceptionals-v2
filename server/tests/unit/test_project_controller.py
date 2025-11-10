import pytest
from fastapi import HTTPException
from bson import ObjectId

from controller.ProjectController import create_project, process_project_files
from model.ProjectModel import ProjectCreate
from model.UserModel import UserInDB

pytestmark = pytest.mark.asyncio

@pytest.fixture
def current_user():
    # A fixture to represent the logged-in user
    return UserInDB(
        id=ObjectId(),
        username="testuser",
        email="test@test.com"
    )

async def test_create_project_success(fakedb, current_user):
    project_data = ProjectCreate(name="My New Project", description="A test.", tags=["t1"])
    
    # Act
    response = await create_project(project_data, fakedb, current_user)

    # Assert project was created
    assert response.name == "My New Project"
    assert response.user_id == str(current_user.id)
    
    created_proj = await fakedb.projects.find_one({"name": "My New Project"})
    assert created_proj is not None
    assert created_proj["description"] == "A test."

    # Assert default preferences were created via upsert
    created_prefs = await fakedb.preferences.find_one({"project_id": str(created_proj["_id"])})
    assert created_prefs is not None
    assert created_prefs["format"] == "HTML"
    assert "directory_exclusion" in created_prefs

async def test_create_project_duplicate_name_fails(fakedb, current_user):
    # Arrange: pre-insert a project with the same name
    existing_project = ProjectCreate(name="Duplicate Project", description="...")
    await create_project(existing_project, fakedb, current_user)

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        new_project = ProjectCreate(name="Duplicate Project", description="...")
        await create_project(new_project, fakedb, current_user)
    
    assert exc_info.value.status_code == 400
    assert "already exists" in exc_info.value.detail

async def test_process_project_files_applies_all_exclusions(fakedb, project_with_files):
    project_id, _ = project_with_files

    # Arrange: Add a file that should be fully excluded by directory rules
    fakedb.files.docs.append({
        "_id": ObjectId(),
        "project_id": project_id,
        "filename": "excluded_dir/ignore.py",
        "functions": [{"name": "ignored_fn"}],
        "classes": [],
    })
    # And update preferences to exclude that directory
    prefs = await fakedb.preferences.find_one({"project_id": project_id})
    prefs["directory_exclusion"]["exclude_dirs"] = ["excluded_dir"]

    # Act
    response = await process_project_files(project_id, fakedb)

    # Assert
    assert len(response.processed_files) == 2

    # First file: src/module.py (partially excluded)
    summary1 = next(p for p in response.processed_files if p.filename == "src/module.py")
    assert set(summary1.included_functions) == {"main_fn"}
    assert set(summary1.excluded_functions) == {"helper_fn"}
    assert set(summary1.included_classes) == {"MainClass"}
    assert set(summary1.excluded_classes) == {"HelperClass"}
    assert summary1.excluded_methods == {"MainClass": ["skip_method"]}

    # Second file: excluded_dir/ignore.py (fully excluded)
    summary2 = next(p for p in response.processed_files if p.filename == "excluded_dir/ignore.py")
    assert not summary2.included_functions
    assert not summary2.included_classes
    assert set(summary2.excluded_functions) == {"ignored_fn"}
    
    # Check final project status was updated
    project = await fakedb.projects.find_one({"_id": ObjectId(project_id)})
    # It should be 'in_progress' because src/module.py has content, but it's not fully processed
    # based on the original file content vs the processed content.
    # The calculate_project_status logic is complex, but given exclusions, it's unlikely to be 'completed'.
    assert project["status"] == "in_progress"
