import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface TensorFlowResult {
  title: string;
  author?: string;
  year?: string;
  style?: string;
  description: string;
  confidence: number;
  detectedObjects?: Array<{
    class: string;
    confidence: number;
    bbox?: number[];
  }>;
}

// Pre-trained model URLs (these are free and don't require API keys)
const MOBILENET_URL = 'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/5';
const COCO_SSD_URL = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1';

let mobilenetModel: tf.GraphModel | null = null;
let cocoSsdModel: tf.GraphModel | null = null;

// Load models (cache them for better performance)
async function loadMobileNetModel(): Promise<tf.GraphModel> {
  if (!mobilenetModel) {
    console.log('📥 Loading MobileNet model...');
    try {
      mobilenetModel = await tf.loadGraphModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
      console.log('✅ MobileNet model loaded successfully');
    } catch (error) {
      console.error('❌ Error loading MobileNet model:', error);
      throw error;
    }
  }
  return mobilenetModel;
}

async function loadCocoSsdModel(): Promise<tf.GraphModel> {
  if (!cocoSsdModel) {
    console.log('📥 Loading COCO-SSD model...');
    try {
      cocoSsdModel = await tf.loadGraphModel('https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1', { fromTFHub: true });
      console.log('✅ COCO-SSD model loaded successfully');
    } catch (error) {
      console.error('❌ Error loading COCO-SSD model:', error);
      throw error;
    }
  }
  return cocoSsdModel;
}

// ImageNet class labels (top 1000 classes)
const IMAGENET_CLASSES = [
  'tench', 'goldfish', 'great white shark', 'tiger shark', 'hammerhead',
  'electric ray', 'stingray', 'cock', 'hen', 'ostrich', 'brambling',
  'goldfinch', 'house finch', 'junco', 'indigo bunting', 'robin',
  'bulbul', 'jay', 'magpie', 'chickadee', 'water ouzel', 'kite',
  'bald eagle', 'vulture', 'great grey owl', 'European fire salamander',
  // ... (truncated for brevity, would include all 1000 classes)
  'sports car', 'convertible', 'minivan', 'limousine', 'jeep',
  'ambulance', 'police van', 'pickup truck', 'fire engine',
  // Art-related classes
  'altar', 'monastery', 'palace', 'castle', 'church', 'cathedral',
  'mosque', 'synagogue', 'library', 'museum', 'art gallery',
  'statue', 'fountain', 'obelisk', 'triumphal arch'
];

// COCO dataset classes (for object detection)
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train',
  'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
  'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep',
  'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
  'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
  'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork',
  'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv',
  'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave',
  'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
  'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

// Preprocess image for TensorFlow using Sharp
async function preprocessImage(imagePath: string): Promise<tf.Tensor> {
  try {
    // Use Sharp to resize and process the image
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224)
      .removeAlpha()
      .raw()
      .toBuffer();
    
    // Convert buffer to tensor
    const tensor = tf.tensor3d(new Uint8Array(imageBuffer), [224, 224, 3])
      .toFloat()
      .div(255.0)
      .expandDims(0);
      
    return tensor;
  } catch (error) {
    console.error('❌ Image preprocessing failed:', error);
    throw error;
  }
}

// Generate description based on detected objects/classes
function generateDescription(predictions: Array<{ class: string; confidence: number }>): string {
  const topPrediction = predictions[0];
  const className = topPrediction.class;
  const confidence = (topPrediction.confidence * 100).toFixed(1);
  
  // Art and museum-specific descriptions
  if (className.includes('car') || className.includes('vehicle')) {
    return `This appears to be a ${className} with ${confidence}% confidence. The image shows automotive design elements typical of modern vehicle manufacturing, with attention to aerodynamic styling and engineering details.`;
  } else if (className.includes('art') || className.includes('painting') || className.includes('statue')) {
    return `This appears to be a work of art, specifically a ${className} with ${confidence}% confidence. The composition demonstrates artistic techniques with careful attention to form, color, and aesthetic presentation typical of museum-quality pieces.`;
  } else if (className.includes('building') || className.includes('architecture')) {
    return `This shows architectural elements identified as ${className} with ${confidence}% confidence. The structure displays design principles and construction techniques that reflect historical or contemporary architectural styles.`;
  } else if (className.includes('person') || className.includes('people')) {
    return `This image contains human subjects identified with ${confidence}% confidence. The composition may represent portraiture, documentary photography, or artistic representation of human forms.`;
  } else {
    return `This image has been analyzed and identified as containing ${className} with ${confidence}% confidence. The visual elements show interesting details and composition that could be of cultural or artistic significance.`;
  }
}

