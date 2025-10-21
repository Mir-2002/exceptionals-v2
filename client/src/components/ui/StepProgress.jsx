import React from "react";

const StepProgress = ({
  steps,
  currentStep,
  getStepStatus,
  className = "",
}) => {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index;
        const status = getStepStatus(stepNumber);

        return (
          <div key={stepNumber} className="flex items-center">
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
              {status === "completed" ? "✓" : stepNumber + 1}
            </div>
            <span className="ml-2 text-sm">{step.name}</span>
            {index < steps.length - 1 && (
              <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepProgress;
