import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import Logger from '../utils/logger';

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET || 'realmeta-museum-assets';
const S3_REGION = process.env.S3_REGION || 'us-east-1';

// Initialize S3 Client
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Get the public URL for an S3 object
 */
export function getS3Url(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Generate S3 key path for museum assets
 */
export function generateS3Key(
  museumId: string,
  artworkId: string,
  type: 'main' | 'photos' | 'videos' | 'audio' | 'documents',
  filename: string
): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-z0-9.-]/gi, '_');

  if (type === 'main') {
    return `museums/${museumId}/artworks/${artworkId}/main_${timestamp}_${safeName}`;
  }
  return `museums/${museumId}/artworks/${artworkId}/${type}/${timestamp}_${safeName}`;
}

/**
 * Upload a file to S3
 * @param filePath - Local file path
 * @param s3Key - S3 object key
 * @param contentType - MIME type
 * @returns S3 URL
 */
export async function uploadToS3(
  filePath: string,
  s3Key: string,
  contentType?: string
): Promise<string> {
  try {
    Logger.info(`Uploading to S3: ${s3Key}`);

    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);

    // Determine content type
    const mimeType = contentType || getMimeType(filePath);

    // Use multipart upload for large files
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileStream,
        ContentType: mimeType,
      },
    });

    await upload.done();

    const url = getS3Url(s3Key);
    Logger.info(`Uploaded to S3: ${url}`);

    return url;
  } catch (error) {
    Logger.error(`S3 upload error: ${error}`);
    throw error;
  }
}

/**
 * Upload a buffer to S3
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  s3Key: string,
  contentType: string
): Promise<string> {
  try {
    Logger.info(`Uploading buffer to S3: ${s3Key}`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const url = getS3Url(s3Key);
    Logger.info(`Uploaded buffer to S3: ${url}`);

    return url;
  } catch (error) {
    Logger.error(`S3 buffer upload error: ${error}`);
    throw error;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    Logger.info(`Deleting from S3: ${s3Key}`);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
      })
    );

    Logger.info(`Deleted from S3: ${s3Key}`);
  } catch (error) {
    Logger.error(`S3 delete error: ${error}`);
    throw error;
  }
}

/**
 * Extract S3 key from full URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  const s3UrlPattern = new RegExp(
    `https://${S3_BUCKET}\\.s3\\.${S3_REGION}\\.amazonaws\\.com/(.+)`
  );
  const match = url.match(s3UrlPattern);
  return match ? match[1] : null;
}

/**
 * Check if URL is an S3 URL
 */
export function isS3Url(url: string): boolean {
  return url.includes(`${S3_BUCKET}.s3.`);
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default {
  uploadToS3,
  uploadBufferToS3,
  deleteFromS3,
  getS3Url,
  generateS3Key,
  extractS3KeyFromUrl,
  isS3Url,
};
