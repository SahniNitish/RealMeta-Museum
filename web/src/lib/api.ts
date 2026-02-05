// API Configuration - automatically uses correct URL for dev/production
const getApiHost = () => {
  // In development, use localhost with port 4000
  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:4000`;
  }

  // Production: Railway API URL
  return 'https://realmeta-museum-production.up.railway.app';
};

export const API_HOST = getApiHost();
export const API_BASE = `${API_HOST}/api`;

/**
 * Get the full URL for a media file
 * Handles both S3 URLs (already full URLs) and local uploads (need API_HOST prefix)
 */
export function getMediaUrl(url: string | undefined | null): string {
  if (!url) return '';

  // If it's already a full URL (S3 or external), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Local upload - prepend API_HOST
  return `${API_HOST}${url}`;
}
