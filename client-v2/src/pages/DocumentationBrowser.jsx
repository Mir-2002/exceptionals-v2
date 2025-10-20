// filepath: client-v2/src/pages/DocumentationBrowser.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  listDocumentationRevisions,
  getDocumentationRevision,
  downloadDocumentationRevision,
} from "../services/documentationService";

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
              {it.created_at_iso ||
                new Date(it.created_at * 1000).toISOString()}
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
                  const ext =
                    (selected.format || "HTML").toUpperCase() === "PDF"
                      ? "pdf"
                      : (selected.format || "HTML").toUpperCase() === "MARKDOWN"
                      ? "md"
                      : "html";
                  a.download = `documentation_${projectId}_${selected.id}.${ext}`;
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
            <div className="text-xs text-gray-600">
              Format: {(selected.format || "HTML").toUpperCase()} • Created:{" "}
              {selected.created_at_iso ||
                new Date(selected.created_at * 1000).toISOString()}
            </div>
          )}
        </Card.Header>
        <Card.Content className="overflow-auto">
          {!selected ? (
            <div className="text-gray-500">
              Select a revision from the left.
            </div>
          ) : (selected.format || "HTML").toUpperCase() === "PDF" ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                PDF cannot be previewed inline. Use Download to view.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-semibold">
                {selected.title ||
                  selected.project_name ||
                  `Project ${projectId}`}
              </div>
              <div className="text-xs text-gray-600">
                Version: {selected.id}
              </div>
              {selected.content ? (
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
