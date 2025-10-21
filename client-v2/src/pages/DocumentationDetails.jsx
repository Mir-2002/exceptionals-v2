import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  getDocumentationRevision,
  downloadDocumentationRevision,
  updateDocumentationRevision,
} from "../services/documentationService";
import { updateProject } from "../services/projectService";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { logger } from "../utils/logger";

export default function DocumentationDetails() {
  const { projectId, revisionId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  // Inline metadata editing state
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaFilename, setMetaFilename] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!projectId || !revisionId || !token) return;
      setLoading(true);
      try {
        const data = await getDocumentationRevision(
          projectId,
          revisionId,
          token
        );
        if (mounted) {
          setDoc(data);
          // Initialize editor fields from loaded doc
          setMetaTitle(data?.title || "");
          setMetaFilename(data?.filename || "");
          setMetaDescription(data?.description || "");
        }
        // Mark project as complete once documentation is available
        try {
          await updateProject(projectId, { status: "completed" }, token);
        } catch (e) {
          // Ignore errors, do not block UI
        }
      } catch (e) {
        logger.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [projectId, revisionId, token]);

  useEffect(() => {
    // If PDF, prefetch as blob and create object URL to render under auth
    const fetchPdf = async () => {
      if (!doc) return;
      const fmt = (doc.format || "HTML").toUpperCase();
      if (fmt !== "PDF") return;
      try {
        const res = await downloadDocumentationRevision(
          projectId,
          revisionId,
          token
        );
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        logger.error("Failed to fetch PDF blob", e);
      }
    };
    fetchPdf();
  }, [doc, projectId, revisionId, token]);

  const onDownload = async () => {
    if (!projectId || !revisionId || !token) return;
    setDownloading(true);
    try {
      const res = await downloadDocumentationRevision(
        projectId,
        revisionId,
        token
      );
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition =
        res.headers["content-disposition"] ||
        "attachment; filename=documentation";
      const match = /filename=([^;]+)/.exec(disposition);
      const filename = match ? match[1] : `documentation_${revisionId}`;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      logger.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const onSaveMeta = async () => {
    if (!projectId || !revisionId || !token) return;
    setSavingMeta(true);
    try {
      const payload = {};
      if (typeof metaTitle === "string") payload.title = metaTitle;
      if (typeof metaFilename === "string") payload.filename = metaFilename;
      if (typeof metaDescription === "string")
        payload.description = metaDescription;
      await updateDocumentationRevision(projectId, revisionId, token, payload);
      // Re-fetch to refresh preview content (title affects rendered output)
      const updated = await getDocumentationRevision(
        projectId,
        revisionId,
        token
      );
      setDoc(updated);
      setEditingMeta(false);
    } catch (e) {
      logger.error("Failed to update metadata", e);
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading documentation..." />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6">
        <Card>
          <Card.Header>
            <Card.Title>Documentation</Card.Title>
          </Card.Header>
          <Card.Content>Not found</Card.Content>
        </Card>
      </div>
    );
  }

  const fmt = (doc.format || "HTML").toUpperCase();
  const totalItems = Array.isArray(doc.results) ? doc.results.length : 0;
  const generatedCount = totalItems; // all items generated for a revision
  const successRate = totalItems > 0 ? 100 : 0;
  const elapsedSecs =
    typeof doc.generation_time_seconds === "number"
      ? doc.generation_time_seconds
      : null;
  const elapsedDisplay =
    elapsedSecs !== null
      ? `${Math.floor(elapsedSecs / 60)}m ${Math.floor(elapsedSecs % 60)}s`
      : "N/A";

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentation</h2>
          <div className="text-sm text-gray-500">Revision: {doc.id}</div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Back to Project
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/projects/${projectId}/documentation/browser`)
            }
          >
            Browse All Revisions
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
          >
            Regenerate
          </Button>
          <Button variant="secondary" onClick={() => setEditingMeta((v) => !v)}>
            {editingMeta ? "Cancel" : "Edit Metadata"}
          </Button>
          <Button variant="primary" onClick={onDownload} disabled={downloading}>
            {downloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded border bg-blue-50 text-blue-800 border-blue-200">
          <div className="text-xs">Total Items</div>
          <div className="text-2xl font-bold">{totalItems}</div>
        </div>
        <div className="p-4 rounded border bg-green-50 text-green-800 border-green-200">
          <div className="text-xs">Generated</div>
          <div className="text-2xl font-bold">{generatedCount}</div>
        </div>
        <div className="p-4 rounded border bg-purple-50 text-purple-800 border-purple-200">
          <div className="text-xs">Success Rate</div>
          <div className="text-2xl font-bold">{successRate}%</div>
        </div>
        <div className="p-4 rounded border bg-amber-50 text-amber-800 border-amber-200">
          <div className="text-xs">Elapsed</div>
          <div className="text-2xl font-bold">{elapsedDisplay}</div>
        </div>
      </div>

      {editingMeta && (
        <Card>
          <Card.Header>
            <Card.Title>Edit Metadata</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={doc.title || doc.project_name || "Untitled"}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Download filename
                </label>
                <input
                  type="text"
                  value={metaFilename}
                  onChange={(e) => setMetaFilename(e.target.value)}
                  placeholder={`documentation_${projectId}_${doc.id}.${
                    (doc.format || "HTML").toUpperCase() === "PDF"
                      ? "pdf"
                      : (doc.format || "HTML").toUpperCase() === "MARKDOWN"
                      ? "md"
                      : "html"
                  }`}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                Description (only in documentation)
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                className="w-full border rounded px-2 py-1"
                placeholder="Optional description shown in the document header."
              />
            </div>
          </Card.Content>
          <Card.Footer className="justify-end">
            <Button
              variant="primary"
              onClick={onSaveMeta}
              disabled={savingMeta}
            >
              {savingMeta ? "Saving..." : "Save"}
            </Button>
          </Card.Footer>
        </Card>
      )}

      {/* Content Viewer */}
      <Card>
        <Card.Header>
          <Card.Title>Rendered Output ({fmt})</Card.Title>
        </Card.Header>
        <Card.Content>
          {/* Show description under heading for quick preview */}
          {doc.description && (
            <div className="mb-3 text-sm text-gray-700">{doc.description}</div>
          )}
          {fmt === "PDF" ? (
            pdfUrl ? (
              <iframe
                title="doc-pdf"
                src={pdfUrl}
                className="w-full h-[75vh] border rounded"
              />
            ) : (
              <div className="text-sm text-gray-500">
                Loading PDF preview...
              </div>
            )
          ) : fmt === "MARKDOWN" ? (
            <SyntaxHighlighter
              language="markdown"
              style={atomOneLight}
              customStyle={{ maxHeight: "75vh" }}
            >
              {doc.content}
            </SyntaxHighlighter>
          ) : (
            <iframe
              title="doc-html"
              srcDoc={doc.content}
              className="w-full h-[75vh] border rounded"
            />
          )}
        </Card.Content>
      </Card>

      {/* Items Summary Grid (original simple view) */}
      {Array.isArray(doc.results) && doc.results.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Items Overview</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {doc.results.map((r, idx) => (
                <div key={idx} className="border rounded p-3 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs rounded border uppercase ${
                        r.type === "function"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : r.type === "class"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-purple-100 text-purple-800 border-purple-200"
                      }`}
                    >
                      {r.type}
                    </span>
                    <span className="font-mono text-sm break-all font-semibold">
                      {r.name}
                      {r.parent_class ? ` (class ${r.parent_class})` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 break-all mb-2">
                    {r.file}
                  </div>
                  <pre className="bg-gray-50 rounded p-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {r.generated_docstring}
                  </pre>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
