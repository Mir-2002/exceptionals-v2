import React from "react";

const Button = ({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  fullWidth = false,
  ...props
}) => {
  const base = "text-md p-3 rounded-xl text-white transition";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700",
    secondary: "bg-gray-400 hover:bg-gray-500",
    danger: "bg-red-500 hover:bg-red-600",
  };
  const disabledStyle = "opacity-50 cursor-not-allowed";
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${
        disabled || loading ? disabledStyle : ""
      } ${className}`}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;
