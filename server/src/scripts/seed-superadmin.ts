import dotenv from 'dotenv';
dotenv.config({ override: true });

import { connectToDatabase } from '../utils/db';
import { Admin } from '../models/Admin';
import { Museum } from '../models/Museum';

async function seedSuperAdmin() {
  const email = process.argv[2] || 'raj@realmeta.ca';
  const password = process.argv[3] || 'SuperAdmin123!';
  const name = process.argv[4] || 'Raj Nayak';

  try {
    await connectToDatabase();

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.role === 'superadmin') {
        console.log(`Super admin already exists: ${email}`);
        process.exit(0);
      }
      // Upgrade existing admin to superadmin
      existing.role = 'superadmin';
      await existing.save();
      console.log(`Upgraded ${email} to superadmin`);
      process.exit(0);
    }

    // Create a placeholder museum for the superadmin account
    let museum = await Museum.findOne({ name: 'RealMeta Platform' });
    if (!museum) {
      museum = await Museum.create({
        name: 'RealMeta Platform',
        location: 'Toronto, Canada',
        qrCode: 'realmeta_platform_admin',
        description: 'RealMeta platform administration',
      });
    }

    await Admin.create({
      email: email.toLowerCase(),
      password,
      name,
      museumId: museum._id,
      role: 'superadmin',
      isVerified: true,
    });

    console.log(`Super admin created: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
