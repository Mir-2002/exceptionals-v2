import React from "react";

const Heading = ({ children, className }) => {
  return (
    <h1 className={`text-4xl font-bold text-center ${className}`}>
      {children}
    </h1>
  );
};

export default Heading;
