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

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Generate QR code for museum
async function generateMuseumQRCode(museumId: string, museumName: string): Promise<string> {
  const qrDir = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');
  fs.mkdirSync(qrDir, { recursive: true });

  const qrData = JSON.stringify({
    type: 'museum',
    id: museumId,
    name: museumName
  });

  const filename = `qr_${museumId}.png`;
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

    // Validate required fields
    if (!email || !password || !name || !museumName || !museumLocation) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name', 'museumName', 'museumLocation']
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Generate unique QR code for museum
    const qrCode = `museum_${crypto.randomBytes(8).toString('hex')}`;

    // Create museum first
    const museum = await Museum.create({
      name: museumName,
      location: museumLocation,
      description: museumDescription,
      website: museumWebsite,
      qrCode
    });

    // Generate QR code image
    const qrCodeUrl = await generateMuseumQRCode(museum._id.toString(), museumName);

    // Create admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      name,
      museumId: museum._id,
      role: 'admin'
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

    Logger.info(`New admin registered: ${email} for museum: ${museumName}`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      museum: {
        id: museum._id,
        name: museum.name,
        location: museum.location,
        qrCode: museum.qrCode,
        qrCodeUrl
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

    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get museum info
    const museum = await Museum.findById(admin.museumId);
    if (!museum) {
      return res.status(500).json({ error: 'Museum not found for this admin' });
    }

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

    Logger.info(`Admin logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      museum: {
        id: museum._id,
        name: museum.name,
        location: museum.location,
        qrCode: museum.qrCode
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
          role: admin.role
        },
        museum: museum ? {
          id: museum._id,
          name: museum.name,
          location: museum.location,
          qrCode: museum.qrCode
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

      // Attach decoded info to request
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

export default router;
