import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleRegister = async (values) => {
    setError("");
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      showError("Passwords do not match.");
      return;
    }
    try {
      await register(values.Username, values.email, values.password);
      showSuccess("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    }
  };
  return (
    <div className="bg-gray-50 min-h-screen w-screen overflow-x-hidden flex justify-center items-center">
      <section className="flex flex-col w-full max-w-md h-full justify-center items-center gap-y-4 px-6">
        <h1 className="text-2xl font-bold">Register</h1>
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
      </section>
    </div>
  );
};

export default Register;
