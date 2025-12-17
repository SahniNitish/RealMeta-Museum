import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

export interface GoogleVisionResult {
  title: string;
  author?: string;
  year?: string;
  style?: string;
  description: string;
  confidence: number;
  detectedObjects?: string[];
  detectedText?: string[];
}

// Initialize Google Vision client
let visionClient: ImageAnnotatorClient | null = null;

function initializeVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    // Try different authentication methods
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log('🔑 Using Google Service Account authentication');
      visionClient = new ImageAnnotatorClient({
        keyFilename: serviceAccountPath
      });
    } else if (apiKey) {
      console.log('🔑 Using Google Vision API Key authentication');
      visionClient = new ImageAnnotatorClient({
        apiKey: apiKey
      });
    } else {
      console.log('🔑 Using Google Application Default Credentials');
      visionClient = new ImageAnnotatorClient();
    }
  }
  return visionClient;
}

// Generate smart description based on Google Vision results
function generateDescription(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>,
  text: string[]
): string {
  const topLabels = labels.slice(0, 5).map(l => l.description.toLowerCase());
  const topObjects = objects.slice(0, 3).map(o => o.name.toLowerCase());

  // Check for vehicles/cars
  const carKeywords = ['car', 'vehicle', 'automobile', 'motor vehicle', 'sports car', 'luxury vehicle', 'coupe', 'sedan', 'suv'];
  const isVehicle = [...topLabels, ...topObjects].some(item =>
    carKeywords.some(keyword => item.includes(keyword))
  );

  // Check for artwork/paintings
  const artKeywords = ['art', 'painting', 'artwork', 'portrait', 'canvas', 'drawing', 'sculpture'];
  const isArtwork = [...topLabels, ...topObjects].some(item =>
    artKeywords.some(keyword => item.includes(keyword))
  );

  // Check for architecture
  const archKeywords = ['building', 'architecture', 'church', 'cathedral', 'museum', 'monument'];
  const isArchitecture = [...topLabels, ...topObjects].some(item =>
    archKeywords.some(keyword => item.includes(keyword))
  );

  if (isVehicle) {
    const vehicleType = topLabels.find(label => carKeywords.some(k => label.includes(k))) || 'vehicle';
    return `This image shows a ${vehicleType} with distinctive automotive design elements. The AI analysis detected characteristics typical of ${topLabels.includes('luxury vehicle') || topLabels.includes('sports car') ? 'luxury or performance' : 'modern'} vehicles, including specific styling cues, proportions, and engineering details that suggest ${topLabels.includes('sports car') ? 'high-performance capabilities' : 'contemporary automotive design'}.`;
  } else if (isArtwork) {
    const artType = topLabels.find(label => artKeywords.some(k => label.includes(k))) || 'artwork';
    return `This appears to be a ${artType} displaying artistic composition and visual elements. The analysis reveals characteristics typical of ${topLabels.includes('portrait') ? 'portraiture' : topLabels.includes('painting') ? 'painted artwork' : 'visual art'}, with attention to color, form, and aesthetic presentation that suggests artistic intent and creative expression.`;
  } else if (isArchitecture) {
    const buildingType = topLabels.find(label => archKeywords.some(k => label.includes(k))) || 'architectural structure';
    return `This image captures a ${buildingType} showcasing architectural design and structural elements. The analysis identifies features characteristic of ${topLabels.includes('church') || topLabels.includes('cathedral') ? 'religious architecture' : topLabels.includes('museum') ? 'cultural institution design' : 'contemporary architecture'}, with emphasis on form, function, and spatial relationships.`;
  } else {
    // Generic description based on top labels
    const primarySubject = topLabels[0] || 'subject';
    const secondaryElements = topLabels.slice(1, 3).join(', ');
    return `This image features ${primarySubject}${secondaryElements ? ` with elements of ${secondaryElements}` : ''}. The AI analysis detected various visual components and compositional elements that suggest ${topLabels.includes('person') ? 'human subjects or portraiture' : topLabels.includes('nature') || topLabels.includes('outdoor') ? 'natural or outdoor photography' : 'contemporary digital imagery'} with attention to visual presentation and aesthetic qualities.`;
  }
}

