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

### 3. GitHub OAuth Login

- **GET** `/api/auth/github/login`
- Redirects user to GitHub for consent. Configure env:
  - `GITHUB_OAUTH_CLIENT_ID`
  - `GITHUB_OAUTH_CLIENT_SECRET`
  - `GITHUB_OAUTH_REDIRECT_URI` (e.g., `http://localhost:5173/oauth/github/callback` on the client, which then calls backend callback)

### 4. GitHub OAuth Callback

- **GET** `/api/auth/github/callback?code=...`
- **Public** (called by frontend after redirect from GitHub)
- Exchanges code, upserts user with provider `github`, stores encrypted token, and returns `Token`.

### 5. GitHub Repositories

- **GET** `/api/auth/github/repos`
- **Protected**
- Returns the authenticated user's repositories from GitHub (subset fields).

### 6. GitHub App Flow

- **GET** `/api/auth/github/login` → Redirects to GitHub to authorize the GitHub App. No OAuth scopes are sent.
- **GET** `/api/auth/github/callback?code=...` → Exchanges the code for a user access token, links/creates the local user, and returns a JWT for this API.
- **GET** `/api/auth/github/repos` → Lists repositories accessible via the GitHub App across the user's installations.

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
- GitHub token is encrypted at rest using `GITHUB_TOKEN_SECRET` (falls back to `SECRET_KEY` in dev).
- User model now supports `auth_provider` (`local` or `github`) and `provider_id`.
- Local registration still works; OAuth users have no local password.

## GitHub Authentication

This service uses the GitHub App OAuth web flow (user-to-server) to connect users' GitHub accounts. The app's permissions are defined in the GitHub App configuration. Users must install the GitHub App to repositories they want the app to access.

### Endpoints

- **GET** `/api/auth/github/login` → Redirects to GitHub to authorize the GitHub App. No OAuth scopes are sent.
- **GET** `/api/auth/github/callback?code=...` → Exchanges the code for a user access token, links/creates the local user, and returns a JWT for this API.
- **GET** `/api/auth/github/repos` → Lists repositories accessible via the GitHub App across the user's installations.

### Environment variables

- `GITHUB_OAUTH_CLIENT_ID` → GitHub App's Client ID
- `GITHUB_OAUTH_CLIENT_SECRET` → GitHub App's Client Secret
- `GITHUB_OAUTH_REDIRECT_URI` → The callback URL registered in the GitHub App (e.g., `https://exceptionals.up.railway.app/oauth/github/callback`)
- `GITHUB_APP_ID` → Numeric App ID
- `GITHUB_APP_PRIVATE_KEY` → The GitHub App private key (PEM, `\n` newlines allowed)

### Notes

- Ensure the GitHub App is public and installable by any account if your site serves the public. Otherwise, non-members will see a 404 at the GitHub authorize URL.
- Frontend should redirect to `/api/auth/github/login` rather than building the GitHub URL client-side.
- When importing or listing repos, this API prefers GitHub App installation access tokens for correct repository permissions.
