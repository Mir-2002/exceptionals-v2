from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from bson import ObjectId

class DocstringItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: Literal["function", "class", "method"]
    file: str = Field(..., min_length=1, max_length=512)
    code: str
    parent_class: Optional[str] = Field(default=None, min_length=1, max_length=255)

class DocumentationPlan(BaseModel):
    project_id: str
    format: Literal["Markdown", "HTML", "PDF"]
    total_items: int = Field(..., ge=0)
    items: List[DocstringItem]
    excluded_files: List[str]
    included_files: List[str]

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid project_id format")
        return v

class DocumentationResult(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: Literal["function", "class", "method"]
    file: str = Field(..., min_length=1, max_length=512)
    parent_class: Optional[str] = Field(default=None, min_length=1, max_length=255)
    original_code: str
    generated_docstring: str

class DocumentationGenerationResponse(BaseModel):
    project_id: str
    format: Literal["Markdown", "HTML", "PDF"]
    total_items: int = Field(..., ge=0)
    included_files: List[str]
    excluded_files: List[str]
    results: List[DocumentationResult]
    generation_time_seconds: Optional[float] = Field(default=None, ge=0)

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid project_id format")
        return v

# Removed demo/testing models (SingleDocstringRequest/Response, DemoBatch*) for production