import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectToDatabase } from '../utils/db';
import { Artwork } from '../models/Artwork';
import { recognizeArtworkFromImage } from '../services/vision';
import { fetchFromWikipedia } from '../services/resources';
import { synthesizeWithElevenLabs } from '../services/tts';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
    const name = `${Date.now()}_${base}${ext || '.jpg'}`;
    cb(null, name);
  },
});

const upload = multer({ 
  storage,
  fileFilter: (_req, _file, cb) => {
    cb(null, true); // Accept any file
  }
});

// Upload an image and create a draft artwork record
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const file = req.file;
    
    console.log('Upload debug:', { 
      hasFile: !!file, 
      filename: file?.filename,
      originalname: file?.originalname,
      contentType: req.headers['content-type']
    });
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    // Try AI recognition
    const absPath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    const ai = await recognizeArtworkFromImage(absPath);
    let wiki = null;
    if (ai.title) {
      wiki = await fetchFromWikipedia(`${ai.title} ${ai.author || ''}`.trim());
    }

    const doc = await Artwork.create({
      title: ai.title || 'Unlabeled Artwork',
      author: ai.author,
      year: ai.year,
      style: ai.style,
      description: wiki?.description || ai.description,
      imageUrl,
      sources: wiki?.sources,
    });
    res.json({ id: doc._id, imageUrl, ai, wiki });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Save finalized metadata for an artwork
router.post('/:id/finalize', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const { title, author, year, style, description, sources, narrate } = req.body || {};
    const updated = await Artwork.findByIdAndUpdate(
      id,
      { title, author, year, style, description, sources },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });

    // Optional narration
    if (narrate && description) {
      const audioUrl = await synthesizeWithElevenLabs({ text: description });
      if (audioUrl) {
        updated.audioUrl = audioUrl;
        await updated.save();
      }
    }

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


