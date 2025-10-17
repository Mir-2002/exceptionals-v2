from pydantic import BaseModel
from typing import Optional, List, Literal

class DocstringItem(BaseModel):
    name: str
    type: Literal["function", "class", "method"]
    file: str
    code: str
    parent_class: Optional[str] = None  # For methods, which class they belong to

class DocumentationPlan(BaseModel):
    project_id: str
    format: str  # HTML, PDF, Markdown
    total_items: int
    items: List[DocstringItem]
    excluded_files: List[str]
    included_files: List[str]