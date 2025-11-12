import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";
import { FiLogIn } from "react-icons/fi";
import MobilePage from "./MobilePage";

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const { login, getCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showBlocker, setShowBlocker] = useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleLogin = async (values) => {
    if (isMobile) {
      setShowBlocker(true);
      return;
    }
    setError("");
    try {
      const tokenData = await login(values.username, values.password);
      const me = await getCurrentUser(tokenData.access_token);
      showSuccess("Login successful! Welcome back.");
      if (me?.is_admin) navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      // Robust normalization for FastAPI 422 validation errors and others
      let errorMessage = "Login failed. Please try again.";
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

  const handleGithub = () => {
    if (isMobile) {
      setShowBlocker(true);
      return;
    }
    window.location.href = `${API_URL}/auth/github/login`;
  };

  if (showBlocker && isMobile) {
    return <MobilePage />;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 max-md:px-3">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 max-md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiLogIn className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-bold max-md:text-xl">Login</h1>
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
              name: "password",
              label: "Password",
              type: "password",
              required: true,
              placeholder: "Enter your password",
              inputProps: { autoComplete: "current-password" },
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
            className="w-full bg-gray-900 text-white py-2 rounded hover:bg-black text-sm"
          >
            Sign in with GitHub
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register here
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

export default Login;
