// Centralized API Base URL
// In development, falls back to empty string (handled by Vite proxy)
// In production, uses VITE_API_URL if set, or empty string (handled by Vercel rewrites)
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
