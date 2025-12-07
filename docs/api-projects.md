# Projects API Documentation

## Overview

The Projects API allows you to manage localization projects. Each project can contain multiple features, which in turn contain translation keys.

**Base URL**: `/projects`

---

## Endpoints

### 1. Create Project

Create a new localization project.

**Endpoint**: `POST /projects`

**Request Body**:

```json
{
  "name": "Mobile App",
  "description": "Localization for iOS and Android app" // optional
}
```

**Response**: `201 Created`

```json
{
  "id": "clq1a2b3c4d5e6f7g8h9i0j1",
  "name": "Mobile App",
  "description": "Localization for iOS and Android app",
  "isActive": true,
  "createdAt": "2024-12-07T04:58:33.000Z",
  "updatedAt": "2024-12-07T04:58:33.000Z"
}
```

**Validation**:

- `name`: Required, string
- `description`: Optional, string

---

### 2. Get All Projects

Retrieve all active projects.

**Endpoint**: `GET /projects`

**Response**: `200 OK`

```json
[
  {
    "id": "clq1a2b3c4d5e6f7g8h9i0j1",
    "name": "Mobile App",
    "description": "Localization for iOS and Android app",
    "isActive": true,
    "createdAt": "2024-12-07T04:58:33.000Z",
    "updatedAt": "2024-12-07T04:58:33.000Z"
  },
  {
    "id": "clq2b3c4d5e6f7g8h9i0j1k2",
    "name": "Web Dashboard",
    "description": null,
    "isActive": true,
    "createdAt": "2024-12-06T10:30:00.000Z",
    "updatedAt": "2024-12-06T10:30:00.000Z"
  }
]
```

**Notes**:

- Only returns projects where `isActive: true`
- Results are ordered by `createdAt` descending (newest first)

---

### 3. Get Project by ID

Retrieve a specific project by its ID.

**Endpoint**: `GET /projects/:id`

**URL Parameters**:

- `id`: Project ID (string, CUID format)

**Response**: `200 OK`

```json
{
  "id": "clq1a2b3c4d5e6f7g8h9i0j1",
  "name": "Mobile App",
  "description": "Localization for iOS and Android app",
  "isActive": true,
  "createdAt": "2024-12-07T04:58:33.000Z",
  "updatedAt": "2024-12-07T04:58:33.000Z"
}
```

**Error Responses**:

- `404 Not Found`: Project does not exist

```json
{
  "statusCode": 404,
  "message": "Project not found"
}
```

---

### 4. Update Project

Update an existing project's details.

**Endpoint**: `PATCH /projects/:id`

**URL Parameters**:

- `id`: Project ID (string, CUID format)

**Request Body** (all fields optional):

```json
{
  "name": "Mobile App v2",
  "description": "Updated description"
}
```

**Response**: `200 OK`

```json
{
  "id": "clq1a2b3c4d5e6f7g8h9i0j1",
  "name": "Mobile App v2",
  "description": "Updated description",
  "isActive": true,
  "createdAt": "2024-12-07T04:58:33.000Z",
  "updatedAt": "2024-12-07T05:10:00.000Z"
}
```

**Error Responses**:

- `404 Not Found`: Project does not exist

---

### 5. Delete Project (Soft Delete)

Deactivate a project (soft delete - sets `isActive: false`).

**Endpoint**: `DELETE /projects/:id`

**URL Parameters**:

- `id`: Project ID (string, CUID format)

**Response**: `200 OK`

```json
{
  "id": "clq1a2b3c4d5e6f7g8h9i0j1",
  "name": "Mobile App",
  "description": "Localization for iOS and Android app",
  "isActive": false,
  "createdAt": "2024-12-07T04:58:33.000Z",
  "updatedAt": "2024-12-07T05:15:00.000Z"
}
```

**Notes**:

- This is a soft delete - the project is not removed from the database
- The project will no longer appear in `GET /projects` list
- Associated features and translations remain in the database

**Error Responses**:

- `404 Not Found`: Project does not exist

---

## Data Model

### Project Object

```typescript
{
  id: string; // CUID, auto-generated
  name: string; // Project name
  description: string | null; // Optional description
  isActive: boolean; // Default: true
  createdAt: Date; // Auto-generated
  updatedAt: Date; // Auto-updated
}
```

---

## Integration with Features

Once a project is created, you can create features linked to it:

```http
POST /features
{
  "name": "Login Screen",
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1"  // Required
}
```

To get all features for a specific project:

```http
GET /features?projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

---

## Example Workflow

1. **Create a project**:

   ```bash
   curl -X POST http://localhost:4000/projects \
     -H "Content-Type: application/json" \
     -d '{"name": "Mobile App", "description": "iOS and Android"}'
   ```

2. **Get the project ID** from the response

3. **Create features** for the project:

   ```bash
   curl -X POST http://localhost:4000/features \
     -H "Content-Type: application/json" \
     -d '{"name": "Login", "projectId": "clq1a2b3c4d5e6f7g8h9i0j1"}'
   ```

4. **List all projects**:
   ```bash
   curl http://localhost:4000/projects
   ```

---

## Error Handling

All endpoints follow standard HTTP status codes:

- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid request body or parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
