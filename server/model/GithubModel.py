from typing import List
from pydantic import BaseModel

class GithubImportRequest(BaseModel):
    name: str
    description: str
    repo_full_name: str  # e.g., owner/repo
    ref: str  # branch or tag
    tags: List[str] = []
