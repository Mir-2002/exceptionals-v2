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
import { generateDocstring } from "./services/documentationService";

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
          <span className="text-secondary">Documentations</span>, Made Easier
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

function Demo() {
  const [code, setCode] = useState("# Paste your Python code here");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    try {
      const data = await generateDocstring({ code });
      setResult(data); // store the full response object
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <section className="flex flex-col w-full min-h-screen">
      <div className="w-full py-20 items-center justify-center text-center gap-y-3 flex flex-col">
        <Heading className="text-[4rem]">Try It Out</Heading>
        <p className="text-secondary text-lg font-medium">
          Write or paste your Python code and test our tool!
        </p>
      </div>
      <div className="w-full h-[85%] flex flex-col justify-between items-center">
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
        </form>
      </div>
      <div className="w-full flex justify-center mt-6 mb-20">
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
      </div>
    </section>
  );
}

function Info() {
  return (
    <>
      <section className="flex flex-col w-full min-h-screen bg-tertiary text-white">
        <Heading className="font-funnel-display text-[3rem] w-full h-[20vh] py-20">
          From Code to Docs — Effortlessly.
        </Heading>
        <div className="flex flex-row w-full h-[80vh] px-30">
          <div className="flex flex-col h-full w-1/3 p-20">
            <div className="flex flex-col gap-y-2 h-1/2 w-full justify-center items-center ">
              <img
                src={Program}
                alt="Programmer"
                className="w-48 h-48"
                style={{ display: "block" }}
              />
            </div>
            <div className="flex flex-col gap-y-2 h-1/2 w-full">
              <Heading className="font-funnel-display text-[2rem] text-start w-full">
                Python Focused
              </Heading>
              <p className="text-lg">
                Our tool is designed specifically for Python developers,
                ensuring accurate and relevant docstring generation.
              </p>
            </div>
          </div>
          <div className="flex flex-col h-full w-1/3 p-20">
            <div className="flex flex-col gap-y-2 h-1/2 w-full justify-center items-center ">
              <img
                src={AIPic}
                alt="Artificial Intelligence"
                className="w-48 h-48"
                style={{ display: "block" }}
              />
            </div>
            <div className="flex flex-col gap-y-2 h-1/2">
              <Heading className="font-funnel-display text-[2rem] text-start w-full">
                AI-Powered
              </Heading>
              <p className="text-lg">
                Our model is a fine-tuned{" "}
                <span className="font-bold text-xl">CodeT5+</span> model,
                specifically trained to generate Python docstrings in Google
                Style format.
              </p>
            </div>
          </div>
          <div className="flex flex-col h-full w-1/3 p-20">
            <div className="flex flex-col gap-y-2 h-1/2 w-full justify-center items-center ">
              <img
                src={Time}
                alt="Time Management"
                className="w-48 h-48"
                style={{ display: "block" }}
              />
            </div>
            <div className="flex flex-col gap-y-2 h-1/2">
              <Heading className="font-funnel-display text-[2rem] text-start w-full">
                Save Precious Time
              </Heading>
              <p className="text-lg">
                Let our tool handle the documentation so you can concentrate on
                building features and solving real problems.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Home() {
  return (
    <>
      <Container className="flex-col">
        <Hero />
        <Info />
        <Demo />
      </Container>
    </>
  );
}

function App() {
  return (
    <>
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
        </Route>
      </Routes>
    </>
  );
}

export default App;
