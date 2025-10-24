import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advTemperature, setAdvTemperature] = useState(0);
  const [advTopP, setAdvTopP] = useState(0);
  const [advTopK, setAdvTopK] = useState(0);
  const [genStart, setGenStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [modelStatus, setModelStatus] = useState("idle");
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        controllerRef.current?.abort("Component unmounted");
      } catch {}
    };
  }, []);

  useEffect(() => {
    let timer;
    if (genLoading && genStart) {
      timer = setInterval(() => {
        const secs = Math.floor((Date.now() - genStart) / 1000);
        setElapsed(secs);
      }, 500);
    } else {
      setElapsed(0);
    }
    return () => timer && clearInterval(timer);
  }, [genLoading, genStart]);

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

  // Build segregated groups for items (must be declared before any early returns)
  const items = plan?.items || [];
  const functionItems = useMemo(
    () => items.filter((i) => i.type === "function"),
    [items]
  );
  const classItems = useMemo(
    () => items.filter((i) => i.type === "class"),
    [items]
  );
  const methodsByClassKey = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      if (i.type === "method") {
        const key = `${i.file}::${i.parent_class}`;
        if (!map[key]) map[key] = [];
        map[key].push(i);
      }
    });
    return map;
  }, [items]);

  const navigateToLatestWhenReady = async () => {
    // Poll for latest revision up to ~60s
    const start = Date.now();
    const maxMs = 60000;
    while (Date.now() - start < maxMs) {
      try {
        const revisions = await listDocumentationRevisions(projectId, token);
        const latest = revisions?.revisions?.[0];
        if (latest?.id) {
          navigate(`/projects/${projectId}/documentation/${latest.id}`);
          return true;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!projectId || !token) return;
    setGenLoading(true);
    setModelStatus("processing");
    setGenStart(Date.now());

    const maxAttempts = 3;
    let attempt = 0;

    // Controller to support manual cancellation only (no auto-timeout)
    controllerRef.current = new AbortController();

    try {
      while (attempt < maxAttempts) {
        try {
          const res = await generateDocumentation(projectId, token, {
            // batchSize intentionally omitted to let server env decide
            temperature: advTemperature,
            topP: advTopP,
            topK: advTopK,
            signal: controllerRef.current.signal,
            // no hard timeout, let server finish
            timeoutMs: 0,
          });
          // Successful response -> show success, mark project, then navigate (poll if needed)
          setModelStatus("processing");
          const elapsedSecs =
            Number(res?.generation_time_seconds ?? elapsed) || 0;
          const mins = Math.floor(elapsedSecs / 60);
          const secs = Math.floor(elapsedSecs % 60);
          showSuccess(
            `Generated ${
              res?.results?.length || 0
            } docstrings in ${mins}m ${secs}s`
          );
          try {
            await updateProject(projectId, { status: "completed" }, token);
          } catch {}
          const navigated = await navigateToLatestWhenReady();
          if (!navigated) {
            // Fallback to browser view
            navigate(`/projects/${projectId}/documentation/browser`);
          }
          break; // exit retry loop on success
        } catch (e) {
          const code = e?.code;
          const status = e?.response?.status;
          const modelHeader =
            e?.response?.headers?.["x-model-status"]?.toLowerCase?.();
          const isCanceled =
            code === "ERR_CANCELED" ||
            code === "ECONNABORTED" ||
            e?.message?.toLowerCase?.().includes("timeout") ||
            e?.message?.toLowerCase?.().includes("aborted");

          if (isCanceled) {
            setModelStatus("paused");
            showError("Generation canceled.");
            break;
          }

          if (modelHeader === "booting") {
            setModelStatus("booting");
          } else if (modelHeader === "paused") {
            setModelStatus("paused");
          } else if (status && status >= 500) {
            setModelStatus("booting");
          } else if (status && status >= 400) {
            setModelStatus("paused");
          }

          if (status && status >= 500) {
            attempt += 1;
            if (attempt < maxAttempts) {
              const backoff =
                attempt === 1 ? 5000 : attempt === 2 ? 10000 : 20000;
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            } else {
              showError(
                "The model service is starting up (5xx). Please wait and try again."
              );
            }
          } else if (status && status >= 400) {
            showError(
              "Model is currently unavailable (4xx). Please try again later."
            );
          } else {
            const msg =
              e?.response?.data?.detail || e?.message || "Generation failed";
            showError(msg);
          }
          break; // exit loop on non-retryable or after final retry
        }
      }
    } finally {
      controllerRef.current = null;
      setGenStart(null);
      setGenLoading(false);
    }
  };

  const handleCancel = () => {
    try {
      controllerRef.current?.abort("User canceled generation");
    } catch {}
    setModelStatus("paused");
    setGenLoading(false);
    showError("Generation canceled by user.");
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading documentation plan… The model may be cold-starting from scale-to-zero; first request can take a few tries." />
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

      {/* Advanced Generation Options */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between w-full">
            <Card.Title>Advanced Generation Options</Card.Title>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAdvanced((s) => !s)}
            >
              {showAdvanced ? "Hide" : "Show"}
            </Button>
          </div>
          {/* Description hidden until expanded */}
          {showAdvanced && (
            <p className="text-xs text-gray-600 mt-1">
              Parameters to tweak model output
            </p>
          )}
        </Card.Header>
        {showAdvanced && (
          <Card.Content>
            {/* Warning section */}
            <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
              Unrealistic parameters may induce the model to hallucinate and
              generate faulty output.{" "}
              <span className="font-semibold">
                We recommend sticking to the defaults, or setting none at all,
                for the best quality.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Temperature (0.0–2.0)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={advTemperature}
                  onChange={(e) =>
                    setAdvTemperature(
                      Math.max(0, Math.min(2, Number(e.target.value)))
                    )
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Top P (0.0–1.0)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={advTopP}
                  onChange={(e) =>
                    setAdvTopP(Math.max(0, Math.min(1, Number(e.target.value))))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Top K (0–100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={advTopK}
                  onChange={(e) =>
                    setAdvTopK(
                      Math.max(0, Math.min(100, Number(e.target.value)))
                    )
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
          </Card.Content>
        )}
      </Card>

      {/* Enlarged Counters (replaces Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded border bg-blue-50 text-blue-800 border-blue-200">
          <div className="text-sm">Format</div>
          <div className="text-3xl font-bold leading-tight">{plan.format}</div>
        </div>
        <div className="p-5 rounded border bg-green-50 text-green-800 border-green-200">
          <div className="text-sm">Items</div>
          <div className="text-3xl font-bold leading-tight">
            {plan.total_items}
          </div>
        </div>
        <div className="p-5 rounded border bg-purple-50 text-purple-800 border-purple-200">
          <div className="text-sm">Included Files</div>
          <div className="text-3xl font-bold leading-tight">
            {(plan.included_files || []).length}
          </div>
        </div>
        <div className="p-5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200">
          <div className="text-sm">Excluded Files</div>
          <div className="text-3xl font-bold leading-tight">
            {(plan.excluded_files || []).length}
          </div>
        </div>
      </div>

      {/* Remove Overview card */}
      {/* Planned Items - Segregated */}
      <Card>
        <Card.Header>
          <Card.Title>Planned Items</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-sm text-gray-600 mb-4">
            These are the functions and classes (with methods) that will be sent
            to the model.
          </div>
          {(plan.items || []).length === 0 ? (
            <div className="text-gray-500">
              No items to generate based on your preferences.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Functions */}
              <div>
                <h4 className="font-semibold text-green-700 mb-3">Functions</h4>
                {functionItems.length === 0 ? (
                  <div className="text-gray-400 text-sm">No functions.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {functionItems.map((it, idx) => (
                      <div
                        key={`${it.file}-${it.name}-${idx}`}
                        className="border rounded-lg p-3 bg-white"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded border uppercase bg-green-100 text-green-800 border-green-200">
                            function
                          </span>
                          <span className="font-mono text-sm break-all font-semibold">
                            {it.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 break-all mb-2">
                          {it.file}
                        </div>
                        <SyntaxHighlighter
                          language="python"
                          style={docco}
                          customStyle={{
                            maxHeight: 140,
                            overflow: "auto",
                            fontSize: "12px",
                          }}
                          wrapLines
                          wrapLongLines
                        >
                          {it.code}
                        </SyntaxHighlighter>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Classes with Methods */}
              <div>
                <h4 className="font-semibold text-blue-700 mb-3">Classes</h4>
                {classItems.length === 0 ? (
                  <div className="text-gray-400 text-sm">No classes.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classItems.map((cls, idx) => {
                      const mkey = `${cls.file}::${cls.name}`;
                      const methods = methodsByClassKey[mkey] || [];
                      return (
                        <div
                          key={`${cls.file}-${cls.name}-${idx}`}
                          className="border rounded-lg p-3 bg-white"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded border uppercase bg-blue-100 text-blue-800 border-blue-200">
                              class
                            </span>
                            <span className="font-mono text-sm break-all font-semibold">
                              {cls.name}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 break-all mb-2">
                            {cls.file}
                          </div>
                          <SyntaxHighlighter
                            language="python"
                            style={docco}
                            customStyle={{
                              maxHeight: 140,
                              overflow: "auto",
                              fontSize: "12px",
                            }}
                            wrapLines
                            wrapLongLines
                          >
                            {cls.code}
                          </SyntaxHighlighter>

                          {methods.length > 0 && (
                            <div className="mt-3">
                              <div className="font-semibold text-purple-700 mb-2">
                                Methods
                              </div>
                              <div className="space-y-2">
                                {methods.map((m, midx) => (
                                  <div
                                    key={`${m.file}-${m.parent_class}-${m.name}-${midx}`}
                                    className="border rounded p-2 bg-gray-50"
                                  >
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 text-xs font-semibold rounded border uppercase bg-purple-100 text-purple-800 border-purple-200">
                                        method
                                      </span>
                                      <span className="font-mono text-xs break-all font-semibold">
                                        {m.name}
                                      </span>
                                    </div>
                                    <SyntaxHighlighter
                                      language="python"
                                      style={docco}
                                      customStyle={{
                                        maxHeight: 120,
                                        overflow: "auto",
                                        fontSize: "12px",
                                      }}
                                      wrapLines
                                      wrapLongLines
                                    >
                                      {m.code}
                                    </SyntaxHighlighter>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Full-screen overlay while generating */}
      {genLoading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md text-center space-y-3">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <div className="font-semibold">
              {modelStatus === "booting"
                ? "Model service is booting up..."
                : modelStatus === "paused"
                ? "Model is currently unavailable. Please try again later."
                : modelStatus === "processing"
                ? "Generating documentation"
                : "Generating documentation"}
            </div>
            <div className="text-sm text-gray-500">
              Large projects may take several minutes. Please do not close this
              window.
            </div>
            <div className="text-xs text-gray-600">Elapsed: {elapsed}s</div>
            <div className="pt-2">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
