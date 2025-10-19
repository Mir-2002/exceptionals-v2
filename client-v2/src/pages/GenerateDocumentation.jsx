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
      // Fetch latest revision and navigate to details
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
    <div className="p-6 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Format" value={plan.format} variant="blue" />
        <StatsCard
          title="Total Items"
          value={plan.total_items}
          variant="green"
        />
        <StatsCard
          title="Included Files"
          value={(plan.included_files || []).length}
          variant="purple"
        />
      </div>

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

      <Card>
        <Card.Header>
          <Card.Title>Planned Items</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-sm text-gray-600 mb-4">
            Showing each function, class, and method that will be sent to the
            model.
          </div>
          <div className="space-y-4">
            {(plan.items || []).map((it, idx) => (
              <div
                key={`${it.file}-${it.type}-${it.name}-${idx}`}
                className="border rounded-lg p-3"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-100 border">
                    {it.type}
                  </span>
                  <span className="font-mono text-sm break-all">
                    {it.name}
                    {it.parent_class ? ` (class ${it.parent_class})` : ""}
                  </span>
                </div>
                <div className="text-xs text-gray-500 break-all mb-2">
                  {it.file}
                </div>
                <pre className="bg-gray-50 rounded p-2 text-xs overflow-auto max-h-48">
                  {it.code}
                </pre>
              </div>
            ))}
            {(plan.items || []).length === 0 && (
              <div className="text-gray-500">
                No items to generate based on your preferences.
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <div className="flex gap-3">
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
          {genLoading ? "Generating..." : "Generate Documentation"}
        </Button>
      </div>
    </div>
  );
}
