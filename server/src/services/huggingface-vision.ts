import { HfInference } from '@huggingface/inference';
import * as fs from 'fs';
import { VisionResult } from './vision.js';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function recognizeWithHuggingFace(imagePath: string): Promise<VisionResult> {
  try {
    console.log(`🤖 Analyzing image with Hugging Face: ${imagePath}`);
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Convert buffer to Blob for Hugging Face API
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    
    // Use BLIP-2 for image captioning (great for artwork and objects)
    const captionResult = await hf.imageToText({
      data: imageBlob,
      model: 'Salesforce/blip-image-captioning-large'
    });
    
    // Use object detection for additional details
    let objectDetails = '';
    try {
      const objectResult = await hf.objectDetection({
        inputs: imageBlob,
        model: 'facebook/detr-resnet-50'
      });
      
      if (objectResult && objectResult.length > 0) {
        const detectedObjects = objectResult
          .filter(obj => obj.score > 0.3)
          .map(obj => obj.label)
          .slice(0, 5)
          .join(', ');
        objectDetails = detectedObjects ? ` Objects detected: ${detectedObjects}.` : '';
      }
    } catch (objError) {
      console.log('Object detection failed, continuing with caption only');
    }
    
    // Generate description from caption
    const caption = captionResult.generated_text || 'An artwork or museum piece';
    let title = 'Unknown Artwork';
    let description = caption;
    
    // Try to extract title from caption
    if (caption.includes('painting')) {
      title = 'Painting';
      description = `This appears to be a painting. ${caption}${objectDetails}`;
    } else if (caption.includes('sculpture')) {
      title = 'Sculpture';
      description = `This appears to be a sculpture. ${caption}${objectDetails}`;
    } else if (caption.includes('portrait')) {
      title = 'Portrait';
      description = `This appears to be a portrait. ${caption}${objectDetails}`;
    } else if (caption.includes('landscape')) {
      title = 'Landscape';
      description = `This appears to be a landscape artwork. ${caption}${objectDetails}`;
    } else if (caption.includes('statue')) {
      title = 'Statue';
      description = `This appears to be a statue. ${caption}${objectDetails}`;
    } else {
      // For other objects like cars, artifacts, etc.
      const words = caption.split(' ');
      if (words.length > 0) {
        title = words.slice(0, 2).join(' ').replace(/^./, str => str.toUpperCase());
      }
      description = `${caption}${objectDetails}`;
    }
    
    console.log(`✅ Hugging Face analysis complete: ${title}`);
    
    return {
      title: title,
      description: description,
      educationalNotes: 'This analysis was generated using automated computer vision and image captioning models. For more detailed art historical information, consult with museum staff or specialized art resources.',
      relatedWorks: 'Similar artworks and objects can be found in museum collections worldwide. Consult museum catalogs for related pieces.',
      museumLinks: 'Visit your local museum, art gallery, or explore online collections from major institutions like the Metropolitan Museum, Louvre, or British Museum.',
      confidence: 0.85 // Hugging Face models are generally quite reliable
    };
    
  } catch (error) {
    console.error('❌ Hugging Face Vision error:', error);
    
    // Return fallback result
    return {
      title: 'Unknown',
      description: 'Unable to analyze image with Hugging Face. Please check your API key or try again.',
      educationalNotes: 'Image analysis failed. Please try again or use alternative vision services.',
      relatedWorks: 'Unable to provide recommendations at this time.',
      museumLinks: 'Visit your local museum or contact museum staff for assistance.',
      confidence: 0.0
    };
  }
}

// Test function for the API
export async function testHuggingFaceAPI(): Promise<boolean> {
  try {
    // Test with a simple text generation to verify API key
    const result = await hf.textGeneration({
      model: 'gpt2',
      inputs: 'Hello',
      parameters: { max_new_tokens: 1 }
    });
    
    console.log('✅ Hugging Face API key is working');
    return true;
  } catch (error) {
    console.error('❌ Hugging Face API key test failed:', error);
    return false;
  }
}
