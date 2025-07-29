import React, { useState } from "react";
import Container from "./components/Container";
import Login from "./pages/Login";
import { Outlet, Route, Routes, useNavigate } from "react-router-dom";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import Heading from "./components/Heading";
import MonacoEditor from "@monaco-editor/react";
import CodingPic from "./assets/svg/vibe_coding.svg";
import Program from "./assets/svg/program.svg";
import AIPic from "./assets/svg/ai-code.svg";
import Time from "./assets/svg/time-management.svg";
import CodeInspect from "./assets/svg/code_inspection.svg";
import { generateDocstring } from "./services/documentationService";
import CreateProject from "./pages/CreateProject";
import ViewProject from "./pages/ViewProject";

// InfoCard component for Info section
function InfoCard({ imgSrc, alt, heading, children }) {
  return (
    <div className="flex flex-col h-full w-1/3 p-20 justify-between">
      <div className="flex flex-col gap-y-2 justify-center items-center">
        <img
          src={imgSrc}
          alt={alt}
          className="w-48 h-48"
          style={{ display: "block" }}
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Heading className="font-funnel-display text-[2rem] text-start w-full">
          {heading}
        </Heading>
        <p className="text-lg">{children}</p>
      </div>
    </div>
  );
}

// ResultBox component for displaying results
function ResultBox({ loading, result }) {
  return (
    <div className="w-1/2 bg-gray-100 rounded-xl p-6 min-h-[120px] shadow">
      <h3 className="font-bold mb-2 text-lg">Result</h3>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <svg
            className="animate-spin h-8 w-8 text-primary mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
          <span className="text-primary font-medium">Generating...</span>
        </div>
      ) : result ? (
        <div>
          <div className="font-semibold mb-1 text-primary">
            Generated Docstring:
          </div>
          <pre className="whitespace-pre-wrap break-words bg-white rounded p-3 text-sm text-gray-800 border">
            {typeof result === "object"
              ? result.docstring || "No docstring generated."
              : result}
          </pre>
        </div>
      ) : (
        <div className="text-gray-400 italic">No result yet.</div>
      )}
    </div>
  );
}

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="flex flex-row w-full min-h-screen justify-center items-center p-10 gap-y-5">
      <div className="flex flex-col items-center justify-center w-1/2 h-full">
        <img
          src={CodingPic}
          alt="Coding Illustration"
          className="w-full h-auto max-w-md"
          style={{ display: "block" }}
        />
      </div>
      <div className="flex flex-col items-center justify-center w-1/2 h-full gap-y-5">
        <h1 className="text-[4rem] font-bold leading-17 text-center font-funnel-display">
          <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
            Documentations
          </span>
          , Made Easier
        </h1>
        <h2 className="text-xl text-center font-medium w-3/4">
          Create your Python codebase documentation using our AI powered tool
        </h2>
        <div className="flex flex-row gap-x-5">
          <button
            onClick={() => navigate("/login")}
            className="text-lg p-3.5 font-semibold text-white bg-primary rounded-xl shadow-lg hover:bg-white hover:text-primary"
          >
            Get Started
          </button>
          <button className="text-lg p-3.5 font-semibold text-white bg-primary rounded-xl shadow-lg hover:bg-white hover:text-primary">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

function Info() {
  return (
    <section className="flex flex-col w-full min-h-screen bg-tertiary text-white">
      <Heading className="font-funnel-display text-[3rem] w-full h-[20vh] py-20">
        From Code to Docs — Effortlessly.
      </Heading>
      <div className="flex flex-row w-full h-[80vh] px-30">
        <InfoCard imgSrc={Program} alt="Programmer" heading="Python Focused">
          Our tool is designed specifically for Python developers, ensuring
          accurate and relevant docstring generation.
        </InfoCard>
        <InfoCard
          imgSrc={AIPic}
          alt="Artificial Intelligence"
          heading="AI-Powered"
        >
          Our model is a fine-tuned{" "}
          <span className="font-bold text-xl">CodeT5+</span> model, specifically
          trained to generate Python docstrings in Google Style format.
        </InfoCard>
        <InfoCard
          imgSrc={Time}
          alt="Time Management"
          heading="Save Precious Time"
        >
          Let our tool handle the documentation so you can concentrate on
          building features and solving real problems.
        </InfoCard>
      </div>
    </section>
  );
}

function Demo() {
  const [code, setCode] = useState("# Paste your Python code here");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEditorChange = (value) => setCode(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    try {
      const data = await generateDocstring({ code });
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <section className="relative flex flex-col w-full min-h-screen">
      <div className="w-full py-20 flex flex-col items-center justify-center text-center gap-y-3">
        <Heading className="text-[4rem]">Try It Out</Heading>
        <p className="text-secondary text-lg font-medium">
          Write or paste your Python code and test our tool!
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col items-center gap-y-4"
      >
        <div className="w-full flex justify-center">
          <div className="w-1/2 rounded-lg overflow-hidden shadow-xl p-2 bg-secondary">
            <MonacoEditor
              height="300px"
              width="100%"
              language="python"
              value={code}
              theme="vs-dark"
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                folding: false,
                scrollbar: {
                  vertical: "hidden",
                  horizontal: "hidden",
                },
                glyphMargin: false,
                renderIndentGuides: false,
                renderValidationDecorations: "off",
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary/90 transition"
          disabled={loading}
        >
          Submit
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
      <div className="w-full flex justify-center mt-6 mb-20">
        <ResultBox loading={loading} result={result} />
      </div>
      <img
        src={CodeInspect}
        alt="Code Inspect"
        className="absolute bottom-15 right-15 w-60 h-60 z-0 pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}

function Home() {
  return (
    <Container className="flex-col">
      <Hero />
      <Info />
      <Demo />
    </Container>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/create-project"
          element={
            <ProtectedRoute>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/projects/:projectId"
          element={
            <ProtectedRoute>
              <ViewProject />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
