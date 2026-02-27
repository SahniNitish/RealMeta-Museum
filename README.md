# RealMeta Museum

AI-powered museum companion app that lets visitors identify artworks by scanning QR codes and taking photos. Built with CLIP-based image recognition, multi-language translation, and audio narration.

## Features

- **Artwork Recognition** — Identify artworks in under 3 seconds using CLIP embeddings (512-dimensional vector matching)
- **QR Code Access** — Visitors scan a QR code at the museum entrance to access the collection
- **Multi-Language Support** — 10+ languages including English, Spanish, French, German, Hindi, Chinese, Japanese, Korean, Arabic, and more
- **Audio Guides** — AI-generated narration in the visitor's preferred language via ElevenLabs
- **Multi-Museum Support** — Isolated collections per institution
- **Admin Dashboard** — Upload artworks, manage collections, generate QR codes, view analytics

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI
- Framer Motion animations
- React Router 6

### Backend
- Express 5 + TypeScript + Node 20+
- MongoDB / AWS DocumentDB
- AWS S3 (file storage)
- JWT authentication

### AI / ML
- **CLIP** (Xenova/clip-vit-base-patch32) — Local image embedding & matching
- **Anthropic Claude** — Translation
- **OpenAI Vision** — Artwork analysis
- **Google Cloud Vision** — Image analysis
- **HuggingFace Inference** — Alternative vision recognition
- **ElevenLabs** — Text-to-speech narration
- **Wikipedia API** — Artwork context enrichment

## Project Structure

```
museum-app/
├── server/          # Express API server
│   └── src/
│       ├── routes/       # API routes (auth, admin, visit, museums)
│       ├── services/     # AI services (CLIP, TTS, translation)
│       ├── models/       # Mongoose models
│       └── middleware/    # Auth & upload middleware
├── web/             # React frontend
│   └── src/
│       ├── pages/        # Admin & Visitor pages
│       ├── components/   # UI components
│       └── lib/          # Utilities
└── docs/            # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB or AWS DocumentDB
- AWS S3 bucket

### Environment Variables

**Server** (`server/.env`):
```
PORT=5000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_S3_BUCKET=<your-s3-bucket>
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
```

**Web** (`web/.env`):
```
VITE_API_URL=<your-api-url>
```

### Installation

```bash
# Install server dependencies
cd server && npm install

# Install web dependencies
cd ../web && npm install
```

### Development

```bash
# Start server
cd server && npm run dev

# Start web (in another terminal)
cd web && npm run dev
```

### Production Build

```bash
cd web && npm run build
cd ../server && npm run build && npm start
```

## User Flows

**Visitor:** Scan QR code → Welcome page → Take photo → View artwork details (with translation & audio)

**Admin:** Login → Dashboard → Upload artworks → Manage collection → Generate QR codes

## License

Proprietary — RealMeta
