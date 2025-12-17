import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import adminRouter from './routes/admin';
import publicRouter from './routes/public';
import museumsRouter from './routes/museums';
import visitorRouter from './routes/visitor';
import { connectToDatabase } from './utils/db';
import Logger from './utils/logger';

// Ensure .env overrides any machine/user env so the latest keys are used
dotenv.config({ override: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  Logger.http(`${req.method} ${req.url}`);
  next();
});

app.use('/api/admin', adminRouter);
app.use('/api/museums', museumsRouter);
app.use('/api/visit', visitorRouter);
app.use('/api', publicRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  Logger.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  try {
    // Connect to MongoDB only if URI is provided
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
    } else {
      Logger.warn('MONGODB_URI not set. API will run without DB until provided.');
    }
    app.listen(PORT, () => {
      Logger.info(`API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    Logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

start();


