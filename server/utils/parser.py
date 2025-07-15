import ast

def extract_functions_classes_from_file(filepath: str):
    """
    Reads a Python file and extracts functions, classes, and their methods.
    Returns a dict with lists of functions and classes (with methods).
    """
    with open(filepath, "r", encoding="utf-8") as f:
        file_content = f.read()
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