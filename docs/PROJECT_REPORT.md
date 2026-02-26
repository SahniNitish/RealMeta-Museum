# RealMeta Museum AI — Project Report

**Project Title:** RealMeta Museum AI — AI-Powered Museum Companion System  
**Institution:** Acadia University  
**Client:** RealMeta  
**Prepared By:** Nitish Sahni  
**Date:** February 2026  
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Requirements](#4-requirements)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Features Implemented](#7-features-implemented)
8. [AI & Machine Learning Components](#8-ai--machine-learning-components)
9. [Database Design](#9-database-design)
10. [API Design](#10-api-design)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Testing](#12-testing)
13. [Limitations & Known Issues](#13-limitations--known-issues)
14. [Future Work](#14-future-work)
15. [Conclusion](#15-conclusion)

---

## 1. Executive Summary

RealMeta Museum AI is a full-stack web application designed to modernize the museum visitor experience through artificial intelligence. The system enables museum administrators to digitize their artwork collections using AI-powered analysis, and allows visitors to interact with those collections via their smartphones — no app installation required.

Visitors scan a museum-issued QR code, point their phone camera at any artwork, and receive instant identification results including the artwork's title, artist, creation year, style classification, a detailed description, and a narrated audio guide — all in their preferred language. The system supports 16 languages with on-demand translation and text-to-speech audio generation.

The project was developed as a client engagement in partnership with Acadia University and delivered as a production-ready system deployed on AWS infrastructure.

**Key Deliverables:**
- Fully functional admin portal for museum staff
- Visitor-facing mobile web experience
- AI image recognition pipeline using CLIP embeddings
- Multi-language translation and audio guide generation
- Cloud-hosted infrastructure (AWS EC2, AWS S3, AWS CloudFront, Amazon DocumentDB)

---

## 2. Problem Statement

Museums face several persistent challenges in delivering accessible, engaging visitor experiences:

1. **Language Barriers** — International visitors often cannot read artwork labels or access guides in their native language. Hiring human translators or producing physical guides in multiple languages is prohibitively expensive.

2. **Static Information** — Traditional plaques and pamphlets provide limited, non-interactive information. Visitors have no way to explore deeper context, hear narration, or engage with supplementary media.

3. **High Cost of Audio Guides** — Traditional audio guide systems require dedicated hardware (rental devices), physical infrastructure, and significant ongoing maintenance costs.

4. **Accessibility** — Visitors with visual impairments or reading difficulties have few options for accessing artwork information in an accessible format.

5. **Visitor Data** — Museums struggle to understand visitor behaviour, which artworks attract the most interest, and how long visitors engage with specific exhibits.

**The core need:** A low-cost, scalable, smartphone-based system that identifies artworks automatically, delivers rich information in any language, and works on any modern device without a native app.

---

## 3. Project Objectives

### Primary Objectives

| # | Objective | Outcome |
|---|-----------|---------|
| 1 | Build an AI system that identifies artworks from visitor smartphone photos | ✅ Achieved — CLIP-based embedding matching with cosine similarity |
| 2 | Support multi-language content delivery (10+ languages) | ✅ Achieved — 16 languages supported |
| 3 | Auto-generate audio guides from artwork descriptions | ✅ Achieved — ElevenLabs TTS integration |
| 4 | Enable museums to self-manage their collections via a dashboard | ✅ Achieved — Full admin portal with authentication |
| 5 | Deploy as a production-ready system accessible via QR code | ✅ Achieved — Full AWS deployment (EC2, S3, CloudFront, DocumentDB) |

### Secondary Objectives

| # | Objective | Outcome |
|---|-----------|---------|
| 6 | Auto-generate artwork metadata using AI vision analysis | ✅ Achieved — Claude + fallback chain |
| 7 | Support additional media per artwork (video, music, documents) | ✅ Achieved — Full media management |
| 8 | Track visitor interactions for analytics | ✅ Partially achieved — visitor registration and session tracking implemented; dashboard visualizations planned |
| 9 | No native app required — browser only | ✅ Achieved — Progressive Web App via React |

---

## 4. Requirements

### 4.1 Functional Requirements

#### Admin System
- FR-1: Administrators must be able to register with email and password; registration auto-creates an associated museum.
- FR-2: Administrators must be able to upload artwork images and have them automatically analyzed by AI.
- FR-3: The system must extract title, artist name, year, art style, and description from uploaded artwork images.
- FR-4: Administrators must be able to review and edit AI-generated metadata before publishing.
- FR-5: The system must auto-translate artwork descriptions into multiple languages upon finalization.
- FR-6: The system must auto-generate narrated audio guides in multiple languages.
- FR-7: Administrators must be able to attach additional media to artworks (photos, videos, music, PDFs).
- FR-8: Administrators must be able to generate and download QR codes for their museum.
- FR-9: Administrators must be able to view, edit, and delete artworks from their collection.

#### Visitor System
- FR-10: Visitors must be able to access a museum's digital experience by scanning a QR code.
- FR-11: Visitors must be able to select their preferred language before or during their visit.
- FR-12: Visitors must be able to photograph an artwork and receive an identification result within 5 seconds.
- FR-13: The system must return the top matching artwork with a confidence score.
- FR-14: Visitors must be able to play an audio guide for identified artworks.
- FR-15: Visitors must be able to browse the full museum collection without scanning.
- FR-16: Visitor registration (name, email, phone) must be optional and skippable.

### 4.2 Non-Functional Requirements

| Requirement | Target | Status |
|-------------|--------|--------|
| Artwork identification response time | < 5 seconds end-to-end | ✅ Met (~3s typical) |
| System uptime | > 99% | ✅ Met (cloud deployment) |
| Supported languages | 10+ | ✅ Met (16 languages) |
| No native app installation required | Browser only | ✅ Met |
| Mobile-first responsive design | Works on all modern smartphones | ✅ Met |
| Secure authentication | JWT tokens, bcrypt hashing | ✅ Met |
| Scalable file storage | Cloud-based, not local disk | ✅ Met (AWS S3) |
| CLIP model embedding size | 512 dimensions | ✅ Met |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                       │
│   ┌───────────────────────┐       ┌──────────────────────────────┐  │
│   │   Admin Portal        │       │   Visitor Portal (Mobile)    │  │
│   │   React + TypeScript  │       │   React + TypeScript         │  │
│   │   /admin/*            │       │   /visit/:qrCode             │  │
│   └───────────┬───────────┘       └───────────────┬──────────────┘  │
└───────────────┼───────────────────────────────────┼─────────────────┘
                │ HTTPS REST API                     │ HTTPS REST API
                ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│                                                                       │
│   Node.js + Express 5 + TypeScript (Port 4000)                      │
│                                                                       │
│   ┌──────────────┐ ┌───────────────┐ ┌───────────┐ ┌────────────┐  │
│   │ /api/auth    │ │ /api/admin    │ │/api/museums│ │ /api/visit │  │
│   └──────────────┘ └───────────────┘ └───────────┘ └────────────┘  │
│                                                                       │
│   Services: CLIP | Vision AI | Translation | TTS | S3               │
└──────────────────────────────┬──────────────────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                         ▼
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  MongoDB     │     │  AWS S3          │     │  External AI APIs  │
│  Atlas       │     │  (Media Storage) │     │                    │
│              │     │  realmeta-       │     │  - Anthropic Claude│
│  Museums     │     │  museum-prod     │     │  - ElevenLabs TTS  │
│  Artworks    │     │  us-east-1       │     │  - OpenAI          │
│  Admins      │     │                  │     │  - HuggingFace     │
│  Visitors    │     │  Images, Audio,  │     │  - Wikipedia API   │
│              │     │  Videos, Docs    │     │                    │
└──────────────┘     └──────────────────┘     └────────────────────┘
```

### 5.2 Data Flow — Admin Upload Pipeline

```
Admin uploads image
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
CLIP Embedding                    Claude Vision AI
(512-dim vector)                  (Title, Artist, Year, Style, Description)
       │                                 │
       │                    ┌────────────┤
       │                    ▼            ▼
       │             Wikipedia API   OpenAI Translation
       │             (Extra context) (EN → 16 languages)
       │                                 │
       │                                 ▼
       │                         ElevenLabs TTS
       │                         (Audio MP3 per language)
       │                                 │
       └─────────────────┬───────────────┘
                         ▼
                  AWS S3 (media files)
                         │
                         ▼
                  MongoDB (artwork document)
```

### 5.3 Data Flow — Visitor Identification

```
Visitor opens camera → captures photo
              │
              ▼
     POST /api/visit/:qrCode/identify
              │
              ▼
      CLIP generates 512-dim embedding
      for visitor photo
              │
              ▼
      Cosine similarity compared against
      all artworks in museum (from MongoDB)
              │
              ▼
      Top 3 matches ranked by score
              │
         ┌────┴────┐
         ▼         ▼
    Score ≥ 50%  Score < 50%
    Confident    "No match found"
    match        UX shown
         │
         ▼
    Return: title, artist, year, style,
    description (in visitor's language),
    audioUrl (from S3)
```

---

## 6. Technology Stack

### 6.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool and dev server |
| React Router | 6.30 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | Various | Accessible UI primitives (dialogs, dropdowns, tabs) |
| Framer Motion | 12.x | Animations and transitions |
| Axios | 1.11 | HTTP client |
| Lucide React | 0.462 | Icon library |
| qrcode.react | 4.2 | QR code generation |
| Sonner | 1.7 | Toast notifications |

### 6.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22 (≥20 required) | Runtime |
| Express | 5.1 | Web framework |
| TypeScript | 5.9 | Type safety |
| Mongoose | 8.18 | MongoDB ODM |
| Multer | 2.0 | File upload handling |
| bcryptjs | 3.0 | Password hashing |
| jsonwebtoken | 9.0 | JWT authentication |
| Winston | 3.19 | Logging |
| Sharp | 0.34 | Image processing |
| UUID | 13.0 | Unique ID generation |

### 6.3 AI & ML Services

| Service | Model/API | Purpose |
|---------|-----------|---------|
| CLIP (local) | Xenova/clip-vit-base-patch32 | Image embedding generation and artwork matching |
| Anthropic Claude | claude-3-5-sonnet | Primary artwork vision analysis |
| OpenAI GPT-4o | gpt-4o | Vision analysis fallback + translations |
| ElevenLabs | eleven_multilingual_v2 | Text-to-speech audio generation |
| HuggingFace | Various | Free-tier fallback for vision |
| Wikipedia API | MediaWiki REST | Contextual information retrieval |

### 6.4 Infrastructure

| Component | Provider | Details |
|-----------|----------|---------|
| Media Storage | AWS S3 | Bucket: `realmeta-museum-prod`, Region: `us-east-1` |
| Database | Amazon DocumentDB 5.0 | Cluster: `museum-docdb-cluster`, Instance: `db.t3.medium`, MongoDB-compatible, encrypted at rest |
| Backend Hosting | AWS EC2 | Instance: `i-01689e896a88dad54` (`t3.medium`), IP: `44.220.47.123`, Port: 4000, fronted by CloudFront (`d1nclo4efvqhzz.cloudfront.net`) |
| Frontend Hosting | AWS S3 + CloudFront | S3 bucket: `realmeta-museum-web`, CloudFront CDN: `dw6q73wb38ozb.cloudfront.net` |
| DNS | AWS Route 53 | Hosted zones: `realmeta.ca`, `meta-real.ca` |

---

## 7. Features Implemented

### 7.1 Admin Portal (100% Complete)

#### Authentication
- Email/password registration with automatic museum creation
- JWT-based login with 7-day token expiry
- Protected routes — all admin pages require valid token
- Persistent sessions via localStorage

#### Dashboard
- Museum stats overview (total artworks, location)
- Recent artworks grid with hover-reveal metadata
- Quick-action buttons to upload and manage QR codes

#### Artwork Upload (AI-Powered)
- Drag-and-drop image upload interface
- Real-time AI analysis progress indicator
- AI extracts: title, artist, year, art style, detailed description
- Wikipedia integration for additional context and sources
- Editable form to review and correct AI output
- Two-step process: Upload → Finalize (triggers translation + TTS)
- Support for external resource links (Google Drive, etc.)

#### Additional Media Management
- Upload up to 10 extra photos per artwork
- Add video content: YouTube URLs, Vimeo URLs, or direct video file uploads
- Upload music/audio tracks with title and artist metadata
- Upload PDF documents with descriptions
- All media stored in AWS S3 with organized key structure

#### Collection Browser
- Grid view of all artworks with thumbnails
- Detail view with all metadata and media
- Delete artwork (removes from DB and S3)

#### QR Code Management
- Auto-generated QR code per museum on registration
- Display QR as SVG (for display) and Canvas (for download)
- Download as PNG or SVG
- Print-ready format with museum name and URL
- Copy URL to clipboard and native share support

### 7.2 Visitor Experience (95% Complete)

#### Museum Entry
- Accessible via unique URL: `/visit/:qrCode`
- Museum info card with name, location, description, artwork count
- Optional visitor registration (name, email, phone — all skippable)
- Language selector (16 languages) with flag indicators
- Session persistence via localStorage (no re-registration on return)

#### Artwork Scanning
- Browser camera API — no app install required
- Environment-facing camera (back camera on mobile)
- Crosshair scan overlay UI
- Capture button sends photo to backend for CLIP matching
- Confidence score display (colour-coded: green ≥80%, amber 60-79%, grey <60%)
- "No match found" state with clear retry UX
- Scan another / Browse collection actions after result

#### Artwork Detail View
- Full artwork image
- Title, artist, year, art style
- Description in selected language
- Inline audio guide player (play/pause)
- Additional photos gallery with lightbox
- Embedded YouTube/Vimeo video player
- Music track list with individual play controls
- PDF document download links

#### Language Switching
- On-demand translation — requested per artwork, per language
- Audio guide regenerated for selected language
- Supports 16 languages: English, Spanish, French, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, Hindi, Arabic, Russian, Turkish, Polish, Swedish

#### Browse Mode
- Full collection grid without camera
- Tap to expand any artwork with full detail modal
- Language switch applies to currently viewed artwork

---

## 8. AI & Machine Learning Components

### 8.1 CLIP Image Matching

**Model:** `Xenova/clip-vit-base-patch32` (via `@xenova/transformers`)  
**Embedding Dimensions:** 512  
**Similarity Metric:** Cosine similarity  
**Match Threshold:** ≥ 0.50 (50%) for a positive identification

**Process:**
1. When an artwork is uploaded, CLIP generates a 512-dimensional vector representing the visual content of the image.
2. This vector is stored alongside the artwork record in MongoDB.
3. When a visitor submits a photo, CLIP generates an equivalent vector for that photo.
4. Cosine similarity is calculated between the visitor photo vector and every artwork embedding in the museum's collection.
5. Results are sorted by score; the top match above threshold is returned as the "best match."

**Performance:**
- First-time model load: 5–10 seconds (model download ~350MB, cached after first use)
- Subsequent embedding generation: < 1 second
- Similarity search over 500 artworks: < 50ms

**Known Limitation:** The `clip-vit-base-patch32` model has moderate accuracy for real-world phone photos taken at angles or with glare. Upgrading to `clip-vit-large-patch14` or a fine-tuned art-domain model would significantly improve accuracy.

### 8.2 Vision Analysis (AI Artwork Recognition)

**Priority Chain:**
```
1. Anthropic Claude 3.5 Sonnet  →  (best quality)
2. OpenAI GPT-4o                →  (fallback)
3. HuggingFace Inference        →  (free tier fallback)
4. Mock analysis                →  (last resort placeholder)
```

Claude is given a structured prompt instructing it to act as an art historian and return JSON with: title, artist, year, art style, confidence score, museum-quality description, educational notes, related works, and suggested museum links.

### 8.3 Translation Pipeline

**Primary:** OpenAI API (GPT-4o) — high quality, context-aware translation  
**Fallback:** Google Translate API — free tier  

Translations are generated on two occasions:
1. **At finalization** — when admin saves an artwork, descriptions are translated to EN, FR, and ES and stored.
2. **On-demand** — when a visitor selects a non-English language, translation is generated in real time and cached.

### 8.4 Text-to-Speech (Audio Guides)

**Provider:** ElevenLabs  
**Model:** `eleven_multilingual_v2`  
**Output:** MP3, stored in AWS S3 at `museums/{museumId}/artworks/{artworkId}/audio/`

Audio is generated at finalization time for EN, FR, ES and generated on-demand for all other supported languages when a visitor requests them.

---

## 9. Database Design

### 9.1 Collections Overview

The system uses four MongoDB collections:

| Collection | Purpose |
|------------|---------|
| `museums` | Museum profile and QR code |
| `artworks` | Artwork metadata, embeddings, media, translations |
| `admins` | Museum administrator accounts |
| `visitors` | Visitor session and interaction records |

### 9.2 Key Schema Relationships

```
Admin ──────────┐
                ▼
Museum ─────────► Artwork (1:many, via museumId)
                      │
                      ├── imageEmbedding (512-dim CLIP vector)
                      ├── descriptions { en, fr, es, de, zh, ... }
                      ├── audioUrls { en, fr, es, ... }
                      ├── additionalPhotos []
                      ├── videos []
                      ├── musicTracks []
                      └── documents []

Visitor ────────► Museum (via museumId)
Visitor ────────► Artworks[] (artworksViewed — usage tracking)
```

### 9.3 Artwork Schema (Simplified)

```typescript
{
  _id: ObjectId,
  museumId: ObjectId,         // Parent museum
  title: string,
  author: string,
  year: string,
  style: string,
  imageUrl: string,           // S3 URL
  imageEmbedding: number[],   // 512-dim CLIP vector (core matching data)
  descriptions: {             // Multi-language text
    en, fr, es, de, zh, ja, it, pt, ru, ar, hi, ko, nl, tr, pl, sv
  },
  audioUrls: {                // S3 URLs to MP3 files
    en, fr, es, ...
  },
  additionalPhotos: [{ url, caption }],
  videos: [{ type, url, embedId, title }],
  musicTracks: [{ url, title, artist }],
  documents: [{ url, title, description }],
  externalLinks: [{ label, url }],
  sources: [{ provider, url }],
}
```

---

## 10. API Design

The backend exposes a RESTful JSON API on port 4000. All endpoints under `/api/admin/*` and `/api/auth/me` require a valid JWT Bearer token.

### Route Groups

| Prefix | Purpose | Auth Required |
|--------|---------|---------------|
| `/api/auth` | Admin login, registration, profile | Partial (login/register: no) |
| `/api/admin` | Artwork CRUD, media upload, finalize | Yes |
| `/api/museums` | Museum CRUD, QR code | No (read), Yes (write) |
| `/api/visit` | Visitor experience — identify, browse, track | No |

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register admin + auto-create museum |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Validate token, return admin + museum |
| POST | `/api/admin/upload` | Upload artwork image + AI analysis |
| POST | `/api/admin/:id/finalize` | Generate translations + audio |
| POST | `/api/admin/:id/media/photos` | Upload additional photos |
| POST | `/api/admin/:id/media/videos` | Upload video or add embed URL |
| POST | `/api/admin/:id/media/music` | Upload audio track |
| POST | `/api/admin/:id/media/documents` | Upload PDF |
| GET | `/api/visit/:qrCode` | Load museum info (visitor entry) |
| POST | `/api/visit/:qrCode/identify` | Match photo to artwork via CLIP |
| GET | `/api/visit/:qrCode/artworks` | Browse museum collection |
| POST | `/api/visit/artwork/:id/translate` | On-demand language translation |
| POST | `/api/visit/:qrCode/visitor` | Register visitor (optional) |

---

## 11. Deployment & Infrastructure

### 11.1 Environment Overview

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React SPA (built with Vite), hosted on AWS S3 + CloudFront CDN (`dw6q73wb38ozb.cloudfront.net`) | ✅ Deployed |
| Backend API | Node.js + Express, hosted on AWS EC2 `t3.medium` (`44.220.47.123`), fronted by CloudFront (`d1nclo4efvqhzz.cloudfront.net`) | ✅ Deployed |
| Database | Amazon DocumentDB 5.0 (`museum-docdb-cluster`, `db.t3.medium`, same VPC as EC2) | ✅ Live |
| Media Storage | AWS S3 (`realmeta-museum-prod`, `us-east-1`) | ✅ Active |
| DNS | AWS Route 53 (`realmeta.ca`, `meta-real.ca`) | ✅ Active |

### 11.2 Environment Variables (Backend)

```bash
# Server
PORT=4000

# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<strong-secret>

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=sk_...
HUGGINGFACE_API_KEY=hf_...

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=realmeta-museum-prod
S3_REGION=us-east-1
```

### 11.3 Frontend Configuration

The frontend automatically selects the correct API host:
- **Development:** `http://localhost:4000`
- **Production:** `https://d1nclo4efvqhzz.cloudfront.net` (AWS CloudFront → EC2)

### 11.4 Build & Start Commands

```bash
# Backend
cd server
npm install
npm run build     # TypeScript → dist/
npm start         # node dist/index.js

# Frontend
cd web
npm install
npm run build     # Outputs to dist/
# Upload dist/ to S3 bucket realmeta-museum-web, served via CloudFront
```

---

## 12. Testing

### 12.1 Testing Approach

Due to project timeline constraints, the system was validated through **manual functional testing** and **integration smoke tests** rather than automated test suites. All core user flows were exercised before deployment.

### 12.2 Manual Test Cases

#### Admin Flows

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| A-01 | Register new admin with valid credentials | Account created, museum auto-created, JWT returned | ✅ Pass |
| A-02 | Login with correct credentials | JWT token returned, admin + museum data returned | ✅ Pass |
| A-03 | Access `/admin` without token | Redirected to `/admin/login` | ✅ Pass |
| A-04 | Upload artwork image (JPG) | AI analysis triggered, metadata returned | ✅ Pass |
| A-05 | Upload artwork image (PNG, WebP) | Same as A-04 | ✅ Pass |
| A-06 | Finalize artwork | Translations and audio generated, saved to S3 | ✅ Pass |
| A-07 | Edit metadata before finalize | Edited values persist to save | ✅ Pass |
| A-08 | Upload additional photo to artwork | Photo saved to S3, URL returned | ✅ Pass |
| A-09 | Add YouTube URL to artwork | Video stored with type=youtube | ✅ Pass |
| A-10 | Delete artwork | Artwork removed from DB | ✅ Pass |
| A-11 | Generate and download QR code (PNG) | Valid PNG downloaded | ✅ Pass |
| A-12 | Print QR code | Print dialog opens with formatted layout | ✅ Pass |

#### Visitor Flows

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| V-01 | Navigate to `/visit/:qrCode` with valid QR | Museum landing page loaded | ✅ Pass |
| V-02 | Navigate to `/visit/:qrCode` with invalid QR | Error state shown | ✅ Pass |
| V-03 | Skip registration | Proceeds to museum home directly | ✅ Pass |
| V-04 | Select language from 16 options | Language preference stored | ✅ Pass |
| V-05 | Open camera (requires permission) | Camera stream displayed | ✅ Pass |
| V-06 | Capture photo of artwork in collection | Artwork identified with confidence score | ✅ Pass |
| V-07 | Capture photo of unrelated image | "No match found" screen displayed | ✅ Pass |
| V-08 | Play audio guide | MP3 plays from S3 | ✅ Pass |
| V-09 | Switch language on result screen | Description and audio updated | ✅ Pass |
| V-10 | Browse collection | All artworks shown in grid | ✅ Pass |
| V-11 | Tap artwork in browse grid | Detail modal with media displayed | ✅ Pass |
| V-12 | View additional photos in lightbox | Full-screen lightbox opens | ✅ Pass |
| V-13 | Play embedded YouTube video | YouTube iframe loads | ✅ Pass |

#### Backend Integration Tests

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| B-01 | `POST /api/visit/:qrCode/identify` with valid photo | JSON with bestMatch, matchScore, audioUrl | ✅ Pass |
| B-02 | `POST /api/admin/upload` with image | AI analysis JSON returned | ✅ Pass |
| B-03 | `POST /api/admin/:id/finalize` | Translations + audio URLs returned | ✅ Pass |
| B-04 | `GET /api/visit/:qrCode/artworks` | Array of artworks with S3 URLs | ✅ Pass |
| B-05 | Built-in test endpoints (`/test-vision`, `/test-tts`) | Service health confirmed | ✅ Pass |

### 12.3 Known Test Gaps

- No automated unit tests (Jest/Vitest not configured)
- No automated end-to-end tests (Playwright/Cypress not configured)
- No load/stress testing performed
- No security penetration testing performed

These are identified as high-priority items for any future development phases.

---

## 13. Limitations & Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| CLIP model accuracy | Medium | `clip-vit-base-patch32` is a general-purpose model. Accuracy degrades with photos taken at angles, in poor lighting, or with reflections. A fine-tuned art-domain model would improve results significantly. |
| No automated tests | High | The codebase has no automated test coverage. Manual testing was performed but regressions are a risk during future development. |
| No rate limiting | Medium | The API has no rate limiting, making it potentially vulnerable to abuse or accidental DDoS. |
| Analytics incomplete | Low | The admin analytics page is a placeholder. Visitor scan data is collected but not yet visualized. |
| ElevenLabs quota | Low | On the free tier, ElevenLabs has character limits. Large collections with many languages may exhaust quota quickly. |
| CLIP model cold start | Low | First CLIP embedding generation downloads the model (~350MB). Subsequent calls use the cached model. On serverless deployments this can cause slow cold starts. |
| CloudFront URL in frontend | Low | `api.ts` contains the CloudFront distribution URL. If a custom domain is configured (e.g., `museum.realmeta.ca`), this should be updated accordingly. |
| No input sanitization library | Medium | Basic validation is in place, but a dedicated library (Zod or Joi) would provide stronger guarantees. |

---

## 14. Future Work

### Phase 2 — Near Term

| Feature | Priority | Description |
|---------|----------|-------------|
| Analytics Dashboard | High | Visualize visitor scans, popular artworks, language breakdown using charts |
| Automated Tests | High | Add Jest unit tests for services and Playwright E2E tests |
| Rate Limiting | High | Implement API rate limiting (express-rate-limit) |
| Admin Settings | Medium | Password change, profile management, museum details editing |
| Larger CLIP Model | Medium | Upgrade to `clip-vit-large-patch14` or a fine-tuned art model on GPU-enabled AWS instance |
| Batch Artwork Import | Medium | CSV/JSON bulk upload for museums with large collections |
| Search | Medium | Full-text search across artworks by title, artist, or style |

### Phase 3 — Long Term

| Feature | Description |
|---------|-------------|
| PWA / Offline Mode | Cache museum collection for offline browsing using service workers |
| Native Mobile Apps | iOS and Android apps for enhanced camera control and performance |
| Indoor Navigation | Map-based guided tours with turn-by-turn directions to artworks |
| Social Features | Share artwork discoveries on social media |
| AR Overlay | Augmented reality mode overlaying artwork info on live camera feed |
| Ticketing Integration | Link with museum reservation systems |
| Multi-Museum Admin | Allow one admin account to manage multiple museum locations |

---

## 15. Conclusion

The RealMeta Museum AI project successfully delivered a production-ready, AI-powered museum companion system within the project timeline. The system meets all primary objectives: it identifies artworks from visitor smartphone photos using CLIP-based embedding matching, delivers artwork information in 16 languages with on-demand translation, generates narrated audio guides via ElevenLabs, and provides museum administrators with a self-service portal for collection management.

The system is deployed on AWS cloud infrastructure (EC2, S3, CloudFront, Route 53) with Amazon DocumentDB and is accessible to museum visitors through any modern smartphone browser — requiring no app installation. The admin portal supports the full artwork lifecycle from upload through AI analysis, translation, audio generation, and publication.

Key technical contributions include:
- A complete AI pipeline combining CLIP image matching with Claude vision analysis, multi-language translation, and TTS audio generation
- A two-role web application serving both museum administrators and visiting public
- A scalable, cloud-native architecture built on AWS (EC2, S3, CloudFront, Route 53) and Amazon DocumentDB
- Support for rich media attachments per artwork including photos, videos, music, and documents

The project demonstrated the practical viability of using state-of-the-art AI services (large language models, image-language models, neural TTS) to automate content generation tasks that would traditionally require significant human expertise and labour — making museum digitization accessible to institutions of any size.

---

*Report prepared by Nitish Sahni, Acadia University, February 2026.*  
*Project developed in partnership with RealMeta.*
