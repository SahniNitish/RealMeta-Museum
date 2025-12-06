import mongoose, { Schema, Document, Model } from 'mongoose';

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


