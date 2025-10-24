import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";
import { FiLogIn } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const { login, getCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (values) => {
    setError("");
    try {
      const tokenData = await login(values.username, values.password);
      const me = await getCurrentUser(tokenData.access_token);
      showSuccess("Login successful! Welcome back.");
      if (me?.is_admin) navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      const apiDetail =
        err?.response?.data?.detail || err?.response?.data?.message;
      const errorMessage = apiDetail || "Login failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleGithub = () => {
    window.location.href = `${API_URL}/auth/github/login`;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiLogIn className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-bold">Login</h1>
        </div>
        <Form
          fields={[
            {
              name: "username",
              label: "Username",
              type: "text",
              required: true,
              placeholder: "Enter your email or username",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              required: true,
              placeholder: "Enter your password",
            },
          ]}
          initialValues={{ username: "", password: "" }}
          onSubmit={handleLogin}
          buttonText="Login"
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <div className="mt-4">
          <button
            onClick={handleGithub}
            className="w-full bg-gray-900 text-white py-2 rounded hover:bg-black"
          >
            Sign in with GitHub
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </main>
  );
};

export default Login;
