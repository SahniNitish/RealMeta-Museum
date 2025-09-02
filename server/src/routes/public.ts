import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../utils/db';
import { Artwork } from '../models/Artwork';
import { getDescriptionByLanguage } from '../services/translation';

const router = Router();

router.get('/artworks', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const items = await Artwork.find().sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/artworks/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { lang = 'en' } = req.query;
    const language = ['en', 'fr', 'es'].includes(lang as string) ? (lang as 'en' | 'fr' | 'es') : 'en';
    
    const item = await Artwork.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    // Get language-specific content
    const localizedDescription = getDescriptionByLanguage(item, language);
    const localizedAudioUrl = item.audioUrls?.[language] || item.audioUrl;
    
    res.json({
      ...item.toObject(),
      currentLanguage: language,
      localizedDescription,
      localizedAudioUrl,
      availableLanguages: {
        en: !!item.descriptions?.en,
        fr: !!item.descriptions?.fr,
        es: !!item.descriptions?.es
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


