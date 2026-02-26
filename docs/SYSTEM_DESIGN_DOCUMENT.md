# RealMeta Museum AI — System Design Document

**Project Title:** RealMeta Museum AI — AI-Powered Museum Companion System  
**Institution:** Acadia University  
**Client:** RealMeta  
**Prepared By:** Nitish Sahni  
**Date:** February 2026  
**Version:** 1.0

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Design Goals & Constraints](#3-design-goals--constraints)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Component Design](#5-component-design)
6. [Data Design](#6-data-design)
7. [Interface Design](#7-interface-design)
8. [AI & ML Pipeline Design](#8-ai--ml-pipeline-design)
9. [Security Design](#9-security-design)
10. [Deployment Design](#10-deployment-design)
11. [Design Decisions & Rationale](#11-design-decisions--rationale)
12. [Scalability Considerations](#12-scalability-considerations)

---

## 1. Introduction

### 1.1 Purpose

This document describes the system design for the RealMeta Museum AI application. It covers the architectural decisions, component interactions, data models, and deployment strategy. This document is intended for software developers, technical reviewers, and stakeholders who need to understand how the system is structured and why specific design choices were made.

### 1.2 Scope

The system consists of two user-facing applications — an Admin Portal for museum staff and a Visitor Portal for museum guests — backed by a shared REST API and a set of AI-powered services. The system enables artwork digitization through AI analysis and delivers interactive, multi-language visitor experiences via smartphone without a native app.

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| CLIP | Contrastive Language-Image Pre-training — an OpenAI model that generates vector representations of images |
| Embedding | A numerical vector (array of floating point numbers) representing the content of an image |
| Cosine Similarity | A measure of similarity between two vectors, ranging from 0.0 (different) to 1.0 (identical) |
| QR Code | A machine-readable optical label encoding a URL, used to direct visitors to the museum experience |
| TTS | Text-to-Speech — converting written text to spoken audio |
| JWT | JSON Web Token — a compact, signed token used for stateless authentication |
| ODM | Object Document Mapper — maps code objects to database documents (Mongoose for MongoDB) |
| S3 | Amazon Simple Storage Service — cloud object storage for files |

---

## 2. System Overview

### 2.1 What the System Does

RealMeta Museum AI provides two distinct experiences:

**For Museum Administrators:**
- Upload artwork images to a digital collection
- AI automatically identifies the artwork (title, artist, year, style, description)
- Generate multilingual descriptions and audio guides automatically
- Manage the full collection and generate visitor QR codes

**For Museum Visitors:**
- Scan a QR code at the museum entrance to access the experience
- Point their smartphone camera at any artwork to identify it instantly
- Read artwork information and listen to narrated audio guides in their preferred language
- Browse the entire museum collection

### 2.2 System Context Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ACTORS                               │
│                                                                        │
│   ┌───────────────┐                      ┌───────────────────────┐   │
│   │  Museum Admin │                      │  Museum Visitor        │   │
│   │  (Staff)      │                      │  (Public, anonymous)   │   │
│   └───────┬───────┘                      └──────────┬────────────┘   │
└───────────┼──────────────────────────────────────────┼───────────────┘
            │ Web Browser                              │ Smartphone Browser
            │ (Desktop/Laptop)                         │ (Mobile)
            ▼                                          ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       REALMETA MUSEUM AI SYSTEM                        │
│                                                                         │
│  ┌───────────────────────┐       ┌──────────────────────────────────┐ │
│  │    Admin Portal        │       │       Visitor Portal              │ │
│  │    /admin/*            │       │       /visit/:qrCode             │ │
│  └───────────┬────────────┘       └────────────────┬─────────────────┘ │
│              │                                      │                    │
│              └──────────────┬───────────────────────┘                   │
│                             │                                            │
│                    ┌────────▼────────┐                                  │
│                    │   REST API       │                                  │
│                    │   Node.js/Express│                                  │
│                    └────────┬────────┘                                  │
│                             │                                            │
│         ┌───────────────────┼───────────────────┐                      │
│         ▼                   ▼                    ▼                      │
│  ┌─────────────┐   ┌────────────────┐   ┌────────────────────┐        │
│  │  DocumentDB  │   │   AWS S3       │   │  External AI APIs   │        │
│  │  (Database)  │   │   (Media)      │   │  Claude, ElevenLabs │        │
│  └─────────────┘   └────────────────┘   └────────────────────┘        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Design Goals & Constraints

### 3.1 Design Goals

| Goal | Description |
|------|-------------|
| **G1 — No App Install** | The visitor experience must work in any modern smartphone browser without requiring a native app download |
| **G2 — Fast Identification** | Artwork identification from visitor photo must complete in under 5 seconds end-to-end |
| **G3 — Multi-Language** | The system must support 10+ languages with no manual translation effort from museum staff |
| **G4 — Self-Service Admin** | Museum staff with no technical background must be able to upload and manage artwork independently |
| **G5 — Cloud-Native Storage** | All media files must be stored in a scalable cloud storage system, not on local server disk |
| **G6 — Multi-Museum** | The system must isolate collections between museums — one museum's visitors should only see that museum's artworks |
| **G7 — AI Fallback Chain** | If the primary AI service is unavailable, the system must fall back to alternative services gracefully |

### 3.2 Constraints

| Constraint | Description |
|-----------|-------------|
| **C1 — Budget** | The system must run at low cost during initial deployment. Expensive services (GPU compute, large model APIs) should be minimized |
| **C2 — CLIP Model Size** | The CLIP model requires ~350MB of disk space and ~400MB RAM. Serverless platforms with low memory are not suitable for the backend |
| **C3 — Browser Camera API** | Visitor camera access depends on the browser's `getUserMedia()` API — requires HTTPS in production |
| **C4 — API Rate Limits** | Claude, ElevenLabs, and OpenAI all have rate limits and usage quotas that bound how fast artworks can be processed |
| **C5 — CLIP Accuracy** | The `clip-vit-base-patch32` model has inherent limitations in matching photos taken at angles or in poor lighting |

---

## 4. High-Level Architecture

### 4.1 Architecture Style

The system follows a **three-tier web application architecture**:

- **Presentation Tier** — React SPA (Single Page Application), hosted on AWS S3 + CloudFront CDN
- **Application Tier** — Node.js/Express REST API with embedded AI services, hosted on AWS EC2, fronted by CloudFront
- **Data Tier** — Amazon DocumentDB 5.0 (documents) + AWS S3 (binary media)

This separation allows the frontend and backend to be deployed, scaled, and updated independently.

### 4.2 Architecture Diagram

```
                        ┌─────────────────────────────────────┐
                        │         PRESENTATION TIER            │
                        │                                       │
                        │  React 18 + TypeScript + Vite         │
                        │  Tailwind CSS + Radix UI              │
                        │  Framer Motion (animations)           │
                        │  React Router v6 (client routing)     │
                        │                                       │
                        │  Served via: AWS S3 + CloudFront      │
                        └──────────────┬──────────────────────┘
                                       │ HTTPS (REST API calls via Axios)
                                       │
                        ┌──────────────▼──────────────────────┐
                        │         APPLICATION TIER             │
                        │                                       │
                        │  Node.js v22 + Express 5             │
                        │  TypeScript                           │
                        │                                       │
                        │  ┌───────────────────────────────┐  │
                        │  │          API Routes            │  │
                        │  │  /api/auth  /api/admin         │  │
                        │  │  /api/museums  /api/visit      │  │
                        │  └───────────────────────────────┘  │
                        │                                       │
                        │  ┌───────────────────────────────┐  │
                        │  │          Services              │  │
                        │  │  CLIP (local model)            │  │
                        │  │  Vision AI (Claude/OpenAI)     │  │
                        │  │  Translation (OpenAI/Google)   │  │
                        │  │  TTS (ElevenLabs)              │  │
                        │  │  S3 (AWS SDK)                  │  │
                        │  └───────────────────────────────┘  │
                        │                                       │
                        │  Hosted on: AWS EC2 (t3.medium)       │
                        └──────┬──────────────────┬────────────┘
                               │                  │
               ┌───────────────┘                  └──────────────────┐
               │                                                       │
┌──────────────▼──────────────┐             ┌───────────────────────▼──┐
│        DATA TIER (DB)        │             │      DATA TIER (Files)    │
│                               │             │                           │
│  Amazon DocumentDB 5.0        │             │  AWS S3                   │
│  Collections:                 │             │  Bucket: realmeta-        │
│  - museums                   │             │  museum-prod              │
│  - artworks                  │             │  Region: us-east-1        │
│  - admins                    │             │                           │
│  - visitors                  │             │  Stores:                  │
│                               │             │  - Artwork images         │
│  Indexes:                    │             │  - Audio MP3 guides        │
│  - qrCode (unique)           │             │  - Extra photos            │
│  - museumId                  │             │  - Videos, music, PDFs    │
└───────────────────────────────┘             └───────────────────────────┘
```

### 4.3 Request Flow Summary

| User Action | Path |
|-------------|------|
| Admin logs in | Browser → Express `/api/auth/login` → MongoDB → JWT returned |
| Admin uploads artwork | Browser → Express `/api/admin/upload` → CLIP (local) + Claude API → MongoDB + S3 |
| Visitor scans QR | Browser opens `/visit/:qrCode` → Express `/api/visit/:qrCode` → MongoDB |
| Visitor photographs artwork | Browser → Express `/api/visit/:qrCode/identify` → CLIP (local) → MongoDB cosine search → Response |
| Visitor switches language | Browser → Express `/api/visit/artwork/:id/translate` → OpenAI API → ElevenLabs API → S3 |

---

## 5. Component Design

### 5.1 Frontend Components

The frontend is organized as a React SPA with two distinct user flows:

```
src/
├── App.tsx                         ← Root: route definitions
├── contexts/
│   └── AuthContext.tsx             ← Global auth state (admin + museum + JWT)
├── lib/
│   ├── api.ts                      ← API base URL + getMediaUrl() helper
│   └── utils.ts                    ← Tailwind className utilities
├── pages/
│   ├── AdminLogin.tsx              ← Login form
│   ├── AdminRegister.tsx           ← Registration form
│   ├── AdminDashboard.tsx          ← Stats + quick actions
│   ├── AdminUpload.tsx             ← Full artwork upload + edit workflow
│   ├── AdminCollection.tsx         ← Collection browser
│   ├── AdminQRCodes.tsx            ← QR generation + download
│   ├── AdminPlaceholder.tsx        ← Placeholder for unbuilt pages
│   ├── VisitorHome.tsx             ← Museum entry + scan + result
│   └── VisitorBrowse.tsx           ← Browse collection
└── components/
    ├── ProtectedRoute.tsx          ← Auth gate for admin routes
    ├── admin/
    │   ├── AdminSidebar.tsx        ← Navigation sidebar
    │   ├── UploadZone.tsx          ← Drag-and-drop image upload
    │   ├── ArtworkInfoCard.tsx     ← AI result display
    │   ├── AnalyzingOverlay.tsx    ← AI processing animation
    │   └── SavingOverlay.tsx       ← Save progress overlay
    └── ui/
        └── button.tsx              ← Radix-based button component
```

**Key Design Patterns:**
- **Context API** — `AuthContext` provides admin/museum state globally, avoiding prop drilling
- **Protected Routes** — `ProtectedRoute` wraps all admin pages, redirecting unauthenticated users to `/admin/login`
- **Optimistic UI** — overlays (`AnalyzingOverlay`, `SavingOverlay`) show progress during long async operations
- **Lazy Translation** — language content is fetched on demand rather than pre-loaded, reducing unnecessary API calls

### 5.2 Backend Components

```
server/src/
├── index.ts                        ← Server entry: CORS, middleware, route mounting
├── models/
│   ├── Museum.ts                   ← Museum schema + pre-save QR code generation
│   ├── Artwork.ts                  ← Artwork schema with embeddings + media arrays
│   ├── Admin.ts                    ← Admin schema with bcrypt password hooks
│   └── Visitor.ts                  ← Visitor session tracking schema
├── routes/
│   ├── auth.ts                     ← POST /register, POST /login, GET /me
│   ├── admin.ts                    ← Artwork CRUD + media uploads + finalize
│   ├── museums.ts                  ← Museum CRUD + QR generation
│   ├── visitor.ts                  ← Identify, browse, translate, track
│   └── public.ts                   ← Public artwork listing
├── services/
│   ├── clip.ts                     ← CLIP model singleton + embedding + cosine similarity
│   ├── vision.ts                   ← Claude → OpenAI → HuggingFace fallback chain
│   ├── translation.ts              ← OpenAI → Google Translate fallback chain
│   ├── tts.ts                      ← ElevenLabs TTS audio generation
│   ├── s3.ts                       ← AWS S3 upload, delete, URL generation
│   ├── resources.ts                ← Wikipedia API context fetching
│   ├── google-vision.ts            ← Google Cloud Vision (optional)
│   ├── huggingface-vision.ts       ← HuggingFace inference fallback
│   ├── simple-vision.ts            ← Lightweight vision helpers
│   └── tensorflow-vision.ts        ← TensorFlow.js (optional, disabled)
└── utils/
    ├── db.ts                       ← DocumentDB/MongoDB connection with TLS support
    └── logger.ts                   ← Winston structured logger
```

**Key Design Patterns:**

- **Singleton CLIP Model** — The CLIP model is loaded once at server start and reused across all requests, avoiding repeated 350MB downloads.
- **Fallback Service Chain** — Vision analysis and translation each have a priority chain of providers. If the primary API fails (timeout, quota exceeded, key invalid), the system automatically tries the next option. This prevents total failure when a single service is down.
- **Route-Service Separation** — Route handlers are thin controllers that validate inputs and delegate logic to service modules. Services contain all business logic.
- **Lazy S3 Client** — The S3 client is initialized on first use rather than at startup, allowing the server to start even if AWS credentials are temporarily unavailable.

### 5.3 Authentication Flow

```
[Client] POST /api/auth/login { email, password }
              │
              ▼
    Find admin by email in MongoDB
              │
              ▼
    bcrypt.compare(password, admin.passwordHash)
              │
         ┌────┴────┐
         ▼         ▼
      Match      No Match
         │         │
         ▼         ▼
    Sign JWT    Return 401
    { adminId,
      museumId,
      exp: 7 days }
         │
         ▼
    Return { token, admin, museum }

[Client stores token in localStorage]
[All subsequent admin requests include]
[Authorization: Bearer <token> header]

[Protected routes verify token on each request]
[via JWT middleware in Express]
```

---

## 6. Data Design

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────┐         ┌────────────────────────────────────────────┐
│          ADMIN           │         │                  ARTWORK                    │
├─────────────────────────┤         ├────────────────────────────────────────────┤
│ _id (ObjectId, PK)      │         │ _id (ObjectId, PK)                         │
│ email (string, unique)  │         │ museumId (ObjectId, FK → Museum)            │
│ password (hashed string)│         │ title (string)                             │
│ name (string)           │    1:N  │ author (string)                            │
│ museumId (ObjectId, FK) │────────▶│ year (string)                              │
│ role (string)           │         │ style (string)                             │
│ createdAt, updatedAt    │         │ description (string)                        │
└─────────────────────────┘         │ imageUrl (string, S3 URL)                  │
                                     │ imageEmbedding (number[], 512 dims)         │
                                     │ descriptions { en, fr, es, de, zh, ... }   │
┌─────────────────────────┐         │ audioUrls { en, fr, es, ... }              │
│         MUSEUM           │         │ additionalPhotos [{ url, caption }]         │
├─────────────────────────┤         │ videos [{ type, url, embedId, title }]     │
│ _id (ObjectId, PK)      │    1:N  │ musicTracks [{ url, title, artist }]       │
│ name (string, required) │────────▶│ documents [{ url, title, description }]    │
│ location (string)       │         │ externalLinks [{ label, url }]              │
│ qrCode (string, unique) │         │ sources [{ provider, url }]                │
│ website (string?)       │         │ createdAt, updatedAt                        │
│ description (string?)   │         └────────────────────────────────────────────┘
│ createdAt, updatedAt    │
└─────────────────────────┘

┌─────────────────────────┐
│         VISITOR          │
├─────────────────────────┤
│ _id (ObjectId, PK)      │
│ museumId (ObjectId, FK) │
│ name (string?)          │
│ phone (string?)         │
│ email (string?)         │
│ language (string)       │
│ sessionId (string)      │
│ artworksViewed []       │──── References to Artwork._id array
│ visitedAt (Date)        │
│ createdAt               │
└─────────────────────────┘
```

### 6.2 MongoDB Indexes

| Collection | Index Field | Type | Purpose |
|------------|-------------|------|---------|
| `museums` | `qrCode` | Unique | Fast lookup by QR code on visitor entry |
| `artworks` | `museumId` | Non-unique | Fast retrieval of all artworks for a museum during CLIP matching |
| `admins` | `email` | Unique | Prevent duplicate accounts, fast login lookup |
| `visitors` | `sessionId` | Non-unique | Session lookup for tracking |

### 6.3 Data Storage Split

| Data Type | Stored In | Format | Reason |
|-----------|-----------|--------|--------|
| Structured metadata (titles, descriptions, embeddings) | Amazon DocumentDB 5.0 | BSON documents | Flexible schema, fast querying, MongoDB-compatible |
| Binary media (images, audio, video, PDF) | AWS S3 | Original file format | Scalable object storage, CDN-ready, not suited for MongoDB |
| CLIP model cache | Local server disk | Binary model files | Model must be local for fast inference |
| Auth tokens | Client localStorage | JWT string | Stateless auth — server doesn't store sessions |
| Visitor sessions | MongoDB + localStorage | Document + string ID | Cross-session visitor identification |

### 6.4 CLIP Embedding Storage

The `imageEmbedding` field on each Artwork document stores a 512-element array of 32-bit floats:

```
imageEmbedding: [0.1234, -0.5678, 0.9012, ..., 0.3456]   // 512 numbers
```

- **Storage size per artwork:** ~2KB (512 × 4 bytes)
- **At 1,000 artworks:** ~2MB of embedding data
- **Retrieval:** All embeddings for a museum are retrieved in one query and compared in-memory

This approach (embedding stored in MongoDB, compared in Node.js) is suitable for collections up to ~10,000 artworks. Beyond that, a vector database (Pinecone, Weaviate, pgvector) would provide better performance.

---

## 7. Interface Design

### 7.1 Admin Interface

The admin portal uses a fixed sidebar + scrollable main content layout. All admin pages are accessible from the sidebar without full page reloads (React Router SPA).

**Route Map:**
```
/admin/login         → Login page (public)
/admin/register      → Registration (public)
/admin              → Dashboard (protected)
/admin/upload        → Upload artwork (protected)
/admin/collection    → Browse/manage artworks (protected)
/admin/qr-codes      → QR code management (protected)
/admin/analytics     → Analytics (placeholder, protected)
/admin/settings      → Settings (placeholder, protected)
```

### 7.2 Visitor Interface

The visitor interface is a mobile-first single-page experience accessed via dynamic URL. It uses a multi-state approach within `VisitorHome.tsx`:

**State Machine:**
```
          ┌─────────────┐
          │   Loading    │  ← Fetching museum data
          └──────┬───────┘
                 │
          ┌──────▼──────┐
          │  Registration│  ← Optional visitor details
          │   (or skip)  │
          └──────┬───────┘
                 │
          ┌──────▼──────┐
          │  Museum Home │  ← Language selector + action buttons
          └──────┬───────┘
                 │
       ┌─────────┴──────────┐
       ▼                     ▼
┌──────────────┐     ┌───────────────┐
│ Camera View  │     │ Browse        │
│ (live scan)  │     │ Collection    │
└──────┬───────┘     └───────────────┘
       │
       ▼
┌──────────────┐
│ Match Result │  ← Artwork details + audio
└──────┬───────┘
       │
       ▼
 Scan Another / Browse
```

**Visitor Route Map:**
```
/visit/:qrCode          → Museum entry (VisitorHome — all states above)
/visit/:qrCode/browse   → Browse collection (VisitorBrowse)
```

### 7.3 REST API Interface

The API follows REST conventions with JSON request/response bodies.

**Authentication:**
- Unauthenticated endpoints: all `/api/visit/*`, `/api/museums` (GET), `/api/auth/login`, `/api/auth/register`
- Authenticated endpoints: all `/api/admin/*`, `/api/auth/me`
- Method: `Authorization: Bearer <JWT>` header

**Error Response Format:**
```json
{ "error": "Human-readable error message" }
```

**Success Response Format (example):**
```json
{
  "success": true,
  "museum": { "id": "...", "name": "...", "artworkCount": 42 }
}
```

**CORS:**
CORS is configured to allow all origins with credentials, supporting both development (`localhost`) and production domains without code changes.

---

## 8. AI & ML Pipeline Design

### 8.1 Admin Upload Pipeline

The upload flow is split into two phases to allow the admin to review and correct AI output before committing final content:

```
PHASE 1 — UPLOAD (immediate, ~5-15 seconds)
──────────────────────────────────────────────────────────────
[1] Receive image file via multipart/form-data (Multer)
[2] Save image to temporary local path
[3] Upload image to AWS S3 → get permanent S3 URL
[4] Run in parallel:
    [4a] CLIP: generate 512-dim embedding vector
    [4b] Claude Vision: analyze image → JSON with metadata
[5] Wikipedia API: fetch external context for identified artwork
[6] Return: { id, imageUrl, ai: { title, author, year, style }, wiki }

[Admin reviews, edits, approves metadata]

PHASE 2 — FINALIZE (longer, ~60-120 seconds)
──────────────────────────────────────────────────────────────
[1] Receive edited metadata from admin
[2] OpenAI: translate description to FR, ES (parallel)
[3] OpenAI: translate description to DE, ZH, JA, IT, PT, RU, AR... (on-demand)
[4] ElevenLabs: generate MP3 audio for EN, FR, ES (parallel)
[5] Upload all audio files to AWS S3
[6] Save final Artwork document to MongoDB with:
    - All metadata
    - imageEmbedding (from Phase 1)
    - descriptions { en, fr, es }
    - audioUrls { en, fr, es }
[7] Return updated artwork data to admin
```

**Why two phases?**
Separating upload from finalize allows the admin to catch and correct AI mistakes (e.g., wrong artist name) before expensive translation and audio generation occurs. This reduces wasted API costs from incorrect data.

### 8.2 Visitor Identification Pipeline

```
[1] Receive visitor photo as multipart/form-data
[2] Save to temporary local file (Multer)
[3] CLIP: generate 512-dim embedding for visitor photo
[4] MongoDB: fetch all artworks for this museum
    Query: Artwork.find({ museumId }).select('imageEmbedding title ...')
[5] For each artwork embedding:
    score = cosine_similarity(visitorEmbedding, artworkEmbedding)
[6] Sort results by score descending
[7] Decision:
    if (top_score >= 0.50):   → confident match → return bestMatch
    else:                      → no match → return { noMatch: true }
[8] Return top 3 results with matchScore, description (in visitor's language), audioUrl
[9] Delete temporary photo file
```

**Cosine Similarity Formula:**
```
similarity(A, B) = (A · B) / (||A|| × ||B||)

Where:
  A · B = dot product of vectors A and B
  ||A|| = Euclidean norm (magnitude) of vector A
  Result: 0.0 (completely different) to 1.0 (identical)
```

### 8.3 On-Demand Translation Pipeline

When a visitor selects a language with no cached translation:

```
[1] POST /api/visit/artwork/:id/translate  { language: "de" }
[2] Check MongoDB: does descriptions.de exist?
    YES → return cached translation + audioUrl.de
    NO  → proceed:
[3] OpenAI: translate descriptions.en → German text
[4] ElevenLabs: generate German MP3 audio
[5] Upload audio to S3
[6] Save descriptions.de and audioUrls.de to MongoDB (cache for future)
[7] Return { description, audioUrl }
```

### 8.4 AI Service Fallback Chain

```
VISION ANALYSIS
─────────────────────────────────────────────────────
Priority 1: Anthropic Claude 3.5 Sonnet
  ↓ (if ANTHROPIC_API_KEY missing or API error)
Priority 2: OpenAI GPT-4o
  ↓ (if OPENAI_API_KEY missing or API error)
Priority 3: HuggingFace Inference API
  ↓ (if HUGGINGFACE_API_KEY missing or rate limited)
Priority 4: Mock Analysis (placeholder data)

TRANSLATION
─────────────────────────────────────────────────────
Priority 1: OpenAI GPT-4o (context-aware, natural)
  ↓ (if unavailable)
Priority 2: Google Translate API (literal, fast)
```

---

## 9. Security Design

### 9.1 Authentication & Authorization

| Mechanism | Implementation |
|-----------|---------------|
| Password storage | bcryptjs with salt rounds = 10 (never stored as plaintext) |
| Session tokens | JWT signed with `JWT_SECRET`, 7-day expiry |
| Token storage | Client-side `localStorage` (not cookies) |
| Protected routes | Express middleware validates JWT on every `/api/admin/*` request |
| Museum isolation | Admin's `museumId` is embedded in the JWT — admin can only access their own museum |

### 9.2 Data Isolation

Each museum's data is strictly isolated:
- Every Artwork document references a `museumId`
- Visitor identification queries always filter by `museumId` — visitors can never see another museum's artworks
- The QR code is the only "key" to a museum's visitor experience — each museum has a unique, opaque code

### 9.3 File Upload Security

- **File type validation:** Multer is configured to accept only image formats for artwork images, audio formats for music, video formats for videos, and PDF for documents
- **File size limits:** Configured per upload type (images: 10MB, videos: 100MB, audio: 50MB, PDFs: 20MB)
- **Temporary files:** Visitor photos submitted for identification are deleted immediately after CLIP processing — they are never stored permanently
- **S3 storage:** Media files are stored in S3 with keys organized by `museumId/artworkId/type/filename`, preventing path traversal or key guessing

### 9.4 API Security

| Concern | Mitigation |
|---------|-----------|
| CORS | Configured to allow credentialed requests; restricting to CloudFront domain origins is recommended for production |
| Sensitive keys | All API keys stored in environment variables, never in source code |
| Input validation | Basic type validation in route handlers; production hardening with Zod/Joi is recommended |
| Rate limiting | Not yet implemented — recommended for production |
| HTTPS | Required for browser camera API (`getUserMedia`) — enforced by CloudFront HTTPS termination |

### 9.5 Visitor Privacy

- Visitor registration is **optional** — no data is required to use the app
- Photos taken for artwork identification are **not stored** — deleted after matching
- Visitor tracking (which artworks were viewed) is stored but not linked to identity unless the visitor chooses to register

---

## 10. Deployment Design

### 10.1 Production Architecture

```
Internet
    │
    ├──── Visitor/Admin (HTTPS) ──────▶ CloudFront (dw6q73wb38ozb.cloudfront.net)
    │                                         │
    │                                         │ Static files: HTML, JS, CSS
    │                                         │ Origin: S3 bucket (realmeta-museum-web)
    │
    └──── API calls (HTTPS) ──────────▶ CloudFront (d1nclo4efvqhzz.cloudfront.net)
                                              │
                                              │ Origin: EC2 (52.205.164.184:4000)
                                              │ Instance: t3.medium (realmeta-museum-server)
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        ▼                     ▼                       ▼
                  MongoDB Atlas          AWS S3                 External APIs
                  (Database)          (realmeta-museum-prod)   (Claude, ElevenLabs,
                                        (Media files)            OpenAI)
```

### 10.2 Environment Configuration

Two environments are supported:

**Development:**
```
Frontend:  http://localhost:5173   (Vite dev server)
Backend:   http://localhost:4000   (ts-node-dev)
Database:  mongodb://localhost:27017/museum_app   (local MongoDB)
Storage:   Local disk (/uploads)
```

**Production (AWS):**
```
Frontend:  https://dw6q73wb38ozb.cloudfront.net   (CloudFront → S3: realmeta-museum-web)
Backend:   https://d1nclo4efvqhzz.cloudfront.net  (CloudFront → EC2: 52.205.164.184:4000)
Database:  mongodb://museumadmin:...@museum-docdb-cluster.cluster-cx6a4k24g2c6.us-east-1.docdb.amazonaws.com:27017/museum_app   (Amazon DocumentDB 5.0)
Storage:   https://realmeta-museum-prod.s3.us-east-1.amazonaws.com   (AWS S3)
DNS:       Route 53 — realmeta.ca, meta-real.ca
```

The frontend detects environment automatically:
```typescript
// api.ts
const getApiHost = () => {
  if (import.meta.env.DEV) return `http://${window.location.hostname}:4000`;
  return 'https://d1nclo4efvqhzz.cloudfront.net';
};
```

### 10.3 Build & Deployment Process

**Frontend (AWS S3 + CloudFront):**
```
npm run build → upload dist/ to S3 bucket (realmeta-museum-web) → invalidate CloudFront cache
```

**Backend:**
```bash
npm run build        # tsc → compiles TypeScript to dist/
npm start            # node dist/index.js
```

**CLIP Model:**
- First run: model downloads automatically to `server/.cache/` (~350MB)
- Subsequent runs: model loaded from cache in < 100ms

### 10.4 Static File Serving

In development, the backend serves uploaded files directly from `server/uploads/` via Express static middleware:
```
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
```

In production, all media is served directly from AWS S3 URLs, so this middleware is not used for media files.

---

## 11. Design Decisions & Rationale

### 11.1 Why CLIP for Image Matching?

**Alternatives considered:**
- Traditional image hashing (pHash, dHash) — too sensitive to angle/lighting variations
- Feature matching (SIFT, ORB via OpenCV) — complex, requires similar viewpoints
- External visual search API (Google Vision, Azure) — adds per-query cost at scale

**Decision: CLIP local model**  
CLIP generates semantic embeddings that are robust to moderate angle and lighting changes. Running the model locally means zero per-query cost — critical for a visitor-facing product with unpredictable usage spikes. The 350MB model is downloaded once and cached. Trade-off: the base model has moderate accuracy; a larger or fine-tuned model would improve results.

### 11.2 Why MongoDB over a Relational Database?

**Rationale:**
- Artwork documents have a variable structure — the `descriptions` and `audioUrls` maps grow as new languages are added. This maps naturally to a document model.
- The `imageEmbedding` is a 512-element array — MongoDB handles this natively.
- `additionalPhotos`, `videos`, `musicTracks`, `documents` are variable-length arrays embedded in the artwork document — avoids multiple JOIN tables.
- Amazon DocumentDB offers a managed, MongoDB-compatible cloud service within the same AWS VPC as the backend, with encryption at rest and automated backups.

### 11.3 Why AWS S3 for Media Storage?

Initially, media files were stored on the local server disk. This was migrated to S3 because:
- Local disk storage is lost when a server restarts or is replaced
- Local storage doesn't scale horizontally — second server instance wouldn't share files
- S3 provides 99.999999999% durability and can serve files globally
- S3 URLs can be given directly to the browser — the backend is not involved in file serving, reducing load

### 11.4 Why a Two-Step Upload Flow (Upload → Finalize)?

A single-step flow (upload → AI → translate → audio → save) would require the admin to wait 60–120 seconds with no ability to review or correct AI output before audio is generated in multiple languages.

The two-step approach:
1. Upload + AI analysis (~10s) → show results to admin
2. Admin reviews and corrects (0–∞ time)
3. Finalize → translation + audio (~60–120s)

This prevents wasting ElevenLabs credits on AI-misidentified artworks and gives admins control over content quality.

### 11.5 Why On-Demand Translation for Visitor Languages?

Pre-generating all 16 languages at upload time would cost ~16× the translation and TTS time and money per artwork. Most artworks will never be requested in some languages.

On-demand translation generates and caches content the first time a visitor requests it. Subsequent visitors requesting the same language get the cached version instantly from MongoDB/S3.

This approach significantly reduces API costs while maintaining a good visitor experience (first request in a rare language is slower, subsequent requests are instant).

---

## 12. Scalability Considerations

### 12.1 Current Limits

| Component | Current Limit | Bottleneck |
|-----------|--------------|------------|
| CLIP matching | ~10,000 artworks efficiently | All embeddings loaded into memory for comparison |
| DocumentDB (db.t3.medium) | Single instance | Add read replicas for scaling |
| ElevenLabs (free tier) | ~33 artworks/month | Character quota; upgrade for production |
| Concurrency | Single Node.js process | No horizontal scaling currently configured |

### 12.2 Scaling Strategy

**Short-term (100–1,000 artworks, 1–10 museums):**
- Current architecture handles this well
- DocumentDB db.t3.medium sufficient
- Upgrade ElevenLabs to Starter plan

**Medium-term (1,000–10,000 artworks, 10–100 museums):**
- Upgrade DocumentDB to larger instance class (db.r5.large) or add read replicas
- Consider Redis caching for frequently accessed artworks
- Upgrade CLIP to larger model on GPU-enabled instance
- CloudFront CDN is already in place for both frontend and backend; add custom domain via Route 53

**Long-term (>10,000 artworks, 100+ museums):**
- Migrate CLIP similarity search to a vector database (Pinecone, Weaviate, or pgvector)
- Horizontally scale the Node.js API behind a load balancer
- Implement message queue (Bull/RabbitMQ) for async artwork processing jobs
- Add Redis for JWT token allowlist and API rate limiting

### 12.3 Stateless API Design

The API was designed to be stateless — no in-memory session state is stored between requests. All state lives in MongoDB. This means horizontal scaling (running multiple backend instances behind a load balancer) requires only:
1. A shared DocumentDB connection string
2. A shared S3 bucket
3. Consistent `JWT_SECRET` across instances

The CLIP model singleton is the only instance-local state; in a horizontally scaled setup, each instance would maintain its own cached model (this is acceptable since the model is read-only).

---

*Document prepared by Nitish Sahni, Acadia University, February 2026.*  
*Project developed in partnership with RealMeta.*
