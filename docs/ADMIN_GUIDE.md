# Museum AI - Admin Guide

## Overview

As an Admin, you manage museums and their artwork collections. The system uses AI to automatically identify artworks, generate descriptions, translate content, and create audio guides.

---

## Getting Started

### Access the Admin Dashboard

1. Navigate to `http://localhost:4173/admin`
2. You'll see the Upload Art interface

### Access Museum Management

1. Navigate to `http://localhost:4173/admin/museums`
2. Here you can create, edit, and delete museums

---

## Managing Museums

### Create a New Museum

1. Go to **Museums** page (`/admin/museums`)
2. Fill in:
   - **Name**: Museum name (e.g., "Louvre Museum")
   - **Location**: City, Country (e.g., "Paris, France")
   - **Website**: Optional museum website URL
   - **Description**: Brief description of the museum
3. Click **Create Museum**
4. System generates a unique **QR Code** automatically

### QR Code Format
```
https://yoursite.com/visit/museum-name-city-1234
                            └────────┬────────┘
                           Unique Museum Identifier
```

### Get Museum QR Code

1. Go to **Museums** page
2. Click **View QR** next to your museum
3. Download or print the QR code
4. Display at museum entrance for visitors to scan

---

## Uploading Artwork

### Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. SELECT MUSEUM  →  2. UPLOAD IMAGE  →  3. AI ANALYZES   │
│                                                             │
│  4. REVIEW/EDIT  →  5. FINALIZE  →  6. PUBLISHED           │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Select Museum**: Choose which museum this artwork belongs to

2. **Upload Image**: 
   - Drag & drop or click to upload
   - Supported formats: JPG, PNG, WebP
   - Maximum size: 10MB recommended

3. **AI Processing** (automatic):
   - **Claude Vision AI** identifies the artwork
   - Generates: Title, Artist, Year, Style, Description
   - **CLIP** creates embedding for visitor matching
   - **Wikipedia** fetches additional context
   - **Google Translate** creates EN/FR/ES versions
   - **ElevenLabs** generates audio narration

4. **Review & Edit**:
   - Check AI-generated content
   - Correct any mistakes
   - Add missing information
   - Edit descriptions as needed

5. **Finalize**:
   - Click **Finalize Artwork**
   - Content is published to museum collection

---

## What the AI Provides

| Field | Source | Description |
|-------|--------|-------------|
| **Title** | Claude Vision | Specific artwork name |
| **Author** | Claude Vision | Artist with dates |
| **Year** | Claude Vision | Creation date/period |
| **Style** | Claude Vision | Art movement/period |
| **Description** | Claude Vision | Museum-quality text |
| **Educational Notes** | Claude Vision | Learning insights |
| **Related Works** | Claude Vision | Similar artworks |
| **Museum Links** | Claude Vision | Resource suggestions |
| **Embedding** | CLIP Model | For visitor matching |

---

## Best Practices

### Image Quality
- Use clear, well-lit photos
- Capture the full artwork
- Avoid reflections/glare
- Higher resolution = better AI recognition

### Content Review
- Always verify AI-generated content
- Check dates and artist names
- Ensure descriptions are accurate
- Add local museum context

### Organization
- Create separate museums for different locations
- Use consistent naming conventions
- Maintain artwork metadata regularly

---

## Troubleshooting

### AI Not Recognizing Artwork
- Try a clearer image
- Ensure good lighting
- Upload higher resolution
- Edit manually if needed

### Translations Not Working
- Check API key is configured
- Verify internet connection
- English fallback will be used

### Audio Not Generating
- Check ElevenLabs API key
- Verify quota is available
- Artwork will save without audio
