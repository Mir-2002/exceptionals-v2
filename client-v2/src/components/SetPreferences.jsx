import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";

const SetPreferences = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const {
    initializePreferences,
    isStepCompleted,
    isStepAccessible,
    getStepStatus,
    loading: prefsLoading,
    error: prefsError,
    allFilesData,
    getIncludedFilesCount,
    getFunctionClassCounts,
    resetAllPreferences,
    currentStep,
    setCurrentStep,
  } = usePreferences();

  useEffect(() => {
    if (token) initializePreferences(projectId, token);
  }, [projectId, token, initializePreferences]);

  const getStepButtonClass = (stepNumber) => {
    const status = getStepStatus(stepNumber);
    if (status === "completed")
      return "bg-green-600 text-white hover:bg-green-700";
    if (status === "active" || status === "accessible")
      return "bg-blue-600 text-white hover:bg-blue-700";
    return "bg-gray-400 text-gray-200 cursor-not-allowed";
  };

  const handleStepClick = (stepNumber, route) => {
    if (isStepAccessible(stepNumber)) {
      setCurrentStep(stepNumber); // <-- update context step
      navigate(route);
    }
  };

  const handleResetAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset ALL preferences? This cannot be undone."
      )
    ) {
      const ok = await resetAllPreferences();
      if (ok) {
        alert("All preferences have been reset.");
        initializePreferences(projectId, token);
      } else {
        alert("Failed to reset preferences.");
      }
    }
  };

  if (prefsLoading) {
    return (
      <div className="flex justify-center mt-10">Loading preferences...</div>
    );
  }
  if (prefsError) {
    return (
      <div className="flex justify-center mt-10 text-red-600">
        Error: {prefsError}
      </div>
    );
  }

  const includedFilesCount = getIncludedFilesCount();
  const { totalFunctions, totalClasses, includedFunctions, includedClasses } =
    getFunctionClassCounts();

  return (
    <div className="flex flex-col items-center mt-10">
      <button
        className="mb-8 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        Back
      </button>
      <button
        className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        onClick={handleResetAll}
        disabled={prefsLoading}
      >
        Reset All Preferences
      </button>

      {/* Step Progress Indicator */}
      <div className="mb-8 flex items-center space-x-4">
        {[0, 1, 2].map((step) => {
          const status = getStepStatus(step);
          const stepNames = ["Files", "Functions/Classes", "Project"];
          return (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status === "completed"
                    ? "bg-green-600 text-white"
                    : status === "active"
                    ? "bg-blue-600 text-white"
                    : status === "accessible"
                    ? "bg-blue-200 text-blue-800"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {status === "completed" ? "✓" : step + 1}
              </div>
              <span className="ml-2 text-sm">{stepNames[step]}</span>
              {step < 2 && <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>}
            </div>
          );
        })}
      </div>

      <div className="flex gap-8 justify-center">
        {/* File Preferences */}
        <div className="bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-2">File Preferences</h2>
          <div className="mb-4 p-3 bg-blue-50 rounded border w-full">
            <p className="text-sm text-blue-800 text-center">
              <span className="font-semibold">
                {includedFilesCount} of {allFilesData.length}
              </span>{" "}
              files included
            </p>
          </div>
          <button
            className={`px-4 py-2 rounded ${getStepButtonClass(0)}`}
            onClick={() =>
              handleStepClick(0, `/projects/${projectId}/preferences/files`)
            }
            disabled={!isStepAccessible(0)}
          >
            {isStepCompleted(0)
              ? "✓ Edit File Preferences"
              : "Set File Preferences"}
          </button>
          <p className="mt-4 text-gray-500 text-sm text-center">
            {isStepCompleted(0)
              ? "Click to modify your file selections."
              : "Choose which files to include in documentation."}
          </p>
        </div>

        {/* Function/Class Preferences */}
        <div
          className={`bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center ${
            !isStepAccessible(1) ? "opacity-50" : ""
          }`}
        >
          <h2 className="text-lg font-bold mb-2">Function/Class Preferences</h2>
          <div className="mb-4 p-3 bg-green-50 rounded border w-full">
            <p className="text-sm text-green-800 text-center">
              <span className="font-semibold">
                {includedFunctions} of {totalFunctions}
              </span>{" "}
              functions
            </p>
            <p className="text-sm text-green-800 text-center">
              <span className="font-semibold">
                {includedClasses} of {totalClasses}
              </span>{" "}
              classes
            </p>
          </div>
          <button
            className={`px-4 py-2 rounded ${getStepButtonClass(1)}`}
            onClick={() =>
              handleStepClick(
                1,
                `/projects/${projectId}/preferences/functions-classes`
              )
            }
            disabled={!isStepAccessible(1)}
          >
            {isStepCompleted(1)
              ? "✓ Edit Function/Class Preferences"
              : "Set Function/Class Preferences"}
          </button>
          <p className="mt-4 text-gray-500 text-sm text-center">
            {!isStepAccessible(1)
              ? "Complete file preferences first."
              : "Choose which functions and classes to document."}
          </p>
        </div>

        {/* Project Preferences */}
        <div
          className={`bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center ${
            !isStepAccessible(2) ? "opacity-50" : ""
          }`}
        >
          <h2 className="text-lg font-bold mb-2">Project Preferences</h2>
          <p className="mb-4">Set documentation format and styling options.</p>
          <button
            className={`px-4 py-2 rounded ${getStepButtonClass(2)}`}
            onClick={() =>
              handleStepClick(2, `/projects/${projectId}/preferences/finalize`)
            }
            disabled={!isStepAccessible(2)}
          >
            {isStepCompleted(2)
              ? "✓ Edit Project Preferences"
              : "Set Project Preferences"}
          </button>
          <p className="mt-4 text-gray-500 text-sm text-center">
            {!isStepAccessible(2)
              ? "Complete file preferences first."
              : "Configure documentation style and format."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPreferences;
