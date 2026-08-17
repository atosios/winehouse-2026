import { API_BASE } from '../admin/api';

/**
 * Strips the trailing `/api` from API_BASE to get the backend origin.
 * Dev: http://localhost:8080
 * Production: https://api.winehouse.gr
 */
export function getBackendOrigin(): string {
  return API_BASE.replace(/\/api\/?$/, '');
}

/**
 * Robustly resolves any image, video, or document media path to its full URL:
 * - Empty/null -> ''
 * - External http(s) URLs -> unchanged (or remapped if pointing to localhost in production)
 * - 'storage/uploads/...' or '/storage/uploads/...' -> 'https://api.your-domain.gr/storage/uploads/...'
 * - 'uploads/...' -> 'https://api.your-domain.gr/storage/uploads/...'
 * - Bundled frontend static assets ('def.mp4', 'cellar_ritual.jpg', etc.) -> unchanged for frontend static serving
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const backend = getBackendOrigin();

  // If URL has localhost in production (e.g. from local seed data or testing), rewrite host
  if (
    typeof location !== 'undefined' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1'
  ) {
    if (trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1')) {
      return trimmed.replace(/^https?:\/\/[^/]+/, backend);
    }
  }

  // Already a full external/backend URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative storage path: storage/uploads/... or /storage/uploads/...
  if (trimmed.startsWith('storage/') || trimmed.startsWith('/storage/')) {
    const clean = trimmed.replace(/^\/+/, '');
    return `${backend}/${clean}`;
  }

  // Relative uploads path: uploads/... or /uploads/...
  if (trimmed.startsWith('uploads/') || trimmed.startsWith('/uploads/')) {
    const clean = trimmed.replace(/^\/+/, '');
    return `${backend}/storage/${clean}`;
  }

  // Local frontend static asset (e.g. 'def.mp4', 'cellar_ritual.jpg', 'editorial_intro.jpg')
  return trimmed;
}
