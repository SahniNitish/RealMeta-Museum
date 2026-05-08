import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  museumId: mongoose.Types.ObjectId;
  role: 'admin' | 'superadmin';
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    museumId: {
      type: Schema.Types.ObjectId,
      ref: 'Museum',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      select: false
    },
    verificationTokenExpiry: {
      type: Date,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordTokenExpiry: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
AdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
