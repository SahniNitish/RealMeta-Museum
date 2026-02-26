import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export async function connectToDatabase(connectionString?: string): Promise<typeof mongoose> {
  const mongoUri = connectionString || process.env.MONGODB_URI || '';
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // DocumentDB requires TLS. Load the AWS CA certificate if configured.
  // For local development (no DOCDB_TLS_CA_FILE set), connects normally.
  const tlsCaFile = process.env.DOCDB_TLS_CA_FILE;
  if (tlsCaFile) {
    const caPath = path.resolve(tlsCaFile);
    if (!fs.existsSync(caPath)) {
      throw new Error(`DocumentDB TLS CA file not found at: ${caPath}`);
    }
    return mongoose.connect(mongoUri, {
      tls: true,
      tlsCAFile: caPath,
      retryWrites: false,
      directConnection: false,
    });
  }

  return mongoose.connect(mongoUri);
}
