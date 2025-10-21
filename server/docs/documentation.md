# Documentation API (Production)

## Models

### DocumentationPlan
- Returned by GET /api/documentation/projects/{project_id}/plan

### DocumentationGenerationResponse
- Returned by POST /api/documentation/projects/{project_id}/generate

### Documentation
- Returned by GET /api/documentation/projects/{project_id}/revisions/{revision_id}

### DocumentationRevisionListResponse
- Returned by GET /api/documentation/projects/{project_id}/revisions

## Endpoints

1) POST /api/documentation/projects/{project_id}/generate
- Protected (owner/admin)
- Generates docstrings for included files and returns results and timing info.

2) GET /api/documentation/projects/{project_id}/plan
- Protected
- Returns format, counts, included/excluded files, and planned items.

3) GET /api/documentation/projects/{project_id}/revisions
- Protected
- Lists past revisions (no rendered content).

4) GET /api/documentation/projects/{project_id}/revisions/{revision_id}
- Protected
- Returns a revision with on-the-fly rendered content for HTML/Markdown, or PDF download URL.

5) PATCH /api/documentation/projects/{project_id}/revisions/{revision_id}
- Protected
- Update metadata (title, filename, description).

6) GET /api/documentation/projects/{project_id}/revisions/{revision_id}/download
- Protected
- Download rendered HTML/Markdown or PDF.

## Notes
- Rendering is on-the-fly; only metadata and results are stored.
- Upload limits: <=100 files per upload; <=300 items.
- PDF/HTML/Markdown are segregated and alphabetized with improved styling.
- Generation time is persisted as generation_time_seconds for UI.
