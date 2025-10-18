import React from "react";

const Container = ({ children, className }) => {
  return (
    <main
      className={`w-full min-h-screen flex text-primary font-funnel-sans ${className}`}
    >
      {children}
    </main>
  );
};

export default Container;
