import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitor extends Document {
  museumId: mongoose.Types.ObjectId;
  name?: string;
  phone?: string;
  email?: string;
  language: string;
  visitedAt: Date;
  artworksViewed: mongoose.Types.ObjectId[];
  sessionId: string;
}

const VisitorSchema = new Schema<IVisitor>(
  {
    museumId: {
      type: Schema.Types.ObjectId,
      ref: 'Museum',
      required: true,
      index: true
    },
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'fr', 'es', 'de', 'zh', 'ja', 'it', 'pt', 'ru', 'ar']
    },
    visitedAt: {
      type: Date,
      default: Date.now
    },
    artworksViewed: [{
      type: Schema.Types.ObjectId,
      ref: 'Artwork'
    }],
    sessionId: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Index for analytics queries
VisitorSchema.index({ museumId: 1, visitedAt: -1 });
VisitorSchema.index({ email: 1, museumId: 1 });

export const Visitor = mongoose.model<IVisitor>('Visitor', VisitorSchema);
