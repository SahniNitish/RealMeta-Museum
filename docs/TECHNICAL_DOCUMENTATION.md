# Museum AI - Technical Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Home     │  │   Admin     │  │  Museums    │  │  Visitor    │        │
│  │   Page      │  │  Dashboard  │  │ Management  │  │   Scan      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js/Express)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                            API Routes                                │    │
│  │  /api/admin/*  │  /api/museums/*  │  /api/visit/*  │  /api/*        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                            Services                                  │    │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐ │    │
│  │  │  CLIP   │  │ Claude  │  │ Translate │  │   TTS   │  │Wikipedia│ │    │
│  │  │Embedding│  │ Vision  │  │  Google   │  │Elevenlabs│  │   API   │ │    │
│  │  └─────────┘  └─────────┘  └───────────┘  └─────────┘  └─────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (MongoDB)                              │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐    │
│  │       Museums           │    │            Artworks                  │    │
│  │  - name                 │    │  - title, author, year, style        │    │
│  │  - location             │    │  - imageUrl, imageEmbedding          │    │
│  │  - qrCode              │────▶│  - descriptions (en, fr, es)         │    │
│  │  - website              │    │  - audioUrls (en, fr, es)            │    │
│  └─────────────────────────┘    │  - museumId                          │    │
│                                  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Admin Upload Flow

```
Admin uploads image
        │
        ├──────────────────────────────────────────────┐
        │                                              │
        ▼                                              ▼
┌───────────────────┐                    ┌───────────────────┐
│ CLIP Embedding    │                    │ Claude Vision     │
│ (512-dim vector)  │                    │ (AI Analysis)     │
└─────────┬─────────┘                    └─────────┬─────────┘
          │                                        │
          │                              ┌─────────┴─────────┐
          │                              │                   │
          │                              ▼                   ▼
          │                    ┌─────────────────┐  ┌─────────────────┐
          │                    │ Wikipedia API   │  │ Google Translate│
          │                    │ (Context)       │  │ (EN→FR, ES)     │
          │                    └─────────────────┘  └────────┬────────┘
          │                                                  │
          │                                                  ▼
          │                                        ┌─────────────────┐
          │                                        │ ElevenLabs TTS  │
          │                                        │ (Audio MP3s)    │
          │                                        └────────┬────────┘
          │                                                 │
          └────────────────────────┬────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   MongoDB Document  │
                        │   (Artwork saved)   │
                        └─────────────────────┘
```

### Visitor Identification Flow

```
Visitor scans QR code
        │
        ▼
┌───────────────────────────────────┐
│ Load museum page (/visit/:qrCode) │
│ - Select language                 │
│ - Grant camera permission         │
└─────────────────┬─────────────────┘
                  │
                  ▼
        Visitor captures photo
                  │
                  ▼
┌───────────────────────────────────┐
│ CLIP generates embedding          │
│ for visitor photo                 │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ Compare against museum artworks   │
│ using cosine similarity           │
│                                   │
│ for each artwork in museum:       │
│   score = cosine(visitor, stored) │
│                                   │
│ Sort by score, return top 3       │
└─────────────────┬─────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │ Score >= 0.7?   │
        └────────┬────────┘
           YES   │   NO
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐ ┌───────────────┐
│ Show artwork  │ │ Show top 3    │
│ details       │ │ suggestions   │
└───────────────┘ └───────────────┘
```

---

## API Reference

### Museum Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/museums` | List all museums |
| POST | `/api/museums` | Create museum |
| GET | `/api/museums/:id` | Get museum details |
| PUT | `/api/museums/:id` | Update museum |
| DELETE | `/api/museums/:id` | Delete museum |
| GET | `/api/museums/:id/qr` | Get QR code image |
| GET | `/api/museums/:id/artworks` | Get museum artworks |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/upload` | Upload artwork |
| POST | `/api/admin/:id/finalize` | Finalize artwork |
| DELETE | `/api/admin/artworks/:id` | Delete artwork |

### Visitor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visit/:qrCode` | Get museum by QR |
| GET | `/api/visit/:qrCode/artworks` | Browse collection |
| POST | `/api/visit/:qrCode/identify` | Identify artwork |

---

## AI Services

### CLIP (Image Matching)

**Model**: `Xenova/clip-vit-base-patch32`
**Library**: `@xenova/transformers`
**Output**: 512-dimensional embedding vector

```typescript
// Generate embedding
const embedding = await generateImageEmbedding(imagePath);
// Result: [0.12, -0.45, 0.78, ...] (512 numbers)

// Compare embeddings
const score = cosineSimilarity(embeddingA, embeddingB);
// Result: 0.0 to 1.0 (1.0 = identical)
```

### Claude Vision (Artwork Analysis)

**Model**: `claude-3-opus-20240229`
**Library**: `@anthropic-ai/sdk`

Analyzes images to identify:
- Title, Artist, Year, Style
- Museum-quality description
- Educational notes
- Related works

### Google Translate

Translates descriptions to:
- English (en)
- French (fr)
- Spanish (es)

### ElevenLabs TTS

Generates audio narration:
- Natural-sounding voices
- Language-specific pronunciation
- MP3 format output

---

## Database Schema

### Museum

```typescript
{
  _id: ObjectId,
  name: string,           // "Louvre Museum"
  location: string,       // "Paris, France"
  qrCode: string,         // "louvre-paris-1234"
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
  museumId: ObjectId,           // Reference to Museum
  title: string,                // "Mona Lisa"
  author: string,               // "Leonardo da Vinci"
  year: string,                 // "1503-1519"
  style: string,                // "Renaissance"
  imageUrl: string,             // "/uploads/123.jpg"
  imageEmbedding: number[],     // [0.12, -0.45, ...] (512)
  descriptions: {
    en: string,
    fr: string,
    es: string
  },
  audioUrls: {
    en: string,                 // "/audio/123_en.mp3"
    fr: string,
    es: string
  },
  sources: [{
    provider: string,
    url: string
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Environment Variables

```bash
# Server
PORT=4000
BASE_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb+srv://...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...    # Claude Vision
OPENAI_API_KEY=sk-...           # OpenAI (fallback)
ELEVENLABS_API_KEY=sk_...       # Text-to-Speech
HUGGINGFACE_API_KEY=hf_...      # Hugging Face (fallback)

# Optional
USE_GOOGLE_VISION=false
USE_TENSORFLOW=false
```

---

## Deployment

### Development

```bash
# Backend
cd server && npm run dev

# Frontend
cd web && npm run dev
```

### Production

```bash
# Build backend
cd server && npm run build && npm start

# Build frontend
cd web && npm run build && npx serve -s dist
```
