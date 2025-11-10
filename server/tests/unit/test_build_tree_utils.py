import pytest
from utils.build_tree import build_file_tree


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
