import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../utils/db';
import { Admin } from '../models/Admin';
import { Museum } from '../models/Museum';
import Logger from '../utils/logger';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://museum.realmeta.ca';

// Generate QR code image that encodes the visitor URL
async function generateMuseumQRCode(qrCode: string): Promise<string> {
  const qrDir = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');
  fs.mkdirSync(qrDir, { recursive: true });

  const qrData = `${FRONTEND_URL}/visit/${qrCode}`;

  // Use qrCode slug as filename (stable, human-readable)
  const filename = `qr_${qrCode}.png`;
  const filepath = path.join(qrDir, filename);

  await QRCode.toFile(filepath, qrData, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff'
    }
  });

  return `/uploads/qrcodes/${filename}`;
}

// Register new admin with museum
router.post('/register', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { email, password, name, museumName, museumLocation, museumDescription, museumWebsite } = req.body;

    if (!email || !password || !name || !museumName || !museumLocation) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name', 'museumName', 'museumLocation']
      });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Generate unique QR code slug for museum
    const qrCode = `museum_${crypto.randomBytes(8).toString('hex')}`;

    // Create museum with free plan defaults
    const museum = await Museum.create({
      name: museumName,
      location: museumLocation,
      description: museumDescription,
      website: museumWebsite,
      qrCode,
      isActive: true,
      subscription: {
        plan: 'free',
        status: 'active',
        artworkLimit: 5,
      },
    });

    // Generate QR code image (encodes visitor URL)
    const qrCodeUrl = await generateMuseumQRCode(qrCode);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      name,
      museumId: museum._id,
      role: 'admin',
      isVerified: false,
      verificationToken,
      verificationTokenExpiry
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email,
        museumId: museum._id,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Send verification email — fire and forget, never block registration
    sendVerificationEmail(admin.email, verificationToken, admin.name).catch(err => {
      Logger.error(`Verification email failed for ${admin.email}: ${err}`);
    });

    Logger.info(`New admin registered: ${email} for museum: ${museumName}`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isVerified: admin.isVerified
      },
      museum: {
        id: museum._id,
        name: museum.name,
        location: museum.location,
        qrCode: museum.qrCode,
        qrCodeUrl,
        subscription: museum.subscription,
        isActive: museum.isActive,
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Registration error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const museum = await Museum.findById(admin.museumId);
    if (!museum) {
      return res.status(500).json({ error: 'Museum not found for this admin' });
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email,
        museumId: museum._id,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    Logger.info(`Admin logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isVerified: admin.isVerified
      },
      museum: {
        id: museum._id,
        name: museum.name,
        location: museum.location,
        qrCode: museum.qrCode,
        subscription: museum.subscription,
        isActive: museum.isActive,
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Login error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Get current admin profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        adminId: string;
        email: string;
        museumId: string;
        role: string;
      };

      await connectToDatabase();

      const admin = await Admin.findById(decoded.adminId).select('-password');
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      const museum = await Museum.findById(admin.museumId);

      res.json({
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          isVerified: admin.isVerified
        },
        museum: museum ? {
          id: museum._id,
          name: museum.name,
          location: museum.location,
          qrCode: museum.qrCode,
          subscription: museum.subscription,
          isActive: museum.isActive,
        } : null
      });

    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Profile fetch error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Verify email via token link
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const admin = await Admin.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() }
    }).select('+verificationToken +verificationTokenExpiry');

    if (!admin) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    admin.isVerified = true;
    admin.verificationToken = undefined;
    admin.verificationTokenExpiry = undefined;
    await admin.save();

    Logger.info(`Email verified for admin: ${admin.email}`);

    res.json({ message: 'Email verified successfully', email: admin.email });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Email verification error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Forgot password — send reset email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordToken +resetPasswordTokenExpiry');

    // Always return success to avoid email enumeration
    if (!admin) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Rate limit: don't send if token was generated less than 60 seconds ago
    if (
      admin.resetPasswordTokenExpiry &&
      admin.resetPasswordTokenExpiry.getTime() > Date.now() + 60 * 60 * 1000 - 60 * 1000
    ) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    sendPasswordResetEmail(admin.email, resetToken, admin.name).catch(err => {
      Logger.error(`Password reset email failed for ${admin.email}: ${err}`);
    });

    Logger.info(`Password reset requested for: ${email}`);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Forgot password error: ${message}`);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Reset password via token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiry: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordTokenExpiry');

    if (!admin) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordTokenExpiry = undefined;
    await admin.save();

    Logger.info(`Password reset successful for: ${admin.email}`);

    res.json({ message: 'Password reset successful. You can now sign in with your new password.' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Reset password error: ${message}`);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Auth middleware export for protecting routes
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        adminId: string;
        email: string;
        museumId: string;
        role: string;
      };

      (req as Request & { admin: typeof decoded }).admin = decoded;
      next();

    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

// Resend verification email (requires auth)
router.post('/resend-verification', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const adminReq = req as Request & { admin: { adminId: string; email: string } };
    const admin = await Admin.findById(adminReq.admin.adminId)
      .select('+verificationToken +verificationTokenExpiry');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (admin.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Rate limit: don't resend if token was generated less than 60 seconds ago
    if (
      admin.verificationTokenExpiry &&
      admin.verificationTokenExpiry.getTime() > Date.now() + 24 * 60 * 60 * 1000 - 60 * 1000
    ) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another email' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    admin.verificationToken = verificationToken;
    admin.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await admin.save();

    sendVerificationEmail(admin.email, verificationToken, admin.name).catch(err => {
      Logger.error(`Resend verification email failed for ${admin.email}: ${err}`);
    });

    res.json({ message: 'Verification email sent' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Resend verification error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
