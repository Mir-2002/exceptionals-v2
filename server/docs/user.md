# User API Documentation

## Models

### UserCreate

```javascript
{
  username: string,
  email: string,
  password: string
}
```

### UserUpdate

```javascript
{
  username?: string,
  email?: string,
  password?: string
}
```

### UserResponse

```javascript
{
  id: string,
  username: string,
  email: string
}
```

## Endpoints

### 1. Create User

- **POST** `/api/users`
- **Public** (no authentication required)
- **Body**: `UserCreate`
- **Response**: `UserResponse`

```javascript
async function createUser(userData) {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
  return response.json();
}

// Usage
const newUser = await createUser({
  username: "johndoe",
  email: "john@example.com",
  password: "mypassword123",
});
```

### 2. Get User by ID

- **GET** `/api/users/{user_id}`
- **Protected** (owner or admin only)
- **Response**: `UserResponse`

```javascript
async function getUser(userId, token) {
  const response = await fetch(`/api/users/${userId}`, {
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
const user = await getUser("user123", "your-jwt-token");
```

### 3. Get User Projects

- **GET** `/api/users/{user_id}/projects`
- **Protected** (owner or admin only)
- **Response**: `ProjectResponse[]`

```javascript
async function getUserProjects(userId, token) {
  const response = await fetch(`/api/users/${userId}/projects`, {
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
const projects = await getUserProjects("user123", "your-jwt-token");
```

### 4. Update User

- **PATCH** `/api/users/{user_id}`
- **Protected** (owner or admin only)
- **Body**: `UserUpdate`
- **Response**: `UserResponse`

```javascript
async function updateUser(userId, updates, token) {
  const response = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const updatedUser = await updateUser(
  "user123",
  {
    email: "newemail@example.com",
  },
  "your-jwt-token"
);
```

### 5. Delete User

- **DELETE** `/api/users/{user_id}`
- **Protected** (owner or admin only)
- **Response**: `{ detail: "User deleted successfully." }`

```javascript
async function deleteUser(userId, token) {
  const response = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
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
const result = await deleteUser("user123", "your-jwt-token");
```

## Error Responses

| Status Code | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| 400         | Bad Request - Invalid data, duplicate email/username, or no changes made |
| 403         | Forbidden - Not authorized (not owner or admin)                          |
| 404         | Not Found - User not found                                               |
| 500         | Internal Server Error - Server-side error                                |

## Notes

- All protected endpoints require a valid JWT token in the Authorization header
- Users can only access/modify their own data unless they are an admin
- Passwords are automatically hashed before storage
- Email and username must be unique across all users
- The `password` field is never returned in responses
