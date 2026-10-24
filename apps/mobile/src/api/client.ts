import { Platform } from 'react-native';
import type { ApiErrorResponse } from '@masar/shared';
import { ApiError } from './errors';
export { ApiError } from './errors';
const configuredUrl = Platform.OS === 'web' ? process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL : process.env.EXPO_PUBLIC_API_URL;
export const apiUrl = configuredUrl?.replace(/\/$/, '') || 'http://localhost:3001';
export function validApiUrl() {
  try { const url = new URL(apiUrl); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
let token: string | null = null;
let csrf: string | null = null;
export const credentials = {
  set: (nextToken: string | null, nextCsrf: string | null) => { token = nextToken; csrf = nextCsrf; },
};
export function photoSource(id: string, scope: 'resident'|'agency' = 'resident'): import('react-native').ImageURISource { return { uri: `${apiUrl}/${scope}/photos/${id}`, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }; }
export async function privatePhotoBlob(id: string, scope: 'resident'|'agency' = 'resident') { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000); try { const response = await fetch(`${apiUrl}/${scope}/photos/${id}`, { credentials: 'include', signal: controller.signal }); if (!response.ok) throw new ApiError('UNAVAILABLE', response.status); return await response.blob(); } finally { clearTimeout(timer); } }
export async function request<T>(path: string, method = 'GET', body?: unknown, timeoutMs = 10000): Promise<T> {
  if (!validApiUrl()) throw new ApiError('NETWORK');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method, signal: controller.signal,
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...(Platform.OS !== 'web' && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as ApiErrorResponse | null;
      throw new ApiError(error?.error?.code ?? 'INTERNAL', response.status, error?.error?.message);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('NETWORK'); }
  finally { clearTimeout(timeout); }
}
