import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";
import {
  getDocumentationPlan,
  generateDocumentation,
  listDocumentationRevisions,
} from "../services/documentationService";
import { Button, Card, StatsCard, LoadingSpinner } from "../components/ui";
import { normalizePath, basename } from "../utils/pathUtils";
import { showError, showSuccess } from "../utils/toast";
import { updateProject } from "../services/projectService";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

const SectionHeader = ({ title, extra }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-semibold">{title}</h3>
    {extra}
  </div>
);

export default function GenerateDocumentation() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { preferences, allFilesData, isFileIncluded, getFunctionClassCounts } =
    usePreferences();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!projectId || !token) return;
      setLoading(true);
      try {
        const data = await getDocumentationPlan(projectId, token);
        if (mounted) setPlan(data);
      } catch (e) {
        showError("Failed to load documentation plan");
        setPlan(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [
    projectId,
    token,
    preferences?.directory_exclusion,
    preferences?.per_file_exclusion,
    preferences?.format,
  ]);

  const filesWithMeta = useMemo(() => {
    const m = (allFilesData || []).map((f) => {
      const path = normalizePath(
        f.path || f.filename || f.file_name || f.name || ""
      );
      const displayName = f.name || f.filename || f.file_name || basename(path);
      const included = isFileIncluded(
        displayName,
        path || f.path || displayName
      );
      return { ...f, path, displayName, included };
    });
    return m;
  }, [allFilesData, isFileIncluded]);

  const counts = useMemo(
    () => getFunctionClassCounts(),
    [getFunctionClassCounts]
  );

  const handleGenerate = async () => {
    if (!projectId || !token) return;
    setGenLoading(true);
    try {
      const res = await generateDocumentation(projectId, token, {
        batchSize: 2,
      });
      showSuccess(
        `Generated ${res?.results?.length || 0} docstrings in ${
          res?.generation_time_seconds ?? "?"
        }s`
      );
      // Mark project complete client-side as well
      try {
        await updateProject(projectId, { status: "completed" }, token);
      } catch {}
      // Fetch latest revision and navigate to details (after generation is fully done)
      const revisions = await listDocumentationRevisions(projectId, token);
      const latest = revisions?.revisions?.[0];
      if (latest?.id) {
        navigate(`/projects/${projectId}/documentation/${latest.id}`);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "Generation failed";
      showError(msg);
    } finally {
      setGenLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading documentation plan..." />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 space-y-4">
        <StatsCard
          title="Documentation Plan"
          value="Unavailable"
          variant="yellow"
        />
        <Button
          variant="secondary"
          onClick={() =>
            navigate(`/projects/${projectId}/preferences/finalize`)
          }
        >
          Back to Preferences
        </Button>
      </div>
    );
  }

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Generate Documentation</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/projects/${projectId}/preferences/finalize`)
            }
          >
            Back to Preferences
          </Button>
          <Button
            variant="primary"
            disabled={genLoading || (plan.items || []).length === 0}
            onClick={handleGenerate}
          >
            {genLoading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Format" value={plan.format} variant="blue" />
        <StatsCard title="Items" value={plan.total_items} variant="green" />
        <StatsCard
          title="Included Files"
          value={(plan.included_files || []).length}
          variant="purple"
        />
        <StatsCard
          title="Excluded Files"
          value={(plan.excluded_files || []).length}
          variant="yellow"
        />
      </div>

      {/* Overview */}
      <Card>
        <Card.Header>
          <Card.Title>Overview</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-2">Files</div>
              <div>Included: {(plan.included_files || []).length}</div>
              <div>Excluded: {(plan.excluded_files || []).length}</div>
            </div>
            <div>
              <div className="font-semibold mb-2">Functions & Classes</div>
              <div>Functions (incl): {counts.includedFunctions}</div>
              <div>Classes (incl): {counts.includedClasses}</div>
            </div>
            <div>
              <div className="font-semibold mb-2">Methods</div>
              <div>Methods (incl): {counts.includedMethods}</div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Planned Items grid */}
      <Card>
        <Card.Header>
          <Card.Title>Planned Items</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-sm text-gray-600 mb-4">
            These are the functions, classes, and methods that will be sent to
            the model.
          </div>
          {(plan.items || []).length === 0 ? (
            <div className="text-gray-500">
              No items to generate based on your preferences.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(plan.items || []).map((it, idx) => {
                const typeColor =
                  it.type === "function"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : it.type === "class"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-yellow-100 text-yellow-800 border-yellow-200";
                return (
                  <div
                    key={`${it.file}-${it.type}-${it.name}-${idx}`}
                    className="border rounded-lg p-3 bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded border uppercase ${typeColor}`}
                      >
                        {it.type}
                      </span>
                      <span className="font-mono text-sm break-all font-semibold">
                        {it.name}
                        {it.parent_class ? ` (class ${it.parent_class})` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 break-all mb-2">
                      {it.file}
                    </div>
                    <SyntaxHighlighter
                      language="python"
                      style={atomOneLight}
                      customStyle={{ maxHeight: 192, fontSize: "12px" }}
                    >
                      {it.code}
                    </SyntaxHighlighter>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Full-screen overlay while generating */}
      {genLoading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md text-center space-y-3">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <div className="font-semibold">Generating documentation…</div>
            <div className="text-sm text-gray-500">
              This may take a minute. Please keep this tab open.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
