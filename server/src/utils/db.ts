import mongoose from 'mongoose';

export async function connectToDatabase(connectionString?: string): Promise<typeof mongoose> {
  const mongoUri = connectionString || process.env.MONGODB_URI || '';
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  return mongoose.connect(mongoUri);
}


