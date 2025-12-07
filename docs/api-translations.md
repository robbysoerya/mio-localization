# Translations API Documentation

## Overview

The Translations API allows you to manage translations for localization keys. Translations can be filtered by project, feature, locale, and more.

**Base URL**: `/translations`

---

## Endpoints

### 1. Create Translation

Create or update a translation for a specific key and locale.

**Endpoint**: `POST /translations`

**Request Body**:

```json
{
  "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
  "locale": "en",
  "value": "Welcome to our app"
}
```

**Response**: `201 Created`

```json
{
  "id": "clq4d5e6f7g8h9i0j1k2l3m4",
  "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
  "locale": "en",
  "value": "Welcome to our app",
  "isReviewed": false,
  "createdAt": "2025-12-07T05:30:00.000Z",
  "updatedAt": "2025-12-07T05:30:00.000Z"
}
```

**Notes**:

- Uses **upsert** logic: creates if doesn't exist, updates if it does
- Unique constraint on `(keyId, locale)` combination

---

### 2. Get All Translations (Paginated)

Retrieve all translations with pagination.

**Endpoint**: `GET /translations`

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: "createdAt")
- `sortOrder` (optional): "asc" or "desc" (default: "desc")

**Example**:

```bash
GET /translations?page=1&limit=20&sortBy=updatedAt&sortOrder=desc
```

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "clq4d5e6f7g8h9i0j1k2l3m4",
      "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
      "keyName": "welcome_message",
      "featureId": "clq2b3c4d5e6f7g8h9i0j1k2",
      "featureName": "Login Screen",
      "locale": "en",
      "value": "Welcome to our app",
      "isReviewed": false,
      "createdAt": "2025-12-07T05:30:00.000Z",
      "updatedAt": "2025-12-07T05:30:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### 3. Search Translations

Search and filter translations with advanced options.

**Endpoint**: `GET /translations/search`

**Query Parameters**:

- `q` (optional): Search term (searches in value, key name, and feature name)
- `locale` (optional): Filter by locale (e.g., "en", "id")
- `featureId` (optional): Filter by feature ID
- `projectId` (optional): **Filter by project ID** ✨
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: "createdAt")
- `sortOrder` (optional): "asc" or "desc" (default: "desc")

**Examples**:

Search for "login" in all translations:

```bash
GET /translations/search?q=login
```

Get all English translations for a specific project:

```bash
GET /translations/search?locale=en&projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

Get all translations for a feature:

```bash
GET /translations/search?featureId=clq2b3c4d5e6f7g8h9i0j1k2
```

**Response**: Same format as "Get All Translations"

---

### 4. Get Translations by Key

Get all translations for a specific key across all locales.

**Endpoint**: `GET /translations/key/:keyId`

**URL Parameters**:

- `keyId`: Translation key ID

**Response**: `200 OK`

```json
[
  {
    "id": "clq4d5e6f7g8h9i0j1k2l3m4",
    "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
    "locale": "en",
    "value": "Welcome",
    "isReviewed": false,
    "createdAt": "2025-12-07T05:30:00.000Z",
    "updatedAt": "2025-12-07T05:30:00.000Z"
  },
  {
    "id": "clq5e6f7g8h9i0j1k2l3m4n5",
    "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
    "locale": "id",
    "value": "Selamat datang",
    "isReviewed": false,
    "createdAt": "2025-12-07T05:31:00.000Z",
    "updatedAt": "2025-12-07T05:31:00.000Z"
  }
]
```

---

### 5. Get Translation Statistics

Get comprehensive statistics about translation completion and coverage.

**Endpoint**: `GET /translations/statistics`

**Query Parameters**:

- `featureId` (optional): Filter statistics by feature
- `projectId` (optional): **Filter statistics by project** ✨

**Examples**:

Get overall statistics:

```bash
GET /translations/statistics
```

Get statistics for a specific project:

```bash
GET /translations/statistics?projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

Get statistics for a specific feature:

```bash
GET /translations/statistics?featureId=clq2b3c4d5e6f7g8h9i0j1k2
```

**Response**: `200 OK`

