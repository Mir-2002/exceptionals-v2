import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  getDocumentationRevision,
  downloadDocumentationRevision,
} from "../services/documentationService";
import { updateProject } from "../services/projectService";

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
    <div className="p-6 space-y-4">
      <div className="flex gap-2 mb-2">
        <Button variant="secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
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

      <Card>
        <Card.Header>
          <Card.Title>Documentation ({fmt})</Card.Title>
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
              <div className="text-sm text-gray-500">
                Loading PDF preview...
              </div>
            )
          ) : fmt === "MARKDOWN" ? (
            <pre className="bg-gray-50 p-3 rounded overflow-auto max-h-[75vh] whitespace-pre-wrap">
              {doc.content}
            </pre>
          ) : (
            <iframe
              title="doc-html"
              srcDoc={doc.content}
              className="w-full h-[75vh] border rounded"
            />
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
