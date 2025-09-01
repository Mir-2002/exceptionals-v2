# Project API Documentation

## Models

### ProjectCreate

```javascript
{
  name: string,
  description: string,
  user_id?: string, // Auto-set from authenticated user
  created_at?: string, // Auto-generated
  updated_at?: string, // Auto-generated
  status?: "complete" | "in_progress" | "empty" // Default: "empty"
}
```

### ProjectUpdate

```javascript
{
  name?: string,
  description?: string,
  status?: "complete" | "in_progress" | "empty"
}
```

### ProjectResponse

```javascript
{
  id: string,
  name: string,
  description: string,
  user_id: string,
  created_at: string,
  updated_at: string,
  status: "complete" | "in_progress" | "empty"
}
```

### FileProcessSummary

```javascript
{
  filename: string,
  included_functions: string[],
  excluded_functions: string[],
  included_classes: string[],
  excluded_classes: string[],
  excluded_methods?: { [className: string]: string[] }
}
```

### ProcessFilesSummaryResponse

```javascript
{
  processed_files: FileProcessSummary[]
}
```

## Endpoints

### 1. Create Project

- **POST** `/api/projects`
- **Protected** (authenticated user)
- **Body**: `ProjectCreate`
- **Response**: `ProjectResponse`

```javascript
async function createProject(projectData, token) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const newProject = await createProject(
  {
    name: "My Python Project",
    description: "A project for generating documentation",
  },
  "your-jwt-token"
);
```

### 2. Get Project by ID

- **GET** `/api/projects/{project_id}`
- **Protected** (authenticated user)
- **Response**: `ProjectResponse`

