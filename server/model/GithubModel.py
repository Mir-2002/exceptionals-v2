from typing import List
from pydantic import BaseModel, Field

class GithubImportRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    repo_full_name: str = Field(..., pattern=r"^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$")  # e.g., owner/repo
    ref: str = Field(..., min_length=1)  # branch or tag
    tags: List[str] = Field(default_factory=list)
