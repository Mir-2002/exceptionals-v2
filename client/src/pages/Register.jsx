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
  const [errorList, setErrorList] = useState([]);

  const handleRegister = async (values) => {
    setError("");
    setErrorList([]);
    const errors = [];
    if (values.username.length < 3) {
      errors.push("Username should have at least 3 characters.");
    }
    if (values.password.length < 8) {
      errors.push("Password should have at least 8 characters.");
    }
    if (values.password !== values.confirmPassword) {
      errors.push("Passwords do not match.");
    }
    if (errors.length > 0) {
      setErrorList(errors);
      errors.forEach((err) => showError(err));
      return;
    }
    try {
      await register(values.username, values.email, values.password);
      showSuccess("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      let errorMessage = "Registration failed. Please try again.";
      const data = err?.response?.data;
      let errorsArr = [];
      if (data?.detail) {
        if (typeof data.detail === "string") {
          errorsArr = [data.detail];
        } else if (Array.isArray(data.detail)) {
          errorsArr = data.detail.map(
            (d) =>
              d?.msg ||
              d?.detail ||
              (typeof d === "string" ? d : "Validation error")
          );
        } else if (typeof data.detail === "object") {
          errorsArr = [
            data.detail?.message ||
              data.detail?.msg ||
              JSON.stringify(data.detail),
          ];
        }
      } else if (typeof data?.message === "string") {
        errorsArr = [data.message];
      } else if (typeof err?.message === "string") {
        errorsArr = [err.message];
      } else {
        errorsArr = [errorMessage];
      }
      setErrorList(errorsArr);
      errorsArr.forEach((err) => showError(err));
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
        {errorList.length > 0 && (
          <div className="mt-2">
            {errorList.map((err, idx) => (
              <div key={idx} className="text-red-600 text-sm mb-1">
                {err}
              </div>
            ))}
          </div>
        )}
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