```json
{
  "overallCompletionPercentage": 85,
  "totalTranslations": 450,
  "emptyValueCount": 12,
  "orphanedKeysCount": 3,
  "activeFeaturesWithMissingTranslations": 5,
  "completionByLocale": [
    {
      "locale": "en",
      "total": 150,
      "filled": 145,
      "percentage": 97
    },
    {
      "locale": "id",
      "total": 150,
      "filled": 130,
      "percentage": 87
    }
  ],
  "completionByFeature": [
    {
      "featureId": "clq2b3c4d5e6f7g8h9i0j1k2",
      "featureName": "Login Screen",
      "total": 60,
      "filled": 58,
      "percentage": 97
    }
  ],
  "missingTranslations": [
    {
      "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
      "keyName": "welcome_message",
      "featureId": "clq2b3c4d5e6f7g8h9i0j1k2",
      "featureName": "Login Screen",
      "missingLocales": ["zh", "ja"],
      "filledLocales": ["en", "id"]
    }
  ],
  "recentlyUpdated": [
    {
      "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
      "keyName": "welcome_message",
      "locale": "en",
      "value": "Welcome!",
      "updatedAt": "2025-12-07T05:30:00.000Z"
    }
  ],
  "mostActiveFeatures": [
    {
      "featureId": "clq2b3c4d5e6f7g8h9i0j1k2",
      "featureName": "Login Screen",
      "translationCount": 145
    }
  ],
  "duplicateKeys": [
    {
      "keyName": "submit_button",
      "features": [
        {
          "featureId": "clq2b3c4d5e6f7g8h9i0j1k2",
          "featureName": "Login Screen"
        },
        {
          "featureId": "clq3c4d5e6f7g8h9i0j1k2l3",
          "featureName": "Registration"
        }
      ]
    }
  ]
}
```

---

### 6. Update Translation

Update an existing translation.

**Endpoint**: `PATCH /translations/:id`

**URL Parameters**:

- `id`: Translation ID

**Request Body** (all fields optional):

```json
{
  "value": "Updated translation text",
  "isReviewed": true
}
```

**Response**: `200 OK`

```json
{
  "id": "clq4d5e6f7g8h9i0j1k2l3m4",
  "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
  "locale": "en",
  "value": "Updated translation text",
  "isReviewed": true,
  "createdAt": "2025-12-07T05:30:00.000Z",
  "updatedAt": "2025-12-07T06:00:00.000Z"
}
```

---

### 7. Delete Translation

Delete a translation.

**Endpoint**: `DELETE /translations/:id`

**URL Parameters**:

- `id`: Translation ID

**Response**: `200 OK`

```json
{
  "id": "clq4d5e6f7g8h9i0j1k2l3m4",
  "keyId": "clq3c4d5e6f7g8h9i0j1k2l3",
  "locale": "en",
  "value": "Deleted translation",
  "isReviewed": false,
  "createdAt": "2025-12-07T05:30:00.000Z",
  "updatedAt": "2025-12-07T05:30:00.000Z"
}
```

---

### 8. Bulk Upload from CSV

Upload multiple translations at once from a CSV file.

**Endpoint**: `POST /translations/bulk-upload`

**Query Parameters**:

- `featureId` (required): Feature ID to associate the keys with

**Request**:

- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: CSV

**CSV Format**:

```csv
key,en,id,zh
welcome_message,Welcome,Selamat datang,欢迎
login_button,Login,Masuk,登录
```

**Response**: `201 Created`

```json
{
  "success": true,
  "totalRows": 2,
  "created": 4,
  "updated": 2,
  "errors": []
}
```

**Notes**:

- First column must be "key"
- Other columns are locale codes (must exist in Language table)
- Creates keys if they don't exist
- Upserts translations (creates or updates)

---

## Project Filtering Support ✨

Both the **statistics** and **search** endpoints now support filtering by `projectId`:

### Use Cases

**1. Get project-specific statistics**:

```bash
GET /translations/statistics?projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

Returns completion metrics for all features within the specified project.

**2. Search translations within a project**:

```bash
GET /translations/search?projectId=clq1a2b3c4d5e6f7g8h9i0j1&locale=en
```

Returns all English translations for the specified project.

**3. Monitor project progress**:
Combine with other filters for detailed insights:

```bash
GET /translations/statistics?projectId=clq1a2b3c4d5e6f7g8h9i0j1
```

---

## Error Handling

Standard HTTP status codes:

- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid request or validation error
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Next Steps

See also:

- [Projects API Documentation](file:///home/bandreg/Developments/mio-localization/docs/api-projects.md)
- [Features API Documentation](file:///home/bandreg/Developments/mio-localization/docs/api-features.md)
