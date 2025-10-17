import React from "react";

const LoadingSpinner = ({
  size = "md",
  text = "Loading...",
  className = "",
  centered = true,
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const containerClass = centered ? "flex justify-center items-center" : "";

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex items-center space-x-2">
        <div
          className={`${sizes[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
        />
        {text && <span className="text-gray-600">{text}</span>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