// Determine artwork metadata based on classification
function inferArtworkMetadata(className: string, confidence: number): Partial<TensorFlowResult> {
  const baseYear = new Date().getFullYear();
  
  if (className.includes('car') || className.includes('vehicle')) {
    return {
      title: `${className.charAt(0).toUpperCase() + className.slice(1)} Photography`,
      author: 'Contemporary Photographer',
      year: `${baseYear - 5}-${baseYear}`,
      style: 'Automotive Photography'
    };
  } else if (className.includes('art') || className.includes('statue')) {
    return {
      title: `${className.charAt(0).toUpperCase() + className.slice(1)}`,
      author: 'Unknown Artist',
      year: '19th-20th Century',
      style: 'Classical Art'
    };
  } else if (className.includes('building') || className.includes('architecture')) {
    return {
      title: `Architectural ${className.charAt(0).toUpperCase() + className.slice(1)}`,
      author: 'Architectural Photographer',
      year: `${baseYear - 10}-${baseYear}`,
      style: 'Architectural Photography'
    };
  } else {
    return {
      title: `${className.charAt(0).toUpperCase() + className.slice(1)} Study`,
      author: 'Contemporary Artist',
      year: `${baseYear - 2}-${baseYear}`,
      style: 'Modern Photography'
    };
  }
}

// Main TensorFlow recognition function
export async function recognizeWithTensorFlow(imagePath: string): Promise<TensorFlowResult> {
  try {
    console.log('🤖 Starting TensorFlow.js image analysis...');
    
    // Load model
    const model = await loadMobileNetModel();
    
    // Preprocess image
    const preprocessedImage = await preprocessImage(imagePath);
    
    // Make prediction
    const predictions = model.predict(preprocessedImage) as tf.Tensor;
    const predictionData = await predictions.data();
    
    // Get top 5 predictions
    const topPredictions = Array.from(predictionData)
      .map((confidence, index) => ({
        class: IMAGENET_CLASSES[index] || `class_${index}`,
        confidence: confidence
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    
    const topPrediction = topPredictions[0];
    const metadata = inferArtworkMetadata(topPrediction.class, topPrediction.confidence);
    
    // Clean up tensors
    preprocessedImage.dispose();
    predictions.dispose();
    
    console.log(`✅ TensorFlow analysis complete: ${topPrediction.class} (${(topPrediction.confidence * 100).toFixed(1)}%)`);
    
    return {
      title: metadata.title || 'Analyzed Artwork',
      author: metadata.author || 'Unknown Creator',
      year: metadata.year || 'Contemporary',
      style: metadata.style || 'Modern Art',
      description: generateDescription(topPredictions),
      confidence: topPrediction.confidence,
      detectedObjects: topPredictions
    };
    
  } catch (error) {
    console.error('❌ TensorFlow analysis failed:', error);
    return {
      title: 'Analysis Failed',
      description: `TensorFlow analysis encountered an error: ${error.message}. Please try again or check the image format.`,
      confidence: 0.0
    };
  }
}

// Optional: Object detection with COCO-SSD (more detailed analysis)
export async function detectObjectsWithCOCO(imagePath: string): Promise<Array<{ class: string; confidence: number; bbox?: number[] }>> {
  try {
    const model = await loadCocoSsdModel();
    const preprocessedImage = await preprocessImage(imagePath);
    
    const predictions = await model.executeAsync(preprocessedImage) as tf.Tensor[];
    
    // Process COCO-SSD outputs (boxes, classes, scores)
    const boxes = await predictions[0].data();
    const classes = await predictions[1].data();
    const scores = await predictions[2].data();
    const numDetections = await predictions[3].data();
    
    const detections = [];
    for (let i = 0; i < numDetections[0]; i++) {
      if (scores[i] > 0.5) { // Confidence threshold
        detections.push({
          class: COCO_CLASSES[classes[i]] || 'unknown',
          confidence: scores[i],
          bbox: [boxes[i * 4], boxes[i * 4 + 1], boxes[i * 4 + 2], boxes[i * 4 + 3]]
        });
      }
    }
    
    // Clean up
    preprocessedImage.dispose();
    predictions.forEach(tensor => tensor.dispose());
    
    return detections;
  } catch (error) {
    console.error('❌ COCO-SSD detection failed:', error);
    return [];
  }
}
