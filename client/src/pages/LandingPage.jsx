import React, { useState } from "react";
import python from "../assets/landing-page/python.svg";
import document from "../assets/landing-page/document.svg";
import Button from "../components/ui/Button";
import github from "../assets/landing-page/github.svg";
import gearfile from "../assets/landing-page/gearfile.svg";
import ai from "../assets/landing-page/ai.svg";
import codereview from "../assets/landing-page/codereview.svg";
import webdeveloper from "../assets/landing-page/webdeveloper.svg";
import wave from "../assets/landing-page/wave-haikei.svg";
import { FaArrowRight } from "react-icons/fa";
import Editor from "@monaco-editor/react";
import { useNavigate } from "react-router-dom";
import { generateDemoDocstring } from "../services/documentationService";
import { useAuth } from "../context/authContext";

const FeatureCard = ({ icon, title, children, borderRight = false }) => (
  <div
    className={`flex-1 h-3/4 flex flex-col items-center justify-center p-10 ${
      borderRight ? "border-r-2 border-gray-200" : ""
    } max-md:border-r-0 max-md:p-6 max-md:h-auto`}
  >
    {/* Top half: Icon */}
    <div className="flex items-center justify-center w-full max-md:flex-none max-md:mb-4 sm:mb-8 md:mb-12">
      <img
        src={icon}
        alt={title}
        width={100}
        height={100}
        className="max-md:w-16 max-md:h-16"
      />
    </div>
    {/* Bottom half: Title and Content */}
    <div className="flex flex-col w-full items-center max-md:flex-none">
      <h3 className="text-2xl font-bold mb-4 max-md:text-xl">{title}</h3>
      <div className="w-full sm:w-3/4 md:w-3/4 lg:w-1/2 text-center text-gray-600 max-md:w-full max-md:text-sm">
        {children}
      </div>
    </div>
  </div>
);

