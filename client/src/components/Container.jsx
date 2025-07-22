import React from "react";

const Container = ({ children, className }) => {
  return (
    <div
      className={`w-full h-screen flex items-center justify-center font-mono ${className}`}
    >
      {children}
    </div>
  );
};

export default Container;
