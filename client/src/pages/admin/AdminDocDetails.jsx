import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import axios from "axios";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Button, Card, LoadingSpinner } from "../../components/ui";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDocDetails() {
  const { revisionId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token || !revisionId) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/admin/documentations/${revisionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDoc(res.data);
      } catch (e) {
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, revisionId]);

  const fmt = (doc?.format || "HTML").toUpperCase();
  const createdMeta =
    doc?.created_by || (doc?.user_id ? { id: doc.user_id } : null);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documentation Details (Admin)</h2>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !doc ? (
        <Card>Not found</Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-3">
              <div className="text-sm text-gray-500">Revision ID</div>
              <div className="font-mono break-all">{doc.id}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-gray-500">Project ID</div>
              <div className="font-mono break-all">{doc.project_id}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-gray-500">Format</div>
              <div>{fmt}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-gray-500">Created At</div>
              <div>
                {doc.created_at_iso ||
                  new Date(doc.created_at * 1000).toISOString()}
              </div>
            </Card>
          </div>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">Created By</div>
            <SyntaxHighlighter
              language="json"
              style={atomOneLight}
              customStyle={{ maxHeight: 240 }}
            >
              {JSON.stringify(createdMeta || null, null, 2)}
            </SyntaxHighlighter>
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">
              Preferences Snapshot
            </div>
            <SyntaxHighlighter
              language="json"
              style={atomOneLight}
              customStyle={{ maxHeight: 360 }}
            >
              {JSON.stringify(doc.preferences_snapshot || {}, null, 2)}
            </SyntaxHighlighter>
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">Included Files</div>
            <SyntaxHighlighter
              language="text"
              style={atomOneLight}
              customStyle={{ whiteSpace: "pre-wrap" }}
            >
              {(doc.included_files || []).join("\n")}
            </SyntaxHighlighter>
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">Excluded Files</div>
            <SyntaxHighlighter
              language="text"
              style={atomOneLight}
              customStyle={{ whiteSpace: "pre-wrap" }}
            >
              {(doc.excluded_files || []).join("\n")}
            </SyntaxHighlighter>
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">Results</div>
            <div className="space-y-3">
              {(doc.results || []).map((r, idx) => (
                <Card key={idx} className="p-2">
                  <div className="text-xs text-gray-500">
                    {r.type} · {r.file}{" "}
                    {r.parent_class ? `(class ${r.parent_class})` : ""}
                  </div>
                  <div className="font-semibold">{r.name}</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {r.generated_docstring}
                  </pre>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
