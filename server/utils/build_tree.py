def build_file_tree(files):
    """
    files: list of dicts with 'filename', 'functions', 'classes'
    Returns a nested dict representing the directory tree.
    """
    tree = {}
    for file in files:
        parts = file["filename"].split("/")
        current = tree
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = {
            "functions": file["functions"],
            "classes": file["classes"]
        }
    return tree