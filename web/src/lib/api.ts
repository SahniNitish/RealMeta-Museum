// API Configuration - automatically uses correct URL for dev/production
const getApiHost = () => {
  // In production, use the environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, use localhost with port 4000
  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:4000`;
  }

  // Fallback for production without env var (same domain)
  return window.location.origin;
};

export const API_HOST = getApiHost();
export const API_BASE = `${API_HOST}/api`;
