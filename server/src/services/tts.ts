import fs from 'fs';
import path from 'path';
import axios from 'axios';

export interface TtsOptions {
  text: string;
  voiceId?: string; // For ElevenLabs
  language?: string; // ISO code
}

export async function synthesizeWithElevenLabs(options: TtsOptions): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel default
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const outName = `${Date.now()}_narration.mp3`;
  const outPath = path.join(process.cwd(), 'uploads', outName);

  const response = await axios.post(
    url,
    { text: options.text, model_id: 'eleven_multilingual_v2' },
    { responseType: 'arraybuffer', headers: { 'xi-api-key': apiKey } }
  );

  fs.writeFileSync(outPath, Buffer.from(response.data));
  return `/uploads/${outName}`;
}


