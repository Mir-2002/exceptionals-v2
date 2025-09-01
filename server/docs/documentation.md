# Documentation API Documentation

# NOTE: Under further development. If may isusuggest ka, i pm mo lang sakin. Finifigure out ko pa mga required na endpoints.

## Models

### SingleDocstringRequest

```javascript
{
  code: string,
  name?: string,
  type?: "function" | "class" | "method"
}
```

### SingleDocstringResponse

```javascript
{
  docstring?: string,
  status: "pending" | "completed" | "failed",
  error?: string
}
```

### DocstringInfo

```javascript
{
  name: string,
  type: "function" | "class" | "method",
  file: string,
  code: string,
  docstring?: string,
  status: "pending" | "completed" | "failed",
  error?: string,
  generated_at?: string
}
```

### DocumentationResponse

```javascript
{
  project_id: string,
  documented: DocstringInfo[],
  failed?: DocstringInfo[]
}
```

### Documentation

```javascript
{
  project_id: string,
  revision_id: string,
  format: "markdown" | "html" | "pdf",
  content: string,
  documented: DocstringInfo[],
  created_by?: string,
  created_at: string,
  notes?: string
}
```

### DocumentationRevisionListResponse

```javascript
{
  project_id: string,
  revisions: Documentation[]
}
```

## Endpoints

### 1. Demo Docstring Generation

- **POST** `/api/documentation/demo`
- **Public** (no authentication required)
- **Body**: `SingleDocstringRequest`
- **Response**: `SingleDocstringResponse`

```javascript
async function generateDemoDocstring(codeData) {
  const response = await fetch("/api/documentation/demo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(codeData),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const result = await generateDemoDocstring({
  code: 'def hello_world():\n    print("Hello, World!")',
  name: "hello_world",
  type: "function",
});
```

### 2. Generate Project Docstrings

- **POST** `/api/documentation/projects/{project_id}/generate`
- **Protected** (project owner or admin)
- **Response**: `DocumentationResponse`

```javascript
async function generateProjectDocstrings(projectId, token) {
  const response = await fetch(
    `/api/documentation/projects/${projectId}/generate`,
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
const documentation = await generateProjectDocstrings(
  "project123",
  "your-jwt-token"
);
```

### 3. Save Documentation Revision

- **POST** `/api/documentation/projects/{project_id}/revisions`
- **Protected** (project owner or admin)
- **Query Parameters**: `format`, `content`, `documented`, `notes` (optional)
- **Response**: `Documentation`

```javascript
async function saveDocumentationRevision(projectId, revisionData, token) {
  const params = new URLSearchParams({
    format: revisionData.format,
    content: revisionData.content,
    documented: JSON.stringify(revisionData.documented),
  });

  if (revisionData.notes) {
    params.append("notes", revisionData.notes);
  }

  const response = await fetch(
    `/api/documentation/projects/${projectId}/revisions?${params}`,
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
const revision = await saveDocumentationRevision(
  "project123",
  {
    format: "markdown",
    content: "# Project Documentation\n...",
    documented: [
      /* DocstringInfo objects */
    ],
    notes: "Initial documentation revision",
  },
  "your-jwt-token"
);
```

### 4. List Documentation Revisions

- **GET** `/api/documentation/projects/{project_id}/revisions`
- **Protected** (project owner or admin)
- **Response**: `DocumentationRevisionListResponse`

```javascript
async function listDocumentationRevisions(projectId, token) {
  const response = await fetch(
    `/api/documentation/projects/${projectId}/revisions`,
    {
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
const revisions = await listDocumentationRevisions(
  "project123",
  "your-jwt-token"
);
```

### 5. Get Documentation Revision

- **GET** `/api/documentation/projects/{project_id}/revisions/{revision_id}`
- **Protected** (project owner or admin)
- **Response**: `Documentation`

```javascript
async function getDocumentationRevision(projectId, revisionId, token) {
  const response = await fetch(
    `/api/documentation/projects/${projectId}/revisions/${revisionId}`,
    {
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
const revision = await getDocumentationRevision(
  "project123",
  "revision456",
  "your-jwt-token"
);
```

## Usage Flow

### Complete Documentation Generation Flow

```javascript
// 1. Generate docstrings for entire project
const documentationResponse = await generateProjectDocstrings(
  "project123",
  token
);

// 2. Process the generated documentation (e.g., format as markdown)
const markdownContent = formatDocumentationAsMarkdown(
  documentationResponse.documented
);

// 3. Save as a revision
const revision = await saveDocumentationRevision(
  "project123",
  {
    format: "markdown",
    content: markdownContent,
    documented: documentationResponse.documented,
    notes: "Auto-generated documentation",
  },
  token
);

// 4. List all revisions to see history
const allRevisions = await listDocumentationRevisions("project123", token);
```

### Demo/Test Single Function

```javascript
// Test docstring generation for a single function
const testResult = await generateDemoDocstring({
  code: `
def calculate_area(radius):
    return 3.14159 * radius * radius
  `,
  name: "calculate_area",
  type: "function",
});

console.log(testResult.docstring); // Generated docstring
```

## Error Responses

| Status Code | Description                                             |
| ----------- | ------------------------------------------------------- |
| 400         | Bad Request - Invalid code or request data              |
| 403         | Forbidden - Not authorized (not project owner or admin) |
| 404         | Not Found - Project or revision not found               |
| 503         | Service Unavailable - HuggingFace endpoint unavailable  |
| 500         | Internal Server Error - Server-side error               |

## Notes

- The demo endpoint is public and can be used to test docstring generation
- All project-related endpoints require project ownership or admin privileges
- Documentation generation uses HuggingFace AI models with automatic retry logic
- Generated docstrings are stored as revisions for version control
- Supported formats: markdown, html, pdf
- Failed docstring generations are tracked separately in the response
- The system processes functions, classes, and methods from uploaded project files
- Revisions are sorted by creation date (newest first)

## AI Model Information

- **Provider**: HuggingFace Inference API
- **Retry Logic**: Up to 10 retries with 5-second delays for 502/503 errors
- **Timeout**: 60 seconds per request
- **Input**: Raw code snippets
- **Output**: Generated docstrings in natural language
