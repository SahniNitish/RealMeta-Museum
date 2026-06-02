/**
 * One-time migration: add subscription defaults to existing museums.
 *
 * Run with: npx ts-node src/scripts/migrate-subscriptions.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase } from '../utils/db';
import { Museum } from '../models/Museum';

async function migrate() {
  await connectToDatabase();

  const result = await Museum.updateMany(
    { 'subscription.plan': { $exists: false } },
    {
      $set: {
        isActive: true,
        subscription: {
          plan: 'free',
          status: 'active',
          artworkLimit: 5,
        },
      },
    }
  );

  console.log(`Migration complete. Updated ${result.modifiedCount} museums.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
