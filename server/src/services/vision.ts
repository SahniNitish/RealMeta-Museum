import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export interface VisionResult {
  title?: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  confidence?: number;
}

function encodeImageToDataUrl(imageDiskPath: string): string {
  const absolutePath = path.isAbsolute(imageDiskPath)
    ? imageDiskPath
    : path.join(process.cwd(), imageDiskPath);
  const data = fs.readFileSync(absolutePath);
  const base64 = data.toString('base64');
  const ext = path.extname(absolutePath).toLowerCase().replace('.', '') || 'jpeg';
  return `data:image/${ext};base64,${base64}`;
}

export async function recognizeArtworkFromImage(imageDiskPath: string): Promise<VisionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { title: 'Unknown', description: 'Set OPENAI_API_KEY to enable recognition.' };
  }

  const client = new OpenAI({ apiKey });
  const imageUrl = encodeImageToDataUrl(imageDiskPath);

  const prompt = [
    'You are a museum expert. Identify the artwork in the image and return concise JSON with',
    'keys: title, author, year, style, description (2-3 sentences), confidence (0-1).',
    'If unsure, leave fields empty and set low confidence.'
  ].join(' ');

  // Use Responses API for multimodal
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'input_image', image_url: imageUrl }
        ]
      }
    ]
  });

  const text = response.output_text || '';
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const json = text.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(json);
    return parsed as VisionResult;
  } catch {
    return { description: text } as VisionResult;
  }
}


