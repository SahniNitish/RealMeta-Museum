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
