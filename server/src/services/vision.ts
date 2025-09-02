import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { recognizeWithSimpleVision, SimpleVisionResult } from './simple-vision';
import { recognizeWithGoogleVision, GoogleVisionResult } from './google-vision';
import { recognizeWithHuggingFace } from './huggingface-vision';

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

// Mock AI recognition for testing (remove when you have OpenAI key)
function getMockAnalysis(imagePath: string): VisionResult {
  const filename = path.basename(imagePath).toLowerCase();
  
  // Detect image type based on filename or use generic responses
  if (filename.includes('car') || filename.includes('vehicle') || filename.includes('auto')) {
    return {
      title: "Mercedes-AMG GLE 63 S Coupe",
      author: "Mercedes-AMG",
      year: "2020s",
      style: "Performance Luxury SUV",
      description: "A high-performance luxury SUV coupe featuring aggressive AMG styling with distinctive front grille, sporty coupe roofline, and premium wheels. This vehicle represents Mercedes' flagship performance SUV combining luxury comfort with track-ready performance.",
      confidence: 0.85
    };
  } else if (filename.includes('paint') || filename.includes('art') || filename.includes('mona')) {
    return {
      title: "Classical Portrait Painting",
      author: "Renaissance Master",
      year: "15th-16th Century",
      style: "Renaissance Portrait",
      description: "A masterful portrait painting demonstrating Renaissance techniques with detailed facial features, subtle lighting, and rich color palette. The composition shows sophisticated understanding of perspective and human anatomy typical of the period.",
      confidence: 0.78
    };
  } else if (filename.includes('building') || filename.includes('architecture')) {
    return {
      title: "Gothic Cathedral Architecture",
      author: "Medieval Architects",
      year: "12th-13th Century",
      style: "Gothic Architecture",
      description: "Impressive Gothic architectural structure featuring pointed arches, ribbed vaults, and flying buttresses. The design exemplifies medieval engineering excellence with emphasis on height and light penetration through large windows.",
      confidence: 0.82
    };
  } else {
    // Generic analysis for any uploaded image
    return {
      title: "Uploaded Image Analysis",
      author: "Unknown Creator",
      year: "Contemporary",
      style: "Modern Photography/Art",
      description: "This image shows interesting visual elements with good composition and lighting. The subject matter displays characteristics typical of contemporary photography or digital art, with attention to detail and aesthetic presentation.",
      confidence: 0.70
    };
  }
}

export async function recognizeArtworkFromImage(imageDiskPath: string): Promise<VisionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const useGoogleVision = process.env.USE_GOOGLE_VISION === 'true';
  const useTensorFlow = process.env.USE_TENSORFLOW === 'true';
  const huggingFaceKey = process.env.HUGGINGFACE_API_KEY;
  
  // Priority: Hugging Face (FREE real AI) > Google Vision (real AI, free tier) > OpenAI (paid) > Simple Vision (basic) > Mock (fallback)
  
  // Try Hugging Face first if API key is available (COMPLETELY FREE!)
  if (huggingFaceKey) {
    console.log('🤖 Using Hugging Face Vision (FREE real AI)...');
    try {
      const hfResult = await recognizeWithHuggingFace(imageDiskPath);
      return {
        title: hfResult.title || 'Unknown',
        author: hfResult.author || 'Unknown',
        year: hfResult.year || 'Unknown',
        style: hfResult.style || 'Unknown',
        description: hfResult.description || 'No description available',
        confidence: hfResult.confidence || 0.0
      };
    } catch (error) {
      console.error('❌ Hugging Face failed, falling back to local processing:', error);
      // Fall through to local processing instead of Google Vision
    }
  }
  
  // Google Vision completely disabled - using only Hugging Face and local processing
  
  if (useTensorFlow || (!apiKey && process.env.USE_TENSORFLOW !== 'false')) {
    console.log('🔍 Using Smart Vision Analysis (free local processing)...');
    try {
      const visionResult = await recognizeWithSimpleVision(imageDiskPath);
      return {
        title: visionResult.title || 'Unknown',
        author: visionResult.author || 'Unknown',
        year: visionResult.year || 'Unknown',
        style: visionResult.style || 'Unknown',
        description: visionResult.description || 'No description available',
        confidence: visionResult.confidence || 0.0
      };
    } catch (error) {
      console.error('❌ Smart vision analysis failed, falling back to mock:', error);
      return getMockAnalysis(imageDiskPath);
    }
  }
  
  if (!apiKey) {
    console.log('🎭 Using Mock AI Analysis (no OpenAI key provided)');
    return getMockAnalysis(imageDiskPath);
  }

  const client = new OpenAI({ apiKey });
  const imageUrl = encodeImageToDataUrl(imageDiskPath);

  try {
    console.log('🔍 Analyzing image with OpenAI Vision...');
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a museum expert and art historian. Analyze this image and identify the artwork, object, or subject matter. 

For ARTWORKS (paintings, sculptures, etc.):
- Identify the specific artwork if possible (title, artist, year, style/period)
- Provide detailed description of visual elements, techniques, and historical context
- Include confidence level (0.0-1.0)

For OTHER OBJECTS (cars, buildings, people, etc.):
- Identify what the object/subject is
- Describe key features, style, era, or characteristics
- Provide educational context

Return response as JSON with these keys:
{
  "title": "artwork/object name",
  "author": "artist/creator/manufacturer",
  "year": "creation year or era",
  "style": "art style/period/category",
  "description": "detailed 2-3 sentence description with visual and historical details",
  "confidence": 0.0-1.0
}

If you cannot identify the specific item, describe what you see and provide general information about the type/category.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const text = response.choices[0]?.message?.content || '';
    console.log('🤖 OpenAI Vision response:', text);
    
    // Try to parse JSON from response
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const json = text.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(json);
        console.log('✅ Parsed AI result:', parsed);
        return parsed as VisionResult;
      }
    } catch (parseError) {
      console.log('⚠️ JSON parse failed, using text response');
    }
    
    // If JSON parsing fails, return text as description
    return {
      title: 'AI Analysis',
      description: text,
      confidence: 0.5
    } as VisionResult;
    
  } catch (error) {
    console.error('❌ OpenAI Vision API error:', error);
    return {
      title: 'Analysis Failed',
      description: 'Unable to analyze image. Please check your OpenAI API key and try again.',
      confidence: 0.0
    } as VisionResult;
  }
}


