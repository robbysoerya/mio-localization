# Features API Documentation

## Overview

The Features API allows you to manage localization features within projects. Each feature belongs to a project and can contain multiple translation keys.

**Base URL**: `/features`

---

## Endpoints

### 1. Create Feature

Create a new feature within a project.

**Endpoint**: `POST /features`

**Request Body**:

```json
{
  "name": "Login Screen",
  "description": "All login-related translations", // optional
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1" // required
}
```

**Response**: `201 Created`

```json
{
  "id": "clq2b3c4d5e6f7g8h9i0j1k2",
  "name": "Login Screen",
  "description": "All login-related translations",
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
  "isActive": true,
  "createdAt": "2024-12-07T05:01:33.000Z",
  "updatedAt": "2024-12-07T05:01:33.000Z",
  "totalKeys": 0
}
```

**Validation**:

- `name`: Required, string, non-empty
- `description`: Optional, string
- `projectId`: **Required**, string, non-empty, must be a valid project ID

**Error Responses**:

- `400 Bad Request`: Missing or invalid `projectId`

```json
{
  "statusCode": 400,
  "message": ["projectId should not be empty"],
  "error": "Bad Request"
}
```

---

### 2. Get All Features

Retrieve all features, optionally filtered by project.

**Endpoint**: `GET /features`

**Query Parameters**:

- `projectId` (optional): Filter features by project ID

**Examples**:

Get all features:

```bash
GET /features
```

Get features for a specific project:

```bash
GET /features?projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

**Response**: `200 OK`

```json
[
  {
    "id": "clq2b3c4d5e6f7g8h9i0j1k2",
    "name": "Login Screen",
    "description": "All login-related translations",
    "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
    "isActive": true,
    "createdAt": "2024-12-07T05:01:33.000Z",
    "updatedAt": "2024-12-07T05:01:33.000Z",
    "totalKeys": 15
  },
  {
    "id": "clq3c4d5e6f7g8h9i0j1k2l3",
    "name": "Dashboard",
    "description": null,
    "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
    "isActive": true,
    "createdAt": "2024-12-06T10:30:00.000Z",
    "updatedAt": "2024-12-06T10:30:00.000Z",
    "totalKeys": 8
  }
]
```

**Notes**:

- Results are ordered by `createdAt` descending (newest first)
- `totalKeys` shows the count of translation keys in each feature

---

### 3. Get Feature by ID

Retrieve a specific feature by its ID.

**Endpoint**: `GET /features/:id`

**URL Parameters**:

- `id`: Feature ID (string, CUID format)

**Response**: `200 OK`

```json
{
  "id": "clq2b3c4d5e6f7g8h9i0j1k2",
  "name": "Login Screen",
  "description": "All login-related translations",
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
  "isActive": true,
  "createdAt": "2024-12-07T05:01:33.000Z",
  "updatedAt": "2024-12-07T05:01:33.000Z",
  "totalKeys": 15
}
```

**Error Responses**:

- `404 Not Found`: Feature does not exist

---

### 4. Update Feature

Update an existing feature's details.

**Endpoint**: `PATCH /features/:id`

**URL Parameters**:

- `id`: Feature ID (string, CUID format)

**Request Body** (all fields optional):

```json
{
  "name": "Login & Registration",
  "description": "Updated description"
}
```

**Response**: `200 OK`

```json
{
  "id": "clq2b3c4d5e6f7g8h9i0j1k2",
  "name": "Login & Registration",
  "description": "Updated description",
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
  "isActive": true,
  "createdAt": "2024-12-07T05:01:33.000Z",
  "updatedAt": "2024-12-07T05:10:00.000Z",
  "totalKeys": 15
}
```

**Notes**:

- You cannot update `projectId` - features cannot be moved between projects
- To move a feature, delete and recreate it in the new project

**Error Responses**:

- `404 Not Found`: Feature does not exist

---

### 5. Delete Feature

Permanently delete a feature and all its associated keys and translations.

**Endpoint**: `DELETE /features/:id`

**URL Parameters**:

- `id`: Feature ID (string, CUID format)

**Response**: `200 OK`

```json
{
  "id": "clq2b3c4d5e6f7g8h9i0j1k2",
  "name": "Login Screen",
  "description": "All login-related translations",
  "projectId": "clq1a2b3c4d5e6f7g8h9i0j1",
  "isActive": true,
  "createdAt": "2024-12-07T05:01:33.000Z",
  "updatedAt": "2024-12-07T05:01:33.000Z"
}
```

**⚠️ Warning**:

- This is a **hard delete** - the feature is permanently removed
- All associated keys and translations will also be deleted (cascade delete)
- This action cannot be undone

**Error Responses**:

- `404 Not Found`: Feature does not exist

---

## Data Model

### Feature Response Object

```typescript
{
  id: string; // CUID, auto-generated
  name: string; // Feature name
  description: string | null; // Optional description
  projectId: string; // Required - ID of parent project
  isActive: boolean; // Default: true
  createdAt: Date; // Auto-generated
  updatedAt: Date; // Auto-updated
  totalKeys: number; // Count of translation keys
}
```

---

## Hierarchy

Features sit in the middle of the localization hierarchy:

```
Project (required parent)
  └── Feature
      └── Key (children)
          └── Translation (grandchildren)
```

**Important**:

- A Feature **must** belong to a Project
- Deleting a Feature will delete all its Keys and Translations

---

## Example Workflow

### 1. Create a feature for a project

```bash
curl -X POST http://localhost:4000/features \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Login Screen",
    "description": "Login and authentication",
    "projectId": "clq1a2b3c4d5e6f7g8h9i0j1"
  }'
```

### 2. Get all features for a project

```bash
curl "http://localhost:4000/features?projectId=clq1a2b3c4d5e6f7g8h9i0j1"
```

### 3. Update a feature

```bash
curl -X PATCH http://localhost:4000/features/clq2b3c4d5e6f7g8h9i0j1k2 \
  -H "Content-Type: application/json" \
  -d '{"name": "Login & Registration"}'
```

### 4. Get a specific feature

```bash
curl http://localhost:4000/features/clq2b3c4d5e6f7g8h9i0j1k2
```

### 5. Delete a feature

```bash
curl -X DELETE http://localhost:4000/features/clq2b3c4d5e6f7g8h9i0j1k2
```

---

## Common Use Cases

### Organizing Features by Screen/Module

```
Project: "Mobile App"
  ├── Feature: "Login Screen"
  ├── Feature: "Dashboard"
  ├── Feature: "Settings"
  └── Feature: "Profile"
```

### Organizing Features by Functionality

```
Project: "E-commerce Website"
  ├── Feature: "Product Catalog"
  ├── Feature: "Shopping Cart"
  ├── Feature: "Checkout Process"
  └── Feature: "User Account"
```

---

## Error Handling

All endpoints follow standard HTTP status codes:

- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid request body or missing required fields
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:

```json
{
  "statusCode": 400,
  "message": ["projectId should not be empty"],
  "error": "Bad Request"
}
```

---

## Next Steps

After creating features, you can:

1. **Create Keys**: `POST /keys` with `featureId`
2. **Add Translations**: `POST /translations` with `keyId` and `locale`

See the Keys API and Translations API documentation for more details.
