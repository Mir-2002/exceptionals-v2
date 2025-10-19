import React, { useState } from "react";
import { Button, Card, LoadingSpinner } from "../components/ui";
import {
  demoGenerateSingle,
  demoGenerateBatch,
} from "../services/documentationService";

export default function HFDemoTest() {
  const [file, setFile] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const appendLog = (msg) => setLogs((prev) => [...prev, `[client] ${msg}`]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const readFileText = async (f) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(f);
    });
  };

  const runDemo = async (mode) => {
    setLoading(true);
    setResult(null);
    setLogs([]);
    try {
      let payloadCode = code?.trim();
      let filename = file?.name;
      if (!payloadCode && file) {
        appendLog(`Reading file: ${file.name}`);
        payloadCode = String(await readFileText(file));
      }
      if (!payloadCode) {
        appendLog("No code or file provided");
        alert("Provide either a file or paste code.");
        return;
      }
      appendLog(`Sending request to /documentation/demo (${mode})`);
      const data =
        mode === "batch"
          ? await demoGenerateBatch(payloadCode, filename)
          : await demoGenerateSingle(payloadCode);
      setResult(data);
      appendLog("Received response from backend");
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || String(e);
      appendLog(`Error: ${detail}`);
      setResult({ status: "failed", error: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">HF Demo Test</h2>
      <Card>
        <Card.Header>
          <Card.Title>Input</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Upload a .py file
            </label>
            <input type="file" accept=".py" onChange={onFileChange} />
            {file && (
              <div className="text-xs text-gray-500 mt-1">
                Selected: {file.name}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Or paste code
            </label>
            <textarea
              className="w-full border rounded p-2 font-mono text-sm"
              rows={10}
              placeholder="def foo():\n    pass"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => runDemo("single")}
              disabled={loading}
            >
              {loading ? "Testing..." : "Test Single"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => runDemo("batch")}
              disabled={loading}
            >
              {loading ? "Testing..." : "Test Batch"}
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Result</Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <LoadingSpinner text="Waiting for response..." />
          ) : result ? (
            <pre className="bg-gray-50 rounded p-2 text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-500 text-sm">No result yet.</div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Logs</Card.Title>
        </Card.Header>
        <Card.Content>
          <pre className="bg-gray-50 rounded p-2 text-xs overflow-auto max-h-64">
            {logs.join("\n")}
          </pre>
        </Card.Content>
      </Card>
    </div>
  );
}
