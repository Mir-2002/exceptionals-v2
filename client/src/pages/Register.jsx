import React, { useState } from "react";
import Container from "../components/Container";
import Heading from "../components/Heading";
import Form from "../components/forms/Form";
import Input from "../components/forms/Input";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router-dom";
import { register as registerService } from "../services/authService";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation checks
    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    // Username length check
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    // Password length check
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Password match check
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerService({ username, email, password });
      setLoading(false);
      navigate("/login");
    } catch (err) {
      setLoading(false);
      setError(err.message || "Registration failed");
    }
  };

  return (
    <Container className="flex-col items-center justify-center gap-y-10">
      <Heading>Register</Heading>
      <Form onSubmit={handleSubmit} className="shadow-lg p-10 rounded-xl">
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <span className="text-red-500 text-sm">{error}</span>}
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          className="font-bold"
        >
          {loading ? "Registering..." : "Register"}
        </Button>
      </Form>
      <span className="text-sm mt-2">
        Already have an account?{" "}
        <Link to="/login" className="text-secondary hover:underline">
          Login
        </Link>
      </span>
    </Container>
  );
};

export default Register;
