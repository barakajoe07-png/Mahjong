/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_API_KEY = 'imperial_platform_api_url';
const STORAGE_WS_KEY = 'imperial_platform_ws_url';

// In production, fit the active environment, or local defaults.
export const DEFAULT_API_URL = 'http://localhost:3000/api';
export const DEFAULT_WS_URL = 'ws://localhost:3000/ws';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  return localStorage.getItem(STORAGE_API_KEY) || DEFAULT_API_URL;
}

export function getWsBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_WS_URL;
  return localStorage.getItem(STORAGE_WS_KEY) || DEFAULT_WS_URL;
}

export function setApiUrls(apiUrl: string, wsUrl: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_API_KEY, apiUrl);
    localStorage.setItem(STORAGE_WS_KEY, wsUrl);
  }
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('imperial_demo_mode') !== 'false';
}

export function setDemoMode(active: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('imperial_demo_mode', active ? 'true' : 'false');
  }
}
