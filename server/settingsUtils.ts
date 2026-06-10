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
  };
}

export function normalizeThemeMode(value: unknown): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : 'light';
}

export function normalizeHomepageMode(value: unknown): 'internal' | 'custom' {
  return value === 'custom' ? 'custom' : 'internal';
}

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
  };
}
