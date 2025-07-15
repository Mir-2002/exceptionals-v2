from fastapi import Depends, File, UploadFile, HTTPException
from utils.db import get_db
from utils.parser import extract_functions_classes_from_file

async def upload_file(project_id: str, file: UploadFile = File(...), db=Depends(get_db)):
    """
    Uploads a file to the specified project, parses it, and stores extracted info.
    """
    try:
        # Read the file content as text
        content = (await file.read()).decode("utf-8")
        
        # Use the parser to extract functions and classes
        parsed = extract_functions_classes_from_file(content)
        
        file_data = {
            "project_id": project_id,
            "filename": file.filename,
            "functions": parsed["functions"],
            "classes": parsed["classes"]
        }
        
        result = await db.files.insert_one(file_data)
        
        return {"file_id": str(result.inserted_id), "filename": file.filename}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while uploading the file: {str(e)}"
        )