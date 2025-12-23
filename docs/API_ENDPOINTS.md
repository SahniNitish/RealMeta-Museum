# Meta Visit AR/VR - API Documentation

> **Base URL**: `http://localhost:4000` (development) or your deployed server URL  
> **Content-Type**: `application/json` (unless uploading files)

---

## Table of Contents

1. [Health Check](#health-check)
2. [Museums API](#museums-api)
3. [Visitor API](#visitor-api) ⭐ *Primary for AR/VR Integration*
4. [Public API](#public-api)
5. [Admin API](#admin-api)
6. [Data Models](#data-models)

---

## Health Check

### `GET /health`

Check server status.

**Response:**
```json
{ "ok": true }
```

---

## Museums API

Base path: `/api/museums`

### `GET /api/museums`

List all museums.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "museums": [
    {
      "_id": "64abc...",
      "name": "Metropolitan Museum of Art",
      "location": "New York, USA",
      "qrCode": "metropolitan-museum-of-art-new-york-usa-1234",
      "website": "https://metmuseum.org",
      "description": "World-renowned art museum",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### `GET /api/museums/:id`

Get specific museum details.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `id` | string | MongoDB ObjectId |

**Response:**
```json
{
  "success": true,
  "museum": {
    "_id": "64abc...",
    "name": "Metropolitan Museum of Art",
    "location": "New York, USA",
    "qrCode": "metropolitan-museum-of-art-new-york-usa-1234",
    "artworkCount": 45
  }
}
```

---

### `POST /api/museums`

Create a new museum.

**Request Body:**
```json
{
  "name": "Louvre Museum",
  "location": "Paris, France",
  "website": "https://louvre.fr",
  "description": "World's largest art museum"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "museum": {
    "_id": "64xyz...",
    "name": "Louvre Museum",
    "qrCode": "louvre-museum-paris-france-5678"
  }
}
```

---

### `PUT /api/museums/:id`

Update museum details.

---

### `DELETE /api/museums/:id`

Delete a museum (only if no artworks linked).

---

### `GET /api/museums/:id/qr`

Generate QR code image for museum.

**Response:**
```json
{
  "success": true,
  "museum": { "id": "64abc...", "name": "...", "qrCode": "..." },
  "visitorUrl": "http://localhost:3000/visit/museum-qr-code",
  "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

### `GET /api/museums/:id/artworks`

Get all artworks in a museum.

---

## Visitor API

> ⭐ **Primary endpoints for AR/VR integration**

Base path: `/api/visit`

### `GET /api/visit/:qrCode`

Get museum info by scanning QR code.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `qrCode` | string | Museum's unique QR code slug |

**Response:**
```json
{
  "success": true,
  "museum": {
    "id": "64abc...",
    "name": "Metropolitan Museum of Art",
    "location": "New York, USA",
    "description": "World-renowned art museum",
    "website": "https://metmuseum.org",
    "artworkCount": 45
  }
}
```

---

### `POST /api/visit/:qrCode/identify` ⭐ **Image Recognition**

**Upload visitor's photo to identify artwork using AI/CLIP embeddings.**

**Content-Type:** `multipart/form-data`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `qrCode` | string | Museum's QR code (URL param) |
| `photo` | file | Image file (JPEG/PNG/WebP, max 10MB) |
| `language` | string | Optional: `en`, `fr`, `es` (default: `en`) |

**cURL Example:**
```bash
curl -X POST "http://localhost:4000/api/visit/met-museum-1234/identify" \
  -F "photo=@/path/to/artwork_photo.jpg" \
  -F "language=en"
```

**Response:**
```json
{
  "success": true,
  "confident": true,
  "museum": {
    "id": "64abc...",
    "name": "Metropolitan Museum of Art"
  },
  "bestMatch": {
    "id": "64xyz...",
    "title": "Starry Night",
    "author": "Vincent van Gogh",
    "year": "1889",
    "style": "Post-Impressionism",
    "imageUrl": "/uploads/1702123456_starry_night.jpg",
    "description": "Swirling night sky over a village...",
    "audioUrl": "/uploads/audio_en_1702123456.mp3",
    "matchScore": 87,
    "sources": [
      { "provider": "Wikipedia", "url": "https://en.wikipedia.org/wiki/The_Starry_Night" }
    ]
  },
  "alternatives": [
    {
      "id": "64def...",
      "title": "Café Terrace at Night",
      "matchScore": 62
    }
  ],
  "totalArtworks": 45
}
```

---

### `GET /api/visit/:qrCode/artworks`

Browse all artworks in a museum.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `language` | string | `en`, `fr`, `es` (default: `en`) |

**Response:**
```json
{
  "success": true,
  "museum": { "id": "...", "name": "..." },
  "count": 45,
  "artworks": [
    {
      "id": "64xyz...",
      "title": "Starry Night",
      "author": "Vincent van Gogh",
      "year": "1889",
      "style": "Post-Impressionism",
      "imageUrl": "/uploads/1702123456.jpg",
      "description": "Description in selected language...",
      "audioUrl": "/uploads/audio_en_123.mp3",
      "sources": [...]
    }
  ]
}
```

---

### `GET /api/visit/artwork/:id`

Get specific artwork details.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `language` | string | `en`, `fr`, `es` (default: `en`) |

**Response:**
```json
{
  "success": true,
  "artwork": {
    "id": "64xyz...",
    "title": "Starry Night",
    "author": "Vincent van Gogh",
    "year": "1889",
    "style": "Post-Impressionism",
    "imageUrl": "/uploads/1702123456.jpg",
    "description": "Description in selected language...",
    "audioUrl": "/uploads/audio_en_123.mp3",
    "sources": [...],
    "museum": {
      "id": "64abc...",
      "name": "Metropolitan Museum of Art",
      "location": "New York, USA"
    }
  }
}
```

---

## Public API

Base path: `/api`

### `GET /api/artworks`

List all artworks (latest 100).

**Response:**
```json
[
  {
    "_id": "64xyz...",
    "title": "Starry Night",
    "author": "Vincent van Gogh",
    "imageUrl": "/uploads/...",
    ...
  }
]
```

---

### `GET /api/artworks/:id`

Get artwork with multi-language support.

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `lang` | string | `en`, `fr`, `es` (default: `en`) |

**Response:**
```json
{
  "_id": "64xyz...",
  "title": "Starry Night",
  "currentLanguage": "fr",
  "localizedDescription": "Description in French...",
  "localizedAudioUrl": "/uploads/audio_fr_123.mp3",
  "availableLanguages": {
    "en": true,
    "fr": true,
    "es": true
  }
}
```

---

## Admin API

Base path: `/api/admin`

### `POST /api/admin/upload`

Upload artwork image with AI recognition.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Artwork image |
| `museumId` | string | Yes | Museum ObjectId |

**Response:**
```json
{
  "id": "64xyz...",
  "imageUrl": "/uploads/1702123456_artwork.jpg",
  "ai": {
    "title": "AI-detected title",
    "author": "Detected artist",
    "year": "circa 1889",
    "style": "Impressionism"
  },
  "wiki": {
    "description": "Fetched from Wikipedia...",
    "sources": [...]
  },
  "autoTranslated": true,
  "audioGenerated": ["en", "fr", "es"],
  "descriptions": {
    "english": "...",
    "french": "...",
    "spanish": "..."
  }
}
```

---

### `POST /api/admin/:id/finalize`

Finalize artwork with translations and audio.

**Request Body:**
```json
{
  "title": "Starry Night",
  "author": "Vincent van Gogh",
  "year": "1889",
  "style": "Post-Impressionism",
  "description": "The artwork description to translate...",
  "sourceLanguage": "en",
  "sources": [{ "provider": "Wikipedia", "url": "..." }]
}
```

---

### `DELETE /api/admin/:id`

Delete artwork and associated files.

---

### Testing Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/test-translation` | Test translation service |
| `POST /api/admin/test-tts` | Test text-to-speech |
| `POST /api/admin/test-vision` | Test AI vision recognition |
| `POST /api/admin/test-huggingface` | Test Hugging Face API |

---

## Data Models

### Museum

```typescript
{
  _id: ObjectId,
  name: string,           // Required
  location: string,       // Required
  qrCode: string,         // Auto-generated, unique
  website?: string,
  description?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Artwork

```typescript
{
  _id: ObjectId,
  title: string,          // Required
  author?: string,
  year?: string,
  style?: string,
  description?: string,   // Main description
  museumId?: ObjectId,    // Reference to Museum
  imageUrl?: string,      // Path to image
  imageEmbedding?: number[], // CLIP vector for matching
  
  // Multi-language descriptions
  descriptions?: {
    en?: string, fr?: string, es?: string,
    de?: string, zh?: string, ja?: string,
    it?: string, pt?: string, ru?: string, ar?: string
  },
  
  // Multi-language audio
  audioUrls?: {
    en?: string, fr?: string, es?: string,
    de?: string, zh?: string, ja?: string,
    it?: string, pt?: string, ru?: string, ar?: string
  },
  
  sources?: [{ provider: string, url: string }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (missing required fields) |
| 404 | Resource Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

---

## AR/VR Integration Recommendations

### Primary Flow for Visitor Experience:

1. **Scan QR Code** → `GET /api/visit/:qrCode` → Get museum info
2. **Take Photo of Artwork** → `POST /api/visit/:qrCode/identify` → Get matched artwork with details
3. **Play Audio Guide** → Use `audioUrl` from response
4. **Browse All Artworks** → `GET /api/visit/:qrCode/artworks`

### Key Features for AR/VR:

- **Image Recognition**: CLIP-based embedding matching returns confidence scores
- **Multi-language**: Pass `language` parameter for localized content
- **Audio Guides**: Auto-generated TTS in 3 languages
- **Offline Support**: Cache artwork data and audio files

---

## Static Assets

Images and audio files are served from:

```
GET /uploads/{filename}
```

Example: `http://localhost:4000/uploads/1702123456_artwork.jpg`

---

*Documentation generated: December 2024*
