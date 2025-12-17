import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import Logger from '../utils/logger';

export interface TtsOptions {
  text: string;
  voiceId?: string; // For ElevenLabs
  language?: 'en' | 'fr' | 'es'; // Supported languages
}

export interface MultiLanguageAudio {
  en?: string;
  fr?: string;
  es?: string;
}

// Voice IDs for different languages
const VOICE_IDS = {
  en: '21m00Tcm4TlvDq8ikWAM', // Rachel (English)
  fr: 'ThT5KcBeYPX3keUQqHPh', // Dorothy (French)
  es: 'IKne3meq5aSn9XLyUdCD', // Domi (Spanish)
};

export async function synthesizeWithElevenLabs(options: TtsOptions): Promise<string | null> {
  // Force-load env from the server/.env file to avoid stale User/Machine vars
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const language = options.language || 'en';
  const voiceId = options.voiceId || VOICE_IDS[language];
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const outName = `${Date.now()}_narration_${language}.mp3`;
  // Resolve uploads directory relative to compiled file location to avoid cwd issues
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  const outPath = path.join(uploadsDir, outName);

  try {
    // Debug: log masked key and current quota
    const maskedKey = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
    try {
      const quotaRes = await axios.get('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': apiKey }
      });
      const sub = quotaRes.data?.subscription || {};
      const remaining = typeof sub.character_limit === 'number' && typeof sub.character_count === 'number'
        ? sub.character_limit - sub.character_count
        : undefined;
      Logger.info(`ElevenLabs key ${maskedKey} | remaining=${remaining} of ${sub.character_limit}`);
    } catch (quotaErr: any) {
      Logger.warn(`Unable to read ElevenLabs quota: ${quotaErr?.response?.status} ${quotaErr?.response?.data?.toString?.() || quotaErr?.message}`);
    }

    // Ensure uploads directory exists
    fs.mkdirSync(uploadsDir, { recursive: true });

    const response = await axios.post(
      url,
      { text: options.text, model_id: 'eleven_multilingual_v2' },
      { responseType: 'arraybuffer', headers: { 'xi-api-key': apiKey } }
    );

    fs.writeFileSync(outPath, Buffer.from(response.data));
    return `/uploads/${outName}`;
  } catch (error: any) {
    const status = error?.response?.status;
    const data = error?.response?.data?.toString?.() || error?.message;
    Logger.error(`TTS error for ${language}: status=${status} details=${data}`);
    return null;
  }
}

export async function generateMultiLanguageAudio(descriptions: {
  en?: string;
  fr?: string;
  es?: string;
}): Promise<MultiLanguageAudio> {
  const audioUrls: MultiLanguageAudio = {};

  for (const [lang, text] of Object.entries(descriptions)) {
    if (text && (lang === 'en' || lang === 'fr' || lang === 'es')) {
      const audioUrl = await synthesizeWithElevenLabs({
        text,
        language: lang as 'en' | 'fr' | 'es'
      });
      if (audioUrl) {
        audioUrls[lang as keyof MultiLanguageAudio] = audioUrl;
      }
    }
  }

  return audioUrls;
}


