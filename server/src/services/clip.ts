import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

// Configure transformers.js to use local cache
env.cacheDir = path.join(__dirname, '..', '..', '.cache');

// Singleton pattern for model loading (expensive operation)
let clipModel: any = null;

/**
 * Load CLIP model (cached after first load)
 */
async function loadCLIPModel() {
  if (!clipModel) {
    console.log('📦 Loading CLIP model (this may take a moment on first run)...');
    clipModel = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
    console.log('✅ CLIP model loaded successfully');
  }
  return clipModel;
}

/**
 * Generate CLIP embedding from image file
 * @param imagePath - Absolute path to image file
 * @returns 512-dimensional embedding vector
 */
export async function generateImageEmbedding(imagePath: string): Promise<number[]> {
  try {
    console.log(`🎨 Generating CLIP embedding for: ${imagePath}`);

    // Verify file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Load model
    const model = await loadCLIPModel();

    // Generate embedding
    const result = await model(imagePath);

    // Extract embedding data (convert to plain array)
    const embedding: number[] = Array.from(result.data);

    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);

    return embedding;
  } catch (error) {
    console.error('❌ Error generating CLIP embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * @param embeddingA - First embedding vector
 * @param embeddingB - Second embedding vector
 * @returns Similarity score between 0 and 1 (1 = identical)
 */
export function cosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    magnitudeA += embeddingA[i] * embeddingA[i];
    magnitudeB += embeddingB[i] * embeddingB[i];
  }

  // Calculate magnitudes
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Calculate cosine similarity
  const similarity = dotProduct / (magnitudeA * magnitudeB);

  return similarity;
}

/**
 * Find best matching artwork from array based on embedding similarity
 * @param queryEmbedding - Embedding from visitor's photo
 * @param artworks - Array of artworks with embeddings
 * @returns Matched artwork info with confidence score
 */
export interface MatchResult {
  artwork: any;
  score: number;
}

export function findBestMatches(
  queryEmbedding: number[],
  artworks: any[],
  topN: number = 3
): MatchResult[] {
  // Calculate similarity for each artwork
  const matches: MatchResult[] = artworks
    .filter(artwork => artwork.imageEmbedding && artwork.imageEmbedding.length > 0)
    .map(artwork => ({
      artwork,
      score: cosineSimilarity(queryEmbedding, artwork.imageEmbedding)
    }));

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);

  // Return top N matches
  return matches.slice(0, topN);
}

/**
 * Determine if a match is confident enough
 * @param score - Similarity score (0-1)
 * @param threshold - Minimum threshold (default 0.7)
 * @returns Boolean indicating if match is confident
 */
export function isConfidentMatch(score: number, threshold: number = 0.7): boolean {
  return score >= threshold;
}

export default {
  generateImageEmbedding,
  cosineSimilarity,
  findBestMatches,
  isConfidentMatch
};
