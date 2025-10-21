// filepath: client-v2/src/pages/DocumentationBrowser.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  listDocumentationRevisions,
  getDocumentationRevision,
  downloadDocumentationRevision,
  updateDocumentationRevision,
} from "../services/documentationService";

const fmtElapsed = (secs) => {
  if (typeof secs !== "number") return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return ` • ${m}m ${s}s`;
};

const SidebarSection = ({ title, items, selectedId, onSelect }) => (
  <div className="mb-4">
    <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
      {title}
    </div>
    <div className="space-y-1">
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">None</div>
      ) : (
        items.map((it) => (
          <button
            key={it.id}
            className={`w-full text-left px-2 py-1 rounded border ${
              selectedId === it.id
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => onSelect(it.id)}
            title={`Rev ${it.id}`}
          >
            <div className="text-xs font-mono truncate">{it.id}</div>
            <div className="text-[10px] text-gray-500 truncate">
              {(it.created_at_iso ||
                new Date(it.created_at * 1000).toISOString()) +
                fmtElapsed(it.generation_time_seconds)}
            </div>
          </button>
        ))
      )}
    </div>
  </div>
);

export default function DocumentationBrowser() {
  const { projectId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  const [filter, setFilter] = useState("all"); // all | html | pdf | md

  // Metadata editing state
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaFilename, setMetaFilename] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!projectId || !token) return;
      setLoading(true);
      try {
        const data = await listDocumentationRevisions(projectId, token);
        const revs = data?.revisions || [];
        setRevisions(revs);
        if (revs[0]?.id) setSelectedId(revs[0].id);
      } catch (e) {
        setRevisions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, token]);

  useEffect(() => {
    const loadRev = async () => {
      if (!projectId || !token || !selectedId) return;
      setSelected(null);
      try {
        const rev = await getDocumentationRevision(
          projectId,
          selectedId,
          token
        );
        setSelected(rev);
        // Initialize editor fields from selected revision
        setMetaTitle(rev?.title || "");
        setMetaFilename(rev?.filename || "");
        setEditingMeta(false);
        setMetaDescription(rev?.description || "");
      } catch (e) {
        setSelected(null);
      }
    };
    loadRev();
  }, [projectId, token, selectedId]);

  const byFormat = useMemo(() => {
    const groups = { html: [], pdf: [], md: [] };
    for (const r of revisions) {
      const f = (r.format || "HTML").toUpperCase();
      if (f === "PDF") groups.pdf.push(r);
      else if (f === "MARKDOWN") groups.md.push(r);
      else groups.html.push(r);
    }
    return groups;
  }, [revisions]);

  const onSaveMeta = async () => {
    if (!selected?.id) return;
    setSavingMeta(true);
    try {
      const payload = {};
      if (typeof metaTitle === "string") payload.title = metaTitle;
      if (typeof metaFilename === "string") payload.filename = metaFilename;
      if (typeof metaDescription === "string")
        payload.description = metaDescription;
      await updateDocumentationRevision(projectId, selected.id, token, payload);
      // Refresh selected revision to reflect any title changes in rendered content
      const rev = await getDocumentationRevision(projectId, selected.id, token);
      setSelected(rev);
      setEditingMeta(false);
      // Refresh list to reflect any metadata displayed there in future
      const data = await listDocumentationRevisions(projectId, token);
      setRevisions(data?.revisions || []);
    } catch (e) {
      // no-op
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading)
    return (
      <LoadingSpinner
        className="mt-10"
        center
        text="Loading documentation revisions…"
      />
    );

  return (
    <div className="flex gap-4 p-6">
      {/* Sidebar */}
      <Card className="w-[320px] h-[80vh] flex flex-col">
        <Card.Header>
          <Card.Title>Revisions</Card.Title>
          <div className="ml-auto">
            <Button
              variant="primary"
              onClick={() => navigate(`/projects/${projectId}/preferences`)}
            >
              New Version
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="overflow-auto space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Filter by format
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
              <option value="md">Markdown</option>
            </select>
          </div>
          {filter in { all: 1 } || filter === "html" ? (
            <SidebarSection
              title="HTML"
              items={byFormat.html}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
          {filter in { all: 1 } || filter === "pdf" ? (
            <SidebarSection
              title="PDF"
              items={byFormat.pdf}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
          {filter in { all: 1 } || filter === "md" ? (
            <SidebarSection
              title="Markdown"
              items={byFormat.md}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
        </Card.Content>
        <Card.Footer className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Back to Project
          </Button>
          {selected?.id && (
            <Button
              variant="primary"
              onClick={() =>
                downloadDocumentationRevision(
                  projectId,
                  selected.id,
                  token
                ).then((res) => {
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement("a");
                  a.href = url;
                  // Prefer server-provided filename from Content-Disposition header
                  const disposition =
                    res.headers?.["content-disposition"] || "";
                  const match = /filename=([^;]+)/.exec(disposition);
                  if (match && match[1]) {
                    a.download = match[1];
                  } else {
                    const ext =
                      (selected.format || "HTML").toUpperCase() === "PDF"
                        ? "pdf"
                        : (selected.format || "HTML").toUpperCase() ===
                          "MARKDOWN"
                        ? "md"
                        : "html";
                    a.download = `documentation_${projectId}_${selected.id}.${ext}`;
                  }
                  a.click();
                  window.URL.revokeObjectURL(url);
                })
              }
            >
              Download
            </Button>
          )}
        </Card.Footer>
      </Card>

      {/* Content */}
      <Card className="flex-1 h-[80vh]">
        <Card.Header>
          <Card.Title>Revision Preview</Card.Title>
          {selected && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="text-xs text-gray-600">
                Format: {(selected.format || "HTML").toUpperCase()} • Created:{" "}
                {(selected.created_at_iso ||
                  new Date(selected.created_at * 1000).toISOString()) +
                  fmtElapsed(selected.generation_time_seconds)}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditingMeta((v) => !v)}
              >
                {editingMeta ? "Cancel Edit" : "Edit Metadata"}
              </Button>
            </div>
          )}
        </Card.Header>
        <Card.Content className="overflow-auto">
          {!selected ? (
            <div className="text-gray-500">
              Select a revision from the left.
            </div>
          ) : (
            <div className="space-y-4">
              {editingMeta && (
                <div className="border rounded p-3 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={
                          selected.title ||
                          selected.project_name ||
                          `Project ${projectId}`
                        }
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
                        placeholder={`documentation_${projectId}_${
                          selected.id
                        }.${
                          (selected.format || "HTML").toUpperCase() === "PDF"
                            ? "pdf"
                            : (selected.format || "HTML").toUpperCase() ===
                              "MARKDOWN"
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
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={onSaveMeta}
                      disabled={savingMeta}
                    >
                      {savingMeta ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-lg font-semibold">
                {selected.title ||
                  selected.project_name ||
                  `Project ${projectId}`}
              </div>
              {selected.description && (
                <div className="text-sm text-gray-700">
                  {selected.description}
                </div>
              )}
              <div className="text-xs text-gray-600">
                Version: {selected.id}
              </div>
              {(selected.format || "HTML").toUpperCase() === "PDF" ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    PDF cannot be previewed inline. Use Download to view.
                  </div>
                </div>
              ) : selected.content ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      (selected.format || "HTML").toUpperCase() === "MARKDOWN"
                        ? `<pre class='whitespace-pre-wrap'>${selected.content}</pre>`
                        : selected.content,
                  }}
                />
              ) : (
                <div className="text-gray-500">No content available.</div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
