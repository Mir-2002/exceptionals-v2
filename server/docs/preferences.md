# Preferences API Documentation

## Models

### PerFileExclusion

```javascript
{
  filename: string,
  exclude_functions?: string[],
  exclude_classes?: string[],
  exclude_methods?: string[]
}
```

### DirectoryExclusion

```javascript
{
  exclude_files?: string[],
  exclude_dirs?: string[]
}
```

### Preferences

```javascript
{
  per_file_exclusion?: PerFileExclusion[],
  directory_exclusion?: DirectoryExclusion,
  format?: string
}
```

### UpdatePreferences

```javascript
{
  per_file_exclusion?: PerFileExclusion[],
  directory_exclusion?: DirectoryExclusion,
  format?: string
}
```

### PreferencesResponse

```javascript
{
  id?: string,
  project_id?: string,
  per_file_exclusion?: PerFileExclusion[],
  directory_exclusion?: DirectoryExclusion,
  format?: string
}
```

## Endpoints

### 1. Create Preferences

- **POST** `/api/projects/{project_id}/preferences/`
- **Protected** (project owner or admin)
- **Body**: `Preferences`
- **Response**: `PreferencesResponse`

```javascript
async function createPreferences(projectId, preferences, token) {
  const response = await fetch(`/api/projects/${projectId}/preferences/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const preferences = await createPreferences(
  "project123",
  {
    per_file_exclusion: [
      {
        filename: "example.py",
        exclude_functions: ["func1", "func2"],
        exclude_classes: ["Class1"],
        exclude_methods: ["method1"],
      },
    ],
    directory_exclusion: {
      exclude_files: ["test.py", "config.py"],
      exclude_dirs: ["tests", "__pycache__"],
    },
    format: "markdown",
  },
  "your-jwt-token"
);
```

### 2. Get Preferences

- **GET** `/api/projects/{project_id}/preferences/`
- **Protected** (project owner or admin)
- **Response**: `PreferencesResponse`

```javascript
async function getPreferences(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/preferences/`, {
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
const preferences = await getPreferences("project123", "your-jwt-token");
```

### 3. Update Preferences

- **PATCH** `/api/projects/{project_id}/preferences/`
- **Protected** (project owner or admin)
- **Body**: `UpdatePreferences` (partial update)
- **Response**: `PreferencesResponse`

```javascript
async function updatePreferences(projectId, updates, token) {
  const response = await fetch(`/api/projects/${projectId}/preferences/`, {
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

// Usage - update just the format
const updatedPreferences = await updatePreferences(
  "project123",
  {
    format: "html",
  },
  "your-jwt-token"
);

// Usage - add new file exclusion
const updatedPreferences = await updatePreferences(
  "project123",
  {
    per_file_exclusion: [
      {
        filename: "new_file.py",
        exclude_functions: ["debug_function"],
      },
    ],
  },
  "your-jwt-token"
);
```

### 4. Delete Preferences

- **DELETE** `/api/projects/{project_id}/preferences/`
- **Protected** (project owner or admin)
- **Response**: `{ detail: "Preferences deleted" }`

```javascript
async function deletePreferences(projectId, token) {
  const response = await fetch(`/api/projects/${projectId}/preferences/`, {
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
const result = await deletePreferences("project123", "your-jwt-token");
```

## Usage Flow

### Complete Preferences Management Flow

```javascript
// 1. Create initial preferences for a project
const initialPrefs = await createPreferences(
  "project123",
  {
    directory_exclusion: {
      exclude_dirs: ["node_modules", "__pycache__", ".git"],
    },
    format: "markdown",
  },
  token
);

// 2. Get current preferences
const currentPrefs = await getPreferences("project123", token);

// 3. Update specific preferences (partial update)
const updatedPrefs = await updatePreferences(
  "project123",
  {
    per_file_exclusion: [
      {
        filename: "main.py",
        exclude_functions: ["debug_print", "temp_function"],
      },
    ],
  },
  token
);

// 4. Delete preferences if needed
const deleteResult = await deletePreferences("project123", token);
```

### Advanced Exclusion Configuration

```javascript
// Complex exclusion setup for large projects
const advancedPreferences = {
  per_file_exclusion: [
    {
      filename: "utils.py",
      exclude_functions: ["_private_helper", "_internal_debug"],
      exclude_classes: ["_InternalClass"],
    },
    {
      filename: "models.py",
      exclude_methods: ["__str__", "__repr__", "_validate_internal"],
    },
  ],
  directory_exclusion: {
    exclude_files: ["test_*.py", "*_test.py", "conftest.py", "setup.py"],
    exclude_dirs: [
      "tests",
      "test",
      "__pycache__",
      ".pytest_cache",
      "venv",
      "env",
      ".git",
    ],
  },
  format: "markdown",
};

const result = await createPreferences(
  "project123",
  advancedPreferences,
  token
);
```

### Utility Functions for Preferences Management

```javascript
// Helper function to add exclusion to existing preferences
async function addFileExclusion(projectId, filename, exclusions, token) {
  const currentPrefs = await getPreferences(projectId, token);

  const existingExclusions = currentPrefs.per_file_exclusion || [];
  const newExclusion = { filename, ...exclusions };

  // Remove existing exclusion for the same file if any
  const filteredExclusions = existingExclusions.filter(
    (exc) => exc.filename !== filename
  );

  return await updatePreferences(
    projectId,
    {
      per_file_exclusion: [...filteredExclusions, newExclusion],
    },
    token
  );
}

// Helper function to remove file from exclusions
async function removeFileExclusion(projectId, filename, token) {
  const currentPrefs = await getPreferences(projectId, token);

  if (!currentPrefs.per_file_exclusion) return currentPrefs;

  const filteredExclusions = currentPrefs.per_file_exclusion.filter(
    (exc) => exc.filename !== filename
  );

  return await updatePreferences(
    projectId,
    {
      per_file_exclusion: filteredExclusions,
    },
    token
  );
}

// Usage
await addFileExclusion(
  "project123",
  "config.py",
  {
    exclude_functions: ["load_secrets", "decrypt_data"],
  },
  token
);

await removeFileExclusion("project123", "old_file.py", token);
```

## Error Responses

| Status Code | Description                                             |
| ----------- | ------------------------------------------------------- |
| 400         | Bad Request - Invalid preferences format or data        |
| 403         | Forbidden - Not authorized (not project owner or admin) |
| 404         | Not Found - Project or preferences not found            |
| 500         | Internal Server Error - Server-side error               |

## Exclusion Types

### Per-File Exclusions

- **exclude_functions**: List of function names to exclude from documentation
- **exclude_classes**: List of class names to exclude from documentation
- **exclude_methods**: List of method names to exclude from documentation

### Directory Exclusions

- **exclude_files**: List of file patterns to exclude (supports wildcards)
- **exclude_dirs**: List of directory names to exclude completely

### Format Options

- **markdown**: Generate documentation in Markdown format
- **html**: Generate documentation in HTML format
- **pdf**: Generate documentation in PDF format

## Notes

- All endpoints require project ownership or admin privileges
- Preferences are specific to each project
- Partial updates are supported - only provided fields will be updated
- Exclusions help customize which parts of code get documented
- File patterns support wildcards (e.g., `test_*.py`, `*_config.py`)
- Directory exclusions apply recursively to all subdirectories
- Default format is `markdown` if not specified
- Creating preferences when they already exist will return an error
- Use PATCH for updates, POST only for initial creation
- Deleting preferences removes all exclusion rules for the project

## Best Practices

### Common Exclusion Patterns

```javascript
// Typical exclusions for Python projects
const commonExclusions = {
  directory_exclusion: {
    exclude_dirs: [
      "__pycache__",
      ".pytest_cache",
      "venv",
      "env",
      ".git",
      "node_modules",
      "tests",
    ],
    exclude_files: [
      "test_*.py",
      "*_test.py",
      "conftest.py",
      "setup.py",
      "__init__.py",
    ],
  },
  per_file_exclusion: [
    {
      filename: "config.py",
      exclude_functions: ["load_secrets", "get_api_keys"],
    },
  ],
};
```
