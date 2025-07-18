from typing import Optional
from pydantic import BaseModel, Field


class PerFileExclusion(BaseModel):
    filename: str
    exclude_functions: Optional[list[str]] = None
    exclude_classes: Optional[list[str]] = None
    exclude_methods: Optional[list[str]] = None

class DirectoryExclusion(BaseModel):
    exclude_files: Optional[list[str]] = None
    exclude_dirs: Optional[list[str]] = None

class Preferences(BaseModel):
    per_file_exclusion: Optional[list[PerFileExclusion]] = None
    directory_exclusion: Optional[DirectoryExclusion] = None
    format: Optional[str] = "markdown"

    model_config = {
        "json_schema_extra" : {
            "example": {
                "per_file_exclusion": [
                    {
                        "filename": "example.py",
                        "exclude_functions": ["func1", "func2"],
                        "exclude_classes": ["Class1"],
                        "exclude_methods": ["method1"]
                    }
                ],
                "directory_exclusion": {
                    "exclude_files": ["file1.py", "file2.py"],
                    "exclude_dirs": ["dir1", "dir2"]
                },
                "format": "markdown"
            }
        }
    }
        

class UpdatePreferences(Preferences):
    """All fields optional for partial update."""
    pass

class PreferencesResponse(Preferences):
    id: Optional[str] = Field(None, alias="_id")  # MongoDB id if needed
    project_id: Optional[str] = None  # or project_id, if you associate preferences

    model_config = {
        "from_attributes": True
    }