import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ArtworkDocument extends Document {
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

const ArtworkSchema = new Schema<ArtworkDocument>(
  {
    title: { type: String, required: true },
    author: { type: String },
    year: { type: String },
    style: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    audioUrl: { type: String },
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


