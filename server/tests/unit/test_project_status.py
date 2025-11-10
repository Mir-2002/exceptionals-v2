import pytest
from controller.ProjectController import calculate_project_status


def test_status_empty_when_no_files():
    assert calculate_project_status([]) == "empty"


def test_status_empty_when_no_functions_or_classes():
    files = [
        {"filename": "a.py", "functions": [], "classes": []},
        {"filename": "b.py"},
    ]
    assert calculate_project_status(files) == "empty"


def test_status_in_progress_partial_processed():
    files = [
        {
            "filename": "a.py",
            "functions": [{"name": "f1"}],
            "classes": [],
            "processed_functions": [],
            "processed_classes": [],
        }
    ]
    assert calculate_project_status(files) == "in_progress"


def test_status_completed_when_all_processed():
    files = [
        {
            "filename": "a.py",
            "functions": [{"name": "f1"}],
            "classes": [{"name": "C1", "methods": []}],
            "processed_functions": [{"name": "f1"}],
            "processed_classes": [{"name": "C1", "methods": []}],
        }
    ]
    assert calculate_project_status(files) == "completed"
