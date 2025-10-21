import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";

export default function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateMsg =
    location.state && (location.state.message || location.state.error);
  const params = new URLSearchParams(location.search);
  const code = params.get("code");

  let title = "Something went wrong";
  let description = "An unexpected error occurred.";

  if (code === "404") {
    title = "Page not found";
    description = "The page you're looking for doesn't exist.";
  } else if (code === "503") {
    title = "Service unavailable";
    description =
      "The service is temporarily unavailable. Please try again later.";
  }

  const message = stateMsg || params.get("message");

  return (
    <main className="min-h-[70vh] w-full flex items-center justify-center p-6 bg-gray-50">
      <Card className="w-full max-w-lg">
        <Card.Header>
          <Card.Title>{title}</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          {message && (
            <pre className="text-xs bg-gray-100 border rounded p-3 overflow-auto whitespace-pre-wrap break-words">
              {String(message)}
            </pre>
          )}
        </Card.Content>
        <Card.Footer className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
