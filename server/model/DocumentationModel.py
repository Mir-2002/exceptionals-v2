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

class DocumentationResult(BaseModel):
    name: str
    type: Literal["function", "class", "method"]
    file: str
    parent_class: Optional[str] = None
    original_code: str
    generated_docstring: str

class DocumentationGenerationResponse(BaseModel):
    project_id: str
    format: str
    total_items: int
    included_files: List[str]
    excluded_files: List[str]
    results: List[DocumentationResult]
    generation_time_seconds: Optional[float] = None

class SingleDocstringRequest(BaseModel):
    code: str
    name: Optional[str] = None
    type: Optional[Literal["function", "class", "method"]] = None

class SingleDocstringResponse(BaseModel):
    docstring: Optional[str] = None
    status: Literal["pending", "completed", "failed"]
    error: Optional[str] = None

# Demo batch models (no project context)
class DemoBatchRequest(BaseModel):
    code: str
    filename: Optional[str] = None

class DemoGeneratedItem(BaseModel):
    name: str
    type: Literal["function", "class", "method"]
    file: Optional[str] = None
    parent_class: Optional[str] = None
    original_code: str
    generated_docstring: str

class DemoBatchResponse(BaseModel):
    total_items: int
    results: List[DemoGeneratedItem]