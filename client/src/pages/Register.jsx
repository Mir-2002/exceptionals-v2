import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";
import { FiUserPlus } from "react-icons/fi";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleRegister = async (values) => {
    setError("");
    if (values.password !== values.confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      showError(msg);
      return;
    }
    try {
      await register(values.username, values.email, values.password);
      showSuccess("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      let errorMessage = "Registration failed. Please try again.";
      const data = err?.response?.data;
      if (data?.detail) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail
            .map(
              (d) =>
                d?.msg ||
                d?.detail ||
                (typeof d === "string" ? d : "Validation error")
            )
            .join("; ");
        } else if (typeof data.detail === "object") {
          errorMessage =
            data.detail?.message ||
            data.detail?.msg ||
            JSON.stringify(data.detail);
        }
      } else if (typeof data?.message === "string") {
        errorMessage = data.message;
      } else if (typeof err?.message === "string") {
        errorMessage = err.message;
      }
      errorMessage = String(errorMessage);
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 max-md:px-3">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 max-md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiUserPlus className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-bold max-md:text-xl">Register</h1>
        </div>
        <Form
          fields={[
            {
              name: "username",
              label: "Username",
              type: "text",
              required: true,
              placeholder: "Enter your username",
              inputProps: { minLength: 3, autoComplete: "username" },
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              required: true,
              placeholder: "Enter your email",
              inputProps: { autoComplete: "email" },
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              required: true,
              placeholder: "Enter your password",
              inputProps: { minLength: 8, autoComplete: "new-password" },
            },
            {
              name: "confirmPassword",
              label: "Confirm Password",
              type: "password",
              required: true,
              placeholder: "Confirm your password",
              inputProps: { minLength: 8, autoComplete: "new-password" },
            },
          ]}
          initialValues={{
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
          }}
          onSubmit={handleRegister}
          buttonText="Register"
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <p className="mt-4 text-sm text-gray-600 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Login here
          </a>
        </p>
        <p className="mt-2 text-xs text-center text-gray-500">
          <a href="/" className="hover:underline">
            Back to Home
          </a>
        </p>
      </div>
    </main>
  );
};

export default Register;
