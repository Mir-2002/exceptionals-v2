import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";
import {
  Button,
  Card,
  StepProgress,
  StatsCard,
  LoadingSpinner,
} from "../components/ui";
import { showSuccess, showError } from "../utils/toast";

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
        showSuccess("All preferences have been reset.");
        initializePreferences(projectId, token);
      } else {
        showError("Failed to reset preferences. Please try again.");
      }
    }
  };
  if (prefsLoading) {
    return <LoadingSpinner text="Loading preferences..." className="mt-10" />;
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

  const steps = [
    { name: "Files" },
    { name: "Functions/Classes" },
    { name: "Project" },
  ];

  return (
    <div className="flex flex-col items-center mt-10">
      <Button
        variant="secondary"
        className="mb-8"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        Back
      </Button>
      <Button
        variant="warning"
        className="mb-4"
        onClick={handleResetAll}
        disabled={prefsLoading}
      >
        Reset All Preferences
      </Button>{" "}
      {/* Step Progress Indicator */}
      <StepProgress
        steps={steps}
        currentStep={currentStep}
        getStepStatus={getStepStatus}
        className="mb-8"
      />
      <div className="flex gap-8 justify-center">
        {/* File Preferences */}{" "}
        <Card className="w-80 flex flex-col items-center">
          <Card.Header>
            <Card.Title>File Preferences</Card.Title>
          </Card.Header>
          <Card.Content>
            <StatsCard
              title="files included"
              value={includedFilesCount}
              total={allFilesData.length}
              color="blue"
              className="mb-4"
            />
            <div className="flex justify-center">
              <Button
                variant={isStepCompleted(0) ? "success" : "primary"}
                onClick={() =>
                  handleStepClick(0, `/projects/${projectId}/preferences/files`)
                }
                disabled={!isStepAccessible(0)}
              >
                {isStepCompleted(0)
                  ? "✓ Edit File Preferences"
                  : "Set File Preferences"}
              </Button>
            </div>
            <p className="mt-4 text-gray-500 text-sm text-center">
              {isStepCompleted(0)
                ? "Click to modify your file selections."
                : "Choose which files to include in documentation."}
            </p>
          </Card.Content>
        </Card>
        {/* Function/Class Preferences */}
        <Card
          className={`w-80 flex flex-col items-center ${
            !isStepAccessible(1) ? "opacity-50" : ""
          }`}
        >
          <Card.Header>
            <Card.Title>Function/Class Preferences</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-2 mb-4">
              <StatsCard
                title="functions"
                value={includedFunctions}
                total={totalFunctions}
                color="green"
              />
              <StatsCard
                title="classes"
                value={includedClasses}
                total={totalClasses}
                color="green"
              />
            </div>
            <div className="flex justify-center">
              <Button
                variant={isStepCompleted(1) ? "success" : "primary"}
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
              </Button>
            </div>
            <p className="mt-4 text-gray-500 text-sm text-center">
              {!isStepAccessible(1)
                ? "Complete file preferences first."
                : "Choose which functions and classes to document."}
            </p>
          </Card.Content>
        </Card>
        {/* Project Preferences */}
        <Card
          className={`w-80 flex flex-col items-center ${
            !isStepAccessible(2) ? "opacity-50" : ""
          }`}
        >
          <Card.Header>
            <Card.Title>Project Preferences</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="mb-4 text-center">
              Set documentation format and styling options.
            </p>
            <div className="flex justify-center">
              <Button
                variant={isStepCompleted(2) ? "success" : "primary"}
                onClick={() =>
                  handleStepClick(
                    2,
                    `/projects/${projectId}/preferences/finalize`
                  )
                }
                disabled={!isStepAccessible(2)}
              >
                {isStepCompleted(2)
                  ? "✓ Edit Project Preferences"
                  : "Set Project Preferences"}
              </Button>
            </div>
            <p className="mt-4 text-gray-500 text-sm text-center">
              {!isStepAccessible(2)
                ? "Complete file preferences first."
                : "Configure documentation style and format."}
            </p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default SetPreferences;
