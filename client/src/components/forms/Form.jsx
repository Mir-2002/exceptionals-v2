import React from "react";

const Form = ({
  children,
  onSubmit,
  className = "",
  autoComplete = "off",
  ...props
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-y-4 ${className}`}
      autoComplete={autoComplete}
      {...props}
    >
      {children}
    </form>
  );
};

export default Form;
