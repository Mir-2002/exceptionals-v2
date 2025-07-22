import React from "react";

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  className = "",
  ...props
}) => (
  <div className={`flex flex-col gap-y-1 ${className}`}>
    {label && (
      <label htmlFor={name} className="font-semibold text-md">
        {label}
      </label>
    )}
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        error ? "border-red-500" : "border-gray-300"
      }`}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

export default Input;