// Infer artwork metadata from Google Vision results
function inferMetadata(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>
): { title: string; author: string; year: string; style: string } {
  const topLabels = labels.slice(0, 5).map(l => l.description.toLowerCase());
  const topObjects = objects.slice(0, 3).map(o => o.name.toLowerCase());
  const allDetected = [...topLabels, ...topObjects];

  // Vehicle detection
  if (allDetected.some(item => ['car', 'vehicle', 'automobile', 'sports car'].some(k => item.includes(k)))) {
    const isLuxury = allDetected.some(item => ['luxury', 'sports car', 'performance'].some(k => item.includes(k)));
    return {
      title: isLuxury ? "Luxury Sports Car" : "Contemporary Vehicle",
      author: "Automotive Designer",
      year: "2020s",
      style: isLuxury ? "High-Performance Automotive Design" : "Modern Automotive Photography"
    };
  }

  // Artwork detection
  if (allDetected.some(item => ['art', 'painting', 'portrait', 'canvas'].some(k => item.includes(k)))) {
    const isPortrait = allDetected.some(item => item.includes('portrait'));
    return {
      title: isPortrait ? "Portrait Artwork" : "Fine Art Piece",
      author: "Master Artist",
      year: "Classical Period",
      style: isPortrait ? "Portrait Painting" : "Fine Art"
    };
  }

  // Architecture detection
  if (allDetected.some(item => ['building', 'architecture', 'church', 'cathedral'].some(k => item.includes(k)))) {
    return {
      title: "Architectural Study",
      author: "Architectural Photographer",
      year: "Contemporary",
      style: "Architectural Photography"
    };
  }

  // Default
  return {
    title: `${labels[0]?.description || 'Image'} Analysis`,
    author: "Contemporary Creator",
    year: "2020s",
    style: "Digital Photography"
  };
}

// Main Google Vision recognition function
export async function recognizeWithGoogleVision(imagePath: string): Promise<GoogleVisionResult> {
  try {
    console.log('🔍 Starting Google Vision API analysis...');

    const client = initializeVisionClient();

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);

    // Perform multiple types of analysis
    const [labelResult] = await client.labelDetection({ image: { content: imageBuffer } });
    const [objectResult] = await client.objectLocalization({ image: { content: imageBuffer } });
    const [textResult] = await client.textDetection({ image: { content: imageBuffer } });

    // Extract results
    const labels = labelResult.labelAnnotations || [];
    const objects = objectResult.localizedObjectAnnotations || [];
    const textDetections = textResult.textAnnotations || [];

    console.log('🏷️ Detected labels:', labels.slice(0, 5).map(l => `${l.description} (${(l.score! * 100).toFixed(1)}%)`));
    console.log('🎯 Detected objects:', objects.slice(0, 3).map(o => `${o.name} (${(o.score! * 100).toFixed(1)}%)`));

    if (labels.length === 0 && objects.length === 0) {
      return {
        title: 'Unrecognized Image',
        description: 'Google Vision API could not identify specific objects or labels in this image.',
        confidence: 0.1
      };
    }

    // Generate metadata and description
    // Fix types by ensuring properties are present (Google Vision types have optional properties)
    const cleanLabels = labels.map(l => ({
      description: l.description || '',
      score: l.score || 0
    }));

    const cleanObjects = objects.map(o => ({
      name: o.name || '',
      score: o.score || 0
    }));

    const metadata = inferMetadata(cleanLabels, cleanObjects);
    const description = generateDescription(
      cleanLabels,
      cleanObjects,
      textDetections.map(t => t.description || '').filter(t => t.length > 0)
    );

    // Calculate confidence based on top detection scores
    const topScore = Math.max(
      cleanLabels[0]?.score || 0,
      cleanObjects[0]?.score || 0
    );

    console.log(`✅ Google Vision analysis complete: ${metadata.title} (${(topScore * 100).toFixed(1)}% confidence)`);

    return {
      title: metadata.title,
      author: metadata.author,
      year: metadata.year,
      style: metadata.style,
      description: description,
      confidence: topScore,
      detectedObjects: objects.slice(0, 5).map(o => o.name || ''),
      detectedText: textDetections.slice(0, 3).map(t => t.description || '').filter(t => t.length > 0)
    };

  } catch (error) {
    console.error('❌ Google Vision API error:', error);

    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      return {
        title: 'API Configuration Error',
        description: 'Google Vision API key is missing or invalid. Please check your GOOGLE_VISION_API_KEY environment variable.',
        confidence: 0.0
      };
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return {
        title: 'API Quota Exceeded',
        description: 'Google Vision API quota exceeded or billing not enabled. Check your Google Cloud Console.',
        confidence: 0.0
      };
    } else {
      return {
        title: 'Vision Analysis Failed',
        description: `Google Vision API encountered an error: ${error.message}. Please try again or check your configuration.`,
        confidence: 0.0
      };
    }
  }
}
