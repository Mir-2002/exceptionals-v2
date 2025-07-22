import React, { useState } from "react";
import Container from "../components/Container";
import Heading from "../components/Heading";
import Form from "../components/forms/Form";
import Input from "../components/forms/Input";
import Checkbox from "../components/forms/Checkbox";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // If your backend expects username instead of email, adjust accordingly
      await login({ username, password });
      setLoading(false);
      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err.message || "Login failed");
    }
  };

  return (
    <>
      <Container>
        <main className="flex flex-col w-1/3 h-full items-center justify-center border-l-2 border-r-2 gap-y-10">
          <Heading>Login</Heading>
          <Form onSubmit={handleSubmit}>
            <Input
              label="Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              autoComplete="username"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Checkbox
              label="Remember me"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {error && <span className="text-red-500 text-sm">{error}</span>}
            <Button
              type="submit"
              className="font-bold"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Form>
          <span className="text-sm mt-2">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </span>
        </main>
      </Container>
    </>
  );
};

export default Login;
