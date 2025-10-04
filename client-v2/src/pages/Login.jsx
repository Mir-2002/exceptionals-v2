import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (values) => {
    setError(""); // Clear previous errors
    try {
      await login(values.username, values.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  return (
    <>
      <section className="flex flex-col w-full h-full justify-center items-center gap-y-4">
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
      </section>
    </>
  );
};

export default Login;
