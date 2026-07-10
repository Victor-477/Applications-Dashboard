import type { ProgramSettingsFile } from './types';

export function getDefaultSettings(): ProgramSettingsFile {
  return {
    homepageMode: 'internal',
    homepageUrl: 'http://localhost',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: '',
    aiApiKey: '',
    themeMode: 'light',
    accentColor: '#009dea',
    dashboardLayout: 'cards',
    aiChatEnabled: true,
    apiTesterEnabled: false,
    connectivityTesterEnabled: false,
    internalApiPort: 0,
    internalApiRemoteAccess: false,
  };
}

/**
 * Coerces a saved port value into a valid TCP port, or 0 when it should fall
 * back to the environment / built-in default. Values outside 1-65535 collapse
 * to 0 so bad input never keeps the server from starting.
 */
export function normalizeInternalApiPort(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const port = Math.trunc(parsed);
  if (port <= 0 || port > 65535) return 0;
  return port;
}

export function normalizeThemeMode(value: unknown): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : 'light';
}

/**
 * Coerces a feature flag from arbitrary input. A missing/undefined value falls
 * back to the previous state, so disabling a feature never wipes its saved
 * configuration (e.g. AI provider or API key).
 */
export function normalizeFeatureFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

/** HomePage source: the panel's own internal page, or a user-provided URL. Defaults to internal. */
export function normalizeHomepageMode(value: unknown): 'internal' | 'custom' {
  return value === 'custom' ? 'custom' : 'internal';
}

/** Dashboard instance presentation: large cards or a compact list. Defaults to cards. */
export function normalizeDashboardLayout(value: unknown): 'cards' | 'list' {
  return value === 'list' ? 'list' : 'cards';
}

export function normalizeAccentColor(value: unknown, fallback = '#009dea') {
  const color = String(value || fallback).trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function publicSettings(settings: ProgramSettingsFile) {
  return {
    homepageMode: normalizeHomepageMode(settings.homepageMode),
    homepageUrl: settings.homepageUrl,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiBaseUrl: settings.aiBaseUrl,
    aiApiKeySet: Boolean(settings.aiApiKey),
    themeMode: normalizeThemeMode(settings.themeMode),
    accentColor: normalizeAccentColor(settings.accentColor),
    dashboardLayout: normalizeDashboardLayout(settings.dashboardLayout),
    aiChatEnabled: normalizeFeatureFlag(settings.aiChatEnabled, true),
    apiTesterEnabled: normalizeFeatureFlag(settings.apiTesterEnabled, false),
    connectivityTesterEnabled: normalizeFeatureFlag(settings.connectivityTesterEnabled, false),
    internalApiPort: normalizeInternalApiPort(settings.internalApiPort),
    internalApiRemoteAccess: normalizeFeatureFlag(settings.internalApiRemoteAccess, false),
  };
}
