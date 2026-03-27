import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AdditionalPhoto {
  url: string;
  caption?: string;
  uploadedAt: Date;
}

export interface Video {
  type: 'upload' | 'youtube' | 'vimeo';
  url: string;
  embedId?: string;
  title?: string;
  uploadedAt: Date;
}

export interface MusicTrack {
  url: string;
  title?: string;
  artist?: string;
  uploadedAt: Date;
}

export interface DocumentFile {
  url: string;
  title?: string;
  description?: string;
  uploadedAt: Date;
}

export interface ArtworkDocument extends Document {
  title: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  educationalNotes?: string;
  relatedWorks?: string;
  museumLinks?: string;
  museumId?: mongoose.Types.ObjectId; // Link to museum
  imageEmbedding?: number[]; // CLIP embedding vector for image matching
  externalLinks?: { label: string; url: string }[]; // External resource links (Google Drive, etc.)
  additionalPhotos?: AdditionalPhoto[];
  videos?: Video[];
  musicTracks?: MusicTrack[];
  documents?: DocumentFile[];
  descriptions?: {
    en?: string;
    fr?: string;
    es?: string;
    de?: string;
    zh?: string;
    ja?: string;
    it?: string;
    pt?: string;
    ru?: string;
    ar?: string;
    hi?: string;
    bn?: string;
    ta?: string;
    te?: string;
    mr?: string;
    gu?: string;
    kn?: string;
    ml?: string;
    pa?: string;
    as?: string;
    sd?: string;
    ne?: string;
  };
  imageUrl?: string;
  audioUrl?: string;
  audioUrls?: {
    en?: string;
    fr?: string;
    es?: string;
    de?: string;
    zh?: string;
    ja?: string;
    it?: string;
    pt?: string;
    ru?: string;
    ar?: string;
    hi?: string;
    bn?: string;
    ta?: string;
    te?: string;
    mr?: string;
    gu?: string;
    kn?: string;
    ml?: string;
    pa?: string;
    as?: string;
    sd?: string;
    ne?: string;
  };
  sources?: { provider: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ArtworkSchema = new Schema<ArtworkDocument>(
  {
    title: { type: String, required: true },
    author: { type: String },
    year: { type: String },
    style: { type: String },
    description: { type: String },
    educationalNotes: { type: String },
    relatedWorks: { type: String },
    museumLinks: { type: String },
    museumId: { type: Schema.Types.ObjectId, ref: 'Museum', index: true },
    imageEmbedding: { type: [Number] }, // Array of numbers for CLIP vector
    externalLinks: [
      {
        label: String,
        url: String,
        _id: false,
      },
    ],
    additionalPhotos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    videos: [
      {
        type: { type: String, enum: ['upload', 'youtube', 'vimeo'] },
        url: String,
        embedId: String,
        title: String,
        uploadedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    musicTracks: [
      {
        url: String,
        title: String,
        artist: String,
        uploadedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    documents: [
      {
        url: String,
        title: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    descriptions: {
      en: { type: String },
      fr: { type: String },
      es: { type: String },
      de: { type: String },
      zh: { type: String },
      ja: { type: String },
      it: { type: String },
      pt: { type: String },
      ru: { type: String },
      ar: { type: String },
      hi: { type: String },
      bn: { type: String },
      ta: { type: String },
      te: { type: String },
      mr: { type: String },
      gu: { type: String },
      kn: { type: String },
      ml: { type: String },
      pa: { type: String },
      as: { type: String },
      sd: { type: String },
      ne: { type: String },
    },
    imageUrl: { type: String },
    audioUrl: { type: String },
    audioUrls: {
      en: { type: String },
      fr: { type: String },
      es: { type: String },
      de: { type: String },
      zh: { type: String },
      ja: { type: String },
      it: { type: String },
      pt: { type: String },
      ru: { type: String },
      ar: { type: String },
      hi: { type: String },
      bn: { type: String },
      ta: { type: String },
      te: { type: String },
      mr: { type: String },
      gu: { type: String },
      kn: { type: String },
      ml: { type: String },
      pa: { type: String },
      as: { type: String },
      sd: { type: String },
      ne: { type: String },
    },
    sources: [
      {
        provider: String,
        url: String,
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export const Artwork: Model<ArtworkDocument> =
  mongoose.models.Artwork || mongoose.model<ArtworkDocument>('Artwork', ArtworkSchema);


