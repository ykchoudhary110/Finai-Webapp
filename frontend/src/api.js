// Centralized API Base URL
// In development, falls back to empty string (handled by Vite proxy)
// In production, connects directly to our live Render backend
export const API_BASE = import.meta.env.VITE_API_URL || 'https://finai-backend-kapn.onrender.com';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
