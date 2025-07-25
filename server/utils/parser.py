import ast

def extract_functions_classes_from_content(file_content: str):
    """
    Extracts functions, classes, and their methods from Python source code.
    Returns a dict with lists of functions and classes (with methods).
    """
    tree = ast.parse(file_content)
    functions = []
    classes = []

    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            func_code = ast.get_source_segment(file_content, node) or ""
            functions.append({
                "name": node.name,
                "code": func_code
            })
        elif isinstance(node, ast.ClassDef):
            class_code = ast.get_source_segment(file_content, node) or ""
            methods = []
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    method_code = ast.get_source_segment(file_content, item) or ""
                    methods.append({
                        "name": item.name,
                        "code": method_code
                    })
            classes.append({
                "name": node.name,
                "code": class_code,
                "methods": methods
            })

    return {
        "functions": functions,
        "classes": classes
    }

import zipfile
import os
import tempfile

def extract_py_files_from_zip(zip_bytes) -> list:
    """
    Extracts all Python files from a zip (as bytes), preserving directory hierarchy.
    Returns a list of dicts: [{ "filename": <relative_path>, "functions": [...], "classes": [...] }, ...]
    """

    extracted_files = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        tmp.write(zip_bytes)
        tmp_path = tmp.name

    with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
        with tempfile.TemporaryDirectory() as extract_dir:
            zip_ref.extractall(extract_dir)
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.endswith(".py"):
                        abs_path = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_path, extract_dir)
                        with open(abs_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        parsed = extract_functions_classes_from_content(content)
                        extracted_files.append({
                            "filename": rel_path.replace("\\", "/"),
                            "functions": parsed["functions"],
                            "classes": parsed["classes"]
                        })
    os.remove(tmp_path)
    return extracted_files