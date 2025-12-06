import mongoose, { Schema, Document } from 'mongoose';

export interface IMuseum extends Document {
  name: string;
  location: string;
  qrCode: string;
  website?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MuseumSchema = new Schema<IMuseum>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true // For fast QR code lookups
    },
    website: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Create text index for search
MuseumSchema.index({ name: 'text', location: 'text' });

export const Museum = mongoose.model<IMuseum>('Museum', MuseumSchema);
