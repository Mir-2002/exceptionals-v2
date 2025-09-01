# File API Documentation

## Models

### FunctionInfo

```javascript
{
  name: string,
  code: string
}
```

### ClassInfo

```javascript
{
  name: string,
  code: string,
  methods: FunctionInfo[]
}
```

### FileResponse

```javascript
{
  id: string,
  project_id: string,
  filename: string,
  functions: FunctionInfo[],
  classes: ClassInfo[],
  processed_functions: FunctionInfo[],
  processed_classes: ClassInfo[]
}
```

### FileTreeNode

```javascript
{
  name: string,
  type: "file" | "directory",
  children?: FileTreeNode[]
}
```

## Endpoints

### 1. Upload Single File

- **POST** `/api/projects/{project_id}/files/`
- **Protected** (project owner or admin)
- **Body**: File upload (multipart/form-data)
- **Response**: `{ file_id: string, filename: string }`

```javascript
async function uploadFile(projectId, file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/projects/${projectId}/files/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const fileInput = document.getElementById("file-input");
const file = fileInput.files[0];
const result = await uploadFile("project123", file, "your-jwt-token");
```

### 2. Upload Project ZIP

- **POST** `/api/projects/{project_id}/files/upload-zip`
- **Protected** (project owner or admin)
- **Body**: ZIP file upload (multipart/form-data)
- **Response**: `{ detail: string, files_processed: number }`

```javascript
async function uploadProjectZip(projectId, zipFile, token) {
  const formData = new FormData();
  formData.append("zip_file", zipFile);

  const response = await fetch(`/api/projects/${projectId}/files/upload-zip`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const zipInput = document.getElementById("zip-input");
const zipFile = zipInput.files[0];
const result = await uploadProjectZip("project123", zipFile, "your-jwt-token");
```

### 3. Get File Tree

- **GET** `/api/projects/{project_id}/files/tree`
- **Protected** (project owner or admin)
- **Response**: `FileTreeNode`

```javascript
async function getFileTree(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/files/tree`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const fileTree = await getFileTree("project123", "your-jwt-token");
```

### 4. Get All Files

- **GET** `/api/projects/{project_id}/files/all`
- **Protected** (project owner or admin)
- **Response**: `FileResponse[]`

```javascript
async function getAllFiles(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/files/all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const files = await getAllFiles("project123", "your-jwt-token");
```

### 5. Get Single File

- **GET** `/api/projects/{project_id}/files/{file_id}`
- **Protected** (project owner or admin)
- **Response**: `FileResponse`

```javascript
async function getFile(projectId, fileId, token) {
  const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const file = await getFile("project123", "file456", "your-jwt-token");
```

### 6. Delete Single File

- **DELETE** `/api/projects/{project_id}/files/{file_id}`
- **Protected** (project owner or admin)
- **Response**: `{ detail: "File deleted successfully" }`

```javascript
async function deleteFile(projectId, fileId, token) {
  const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const result = await deleteFile("project123", "file456", "your-jwt-token");
```

### 7. Delete All Project Files

- **DELETE** `/api/projects/{project_id}/files/`
- **Protected** (project owner or admin)
- **Response**: `{ detail: string }` (with count of deleted files)

```javascript
async function deleteAllProjectFiles(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/files/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const result = await deleteAllProjectFiles("project123", "your-jwt-token");
```

## Usage Flow

### Complete File Upload and Management Flow

```javascript
// 1. Upload a single Python file
const singleFileResult = await uploadFile("project123", pythonFile, token);

// 2. Or upload an entire project as ZIP
const zipResult = await uploadProjectZip("project123", zipFile, token);

// 3. Get the file tree structure
const tree = await getFileTree("project123", token);

// 4. Get all files with parsed content
const allFiles = await getAllFiles("project123", token);

// 5. Get specific file details
const specificFile = await getFile("project123", "file456", token);

// 6. Delete a file if needed
const deleteResult = await deleteFile("project123", "file456", token);
```

### File Upload with Progress Tracking

```javascript
async function uploadFileWithProgress(projectId, file, token, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.open("POST", `/api/projects/${projectId}/files/`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

// Usage
const result = await uploadFileWithProgress(
  "project123",
  file,
  token,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);
```

## Error Responses

| Status Code | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| 400         | Bad Request - Invalid file format or corrupted file         |
| 403         | Forbidden - Not authorized (not project owner or admin)     |
| 404         | Not Found - Project, file, or files not found               |
| 413         | Payload Too Large - File size exceeds limit                 |
| 500         | Internal Server Error - Server-side error during processing |

## File Processing

### Supported File Types

- **Single Files**: `.py` (Python files)
- **ZIP Archives**: Contains multiple `.py` files

### Automatic Processing

- **Function Extraction**: Automatically parses and extracts all function definitions
- **Class Extraction**: Automatically parses and extracts all class definitions with methods
- **Project Status Update**: Updates project status based on uploaded files
- **File Tree Generation**: Creates nested directory structure from file paths

### Parsed Content Structure

```javascript
// Example of parsed file content
{
  "id": "file123",
  "filename": "example.py",
  "functions": [
    {
      "name": "calculate_area",
      "code": "def calculate_area(radius):\n    return 3.14159 * radius * radius"
    }
  ],
  "classes": [
    {
      "name": "Circle",
      "code": "class Circle:\n    def __init__(self, radius):\n        self.radius = radius",
      "methods": [
        {
          "name": "__init__",
          "code": "def __init__(self, radius):\n    self.radius = radius"
        }
      ]
    }
  ]
}
```

## Notes

- All endpoints require project ownership or admin privileges
- Files are automatically parsed for Python functions and classes
- ZIP uploads extract all `.py` files and maintain directory structure
- File tree endpoint provides hierarchical view of uploaded files
- Uploading files automatically updates the parent project's status
- Large files may take time to process; consider implementing progress indicators
- Deleted files cannot be recovered; ensure proper confirmation before deletion
- The system maintains both original and processed versions of code structures
