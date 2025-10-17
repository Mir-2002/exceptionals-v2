import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (values) => {
    setError(""); // Clear previous errors
    try {
      await login(values.username, values.password);
      showSuccess("Login successful! Welcome back.");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || "Login failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    }
  };
  return (
    <div className="bg-gray-50 min-h-screen w-screen overflow-x-hidden flex justify-center items-center">
      <section className="flex flex-col w-full max-w-md h-full justify-center items-center gap-y-4 px-6">
        <h1 className="text-2xl font-bold">Login</h1>
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
        <p className="mt-4 text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register here
          </a>
        </p>
      </section>
    </div>
  );
};

export default Login;
