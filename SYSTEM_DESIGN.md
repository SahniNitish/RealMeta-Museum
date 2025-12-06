# Museum AI - System Design Document

## Project Overview

**Museum AI** is a multi-language artwork recognition system that enables museums to digitize their collections and provide visitors with instant, AI-powered information about artworks through their smartphones.

### Core Problem Statement

Museums face several challenges:
- Language barriers limit accessibility for international visitors
- Traditional audio guides are expensive and language-limited
- Manual artwork information lookup is time-consuming
- Static plaques provide limited information
- Tracking visitor engagement is difficult

### Solution

A smartphone-based system where:
1. **Museums** upload artwork images to build their digital collection
2. **Visitors** scan a QR code at museum entrance
3. **Visitors** photograph any artwork with their phone camera
4. **System** instantly identifies the artwork using AI image matching
5. **System** delivers detailed information in visitor's preferred language
6. **System** provides audio narration in multiple languages

---

## System Goals

### Primary Goals
1. **Instant Artwork Recognition**: Match visitor photos to museum database in <3 seconds
2. **Multi-language Support**: Provide information in 10+ languages
3. **Offline-capable Identification**: Use CLIP embeddings for fast local matching
4. **Scalability**: Support multiple museums with isolated collections
5. **Accessibility**: Work on any smartphone with camera and web browser

### Secondary Goals
- Auto-generate artwork descriptions using AI vision
- Create audio guides automatically via text-to-speech
- Provide external learning resources (Wikipedia, etc.)
- Track museum analytics (popular artworks, visitor patterns)
- Support various artwork types (paintings, sculptures, installations)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Admin Portal   │────────▶│  Backend Server  │────────▶│   AI Services   │
│  (Web App)      │         │  (Node.js/TS)    │         │  - Claude       │
│                 │         │                  │         │  - CLIP         │
└─────────────────┘         └──────────────────┘         │  - ElevenLabs   │
                                     │                    │  - Google Trans │
                                     │                    └─────────────────┘
                                     │
                            ┌────────▼────────┐
                            │                 │
                            │    MongoDB      │
                            │   (Database)    │
                            │                 │
                            └─────────────────┘
                                     │
                                     │
