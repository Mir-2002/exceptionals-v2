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
      await register(values.Username, values.email, values.password);
      showSuccess("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      const apiDetail =
        err?.response?.data?.detail || err?.response?.data?.message;
      const errorMessage =
        apiDetail || err?.message || "Registration failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    }
  };
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiUserPlus className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-bold">Register</h1>
        </div>
        <Form
          fields={[
            {
              name: "Username",
              label: "Username",
              type: "text",
              required: true,
              placeholder: "Enter your username",
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              required: true,
              placeholder: "Enter your email",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              required: true,
              placeholder: "Enter your password",
            },
            {
              name: "confirmPassword",
              label: "Confirm Password",
              type: "password",
              required: true,
              placeholder: "Confirm your password",
            },
          ]}
          initialValues={{
            Username: "",
            email: "",
            password: "",
            confirmPassword: "",
          }}
          onSubmit={handleRegister}
          buttonText="Register"
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </main>
  );
};

export default Register;
