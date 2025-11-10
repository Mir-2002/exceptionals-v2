import pytest
from controller.ProjectController import process_single_file

pytestmark = pytest.mark.asyncio


async def test_process_single_file_respects_per_file_exclusions(fakedb, project_with_files):
    project_id, file_id = project_with_files

    # Act
    summary = await process_single_file(project_id, file_id, fakedb)

    # Assert included/excluded
    assert summary.filename == "src/module.py"
    # helper_fn should be excluded, main_fn kept
    assert set(summary.included_functions) == {"main_fn"}
    assert set(summary.excluded_functions) == {"helper_fn"}

    # HelperClass excluded entirely; MainClass kept but skip_method removed
    assert set(summary.included_classes) == {"MainClass"}
    assert set(summary.excluded_classes) == {"HelperClass"}
    assert summary.excluded_methods == {"MainClass": ["skip_method"]}

    # Persisted processed_* on file
    stored = await fakedb.files.find_one({"_id": fakedb.files.docs[0]["_id"]})
    assert [f["name"] for f in stored["processed_functions"]] == ["main_fn"]
    assert stored["processed_classes"][0]["name"] == "MainClass"
    method_names = [m["name"] for m in stored["processed_classes"][0]["methods"]]
    assert method_names == ["run"]
