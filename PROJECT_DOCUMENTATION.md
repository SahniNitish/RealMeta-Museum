# Museum Image Recognition App - Project Documentation

## 📖 Project Overview
A comprehensive web application that allows museum visitors to scan artwork with their phones and receive detailed information including AI-generated descriptions and audio narrations. The system includes both admin and visitor interfaces with intelligent artwork recognition capabilities.

## 🎯 Project Goals
- **Admin Flow**: Upload/capture artwork images, get AI recognition, correct/finalize metadata, generate audio narrations
- **Visitor Flow**: Scan QR codes or artwork images to access rich multimedia content
- **AI Integration**: Automatic artwork recognition using OpenAI GPT-4o Vision
- **Resource Enrichment**: Wikipedia API integration for additional artwork information
- **Audio Experience**: Text-to-speech narration using ElevenLabs

## 🏗️ Architecture

### Backend (Node.js + TypeScript + MongoDB)
**Location**: `/server`
**Port**: 4000
**Tech Stack**: Express, TypeScript, MongoDB, Multer, OpenAI, ElevenLabs

#### Core Components

**1. Server Entry Point** (`src/index.ts`)
- Express server with CORS enabled
- Static file serving for uploads
- Health check endpoint
- Graceful MongoDB connection handling
- Environment-based configuration

**2. Data Models** (`src/models/Artwork.ts`)
```typescript
interface ArtworkDocument {
  title: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  imageUrl?: string;
  audioUrl?: string;
  sources?: { provider: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}
```

**3. API Routes**

**Admin Routes** (`src/routes/admin.ts`)
- `POST /api/admin/upload` - Upload image, trigger AI recognition & Wikipedia fetch
- `POST /api/admin/:id/finalize` - Save metadata and optionally generate narration

**Public Routes** (`src/routes/public.ts`)
- `GET /api/artworks` - List all artworks
- `GET /api/artworks/:id` - Get specific artwork details

**4. AI Services**

**Vision Service** (`src/services/vision.ts`)
- OpenAI GPT-4o Vision integration
- Artwork identification from uploaded images
- Returns: title, author, year, style, description, confidence

**Resource Service** (`src/services/resources.ts`)
- Wikipedia API integration
- Automatic resource fetching based on AI recognition
- Enriches artwork data with external sources

**Text-to-Speech Service** (`src/services/tts.ts`)
- ElevenLabs API integration
- Generates natural audio narrations
- Saves MP3 files to uploads directory

**5. Database Utilities** (`src/utils/db.ts`)
- MongoDB connection management
- Environment-based URI configuration
- Connection state handling

### Frontend (React + TypeScript + Vite)
**Location**: `/web`
**Tech Stack**: React, TypeScript, Vite, Nginx (for production)

#### Current Status
- ✅ Vite React TypeScript project scaffolded
- ✅ Production-ready Nginx configuration
- 🔄 Admin UI components (pending)
- 🔄 Visitor UI components (pending)

## 🔧 Current Implementation Status

### ✅ Completed Features

**Backend Infrastructure**
- [x] Express server with TypeScript
- [x] MongoDB integration with Mongoose
- [x] File upload handling with Multer
- [x] CORS and security middleware
- [x] Environment configuration
- [x] Health check endpoint

**AI Recognition Pipeline**
- [x] OpenAI GPT-4o Vision integration
- [x] Image-to-base64 encoding
- [x] Artwork identification with structured JSON response
- [x] Confidence scoring

**Resource Enrichment**
- [x] Wikipedia API integration
- [x] Automatic resource fetching
- [x] Source attribution and linking

**Audio Generation**
- [x] ElevenLabs TTS integration
- [x] Audio file generation and storage
- [x] Multilingual support capability

**Data Persistence**
- [x] Artwork model with comprehensive schema
- [x] Image and audio URL storage
- [x] Metadata versioning with timestamps
- [x] Source tracking for attribution

**API Endpoints**
- [x] Admin upload with AI processing
- [x] Admin finalization with optional narration
- [x] Public artwork listing
- [x] Public artwork details
- [x] Static file serving for uploads

### 🔄 In Progress
- [ ] React frontend components
- [ ] Admin dashboard UI
- [ ] Visitor scanning interface
- [ ] Mobile camera integration
- [ ] QR code generation/scanning

### 📋 Environment Configuration

**Required Environment Variables** (`.env`)
```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/museum_app
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (configured and verified)
- MongoDB (local or cloud)
- OpenAI API key (optional, for AI recognition)
- ElevenLabs API key (optional, for narration)

### Backend Setup
```bash
cd server
npm install
npm run dev  # Development server at http://localhost:4000
```

### Frontend Setup
```bash
cd web
npm install
npm run dev  # Development server (Vite)
```

## 🧪 Testing Status

### API Testing (Postman Verified)
- ✅ Health check: `GET /health`
- ✅ Image upload: `POST /api/admin/upload` (form-data)
- ✅ Metadata finalization: `POST /api/admin/:id/finalize` (JSON)
- ✅ Public listing: `GET /api/artworks`
- ✅ Public details: `GET /api/artworks/:id`

### Test Results
- Upload processing: Working with AI recognition fallback
- File storage: Successfully saving to `/uploads`
- Database persistence: MongoDB integration functional
- Static serving: Images accessible via `/uploads/:filename`

## 📁 Project Structure
```
ImageRecognition/
├── server/                 # Backend API
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # AI & external integrations
│   │   └── utils/         # Database utilities
│   ├── uploads/           # File storage
│   └── package.json       # Backend dependencies
├── web/                   # Frontend React app
│   ├── src/
│   ├── nginx.conf         # Production web server config
│   └── package.json       # Frontend dependencies
└── PROJECT_DOCUMENTATION.md
```

## 🔮 Next Steps
1. **Complete React Frontend**: Admin and visitor interfaces
2. **Mobile Optimization**: Camera integration and QR scanning
3. **AWS Deployment**: ECS containerization with SSL
4. **Performance**: Image optimization and caching
5. **Analytics**: Usage tracking and artwork popularity

## 🎯 Key Achievements
- **Full-stack TypeScript**: End-to-end type safety
- **AI Integration**: Successful OpenAI Vision implementation
- **Multi-service Architecture**: Modular service design
- **Production Ready**: Environment configuration and error handling
- **Scalable Database**: Flexible artwork schema with extensibility
- **Rich Media Support**: Image and audio file handling

---
*Project Timeline: ~30 days target | Current Status: Backend Complete (60% overall)*
