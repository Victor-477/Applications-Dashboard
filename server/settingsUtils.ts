import type { ProgramSettingsFile } from './types';

export function getDefaultSettings(): ProgramSettingsFile {
  return {
    homepageUrl: 'http://localhost',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: '',
    aiApiKey: '',
    themeMode: 'light',
    accentColor: '#009dea',
  };
}

export function normalizeThemeMode(value: unknown): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : 'light';
}

export function normalizeAccentColor(value: unknown, fallback = '#009dea') {
  const color = String(value || fallback).trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function publicSettings(settings: ProgramSettingsFile) {
  return {
    homepageUrl: settings.homepageUrl,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiBaseUrl: settings.aiBaseUrl,
    aiApiKeySet: Boolean(settings.aiApiKey),
    themeMode: normalizeThemeMode(settings.themeMode),
    accentColor: normalizeAccentColor(settings.accentColor),
  };
}
