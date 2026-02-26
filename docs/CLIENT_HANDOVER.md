# RealMeta Museum AI — Client Handover Document

**Project:** RealMeta Museum AI  
**Prepared For:** RealMeta (Client)  
**Prepared By:** Nitish Sahni  
**Date:** February 2026  
**Version:** 1.0

---

## Table of Contents

1. [What Was Delivered](#1-what-was-delivered)
2. [Live URLs & Access](#2-live-urls--access)
3. [How to Use the Admin Portal](#3-how-to-use-the-admin-portal)
4. [How Visitors Use the App](#4-how-visitors-use-the-app)
5. [Infrastructure Overview](#5-infrastructure-overview)
6. [API Keys & Credentials](#6-api-keys--credentials)
7. [Ongoing Costs](#7-ongoing-costs)
8. [How to Add a New Museum](#8-how-to-add-a-new-museum)
9. [Maintenance Guide](#9-maintenance-guide)
10. [Known Limitations](#10-known-limitations)
11. [What's Not Finished](#11-whats-not-finished)
12. [Support & Contact](#12-support--contact)

---

## 1. What Was Delivered

### Summary

A fully functional, AI-powered web application for museums that includes:

| Component | Description |
|-----------|-------------|
| **Admin Portal** | A web dashboard for museum staff to manage their artwork collection |
| **Visitor Experience** | A mobile-friendly web app visitors access by scanning a QR code — no app download needed |
| **AI Artwork Recognition** | Visitors photograph an artwork and the system identifies it automatically |
| **Multi-Language Support** | 16 languages with auto-generated descriptions and audio guides |
| **Audio Guides** | AI-narrated audio descriptions per artwork in multiple languages |
| **Media Attachments** | Each artwork can have extra photos, videos, music tracks, and PDFs |
| **QR Code System** | Each museum gets a unique QR code to give visitors access |
| **Cloud Storage** | All images, audio, and media stored on AWS S3 |

### What's Included

- ✅ Full source code (frontend + backend)
- ✅ Production deployment on AWS (EC2 backend + S3/CloudFront frontend)
- ✅ MongoDB Atlas database (live)
- ✅ AWS S3 bucket with all media files (`realmeta-museum-prod`)
- ✅ AWS S3 bucket for frontend hosting (`realmeta-museum-web`) with CloudFront CDN
- ✅ Admin and visitor documentation
- ✅ This handover document

---

## 2. Live URLs & Access

| What | URL |
|------|-----|
| **Admin Dashboard** | `https://dw6q73wb38ozb.cloudfront.net/admin` |
| **Admin Login** | `https://dw6q73wb38ozb.cloudfront.net/admin/login` |
| **Visitor Experience** | `https://dw6q73wb38ozb.cloudfront.net/visit/:qrCode` |
| **Backend API** | `https://d1nclo4efvqhzz.cloudfront.net` |

> **Note:** Replace `:qrCode` in the visitor URL with the museum's unique QR code identifier. This is shown in the Admin → QR Codes page.

### Admin Account Setup

If you do not already have an admin account:

1. Go to: `https://dw6q73wb38ozb.cloudfront.net/admin/register`
2. Fill in:
   - Your name
   - Email address
   - Password (keep this secure)
   - Museum name (e.g., "The Wolfville Museum")
   - Museum location (e.g., "Wolfville, Nova Scotia")
   - Museum description (optional)
3. Click **Register**
4. You'll be automatically logged in and taken to your dashboard

> ⚠️ **Important:** Each registration creates a new museum. Only register once per museum location.

---

## 3. How to Use the Admin Portal

### 3.1 Dashboard

After logging in, the dashboard shows:
- Total artwork count in your collection
- Recent artworks (latest 4 uploads)
- Quick links to Upload and QR Codes

### 3.2 Uploading an Artwork

This is the core workflow. It takes approximately **60–120 seconds** per artwork due to AI processing.

**Step 1 — Upload the image**
1. Click **Upload Artwork** from the dashboard or sidebar
2. Drag and drop an image, or click to browse
3. Supported formats: JPG, PNG, WebP
4. Recommended: clear, well-lit, full-artwork photo

**Step 2 — AI Analysis**
- The system automatically:
  - Identifies the artwork using Claude AI (title, artist, year, style, description)
  - Fetches additional context from Wikipedia
  - Generates a confidence score

**Step 3 — Review & Edit**
- Check the AI-generated information
- Click **Edit** to correct any mistakes (title, artist, year, style, description)
- You can also add external resource links (e.g., Google Drive, high-res image)

**Step 4 — Add Extra Media (Optional)**
- In the edit panel, expand **Additional Media**
- Add extra photos (up to 10)
- Add video links (YouTube/Vimeo) or upload video files
- Upload background music tracks
- Upload PDF documents (e.g., catalogue entries, exhibition notes)

**Step 5 — Save to Collection**
- Click **Save to Collection**
- The system generates descriptions in multiple languages and creates audio guides
- This takes 60–120 seconds — do not close the tab

✅ The artwork is now live and searchable by visitors.

### 3.3 Managing Your Collection

- Go to **Collection** in the sidebar
- Browse all uploaded artworks
- Click any artwork to view full details
- Delete artworks using the trash icon

### 3.4 QR Codes

- Go to **QR Codes** in the sidebar
- Download your museum's QR code as PNG or SVG
- Print and display at your museum entrance or exhibit entrance
- Test by scanning with your phone — it should open the visitor page

**Recommended QR code placement:**
- Museum entrance (for general access)
- Near the exhibit entrance (alongside individual artworks if preferred)
- On printed materials, maps, or flyers

---

## 4. How Visitors Use the App

Visitors do not need to create an account or download anything.

### Step 1 — Scan QR Code
- Visitor scans the QR code with their phone camera
- A link appears — they tap it and the app opens in the browser

### Step 2 — Optional Registration
- A simple form asks for name, email, and phone (all optional)
- Visitors can tap **Skip for now** — this does not affect functionality
- This is for analytics and future visitor engagement

### Step 3 — Choose Language
- Visitors select from 16 languages:
  English, Spanish, French, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, Hindi, Arabic, Russian, Turkish, Polish, Swedish

### Step 4 — Scan an Artwork
- Tap **Scan Artwork**
- Grant camera permission when prompted
- Point the phone at any artwork in the museum
- Tap the scan button
- The app identifies the artwork in ~3 seconds

### Step 5 — View Information
- See title, artist, year, and style
- Read the description in their language
- Tap the play button to hear the audio guide narration
- View extra photos, videos, music, and documents if attached

### Step 6 — Browse or Scan Again
- Tap **Browse Collection** to see all artworks
- Or tap **Scan Another Artwork** to continue the visit

---

## 5. Infrastructure Overview

All system components are cloud-hosted. Here is what is running and where:

| Component | Provider | Details |
|-----------|----------|---------|
| **Frontend (Website)** | AWS S3 + CloudFront | React app in S3 bucket `realmeta-museum-web`, served via CloudFront CDN (`dw6q73wb38ozb.cloudfront.net`) |
| **Backend API** | AWS EC2 | Node.js server on `t3.medium` instance (`i-01689e896a88dad54`), IP: `52.205.164.184`, Port: 4000, fronted by CloudFront (`d1nclo4efvqhzz.cloudfront.net`) |
| **Database** | Amazon DocumentDB 5.0 | Cluster: `museum-docdb-cluster`, Instance: `db.t3.medium`, MongoDB-compatible, encrypted at rest |
| **Media Storage** | AWS S3 | Bucket: `realmeta-museum-prod`, Region: `us-east-1` |
| **DNS** | AWS Route 53 | Hosted zones: `realmeta.ca`, `meta-real.ca` |

### AWS S3 Bucket Structure

All media files are stored in S3 with the following folder structure:

```
realmeta-museum-prod/
└── museums/
    └── {museumId}/
        └── artworks/
            └── {artworkId}/
                ├── main_*.jpg          ← Primary artwork image
                ├── audio/
                │   ├── *_en.mp3        ← English audio guide
                │   ├── *_fr.mp3        ← French audio guide
                │   └── ...
                ├── photos/             ← Additional photos
                ├── videos/             ← Uploaded video files
                ├── music/              ← Music/audio tracks
                └── documents/          ← PDF files
```

---

## 6. API Keys & Credentials

The system requires several third-party API keys to function. These are stored in the backend server's environment variables (`.env` file).

> ⚠️ **Security Note:** Never share these keys publicly or commit them to version control. Treat them like passwords.

### Required Keys

| Service | Environment Variable | Purpose | Where to Get It |
|---------|---------------------|---------|-----------------|
| Amazon DocumentDB | `MONGODB_URI` | Database connection | AWS Console → DocumentDB |
| Anthropic | `ANTHROPIC_API_KEY` | AI artwork analysis (primary) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `OPENAI_API_KEY` | AI fallback + translations | [platform.openai.com](https://platform.openai.com) |
| ElevenLabs | `ELEVENLABS_API_KEY` | Audio guide generation | [elevenlabs.io](https://elevenlabs.io) |
| AWS | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | S3 file storage | [aws.amazon.com/iam](https://aws.amazon.com/iam) |
| JWT | `JWT_SECRET` | Admin authentication | Any strong random string |

### Rotating Keys

If any API key needs to be rotated (expired, compromised, or plan change):

1. Generate a new key from the provider's dashboard
2. Update the environment variable on the EC2 instance (`server/.env`)
3. Restart the backend server
4. The new key takes effect immediately — no code changes needed

---

## 7. Ongoing Costs

The following services incur recurring costs. All estimates are approximate and depend on usage.

### Monthly Cost Estimates (Baseline — Small Museum)

| Service | Plan/Tier | Estimated Monthly Cost (USD) |
|---------|-----------|-------------------------------|
| **Amazon DocumentDB** | `db.t3.medium` single instance, encrypted | **~$68** |
| **AWS S3** | ~$0.023/GB storage + $0.0004/1k requests | **$2–10** (grows with media) |
| **Anthropic Claude** | Pay-per-use: ~$0.003 per artwork analyzed | **$1–5** (upload phase only) |
| **OpenAI** | Pay-per-use: ~$0.002 per translation call | **$1–3** (upload phase only) |
| **ElevenLabs** | Free tier: 10,000 characters/month. Paid: $5/mo (30k chars) | **$0–5** |
| **AWS EC2 (backend)** | `t3.medium` on-demand (~$0.0416/hr) | **~$30** |
| **AWS CloudFront (CDN)** | Free tier covers 1TB/month | **$0–5** |
| **AWS S3 (frontend hosting)** | Minimal storage | **<$1** |
| **TOTAL ESTIMATE** | | **~$100–120/month** |

### Cost Scaling Notes

- **Upload costs (Anthropic, OpenAI, ElevenLabs)** are one-time per artwork. Once an artwork is analyzed and saved, there are no recurring AI costs for it.
- **AWS S3 storage** grows as you upload more artwork images and audio files. A typical artwork with images + 3 audio files uses ~5–15MB.
- **Visitor scan costs** are minimal — CLIP matching is local computation with no external API calls per scan.
- DocumentDB storage scales automatically and is billed at ~$0.10/GB/month.

---

## 8. How to Add a New Museum

The system currently supports one museum per admin account. To add a second museum location:

### Option A — Register a New Admin Account
1. Go to `/admin/register`
2. Register with a different email address
3. Set the museum name to the new location
4. This creates a completely separate, isolated museum

### Option B — Contact Developer
Request a multi-museum admin feature to be built. This would allow a single admin account to manage multiple museum locations from one dashboard. See [Section 11](#11-whats-not-finished) for roadmap details.

---

## 9. Maintenance Guide

### 9.1 Day-to-Day Operations

| Task | How |
|------|-----|
| Add a new artwork | Admin Portal → Upload Artwork |
| Edit existing artwork | Admin Portal → Collection → click artwork → Edit |
| Delete an artwork | Admin Portal → Collection → click artwork → Delete |
| Download QR code | Admin Portal → QR Codes → Download PNG |
| Check artwork count | Admin Portal → Dashboard |

### 9.2 Restarting the Backend Server

If the backend becomes unresponsive:

**Via AWS Console:**
1. Log into [aws.amazon.com](https://aws.amazon.com) (Account: `994356140688`)
2. Go to EC2 → Instances
3. Select `realmeta-museum-server` (`i-01689e896a88dad54`)
4. Click **Instance State** → **Reboot instance**

**Via SSH:**
```bash
ssh -i realmeta-museum-key-v2.pem ubuntu@52.205.164.184
cd ~/realmeta-museum/server
pm2 restart all
```

### 9.3 Checking the Database (Amazon DocumentDB)

1. Log into [aws.amazon.com](https://aws.amazon.com) (Account: `994356140688`)
2. Go to **Amazon DocumentDB** → Clusters → `museum-docdb-cluster`
3. To browse data, connect via `mongosh` from the EC2 instance:
   ```bash
   ssh -i realmeta-museum-key-v2.pem ubuntu@52.205.164.184
   mongosh --tls --tlsCAFile global-bundle.pem \
     --host museum-docdb-cluster.cluster-cx6a4k24g2c6.us-east-1.docdb.amazonaws.com:27017 \
     --username museumadmin --password '<PASSWORD>'
   ```
4. Collections: `museums`, `artworks`, `admins`, `visitors`

To check for issues:
- `artworks` — should have `imageEmbedding` array (512 numbers) for each artwork
- `artworks` — `audioUrls.en` should be populated with an S3 URL after finalization

### 9.4 Checking Amazon DocumentDB Status

1. Log into AWS Console → **Amazon DocumentDB** → Clusters
2. Cluster `museum-docdb-cluster` should show status **Available**
3. Instance `museum-docdb-instance-1` should show status **Available**
4. If the instance is stopped, select it and click **Actions** → **Start**

### 9.5 Checking AWS S3

1. Log into [aws.amazon.com](https://aws.amazon.com)
2. Open S3 → Bucket: `realmeta-museum-prod`
3. Browse `museums/` folder to see all uploaded media
4. If a file is missing, re-upload the artwork from the admin portal

### 9.5 What to Do If AI Analysis Fails

If the AI fails to analyze an uploaded artwork:
- The upload will still succeed but with placeholder metadata ("Untitled", "Unknown Artist")
- You can manually edit all fields in the review step before saving
- Common cause: Anthropic API key quota exceeded — check [console.anthropic.com/usage](https://console.anthropic.com/usage)

### 9.6 Updating Dependencies

To update the system when security patches are available:

```bash
# Backend
cd server
npm audit fix
npm install

# Frontend
cd web
npm audit fix
npm install
npm run build
```

Then redeploy:
- **Frontend:** Build with `npm run build` in `web/`, then upload `dist/` contents to S3 bucket `realmeta-museum-web` and invalidate CloudFront cache
- **Backend:** SSH into EC2 instance (`ssh -i realmeta-museum-key-v2.pem ubuntu@52.205.164.184`), update code in `~/realmeta-museum/server`, run `npx tsc` to build, then `pm2 restart all`

---

## 10. Known Limitations

Please be aware of the following limitations in the current system:

### Artwork Recognition Accuracy

The AI matching uses a general-purpose CLIP model (`clip-vit-base-patch32`). It works well for clear, frontal photos but may struggle with:
- Photos taken at steep angles
- Artworks with heavy glare or reflections
- Very small artworks photographed from a distance
- Two artworks that look visually similar

**Recommendation:** Ensure artwork images uploaded by admins are high-quality, well-lit, and taken straight-on. Visitors should be advised to photograph artworks in good lighting.

To improve accuracy in the future, the model can be upgraded to a larger version (`clip-vit-large-patch14`) on a more powerful server.

### ElevenLabs Audio (Free Tier)

The free ElevenLabs tier allows 10,000 characters per month. A typical artwork description is ~300 characters. This allows ~33 artworks per month on the free tier before audio generation stops working.

**If audio stops generating:** Check [elevenlabs.io](https://elevenlabs.io) usage. Upgrade to the Starter plan ($5/month) for 30,000 characters.

### Analytics Not Visualized

Visitor data is being collected (who visits, which artworks they view, what languages they use) but the admin analytics dashboard currently shows "Coming Soon." A developer would need to build the charts and graphs.

### No Automated Backups

MongoDB Atlas free tier does not include automated backups. Important data should be manually exported periodically via the Atlas console (Tools → Export Data).

---

## 11. What's Not Finished

The following features were scoped but not completed within the project timeline. They are available for future development:

| Feature | Effort Required | Description |
|---------|----------------|-------------|
| **Analytics Dashboard** | Medium (2–3 weeks) | Charts showing visitor counts, popular artworks, language usage |
| **Admin Settings Page** | Small (1 week) | Change password, update museum profile, upload museum logo |
| **Multi-Museum Admin** | Large (1 month) | One admin account managing multiple museum locations |
| **Automated Tests** | Large (1 month) | Unit and integration tests for reliability |
| **Batch Artwork Import** | Medium (2–3 weeks) | Upload many artworks at once via CSV/spreadsheet |
| **Offline Browsing** | Large (2 months) | Visitors can browse collection without internet |
| **Social Sharing** | Small (1 week) | Visitors can share artwork discoveries to social media |
| **Visitor Favourites** | Medium (2 weeks) | Visitors can save and revisit favourite artworks |
| **Larger AI Model** | Medium (2 weeks) | Upgrade CLIP model for better scan accuracy |

---

## 12. Support & Contact

### Developer Contact

For technical questions, bugs, or requests for additional development:

**Nitish Sahni**  
Computer Science, Acadia University  
Wolfville, Nova Scotia  
📱 WhatsApp: +1 (782) 882-3291

### Self-Service Resources

| Resource | Location |
|----------|----------|
| Admin Guide | `docs/ADMIN_GUIDE.md` |
| Visitor Guide | `docs/VISITOR_GUIDE.md` |
| API Reference | `docs/API_ENDPOINTS.md` |
| Technical Docs | `docs/TECHNICAL_DOCUMENTATION.md` |
| Project Source Code | Repository (provided separately) |

### Before Contacting Support

Please check these first:

1. **Admin can't log in** → Reset password via `/admin/login` or check the email used at registration
2. **AI not analyzing uploads** → Check Anthropic API key quota at [console.anthropic.com](https://console.anthropic.com)
3. **Audio guides not generating** → Check ElevenLabs quota at [elevenlabs.io](https://elevenlabs.io)
4. **Images not loading** → Check AWS S3 bucket permissions at [aws.amazon.com](https://aws.amazon.com)
5. **Visitor page not loading** → Check EC2 instance status in AWS Console and MongoDB Atlas status

---

*Document prepared by Nitish Sahni, February 2026.*  
*RealMeta Museum AI — Acadia University Capstone Project.*
