# Authentication API Documentation

## Models

### UserLogin

```javascript
{
  username: string,
  password: string
}
```

### Token

```javascript
{
  access_token: string,
  token_type: string
}
```

## Endpoints

### 1. Login

- **POST** `/api/auth/login`
- **Public** (no authentication required)
- **Body**: `UserLogin`
- **Response**: `Token`

```javascript
async function login(credentials) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const token = await login({
  username: "johndoe",
  password: "mypassword123",
});
```

### 2. Get Current User

- **GET** `/api/auth/me`
- **Protected** (requires valid token)
- **Response**: `UserResponse`

```javascript
async function getCurrentUser(token) {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const currentUser = await getCurrentUser("your-jwt-token");
```

## Authentication Flow

### Basic Login Flow

```javascript
// 1. Login to get token
const loginResponse = await login({
  username: "johndoe",
  password: "mypassword123",
});

// 2. Store token (localStorage, sessionStorage, or state management)
localStorage.setItem("token", loginResponse.access_token);

// 3. Use token for authenticated requests
const token = localStorage.getItem("token");
const user = await getCurrentUser(token);
```

### Using Token with Protected Endpoints

```javascript
// Helper function to make authenticated requests
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem("token");
    throw new Error("Authentication expired. Please login again.");
  }

  return response;
}

// Usage with other endpoints
const userResponse = await makeAuthenticatedRequest("/api/users/123");
const user = await userResponse.json();
```

### Logout

```javascript
function logout() {
  // Remove token from storage
  localStorage.removeItem("token");

  // Redirect to login page or update app state
  window.location.href = "/login";
}
```

## Error Responses

| Status Code | Description                                         |
| ----------- | --------------------------------------------------- |
| 401         | Unauthorized - Invalid credentials or expired token |
| 422         | Unprocessable Entity - Invalid request format       |
| 500         | Internal Server Error - Server-side error           |

## Token Information

- **Token Type**: Bearer token (JWT)
- **Expiration**: 60 minutes
- **Header Format**: `Authorization: Bearer <token>`
- **Token Contains**: User ID and admin status

## Notes

- Login endpoint expects `application/x-www-form-urlencoded` content type
- Tokens expire after 60 minutes and need to be refreshed
- Include the token in the `Authorization` header for all protected endpoints
- Admin status is included in the token payload
- Store tokens securely (avoid localStorage for sensitive applications)
- Always handle 401 responses by redirecting to login
