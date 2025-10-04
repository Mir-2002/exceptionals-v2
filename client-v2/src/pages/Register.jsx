import React, { useState } from "react";
import Form from "../components/Form";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleRegister = async (values) => {
    setError("");
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await register(values.Username, values.email, values.password);
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "");
    }
  };

  return (
    <>
      <section className="flex flex-col w-full h-full justify-center items-center gap-y-4">
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
          initialValues={{ email: "", password: "" }}
          onSubmit={handleRegister}
          buttonText="Register"
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </section>
    </>
  );
};

export default Register;
