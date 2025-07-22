import React, { useState } from "react";
import Container from "../components/Container";
import Heading from "../components/Heading";
import Form from "../components/forms/Form";
import Input from "../components/forms/Input";
import Button from "../components/Button";
import { Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle registration logic here
    console.log({ email, username, password, confirmPassword });
  };

  return (
    <Container>
      <main className="flex flex-col w-1/3 h-full items-center justify-center border-l-2 border-r-2 gap-y-10">
        <Heading>Register</Heading>
        <Form onSubmit={handleSubmit}>
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
          <Button type="submit">Register</Button>
        </Form>
        <span className="text-sm mt-2">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </span>
      </main>
    </Container>
  );
};

export default Register;
