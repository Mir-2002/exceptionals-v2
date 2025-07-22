import React from "react";

const Subheading = ({ children, className }) => {
  return (
    <>
      <h2
        className={`text-xl font-medium text-gray-700 text-center ${className}`}
      >
        {children}
      </h2>
    </>
  );
};

export default Subheading;
