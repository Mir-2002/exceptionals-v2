import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  getDocumentationRevision,
  downloadDocumentationRevision,
} from "../services/documentationService";
import { updateProject } from "../services/projectService";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

export default function DocumentationDetails() {
  const { projectId, revisionId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

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
        if (mounted) setDoc(data);
        // Mark project as complete once documentation is available
        try {
          await updateProject(projectId, { status: "completed" }, token);
        } catch (e) {
          // Ignore errors, do not block UI
        }
      } catch (e) {
        console.error(e);
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
        console.error("Failed to fetch PDF blob", e);
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
      console.error(e);
    } finally {
      setDownloading(false);
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
            onClick={() => navigate(`/projects/${projectId}/documentation/browser`)}
          >
            Browse All Revisions
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
          >
            Regenerate
          </Button>
          <Button variant="primary" onClick={onDownload} disabled={downloading}>
            {downloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>

      {/* Content Viewer */}
      <Card>
        <Card.Header>
          <Card.Title>Rendered Output ({fmt})</Card.Title>
        </Card.Header>
        <Card.Content>
          {fmt === "PDF" ? (
            pdfUrl ? (
              <iframe
                title="doc-pdf"
                src={pdfUrl}
                className="w-full h-[75vh] border rounded"
              />
            ) : (
              <div className="text-sm text-gray-500">Loading PDF preview...</div>
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
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-100 border uppercase">{r.type}</span>
                    <span className="font-mono text-sm break-all font-semibold">
                      {r.name}
                      {r.parent_class ? ` (class ${r.parent_class})` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 break-all mb-2">{r.file}</div>
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
