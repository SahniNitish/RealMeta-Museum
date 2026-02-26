# Museum App Documentation

## Table of Contents
1. [Overview](#overview)
2. [How We Built It](#how-we-built-it)
3. [Architecture](#architecture)
4. [Features - Working](#features---working)
5. [Features - Not Working / Incomplete](#features---not-working--incomplete)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [AI/ML Services](#aiml-services)
9. [Deployment](#deployment)
10. [Remaining Work](#remaining-work)

---

## Overview

This is a **full-stack AI-powered museum guide application** that allows:
- **Museum admins** to upload artworks and have them automatically analyzed by AI
- **Visitors** to scan QR codes, take photos of artworks, and get instant identification with multi-language audio descriptions

The app uses **CLIP (Contrastive Language-Image Pre-training)** for image matching, **Claude/OpenAI** for vision analysis, **ElevenLabs** for text-to-speech, and supports **16 languages**.

---

## How We Built It

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + Radix UI + Framer Motion |
| **Backend** | Node.js + Express 5 + TypeScript |
| **Database** | Amazon DocumentDB 5.0 (Mongoose ODM, MongoDB-compatible) |
| **Authentication** | JWT (7-day tokens) + bcryptjs |
| **AI Vision** | Claude 3.5 Sonnet / OpenAI GPT-4O / Hugging Face |
| **Image Matching** | CLIP (Xenova/clip-vit-base-patch32) |
| **Translation** | OpenAI API / Google Translate (fallback) |
| **Text-to-Speech** | ElevenLabs v2 Multilingual |
| **File Storage** | AWS S3 (`realmeta-museum-prod` bucket, `us-east-1`) |
| **Deployment** | AWS EC2 (backend) + AWS S3/CloudFront (frontend) |

### Development Approach

1. **Backend-first development**: Built API routes and database models first
2. **AI integration**: Integrated CLIP for embeddings, then vision APIs for analysis
3. **Admin dashboard**: Built artwork upload and management features
4. **Visitor experience**: Built QR scanning, camera capture, and matching
5. **Multi-language**: Added translation and audio generation services
6. **Deployment**: Deployed to AWS (EC2 backend + S3/CloudFront frontend)

---

## Architecture

```
museum-app/
├── server/                    # Backend API
│   ├── src/
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── Museum.ts
│   │   │   ├── Artwork.ts
│   │   │   ├── Admin.ts
│   │   │   └── Visitor.ts
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.ts       # Login/Register
│   │   │   ├── admin.ts      # Artwork upload/manage
│   │   │   ├── museums.ts    # Museum CRUD
│   │   │   └── visitor.ts    # Visitor experience
│   │   ├── services/         # Business logic
│   │   │   ├── clip.ts       # Image embeddings
│   │   │   ├── vision.ts     # AI recognition
│   │   │   ├── translation.ts
│   │   │   ├── tts.ts        # Audio generation
│   │   │   └── s3.ts         # AWS S3 file storage
│   │   └── index.ts          # Server entry
│   └── uploads/              # Image & audio storage
│
├── web/                       # Frontend React app
│   ├── src/
│   │   ├── pages/            # Route pages
│   │   │   ├── Admin*.tsx    # Admin dashboard pages
│   │   │   └── Visitor*.tsx  # Visitor experience pages
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # Auth state management
│   │   └── lib/              # API utilities
│   └── index.html
│
└── documentation.md          # This file
```

### Data Flow

```
[Admin Upload] → [AI Vision Analysis] → [CLIP Embedding] → [Save to DB]
                        ↓
              [Translation Service] → [TTS Audio] → [Save Files]

[Visitor Photo] → [CLIP Embedding] → [Cosine Similarity] → [Match Results]
                                            ↓
                                   [Multi-language Description]
                                            ↓
                                      [Audio Playback]
```

---

## Features - Working

### Admin Features (100% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| Registration | ✅ Working | Admin registers with email/password, auto-creates museum |
| Login | ✅ Working | JWT-based authentication with 7-day tokens |
| Dashboard | ✅ Working | Overview with museum stats and quick actions |
| Artwork Upload | ✅ Working | Upload images with automatic AI analysis |
| AI Analysis | ✅ Working | Extracts title, author, year, style, description |
| Wikipedia Integration | ✅ Working | Auto-fetches context for known artworks |
| Edit Metadata | ✅ Working | Modify AI-generated info before saving |
| Multi-language Translation | ✅ Working | Generates descriptions in 3 languages |
| Audio Generation | ✅ Working | ElevenLabs TTS in multiple languages |
| Artwork Finalization | ✅ Working | Two-step process: upload → finalize |
| Collection Browser | ✅ Working | View all artworks in the museum |
| QR Code Management | ✅ Working | Generate/view museum QR code |
| Delete Artwork | ✅ Working | Remove artwork and associated files |

### Visitor Features (95% Complete)

| Feature | Status | Description |
|---------|--------|-------------|
| QR Code Scanning | ✅ Working | Scan museum QR to access visitor portal |
| Museum Landing | ✅ Working | Shows museum info and artwork count |
| Visitor Registration | ✅ Working | Optional: name, email, phone, language |
| Language Selection | ✅ Working | 16 supported languages |
| Camera Capture | ✅ Working | Take photo of artwork for identification |
| CLIP Matching | ✅ Working | 512-dim embedding similarity matching |
| Confidence Scoring | ✅ Working | 70% threshold for positive matches |
| Multi-result Display | ✅ Working | Shows top 3 matching artworks |
| Artwork Details | ✅ Working | Full info with descriptions |
| Audio Playback | ✅ Working | Listen to descriptions in any language |
| On-demand Translation | ✅ Working | Generate new language if not cached |
| Browse Collection | ✅ Working | View all artworks without camera |
| Visitor Tracking | ✅ Working | Track which artworks visitor viewed |
| Session Management | ✅ Working | Session ID for anonymous visitors |

### AI/ML Services (100% Complete)

| Service | Status | Description |
|---------|--------|-------------|
| CLIP Embeddings | ✅ Working | Xenova/clip-vit-base-patch32 model |
| Claude Vision | ✅ Working | Primary AI for artwork recognition |
| OpenAI Vision | ✅ Working | Fallback if Claude unavailable |
| Hugging Face | ✅ Working | Free tier fallback |
| OpenAI Translation | ✅ Working | Primary translation service |
| Google Translate | ✅ Working | Fallback translation |
| ElevenLabs TTS | ✅ Working | Multilingual voice generation |

### Infrastructure (100% Complete)

| Component | Status | Description |
|-----------|--------|-------------|
| Amazon DocumentDB | ✅ Working | AWS-hosted, MongoDB-compatible, encrypted at rest |
| JWT Authentication | ✅ Working | Secure token-based auth |
| File Upload | ✅ Working | Multer with proper validation |
| CORS | ✅ Working | Configured for production domains |
| Error Handling | ✅ Working | Comprehensive try/catch + logging |
| Logging | ✅ Working | Winston with timestamps |
| AWS EC2 Deployment | ✅ Working | Backend API hosted on `t3.medium` instance (`52.205.164.184`) |
| AWS S3 + CloudFront | ✅ Working | Frontend SPA hosted via S3 bucket (`realmeta-museum-web`) + CloudFront CDN |

---

## Features - Not Working / Incomplete

### Admin Features (Incomplete)

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Analytics Dashboard | ⚠️ Placeholder | Shows "Coming Soon" - needs charts/graphs |
| Settings Page | ⚠️ Empty | No functionality implemented |
| Batch Import | ❌ Not Started | No bulk artwork upload feature |
| Admin Management | ❌ Not Started | No ability to add/remove admins |
| Museum Logo Upload | ❌ Not Started | Museums can't have custom logos |

### Visitor Features (Incomplete)

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Advanced Analytics | ⚠️ Basic | Only shows visitor counts, needs visualizations |
| Favorites/Bookmarks | ❌ Not Started | Visitors can't save favorite artworks |
| Tour Planning | ❌ Not Started | No guided tour feature |
| Social Sharing | ❌ Not Started | Can't share artwork discoveries |
| Offline Mode | ❌ Not Started | No service worker/PWA support |

### Technical Debt

| Issue | Priority | Description |
|-------|----------|-------------|
| Hardcoded API URL | ✅ Fixed | Centralized in api.ts, now pointing to AWS CloudFront |
| Image Storage | ✅ Fixed | Migrated to AWS S3 (`realmeta-museum-prod`) |
| CLIP Model Cache | Low | ~350MB cached locally, could use remote |
| Test Coverage | High | No automated tests exist |
| Rate Limiting | Medium | No API rate limiting implemented |
| Input Validation | Medium | Basic validation, needs stricter rules |
| CLIP Model Accuracy | Medium | Current model has limited accuracy, need larger model on AWS |

---

## Database Schema

### Museum Collection
```typescript
{
  _id: ObjectId,
  name: string,           // Required, indexed
  location: string,       // Required, indexed
  qrCode: string,         // Unique, indexed
  website?: string,
  description?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Artwork Collection
```typescript
{
  _id: ObjectId,
  title: string,          // Required
  author?: string,
  year?: string,
  style?: string,
  description?: string,
  educationalNotes?: string,
  relatedWorks?: string,
  museumLinks?: string,
  museumId: ObjectId,     // Reference to Museum
  imageEmbedding: number[], // 512-dim CLIP vector
  imageUrl?: string,
  audioUrl?: string,
  descriptions: {         // Multi-language descriptions
    en?: string,
    fr?: string,
    es?: string,
    de?: string,
    zh?: string,
    ja?: string,
    it?: string,
    pt?: string,
    ru?: string,
    ar?: string
  },
  audioUrls: {            // Multi-language audio files
    en?: string,
    fr?: string,
    // ... same languages
  },
  externalLinks?: [{ label: string, url: string }],
  sources?: [{ provider: string, url: string }],
  // Additional media (new)
  additionalPhotos?: [{ url: string, caption?: string, uploadedAt: Date }],
  videos?: [{ type: 'upload'|'youtube'|'vimeo', url: string, embedId?: string, title?: string }],
  musicTracks?: [{ url: string, title?: string, artist?: string }],
  documents?: [{ url: string, title?: string, description?: string }],
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Collection
```typescript
{
  _id: ObjectId,
  email: string,          // Unique, lowercase
  password: string,       // Hashed with bcryptjs
  name: string,
  museumId: ObjectId,     // Reference to Museum
  role: 'admin' | 'superadmin',
  createdAt: Date,
  updatedAt: Date
}
```

### Visitor Collection
```typescript
{
  _id: ObjectId,
  museumId: ObjectId,     // Reference to Museum
  name?: string,
  phone?: string,
  email?: string,
  language: string,       // Default: 'en'
  visitedAt: Date,
  artworksViewed: ObjectId[], // References to Artworks
  sessionId: string,      // Unique session identifier
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register admin + create museum |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current admin profile |

### Museums (`/api/museums`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/museums` | List all museums |
| GET | `/museums/:id` | Get museum with artwork count |
| POST | `/museums` | Create museum |
| PUT | `/museums/:id` | Update museum |
| DELETE | `/museums/:id` | Delete museum (if no artworks) |
| GET | `/museums/:id/qr` | Get QR code as data URL |
| GET | `/museums/:id/artworks` | Get museum's artworks |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/upload` | Upload artwork + AI analysis |
| POST | `/admin/:id/finalize` | Translate + generate audio |
| PUT | `/admin/:id` | Update artwork metadata |
| DELETE | `/admin/:id` | Delete artwork |
| POST | `/admin/:id/media/photos` | Upload additional photos |
| POST | `/admin/:id/media/videos` | Upload video or add YouTube/Vimeo URL |
| POST | `/admin/:id/media/music` | Upload music/audio tracks |
| POST | `/admin/:id/media/documents` | Upload PDF documents |
| DELETE | `/admin/:id/media/:type/:index` | Delete media item |
| POST | `/admin/test-vision` | Test AI vision |
| POST | `/admin/test-tts` | Test text-to-speech |
| POST | `/admin/test-translation` | Test translation |

### Visitor (`/api/visit`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visit/:qrCode` | Get museum by QR code |
| POST | `/visit/:qrCode/identify` | Match photo to artwork |
| GET | `/visit/:qrCode/artworks` | Browse all artworks |
| GET | `/visit/artwork/:id` | Get artwork details |
| POST | `/visit/artwork/:id/translate` | On-demand translation |
| POST | `/visit/:qrCode/visitor` | Register visitor |
| POST | `/visit/:qrCode/track/:artworkId` | Track artwork view |
| GET | `/visit/:qrCode/stats` | Get visitor analytics |
| GET | `/visit/languages` | Get supported languages |

---

## AI/ML Services

### CLIP Image Matching

**How it works:**
1. When artwork is uploaded, CLIP generates a 512-dimensional embedding vector
2. Vector is stored in the database alongside artwork data
3. When visitor takes a photo, same CLIP model generates embedding for photo
4. Cosine similarity calculated between photo embedding and all museum artwork embeddings
5. Top 3 matches returned, with confidence score >= 70% considered a match

**Model:** `Xenova/clip-vit-base-patch32`
**Embedding Size:** 512 dimensions
**Matching Threshold:** 0.50 (50%) - lowered for real-world phone photos

### Vision Recognition Priority Chain

```
1. Claude 3.5 Sonnet (Best quality, requires ANTHROPIC_API_KEY)
        ↓ (if unavailable)
2. OpenAI GPT-4O (Good quality, requires OPENAI_API_KEY)
        ↓ (if unavailable)
3. Hugging Face (Free tier, rate limited)
        ↓ (if unavailable)
4. Mock Analysis (Returns generic placeholder)
```

### Translation Priority Chain

```
1. OpenAI API (High quality, requires OPENAI_API_KEY)
        ↓ (if unavailable)
2. Google Translate (Free tier fallback)
```

### Text-to-Speech

- **Provider:** ElevenLabs v2 Multilingual
- **Model:** `eleven_multilingual_v2`
- **Output:** MP3 files stored in AWS S3 (`realmeta-museum-prod` bucket)
- **Languages:** Supports all 16 visitor languages

---

## Deployment

### Current Setup (AWS — RealMeta Account)

| Component | Provider | Details |
|-----------|----------|---------|
| **Backend API** | AWS EC2 | Instance: `i-01689e896a88dad54` (`realmeta-museum-server`), Type: `t3.medium`, IP: `52.205.164.184`, Port: 4000 |
| **Backend CDN** | AWS CloudFront | Distribution: `E3SSJL0EHYSH6Y`, URL: `https://d1nclo4efvqhzz.cloudfront.net` |
| **Frontend** | AWS S3 + CloudFront | S3 Bucket: `realmeta-museum-web`, CloudFront: `E2V48B3OVGC999`, URL: `https://dw6q73wb38ozb.cloudfront.net` |
| **Media Storage** | AWS S3 | Bucket: `realmeta-museum-prod`, Region: `us-east-1` |
| **Database** | Amazon DocumentDB 5.0 | Cluster: `museum-docdb-cluster.cluster-cx6a4k24g2c6.us-east-1.docdb.amazonaws.com`, Instance: `db.t3.medium` |
| **DNS** | AWS Route 53 | Zones: `realmeta.ca`, `meta-real.ca` |

### AWS Infrastructure Details

```
Internet
    │
    ├── Visitors/Admins (HTTPS) ──▶ CloudFront (dw6q73wb38ozb.cloudfront.net)
    │                                    │
    │                                    └──▶ S3: realmeta-museum-web (React build)
    │
    └── API calls (HTTPS) ────────▶ CloudFront (d1nclo4efvqhzz.cloudfront.net)
                                         │
                                         └──▶ EC2: 52.205.164.184:4000 (Node.js)
                                                    │
                                    ┌───────────────┼───────────────────┐
                                    ▼               ▼                   ▼
                           DocumentDB 5.0     AWS S3              External APIs
                              (Database)       realmeta-museum-    (Claude, ElevenLabs,
                                               prod (Media)         OpenAI)
```

### EC2 Instance Details

| Property | Value |
|----------|-------|
| Instance ID | `i-01689e896a88dad54` |
| Instance Type | `t3.medium` |
| Public IP | `52.205.164.184` |
| SSH Key | `realmeta-museum-key-v2` |
| OS User | `ubuntu` |
| Elastic IP | `52.205.164.184` (static) |
| Security Group | `realmeta-museum-sg` (`sg-07679fa7180faf012`) |
| DocumentDB SG | `realmeta-docdb-sg` (`sg-07bf344c38854bc2d`) — allows port 27017 from EC2 SG |
| Process Manager | PM2 (`pm2 restart all` to restart, `pm2 logs` to view logs) |
| App Directory | `/home/ubuntu/realmeta-museum` |
| Launched | February 9, 2026 |

### Environment Variables

**Backend (on EC2 `~/realmeta-museum/server/.env`):**
```
# Database (Amazon DocumentDB 5.0)
MONGODB_URI=mongodb://museumadmin:<PASSWORD>@museum-docdb-cluster.cluster-cx6a4k24g2c6.us-east-1.docdb.amazonaws.com:27017/museum_app?retryWrites=false&readPreference=primary&authSource=admin&authMechanism=SCRAM-SHA-1
DOCDB_TLS_CA_FILE=/home/ubuntu/realmeta-museum/server/global-bundle.pem

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=sk_...

# Auth & Server
JWT_SECRET=your-secret-key
PORT=4000
FRONTEND_URL=https://dw6q73wb38ozb.cloudfront.net

# AWS S3 Storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=realmeta-museum-prod
S3_REGION=us-east-1
```

**Frontend (`/web/.env`):**
```
VITE_API_URL=https://d1nclo4efvqhzz.cloudfront.net
```

---

## Remaining Work

### High Priority (Essential for Production)

| Task | Estimated Effort | Description |
|------|-----------------|-------------|
| **Automated Tests** | Large | Add unit and integration tests |
| **Rate Limiting** | Small | Implement API rate limiting |
| **Input Validation** | Medium | Add strict validation with Zod/Joi |
| **Custom Domain** | Small | Add Route 53 subdomain (e.g., `museum.realmeta.ca`) pointing to CloudFront distributions, update CloudFront aliases + code references |

### Medium Priority (Nice to Have)

| Task | Estimated Effort | Description |
|------|-----------------|-------------|
| **Analytics Dashboard** | Medium | Build charts for visitor stats |
| **Admin Settings** | Medium | Profile management, password change |
| **Batch Import** | Large | CSV/JSON bulk artwork upload |
| **Search Functionality** | Medium | Search artworks by title/artist |
| **Pagination** | Small | Add pagination to all list views |

### Low Priority (Future Features)

| Task | Estimated Effort | Description |
|------|-----------------|-------------|
| **PWA Support** | Large | Offline mode with service workers |
| **Tour Planning** | Large | Guided tour with map integration |
| **Social Sharing** | Small | Share artwork discoveries |
| **Favorites** | Medium | Visitor bookmarks/favorites |
| **Multi-museum Admin** | Large | One admin managing multiple museums |
| **Mobile Apps** | Very Large | Native iOS/Android apps |

### Technical Improvements

| Task | Estimated Effort | Description |
|------|-----------------|-------------|
| **TypeScript Strict Mode** | Medium | Enable strict null checks |
| **API Documentation** | Medium | Swagger/OpenAPI docs |
| **Error Boundary** | Small | Better error handling in React |
| **Loading States** | Small | Skeleton loaders for all pages |
| **Caching** | Medium | Redis for session/API caching |
| **CDN** | Small | Serve static files via CDN |

---

## Summary

### What's Done (Approximately 90%)
- Complete admin authentication and dashboard
- Full artwork upload and AI analysis pipeline
- CLIP-based image matching system
- Multi-language translation and audio generation
- Complete visitor experience flow
- Production deployment on AWS (EC2 + S3/CloudFront)
- AWS S3 cloud storage for all media files
- Additional media support (photos, videos, music, documents)
- Improved scanning with "No Match Found" UX

### What's Left (Approximately 10%)
- Analytics visualizations
- Admin settings page
- Automated testing
- Advanced visitor features (favorites, tours, offline)
- Upgrade to larger/more accurate CLIP model (planned for AWS deployment)

### Code Quality
- Well-structured with clear separation of concerns
- TypeScript throughout with proper typing
- Comprehensive error handling and logging
- Responsive UI with modern component library

---

## AI Changelog

This section tracks changes made by AI assistants (Claude Code, Cursor, etc.) so each tool knows what the other has done.

### Format
Each entry should follow this format:
```
### [DATE] - [AI TOOL NAME]
**Task:** Brief description of what was requested
**Changes Made:**
- File: path/to/file.ts
  - What was changed and why
**Context:** Any important context for future AI sessions
```

---

### Log Entries

<!-- AI assistants: Add new entries at the top, below this line -->

### 2026-02-26 - Claude Code (Opus 4.6)
**Task:** Migrate database from MongoDB Atlas to Amazon DocumentDB 5.0
**Changes Made:**
- File: `server/src/utils/db.ts`
  - Rewrote to support DocumentDB TLS connections via `DOCDB_TLS_CA_FILE` env var
  - Backward-compatible: connects normally when env var absent (local dev)
- File: `server/src/models/Museum.ts`
  - Removed `$text` index (unsupported by DocumentDB, never queried in codebase)
- AWS Infrastructure:
  - Created DocumentDB cluster: `museum-docdb-cluster` (engine 5.0, `db.t3.medium`, encrypted)
  - Created security group: `realmeta-docdb-sg` (`sg-07bf344c38854bc2d`) — port 27017 from EC2 SG only
  - Created DB subnet group: `museum-docdb-subnet-group`
  - Downloaded TLS cert (`global-bundle.pem`) to EC2
  - Created new SSH key pair `realmeta-museum-key-v2` (old key was lost)
  - Allocated Elastic IP `52.205.164.184` (replaces old dynamic IP `44.220.47.123`)
  - Updated CloudFront backend origin (`E3SSJL0EHYSH6Y`) to new Elastic IP
  - Updated EC2 `.env` with DocumentDB URI + TLS config + correct AWS S3 credentials
  - Terminated helper EC2 instance used for key swap
- Documentation: Updated all IP references, SSH key/user, deployment instructions across all docs
**Context:**
- DocumentDB endpoint: `museum-docdb-cluster.cluster-cx6a4k24g2c6.us-east-1.docdb.amazonaws.com:27017`
- DocumentDB requires: `retryWrites=false`, `authSource=admin`, `authMechanism=SCRAM-SHA-1`, TLS with `global-bundle.pem`
- EC2 SSH: `ssh -i realmeta-museum-key-v2.pem ubuntu@52.205.164.184` (user is `ubuntu`, not `ec2-user`)
- Server managed by PM2: `pm2 restart all`, `pm2 logs`
- App directory on EC2: `/home/ubuntu/realmeta-museum`
- No data was migrated (fresh DB, user confirmed not needed)

### 2026-02-26 - Claude Code (Opus 4.6)
**Task:** Update documentation to reflect AWS deployment (migrated from Vercel + Railway)
**Changes Made:**
- File: `documentation.md`
  - Updated tech stack table: File Storage bucket name to `realmeta-museum-prod`, Deployment to AWS EC2 + S3/CloudFront
  - Updated development approach to reference AWS deployment
  - Updated infrastructure status table: Railway/Vercel → AWS EC2/S3+CloudFront with instance details
  - Updated TTS output location from `uploads/audio/` to AWS S3
  - Rewrote entire Deployment section with full AWS infrastructure map (EC2 instance details, CloudFront distributions, S3 buckets, Route 53 zones)
  - Updated environment variables to reflect `realmeta-museum-prod` bucket and CloudFront URLs
  - Updated remaining work: replaced cloud storage/env config tasks with frontend URL update and custom domain tasks
  - Updated summary to reference AWS deployment
  - Fixed S3 bucket name in changelog context
  - Flagged hardcoded Railway URL in api.ts as still needing update
**Context:**
- AWS Account: `994356140688` (user: `nitish-sahni`)
- EC2 backend: `i-01689e896a88dad54` (`t3.medium`, IP: `52.205.164.184`, SSH key: `realmeta-museum-key-v2`)
- Frontend CloudFront: `dw6q73wb38ozb.cloudfront.net` → S3: `realmeta-museum-web`
- Backend CloudFront: `d1nclo4efvqhzz.cloudfront.net` → EC2: `52.205.164.184`
- Media S3: `realmeta-museum-prod` (us-east-1)
- Route 53 zones: `realmeta.ca`, `meta-real.ca` (no museum subdomain configured yet)
- Code URLs updated to AWS CloudFront in `web/src/lib/api.ts`, `web/.env`, `server/.env`, `web/src/pages/AdminQRCodes.tsx`

### 2026-02-05 - Claude Code (Opus 4.5)
**Task:** Add S3 storage, additional media support, fix scanning issues
**Changes Made:**
- File: `server/src/services/s3.ts` (NEW)
  - Created S3 service for file uploads with public bucket policy
- File: `server/src/models/Artwork.ts`
  - Added additionalPhotos, videos, musicTracks, documents arrays
- File: `server/src/routes/admin.ts`
  - Added media upload endpoints (photos, videos, music, documents)
  - Updated upload to save to S3 instead of local storage
- File: `server/src/routes/visitor.ts`
  - Added additional media to identify and artworks endpoints
  - Added "no match" response when confidence < 50%
  - Added detailed error logging for debugging
- File: `web/src/pages/VisitorHome.tsx`
  - Fixed API URL to use Railway backend
  - Added "No Match Found" screen for failed scans
  - Fixed image/audio URLs to use getMediaUrl()
- File: `web/src/pages/VisitorBrowse.tsx`
  - Added display for additional media (photos, videos, music, documents)
- File: `web/src/components/VisitorScan.tsx`
  - Fixed API URL configuration
- File: `web/src/lib/api.ts`
  - Added getMediaUrl() helper for S3/local URL handling
  - Fixed malformed URL handling (https// → https://)
**Context:**
- S3 bucket: `realmeta-museum-prod` in us-east-1 with public read bucket policy (migrated from old `realmeta-museum-assets`)
- Confidence threshold lowered to 0.50 for real-world phone photos
- Current CLIP model (clip-vit-base-patch32) has accuracy issues - plan to upgrade to larger model on AWS tomorrow

### 2026-02-04 - Claude Code (Opus 4.5)
**Task:** Set up AI changelog tracking system
**Changes Made:**
- File: `documentation.md`
  - Added "AI Changelog" section at the end of the file
  - Created format template for logging AI changes
**Context:** User wants both Claude Code and Cursor to track their changes so each AI knows what the other did. All AI assistants should add entries here when making changes.



---

*Last Updated: February 2026*
*Repository: museum-app*
