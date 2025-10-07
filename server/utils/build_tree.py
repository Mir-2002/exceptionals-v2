def build_file_tree(files):
    """
    files: list of dicts with 'filename', 'functions', 'classes', 'id' or '_id'
    Returns a nested tree structure suitable for frontend display.
    """
    def insert(parts, file_info, node):
        part = parts[0]
        # If this is the last part, it's a file
        if len(parts) == 1:
            node["children"].append({
                "name": part,
                "id": str(file_info.get("id") or file_info.get("_id")),  # Add id to file node
                "functions": file_info["functions"],
                "classes": file_info["classes"]
            })
        else:
            # It's a directory
            # Find or create the directory node
            for child in node["children"]:
                if child["name"] == part and "children" in child:
                    next_node = child
                    break
            else:
                next_node = {"name": part, "children": []}
                node["children"].append(next_node)
            insert(parts[1:], file_info, next_node)

    tree = {"name": "root", "children": []}
    for file in files:
        parts = file["filename"].split("/")
        insert(parts, file, tree)
    return tree