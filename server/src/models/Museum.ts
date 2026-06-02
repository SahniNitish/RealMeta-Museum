import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription {
  plan: 'free' | 'starter' | 'professional' | 'custom';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'deactivated';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  artworkLimit: number;
  trialStartDate?: Date;
  trialEndDate?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  customPrice?: number;
}

export interface IMuseum extends Document {
  name: string;
  location: string;
  qrCode: string;
  website?: string;
  description?: string;
  subscription: ISubscription;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'custom'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'deactivated'],
      default: 'active',
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePriceId: String,
    artworkLimit: { type: Number, default: 5 },
    trialStartDate: Date,
    trialEndDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    customPrice: Number,
  },
  { _id: false }
);

const MuseumSchema = new Schema<IMuseum>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subscription: {
      type: SubscriptionSchema,
      default: () => ({
        plan: 'free',
        status: 'active',
        artworkLimit: 5,
      }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Museum = mongoose.model<IMuseum>('Museum', MuseumSchema);
