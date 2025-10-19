from typing import List, Dict, Any


def build_file_tree(files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build a nested file tree from a flat list of file records.

    Input files are dicts with keys like:
      - 'filename' (required): path like "src/utils/helpers.py"
      - 'functions': list
      - 'classes': list
      - 'id' or '_id': database id

    Output tree example:
      {
        "name": "root",
        "type": "directory",
        "path": "root",
        "children": [
          {"name": "src", "type": "directory", "path": "src", "children": [
            {"name": "utils", "type": "directory", "path": "src/utils", "children": [
              {"name": "helpers.py", "type": "file", "path": "src/utils/helpers.py", "id": "...", "functions": [...], "classes": [...]} 
            ]}
          ]}
        ]
      }
    """

    def ensure_dir(parent: Dict[str, Any], dir_name: str) -> Dict[str, Any]:
        # Find or create a directory child under parent
        for child in parent["children"]:
            if child.get("type") == "directory" and child.get("name") == dir_name:
                return child
        # Create if not found
        path_prefix = parent.get("path", "")
        # root's path is 'root'; do not include 'root' in child paths
        base = "" if path_prefix == "root" else path_prefix
        node_path = f"{base}/{dir_name}".strip("/")
        new_dir = {
            "name": dir_name,
            "type": "directory",
            "path": node_path,
            "children": [],
        }
        parent["children"].append(new_dir)
        return new_dir

    # Initialize the root node
    tree: Dict[str, Any] = {"name": "root", "type": "directory", "path": "root", "children": []}

    for f in files or []:
        filename = (f.get("filename") or "").replace("\\", "/").strip("/")
        if not filename:
            continue
        parts = [p for p in filename.split("/") if p]
        # Traverse/create directories
        node = tree
        for part in parts[:-1]:
            node = ensure_dir(node, part)

        # Final part is the file
        file_name = parts[-1]
        # Prevent duplicate file nodes within the same directory
        existing = None
        for child in node["children"]:
            if child.get("type") == "file" and child.get("name") == file_name:
                existing = child
                break

        # Compute full path (exclude 'root' prefix)
        base = node.get("path", "")
        base = "" if base == "root" else base
        file_path = f"{base}/{file_name}".strip("/")

        file_node = {
            "name": file_name,
            "type": "file",
            "path": file_path,
            "id": str(f.get("id") or f.get("_id") or ""),
            "functions": f.get("functions", []),
            "classes": f.get("classes", []),
        }

        if existing:
            # Update existing node to keep latest metadata (id/functions/classes)
            existing.update(file_node)
        else:
            node["children"].append(file_node)

    # Optional: sort children (directories first, then files, A-Z)
    def sort_recursive(n: Dict[str, Any]):
        if not n.get("children"):
            return
        n["children"].sort(key=lambda c: (c.get("type") != "directory", c.get("name", "").lower()))
        for ch in n["children"]:
            sort_recursive(ch)

    sort_recursive(tree)
    return tree