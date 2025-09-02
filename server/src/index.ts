import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import adminRouter from './routes/admin';
import publicRouter from './routes/public';
import { connectToDatabase } from './utils/db';

// Ensure .env overrides any machine/user env so the latest keys are used
dotenv.config({ override: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  try {
    // Connect to MongoDB only if URI is provided
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
    } else {
      console.warn('MONGODB_URI not set. API will run without DB until provided.');
    }
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();


