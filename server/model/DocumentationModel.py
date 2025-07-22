from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

class SingleDocstringRequest(BaseModel):
    code: str
    name: Optional[str] = None
    type: Optional[Literal["function", "class", "method"]] = None

class SingleDocstringResponse(BaseModel):
    docstring: Optional[str] = None  # generated docstring
    status: Literal["pending", "completed", "failed"] = "pending"
    error: Optional[str] = None

class DocstringInfo(BaseModel):
    name: str  # function/class/method name
    type: Literal["function", "class", "method"]
    file: str  # filename
    code: str  # code snippet sent to the model
    docstring: Optional[str] = None  # generated docstring
    status: Literal["pending", "completed", "failed"] = "pending"
    error: Optional[str] = None
    generated_at: Optional[datetime] = None

class DocumentationRequest(BaseModel):
    project_id: str
    items: List[DocstringInfo]

class DocumentationResponse(BaseModel):
    project_id: str
    documented: List[DocstringInfo]
    failed: Optional[List[DocstringInfo]] = None

class Documentation(BaseModel):
    project_id: str
    revision_id: str  # UUID or incrementing number
    format: Literal["markdown", "html", "pdf"]
    content: str  # The generated documentation as a string (or file reference for PDF)
    documented: List[DocstringInfo]
    created_by: Optional[str] = None  # user_id or username
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None  # Optional user notes about this revision

# Optionally, a response model for listing revisions:
class DocumentationRevisionListResponse(BaseModel):
    project_id: str
    revisions: List[Documentation]