```javascript
async function getProject(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}`, {
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
const project = await getProject("project123", "your-jwt-token");
```

### 3. Update Project

- **PATCH** `/api/projects/{project_id}`
- **Protected** (project owner or admin)
- **Body**: `ProjectUpdate`
- **Response**: `ProjectResponse`

```javascript
async function updateProject(projectId, updates, token) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const updatedProject = await updateProject(
  "project123",
  {
    description: "Updated description",
    status: "in_progress",
  },
  "your-jwt-token"
);
```

### 4. Delete Project

- **DELETE** `/api/projects/{project_id}`
- **Protected** (project owner or admin)
- **Response**: `{ detail: "Project and all associated files and preferences deleted successfully." }`

```javascript
async function deleteProject(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}`, {
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
const result = await deleteProject("project123", "your-jwt-token");
```

### 5. Apply Preferences to Project

- **POST** `/api/projects/{project_id}/apply-preferences`
- **Protected** (project owner or admin)
- **Response**: `{ detail: string, missing_exclusions: string[] }`

```javascript
async function applyPreferences(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/apply-preferences`, {
    method: "POST",
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
const result = await applyPreferences("project123", "your-jwt-token");
```

### 6. Process Single File

- **POST** `/api/projects/{project_id}/files/{file_id}/process`
- **Protected** (project owner or admin)
- **Response**: `FileProcessSummary`

```javascript
async function processSingleFile(projectId, fileId, token) {
  const response = await fetch(
    `/api/projects/${projectId}/files/${fileId}/process`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const fileSummary = await processSingleFile(
  "project123",
  "file456",
  "your-jwt-token"
);
```

### 7. Process Multiple Files

- **POST** `/api/projects/{project_id}/files/process`
- **Protected** (project owner or admin)
- **Body**: `{ file_ids: string[] }`
- **Response**: `ProcessFilesSummaryResponse`

```javascript
async function processMultipleFiles(projectId, fileIds, token) {
  const response = await fetch(`/api/projects/${projectId}/files/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ file_ids: fileIds }),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const summary = await processMultipleFiles(
  "project123",
  ["file1", "file2", "file3"],
  "your-jwt-token"
);
```

### 8. Process All Project Files

- **POST** `/api/projects/{project_id}/process-files`
- **Protected** (project owner or admin)
- **Response**: `ProcessFilesSummaryResponse`

```javascript
async function processAllProjectFiles(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/process-files`, {
    method: "POST",
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
const projectSummary = await processAllProjectFiles(
  "project123",
  "your-jwt-token"
);
```

## Usage Flow

### Complete Project Lifecycle

```javascript
// 1. Create a new project
const project = await createProject(
  {
    name: "My Documentation Project",
    description: "Python project documentation generator",
  },
  token
);

// 2. Upload files to the project (see File API)
// ... upload files using File API endpoints

// 3. Set preferences for documentation generation (see Preferences API)
// ... create/update preferences using Preferences API

// 4. Process all files according to preferences
const processingResult = await processAllProjectFiles(project.id, token);

// 5. Generate documentation (see Documentation API)
// ... generate docs using Documentation API

// 6. Update project if needed
const updatedProject = await updateProject(
  project.id,
  {
    status: "complete",
  },
  token
);
```

### Processing Files with Preferences

```javascript
// Apply preferences first
await applyPreferences("project123", token);

// Then process specific files
const fileResult = await processSingleFile("project123", "main.py", token);
console.log("Included functions:", fileResult.included_functions);
console.log("Excluded functions:", fileResult.excluded_functions);

// Or process all files at once
const allFilesResult = await processAllProjectFiles("project123", token);
allFilesResult.processed_files.forEach((file) => {
  console.log(`File: ${file.filename}`);
  console.log(
    `Functions: ${file.included_functions.length} included, ${file.excluded_functions.length} excluded`
  );
});
```

### Project Management Helper Functions

```javascript
// Helper to check project status
async function checkProjectStatus(projectId, token) {
  const project = await getProject(projectId, token);
  return project.status;
}

// Helper to get processing summary
async function getProcessingSummary(projectId, token) {
  const result = await processAllProjectFiles(projectId, token);

  const summary = {
    totalFiles: result.processed_files.length,
    totalFunctions: 0,
    totalClasses: 0,
    excludedFunctions: 0,
    excludedClasses: 0,
  };

  result.processed_files.forEach((file) => {
    summary.totalFunctions += file.included_functions.length;
    summary.totalClasses += file.included_classes.length;
    summary.excludedFunctions += file.excluded_functions.length;
    summary.excludedClasses += file.excluded_classes.length;
  });

  return summary;
}

// Usage
const status = await checkProjectStatus("project123", token);
const summary = await getProcessingSummary("project123", token);
```

## Error Responses

| Status Code | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| 400         | Bad Request - Invalid data, duplicate project name, or no changes made |
| 403         | Forbidden - Not authorized (not project owner or admin)                |
| 404         | Not Found - Project, file, or preferences not found                    |
| 500         | Internal Server Error - Server-side error                              |

## Project Status Values

| Status        | Description                                  |
| ------------- | -------------------------------------------- |
| `empty`       | No files uploaded or all files are empty     |
| `in_progress` | Files uploaded but not fully processed       |
| `complete`    | All files processed according to preferences |

## File Processing Details

### Processing Logic

- **Directory Exclusion**: Files in excluded directories are completely ignored
- **File Exclusion**: Specific files can be excluded from processing
- **Per-File Exclusion**: Fine-grained control over functions, classes, and methods
- **Automatic Status Update**: Project status updates based on processing completion

### Processing Results

Each processed file returns:

- **Included Items**: Functions, classes, and methods that will be documented
- **Excluded Items**: Items excluded by preferences
- **Method Exclusions**: Per-class method exclusions (when applicable)

## Notes

- All endpoints except creation require project ownership or admin privileges
- Project names must be unique per user
- Deleting a project removes all associated files and preferences
- Processing files requires existing preferences for the project
- Project status is automatically calculated based on file processing state
- File processing is idempotent - can be run multiple times safely
- Missing exclusions in preferences are reported but don't cause errors
- Processing updates the `processed_functions` and `processed_classes` fields in file records

## Best Practices

### Project Workflow

```javascript
// Recommended workflow for documentation generation
async function documentationWorkflow(projectData, files, preferences, token) {
  // 1. Create project
  const project = await createProject(projectData, token);

  // 2. Upload files (see File API documentation)
  for (const file of files) {
    await uploadFile(project.id, file, token);
  }

  // 3. Set preferences (see Preferences API documentation)
  await createPreferences(project.id, preferences, token);

  // 4. Process files
  const processing = await processAllProjectFiles(project.id, token);

  // 5. Generate documentation (see Documentation API)
  const docs = await generateProjectDocstrings(project.id, token);

  // 6. Mark as complete
  await updateProject(project.id, { status: "complete" }, token);

  return { project, processing, docs };
}
```