┌─────────────────┐         ┌────────▼────────┐
│                 │         │                 │
│ Visitor Portal  │────────▶│  Backend API    │
│  (Mobile Web)   │         │  /api/visit/*   │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
```

### Data Flow

#### Admin Upload Flow
```
1. Admin selects museum and uploads artwork image
2. Backend saves image file to disk
3. CLIP service generates 512-dim embedding vector
4. Claude Vision AI analyzes image → title, artist, year, style, description
5. Wikipedia API fetches additional context
6. Google Translate creates 10 language versions
7. ElevenLabs generates audio narration for each language
8. Artwork document saved to MongoDB with all metadata
```

#### Visitor Identification Flow
```
1. Visitor scans museum QR code → lands on museum page
2. Visitor selects preferred language
3. Visitor grants camera permission and photographs artwork
4. Photo sent to backend with museum ID and language
5. CLIP generates embedding for visitor photo
6. Cosine similarity comparison against museum's artworks
7. Top 3 matches returned with confidence scores
8. If confident match (>85%), show full artwork details
9. If uncertain (<85%), show alternatives for user selection
10. Display: title, artist, year, description, audio guide, sources
```

---

## Technology Stack

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Styling**: CSS3 (custom, no framework)

### Backend (Node.js + TypeScript)
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Language**: TypeScript
- **File Upload**: Multer
- **Process Manager**: ts-node-dev (development)

### Database
- **Type**: MongoDB (NoSQL document database)
- **ODM**: Mongoose
- **Structure**: Two main collections (Museums, Artworks)

### AI Services

| Service | Purpose | Model/API |
|---------|---------|-----------|
| **Claude (Anthropic)** | Artwork vision analysis | claude-3-opus-20240229 |
| **CLIP** | Image embedding & matching | clip-vit-base-patch32 |
| **Google Translate** | Multi-language translation | Google Translate API |
| **ElevenLabs** | Text-to-speech audio | ElevenLabs TTS API |
| **Wikipedia** | External knowledge retrieval | MediaWiki API |

---

## Data Models

### Museum Collection

```typescript
interface Museum {
  _id: ObjectId
  name: string                    // "Louvre Museum"
  location: string                // "Paris, France"
  qrCode: string                  // Unique slug: "louvre-museum-paris-1234"
  website?: string                // "https://louvre.fr"
  description?: string            // About the museum
  createdAt: Date
  updatedAt: Date
}
```

### Artwork Collection

```typescript
interface Artwork {
  _id: ObjectId
  museumId: ObjectId              // Reference to Museum

  // Core Metadata
  title: string                   // "Mona Lisa"
  author: string                  // "Leonardo da Vinci"
  year: string                    // "1503-1519"
  style: string                   // "Renaissance"

  // Media
  imageUrl: string                // "/uploads/123456_monalisa.jpg"
  imageEmbedding: number[]        // [0.123, -0.456, ...] 512 dimensions

  // Multi-language Content
  descriptions: {
    en?: string                   // English description
    fr?: string                   // French
    es?: string                   // Spanish
    de?: string                   // German
    zh?: string                   // Chinese
    ja?: string                   // Japanese
    it?: string                   // Italian
    pt?: string                   // Portuguese
    ru?: string                   // Russian
    ar?: string                   // Arabic
  }

  // Multi-language Audio
  audioUrls: {
    en?: string                   // "/audio/123_en.mp3"
    fr?: string
    es?: string
    // ... same language codes
  }

  // External Resources
  sources: Array<{
    provider: string              // "Wikipedia", "Britannica"
    url: string
  }>

  createdAt: Date
  updatedAt: Date
}
```

---

## API Endpoints

### Admin Endpoints

#### Museum Management
```
POST   /api/museums              Create new museum
GET    /api/museums              List all museums
GET    /api/museums/:id          Get museum details
PUT    /api/museums/:id          Update museum
DELETE /api/museums/:id          Delete museum
GET    /api/museums/:id/qr       Generate QR code image
GET    /api/museums/:id/artworks Get all artworks for museum
```

#### Artwork Management
```
POST   /api/admin/upload         Upload artwork image
POST   /api/admin/finalize       Finalize artwork with edited metadata
GET    /api/admin/artworks       List all artworks (admin view)
DELETE /api/admin/artworks/:id   Delete artwork
```

### Visitor Endpoints

```
GET    /api/visit/:qrCode                    Museum landing page
GET    /api/visit/:qrCode/artworks           Browse museum collection
POST   /api/visit/:qrCode/identify           Identify artwork from photo
```

---

## Key Features

### 1. CLIP-Based Image Matching

**Why CLIP?**
- Fast: Local computation, no external API calls
- Accurate: State-of-art image similarity for artwork
- Scalable: Pre-computed embeddings enable O(n) lookup
- Offline-capable: Embeddings stored in database

**How It Works:**
```
1. Admin uploads artwork
   → CLIP generates 512-dim vector
   → Stored in artwork.imageEmbedding

2. Visitor takes photo
   → CLIP generates 512-dim vector for photo
   → Compare against all museum artworks using cosine similarity
   → Return top 3 matches with confidence scores

3. Cosine Similarity Formula:
   similarity = (A · B) / (||A|| × ||B||)
   - Result: 0.0 (completely different) to 1.0 (identical)
   - Threshold: >0.85 = confident match
```

### 2. Multi-Museum Isolation

**Problem**: Multiple museums shouldn't see each other's artworks

**Solution**:
- Each museum has unique QR code
- QR code encodes museum identifier
- Visitor photo matching scoped to museum
- Query: `Artwork.find({ museumId: museum._id })`

**QR Code Format:**
```
URL: https://museum-ai.com/visit/louvre-paris-1234
                                      └─────┬─────┘
                                      Museum QR Code
```

### 3. Language Processing Pipeline

**Goal**: Support 10 languages without manual translation

**Process:**
```
1. Claude analyzes artwork → English description
2. Google Translate API:
   - Input: English text
   - Output: 9 additional languages
   - Parallel requests for speed
3. Store all translations in descriptions object
4. ElevenLabs TTS:
   - Input: Translated text
   - Output: MP3 audio file
   - 10 audio files per artwork
5. Visitor selects language → get description + audio
```

**Supported Languages:**
- English (en), French (fr), Spanish (es), German (de)
- Chinese (zh), Japanese (ja), Italian (it), Portuguese (pt)
- Russian (ru), Arabic (ar)

### 4. AI Vision Analysis

**Service**: Anthropic Claude (claude-3-opus-20240229)

**Prompt Engineering:**
```
You are a museum expert and art historian.
Analyze this image and identify:

For ARTWORKS:
- Title (specific artwork name)
- Artist (full name)
- Year (creation date or period)
- Style (art movement/period)
- Description (2-3 sentences with visual and historical context)

For OTHER OBJECTS:
- Identify type (car, building, sculpture, etc.)
- Key features and characteristics
- Historical/cultural context

Return JSON format with confidence score.
```

**Confidence Levels:**
- 0.9-1.0: Famous artwork, high certainty
- 0.7-0.89: Recognizable style/period, medium certainty
- 0.5-0.69: Generic description, low certainty
- <0.5: Unable to identify

### 5. Audio Guide Generation

**Service**: ElevenLabs Text-to-Speech

**Features:**
- Natural-sounding voices
- Multi-language support
- Optimized for mobile streaming
- Auto-generated from text descriptions

**Format:**
- Output: MP3 format
- Bitrate: 64kbps (optimized for mobile)
- Storage: `/audio/[artworkId]_[language].mp3`

---

## User Flows

### Admin Flow: Upload Artwork

```
1. Admin logs into Admin Dashboard
2. Admin clicks "Museums" → Create/Select Museum
3. Admin navigates to "Upload Art"
4. Admin selects museum from dropdown
5. Admin uploads artwork image file
6. System processes:
   ├─ Generate CLIP embedding (5-10s first time, <1s cached)
   ├─ Analyze with Claude Vision (3-5s)
   ├─ Fetch Wikipedia data (2-3s)
   ├─ Translate to 10 languages (5-8s parallel)
   └─ Generate 10 audio files (20-30s parallel)
7. Admin reviews auto-generated metadata
8. Admin can edit: title, author, year, style, descriptions
9. Admin clicks "Finalize"
10. Artwork saved to museum collection
```

**Total Time**: ~30-50 seconds per artwork

### Visitor Flow: Identify Artwork

```
1. Visitor arrives at museum
2. Visitor scans QR code (poster/flyer/entrance)
3. Browser opens: /visit/[museum-qr-code]
4. Display: Museum name, location, artwork count
5. Visitor selects language from 10 options
6. Visitor clicks "Scan Artwork"
7. Browser requests camera permission
8. Camera view opens (environment-facing)
9. Visitor positions artwork in frame
10. Visitor taps "Capture" button
11. System processes:
    ├─ Upload photo to backend
    ├─ Generate CLIP embedding (<1s)
    ├─ Compare with museum artworks (<1s)
    └─ Return top 3 matches
12. If confident match (>85%):
    ├─ Show: Title, Artist, Year, Style
    ├─ Show: Description in selected language
    ├─ Show: Audio player with narration
    └─ Show: External sources (Wikipedia, etc.)
13. If uncertain match (<85%):
    ├─ Show: "Possible Matches" heading
    ├─ Display: Top 3 artworks with thumbnails
    └─ User selects correct match
14. Visitor can:
    ├─ Play audio guide
    ├─ Read full description
    ├─ Browse other artworks
    └─ Scan another artwork
```

**Total Time**: ~3-5 seconds from capture to results

### Visitor Flow: Browse Collection

```
1. From museum landing page
2. Visitor clicks "Browse Collection"
3. Display: Grid of all museum artworks
4. Visitor can:
   ├─ Switch language (updates descriptions)
   ├─ Click artwork thumbnail
   └─ View full details in modal
5. Modal shows same info as identification
```

---

## Performance Considerations

### Image Matching Speed
- **CLIP Model Loading**: 5-10s (first request only)
- **Embedding Generation**: <1s per image
- **Similarity Comparison**: O(n) where n = artworks in museum
- **Typical Museum Size**: 50-500 artworks
- **Query Time**: <1s for 500 artworks

### Scalability
- **Concurrent Users**: Stateless API, horizontally scalable
- **Database**: MongoDB indexed on museumId and qrCode
- **File Storage**: Local disk (consider S3/CDN for production)
- **API Rate Limits**:
  - Claude: Depends on API tier
  - ElevenLabs: 10,000 characters free tier
  - Google Translate: Pay per character

### Optimization Strategies
1. **CLIP Model Caching**: Singleton pattern, load once
2. **Database Indexes**: qrCode, museumId, imageEmbedding
3. **Parallel Processing**: Translations and audio generation
4. **Image Compression**: Resize large uploads
5. **CDN Caching**: Static assets (images, audio)

---

## Security Considerations

### Authentication
- **Current**: No authentication (MVP)
- **Production**:
  - JWT-based auth for admin
  - Museum-specific admin roles
  - API key for visitor endpoints (optional)

### Data Privacy
- **Visitor Photos**: Not stored permanently (temp file deleted after match)
- **Museum Data**: Scoped by museumId
- **API Keys**: Stored in .env, not in code

### Input Validation
- **File Upload**: Type validation (images only)
- **Museum ID**: MongoDB ObjectId validation
- **QR Code**: Lowercase alphanumeric + hyphens only

---

## Deployment Architecture

### Development
```
Frontend: Vite dev server (port 5173)
Backend: ts-node-dev (port 4000)
Database: Local MongoDB (port 27017)
```

### Production (Recommended)

```
┌─────────────────────────────────────────────┐
│         Load Balancer / CDN (Cloudflare)    │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐   ┌──────▼──────┐
│   Frontend     │   │   Backend   │
│   (Vercel/     │   │   (Railway/ │
│    Netlify)    │   │    Render)  │
└────────────────┘   └──────┬──────┘
                             │
                     ┌───────▼────────┐
                     │   MongoDB      │
                     │   (Atlas)      │
                     └────────────────┘
                             │
                     ┌───────▼────────┐
                     │  File Storage  │
                     │  (S3/R2)       │
                     └────────────────┘
```

### Environment Variables

**Backend (.env):**
```bash
# Server
PORT=4000
BASE_URL=https://museum-ai.com

# Database
MONGODB_URI=mongodb://localhost:27017/museum_app

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...           # Optional
HUGGINGFACE_API_KEY=hf_...           # Fallback
ELEVENLABS_API_KEY=sk_...

# Feature Flags
USE_GOOGLE_VISION=false
USE_TENSORFLOW=false
```

---

## Future Enhancements

### Phase 2 Features
1. **User Accounts**: Visitor history, favorites, notes
2. **Museum Analytics**: Popular artworks, visit patterns
3. **Social Features**: Share artwork on social media
4. **AR Mode**: Overlay information on live camera feed
5. **Offline Mode**: Download museum collection for offline use
6. **Gamification**: Artwork collection challenges, badges
7. **Advanced Search**: Filter by style, period, artist
8. **3D Artworks**: Support for sculptures (multi-angle photos)

### Phase 3 Features
1. **Mobile Native Apps**: iOS/Android
2. **Indoor Navigation**: Guide visitors to artworks
3. **Multi-Media Content**: Videos, 3D models
4. **Expert Commentary**: Curator-recorded audio
5. **Accessibility**: Screen reader, high contrast mode
6. **Exhibition Management**: Temporary vs permanent collections
7. **Ticketing Integration**: Link with museum ticketing systems

---

## Success Metrics

### Technical Metrics
- **Artwork Recognition Accuracy**: >90% top-3 match rate
- **Response Time**: <3 seconds end-to-end
- **Uptime**: 99.5% availability
- **API Error Rate**: <1%

### Business Metrics
- **Museums Onboarded**: Target 10 museums (6 months)
- **Artworks Uploaded**: Target 1,000+ artworks
- **Visitor Scans**: Target 10,000 scans/month
- **Language Distribution**: Track most used languages
- **User Satisfaction**: >4.5/5 rating

---

## Limitations & Constraints

### Current Limitations
1. **Photo Quality**: Requires clear, well-lit photos
2. **Similarity Threshold**: May struggle with very similar artworks
3. **Language Quality**: Auto-translation may lack nuance
4. **Audio Voices**: TTS less natural than human narration
5. **API Costs**: Claude + ElevenLabs can be expensive at scale

### Technical Constraints
1. **CLIP Model Size**: ~350MB (slow first download)
2. **Browser Compatibility**: Requires modern browser with camera API
3. **Network Dependency**: Requires internet connection
4. **Storage**: 10 audio files per artwork = storage costs
5. **Rate Limits**: API quotas limit concurrent uploads

---

## Conclusion

Museum AI is a comprehensive solution for digitizing museum collections and enhancing visitor experiences through AI-powered artwork recognition, multi-language support, and automated content generation. The system leverages cutting-edge AI technologies (Claude, CLIP) to provide instant, accurate artwork identification while maintaining scalability and performance for multiple museums.

**Key Differentiators:**
- CLIP-based matching (fast, accurate, offline-capable)
- 10-language support (auto-translated)
- Audio guides (auto-generated)
- Multi-museum support (isolated collections)
- Mobile-first design (no app installation required)

**Target Users:**
- Museums wanting to digitize collections
- International tourists needing language support
- Educational institutions for interactive learning
- Cultural heritage organizations

---

## Appendix

### Glossary
- **CLIP**: Contrastive Language-Image Pre-training (OpenAI model)
- **Embedding**: Vector representation of image/text
- **Cosine Similarity**: Measure of vector similarity (-1 to 1)
- **QR Code**: Quick Response code for mobile scanning
- **TTS**: Text-to-Speech synthesis
- **ODM**: Object Document Mapper (like ORM for NoSQL)

### References
- CLIP Paper: https://arxiv.org/abs/2103.00020
- Claude API: https://docs.anthropic.com
- ElevenLabs: https://docs.elevenlabs.io
- MongoDB: https://docs.mongodb.com

### Contact
- Project: Museum AI
- Repository: [Your Git Repository]
- Documentation: This file
