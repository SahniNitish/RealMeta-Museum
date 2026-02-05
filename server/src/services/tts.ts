import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import Logger from '../utils/logger';
import { uploadBufferToS3 } from './s3';

// Extended language support matching translation service
export type TtsLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl'
  | 'zh' | 'ja' | 'ko' | 'hi' | 'ar' | 'ru' | 'tr'
  | 'pl' | 'sv' | 'da' | 'no' | 'fi';

export interface TtsOptions {
  text: string;
  voiceId?: string;
  language?: TtsLanguage;
}

export interface MultiLanguageAudio {
  [key: string]: string | undefined;
}

// ElevenLabs voice IDs - using multilingual voices that work across languages
// The eleven_multilingual_v2 model automatically handles language detection
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel - works well with multilingual model

// Language-specific voices for better pronunciation (optional overrides)
const VOICE_IDS: Record<string, string> = {
  en: '21m00Tcm4TlvDq8ikWAM', // Rachel
  es: 'IKne3meq5aSn9XLyUdCD', // Domi
  fr: 'ThT5KcBeYPX3keUQqHPh', // Dorothy
  de: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  it: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  pt: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  nl: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  zh: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  ja: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  ko: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  hi: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  ar: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  ru: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  tr: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  pl: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  sv: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  da: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  no: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
  fi: '21m00Tcm4TlvDq8ikWAM', // Rachel (multilingual)
};

export interface TtsOptionsWithContext extends TtsOptions {
  museumId?: string;
  artworkId?: string;
}

export async function synthesizeWithElevenLabs(options: TtsOptionsWithContext): Promise<string | null> {
  // Force-load env from the server/.env file to avoid stale User/Machine vars
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    Logger.warn('No ELEVENLABS_API_KEY found, audio generation skipped');
    return null;
  }

  const language = options.language || 'en';
  const voiceId = options.voiceId || VOICE_IDS[language] || DEFAULT_VOICE;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const timestamp = Date.now();
  const outName = `${timestamp}_narration_${language}.mp3`;

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

    const response = await axios.post(
      url,
      { text: options.text, model_id: 'eleven_multilingual_v2' },
      { responseType: 'arraybuffer', headers: { 'xi-api-key': apiKey } }
    );

    const audioBuffer = Buffer.from(response.data);

    // Upload to S3 if museumId and artworkId are provided
    if (options.museumId && options.artworkId) {
      const s3Key = `museums/${options.museumId}/artworks/${options.artworkId}/audio/${outName}`;
      const s3Url = await uploadBufferToS3(audioBuffer, s3Key, 'audio/mpeg');
      return s3Url;
    }

    // Fallback to local storage (for backward compatibility)
    const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
    const outPath = path.join(uploadsDir, outName);
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(outPath, audioBuffer);
    return `/uploads/${outName}`;
  } catch (error: any) {
    const status = error?.response?.status;
    const data = error?.response?.data?.toString?.() || error?.message;
    Logger.error(`TTS error for ${language}: status=${status} details=${data}`);
    return null;
  }
}

export async function generateMultiLanguageAudio(
  descriptions: { [key: string]: string | undefined },
  context?: { museumId?: string; artworkId?: string }
): Promise<MultiLanguageAudio> {
  const audioUrls: MultiLanguageAudio = {};

  for (const [lang, text] of Object.entries(descriptions)) {
    if (text) {
      const audioUrl = await synthesizeWithElevenLabs({
        text,
        language: lang as TtsLanguage,
        museumId: context?.museumId,
        artworkId: context?.artworkId
      });
      if (audioUrl) {
        audioUrls[lang] = audioUrl;
      }
    }
  }

  return audioUrls;
}

/**
 * Generate audio for a single language (on-demand)
 * Used when visitor switches language
 */
export async function generateSingleLanguageAudio(
  text: string,
  language: TtsLanguage,
  context?: { museumId?: string; artworkId?: string }
): Promise<string | null> {
  Logger.info(`🔊 Generating on-demand audio for ${language}...`);

  const audioUrl = await synthesizeWithElevenLabs({
    text,
    language,
    museumId: context?.museumId,
    artworkId: context?.artworkId
  });

  if (audioUrl) {
    Logger.info(`✅ Audio generated for ${language}: ${audioUrl}`);
  } else {
    Logger.warn(`⚠️ Audio generation failed for ${language}`);
  }

  return audioUrl;
}


