from typing import List, Dict, Optional, Set
from fastapi import HTTPException
from model.DocumentationModel import DocumentationPlan, DocstringItem

def normalize_path(p: Optional[str]) -> str:
    # Remove leading './', '/', and 'root/' for consistency
    p = (p or "").replace("\\", "/")
    if p.startswith("root/"):
        p = p[len("root/") :]
    return p.lstrip("./").lstrip("/")

def is_file_excluded(file_path: str, exclude_files: List[str], exclude_dirs: List[str]) -> bool:
    npath = normalize_path(file_path)
    files = {normalize_path(f) for f in (exclude_files or [])}
    dirs = [normalize_path(d) for d in (exclude_dirs or [])]
    if npath in files:
        return True
    for d in dirs:
        if npath == d or npath.startswith(d + "/"):
            return True
    return False

def build_per_file_exclusion_map(per_file_exclusion: List[dict]) -> Dict[str, dict]:
    m: Dict[str, dict] = {}
    for e in per_file_exclusion or []:
        fn = normalize_path(e.get("filename", ""))
        if not fn:
            continue
        m[fn] = {
            "exclude_functions": set(e.get("exclude_functions") or []),
            "exclude_classes": set(e.get("exclude_classes") or []),
            "exclude_methods": set(e.get("exclude_methods") or []),
        }
    return m

def apply_preferences_filter(items: List[DocstringItem], preferences: dict) -> tuple[List[DocstringItem], List[str], List[str]]:
    """
    Retained for item-level filtering. File-level inclusion is now computed separately.
    """
    dir_ex = preferences.get("directory_exclusion", {}) or {}
    exclude_files = dir_ex.get("exclude_files", []) or []
    exclude_dirs = dir_ex.get("exclude_dirs", []) or []
    per_file = build_per_file_exclusion_map(preferences.get("per_file_exclusion") or [])

    filtered: List[DocstringItem] = []
    included_files: Set[str] = set()
    excluded_files: Set[str] = set()

    for it in items:
        nfile = normalize_path(it.file)
        if is_file_excluded(nfile, exclude_files, exclude_dirs):
            excluded_files.add(nfile)
            continue

        pf = per_file.get(nfile, {
            "exclude_functions": set(),
            "exclude_classes": set(),
            "exclude_methods": set(),
        })

        drop = False
        if it.type == "function" and it.name in pf["exclude_functions"]:
            drop = True
        elif it.type == "class" and it.name in pf["exclude_classes"]:
            drop = True
        elif it.type == "method":
            if (it.parent_class and it.parent_class in pf["exclude_classes"]) or (it.name in pf["exclude_methods"]):
                drop = True

        if drop:
            continue

        filtered.append(it)
        included_files.add(nfile)

    return filtered, sorted(excluded_files), sorted(included_files)

async def get_project_preferences(db, project_id: str) -> dict:
    prefs = await db.preferences.find_one({"project_id": project_id})
    if not prefs:
        prefs = await db.project_preferences.find_one({"project_id": project_id})
    if not prefs:
        return {
            "directory_exclusion": {"exclude_files": [], "exclude_dirs": []},
            "per_file_exclusion": [],
            "format": "HTML",
        }
    return {
        "directory_exclusion": prefs.get("directory_exclusion", {"exclude_files": [], "exclude_dirs": []}),
        "per_file_exclusion": prefs.get("per_file_exclusion", []),
        "format": prefs.get("format") or prefs.get("project_settings", {}).get("format", "HTML"),
    }

async def plan_documentation_generation(project_id: str, db) -> DocumentationPlan:
    """
    Compute:
    - included_files/excluded_files from directory_exclusion over ALL files.
    - total_items from item-level filtering on included files.
    """
    prefs = await get_project_preferences(db, project_id)

    files = await db.files.find({"project_id": project_id}).to_list(length=None)
    if not files:
        raise HTTPException(status_code=404, detail="No files found for this project")

    dir_ex = prefs.get("directory_exclusion", {}) or {}
    exclude_files = dir_ex.get("exclude_files", []) or []
    exclude_dirs = dir_ex.get("exclude_dirs", []) or []

    # 1) Determine included/excluded files purely from directory rules
    included_file_paths: List[str] = []
    excluded_file_paths: List[str] = []
    for f in files:
        filename = normalize_path(f.get("filename") or f.get("path") or "")
        if not filename:
            continue
        if is_file_excluded(filename, exclude_files, exclude_dirs):
            excluded_file_paths.append(filename)
        else:
            included_file_paths.append(filename)

    # 2) Build items only from included files for efficiency
    items: List[DocstringItem] = []
    included_set = set(included_file_paths)
    for f in files:
        filename = normalize_path(f.get("filename") or f.get("path") or "")
        if not filename or filename not in included_set:
            continue

        for func in (f.get("functions") or []):
            items.append(DocstringItem(
                name=func.get("name", ""),
                type="function",
                file=filename,
                code=func.get("code", ""),
            ))

        for cls in (f.get("classes") or []):
            items.append(DocstringItem(
                name=cls.get("name", ""),
                type="class",
                file=filename,
                code=cls.get("code", ""),
            ))
            for method in (cls.get("methods") or []):
                items.append(DocstringItem(
                    name=method.get("name", ""),
                    type="method",
                    file=filename,
                    code=method.get("code", ""),
                    parent_class=cls.get("name", ""),
                ))

    # 3) Apply per-file exclusions to items (does NOT affect included/excluded files)
    filtered_items, _, _ = apply_preferences_filter(items, prefs)

    return DocumentationPlan(
        project_id=project_id,
        format=prefs["format"],
        total_items=len(filtered_items),
        items=filtered_items,
        excluded_files=sorted(set(excluded_file_paths)),
        included_files=sorted(set(included_file_paths)),
    )