const LandingPage = () => {
  const [code, setCode] = useState(
    `class Greeter:\n    def __init__(self, name: str) -> None:\n        self.name = name\n\n    def greet(self) -> str:\n               return f"Hello, {self.name}!"\n\n\ndef add(a: int, b: int) -> int:\n        return a + b\n`
  );
  const [generating, setGenerating] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleDemoGenerate = async () => {
    if (!code.trim()) return;
    setGenerating(true);
    setDemoResult(null);
    try {
      const res = await generateDemoDocstring(code, { maxWaitMs: 180000 });
      setDemoResult(res);
    } catch (e) {
      setDemoResult({ error: true });
    } finally {
      setGenerating(false);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) navigate("/dashboard");
    else navigate("/login");
  };

  return (
    <>
      <main className="w-full min-h-screen">
        <div className="flex flex-col">
          <section className="w-full h-full flex flex-row p-10 items-center justify-center relative max-md:flex-col max-md:p-6 max-md:pt-16">
            <div className="w-3/4 lg:h-screen flex flex-col items-center justify-center max-md:w-full max-md:h-auto">
              <img
                src={webdeveloper}
                alt="Web Developer"
                width={300}
                height={300}
                className="absolute left-15 top-18 max-md:hidden"
              />
              <img
                src={codereview}
                alt="Web Developer"
                width={300}
                height={300}
                className="absolute right-15 bottom-20 max-md:hidden"
              />
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center">
                Documentations, Made Easier.
              </h1>
              <h2 className="text-base sm:text-2xl md:text-3xl text-center w-full sm:w-3/4 md:w-2/3 lg:w-1/2 text-gray-600">
                Create your Python project's documentation in minutes using our
                automatic tool.
              </h2>
              <div className="flex flex-col sm:flex-row w-full h-auto justify-center gap-1 sm:gap-3 items-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGetStarted}
                  className="mt-8 sm:mt-6 px-6 py-3 sm:px-5 sm:py-2.5 sm:text-base inline-flex w-auto"
                >
                  Get Started
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate("/guide")}
                  className="mt-2 sm:mt-6 sm:ml-2 px-6 py-3 sm:px-5 sm:py-2.5 sm:text-base inline-flex w-auto"
                >
                  Know More
                </Button>
              </div>
            </div>
          </section>
          <section className="w-full lg:h-screen flex flex-row p-10 max-md:flex-col max-md:h-auto max-md:p-6">
            <FeatureCard icon={github} title="GitHub Integration" borderRight>
              Seamlessly connect your GitHub repositories to automatically
              generate and update documentation per commit.
            </FeatureCard>
            <FeatureCard
              icon={gearfile}
              title="Fine-grained Control"
              borderRight
            >
              Customize the documentation process with advanced settings such as
              file selections and function/class exclusions to suit your
              project's needs.
            </FeatureCard>
            <FeatureCard icon={ai} title="LLM Powered">
              Use our own CodeT5+ model fine tuned to generate Google style
              documentations for your Python projects.
            </FeatureCard>
          </section>
          <section className="w-full lg:h-screen flex flex-row p-10 relative max-md:flex-col max-md:h-auto max-md:p-6">
            <img
              src={wave}
              className="w-full absolute bottom-0 left-0 pointer-events-none select-none z-0 hidden sm:hidden md:hidden lg:block"
              aria-hidden="true"
            />
            <div className="w-1/2 h-full flex flex-col items-center justify-center max-md:w-full max-md:h-auto max-md:mb-6">
              <h2 className="text-6xl font-bold mb-10 max-md:text-4xl">
                Try It Out
              </h2>
              <FaArrowRight className="text-6xl max-md:text-4xl" />
            </div>
            <div className="w-1/2 h-full flex flex-col items-center justify-center px-10 max-md:w-full max-md:h-auto max-md:px-0 z-10">
              {!demoResult ? (
                <>
                  <div className="flex flex-col items-center justify-center gap-y-3 w-full">
                    <h2 className="text-4xl font-bold max-md:text-2xl text-center">
                      Paste your Python code
                    </h2>
                    <p className="text-gray-600 max-md:text-sm text-center">
                      then click Generate to test our tool.
                    </p>
                  </div>
                  <div className="w-full border border-gray-300 rounded-md shadow-sm overflow-hidden mt-5 max-md:mt-4">
                    <Editor
                      height="320px"
                      defaultLanguage="python"
                      theme="vs"
                      value={code}
                      onChange={(v) => setCode(v ?? "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        wordWrap: "on",
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-4 w-full max-md:flex-col max-md:items-start">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleDemoGenerate}
                      disabled={generating || !code.trim()}
                      className="w-full sm:w-1/2 md:w-1/2"
                    >
                      {generating ? "Generating..." : "Generate"}
                    </Button>
                    <span className="text-sm text-gray-600 max-md:text-xs">
                      Model may take time to boot up.
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full grid grid-cols-1 gap-4 z-10">
                  <div className="border rounded-lg p-4 bg-white shadow h-80 flex flex-col max-md:h-64">
                    <h3 className="font-semibold mb-2">Your Code</h3>
                    <pre className="text-sm overflow-auto bg-gray-50 p-3 rounded whitespace-pre-wrap flex-1">
                      {code}
                    </pre>
                  </div>
                  <div className="border rounded-lg p-4 bg-white shadow h-80 flex flex-col max-md:h-64">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Generated Docstrings</h3>
                      {typeof demoResult?.count === "number" && (
                        <span className="text-xs text-gray-500">
                          {demoResult.count} items
                        </span>
                      )}
                    </div>
                    {/* Fixed height, scrollable content; no snap */}
                    <div className="flex-1 overflow-y-auto pr-1">
                      {demoResult?.error ? (
                        <div className="text-red-600 text-sm">
                          Failed to generate. Please try again.
                        </div>
                      ) : demoResult?.results?.length ? (
                        <div className="space-y-4">
                          {demoResult.results.map((r, idx) => (
                            <div
                              key={idx}
                              className="border rounded p-3 bg-white"
                            >
                              {/* Only display the item name */}
                              <div className="mb-2">
                                <span className="font-semibold">{r.name}</span>
                              </div>
                              <pre className="text-sm overflow-auto bg-gray-50 p-3 rounded whitespace-pre-wrap">
                                {r.docstring || ""}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-sm overflow-auto bg-gray-50 p-3 rounded whitespace-pre-wrap">
                          {demoResult?.docstring || ""}
                        </pre>
                      )}
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => setDemoResult(null)}
                      className="z-20 relative max-md:w-full"
                    >
                      Try Another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
          <footer className="flex flex-row w-full h-[70px] bg-black text-white px-6 py-4 max-sm:flex-col max-sm:h-auto max-sm:gap-2 text-center sm:text-left sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold">Exceptionals</h1>
            <h2 className="text-base sm:ml-0">All Rights Reserved 2025</h2>
          </footer>
        </div>
      </main>
    </>
  );
};

export default LandingPage;
