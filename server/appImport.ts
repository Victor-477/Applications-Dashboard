import crypto from 'crypto';
import type { AppConfig } from './types';

function normalizeText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

export function normalizeImportedApp(raw: any, index: number, usedIds: Set<string>): AppConfig {
  const name = normalizeText(raw?.name);
  const command = normalizeText(raw?.command);

  if (!name || !command) {
    throw new Error(`Invalid instance at position ${index + 1}: name and command are required.`);
  }

  const requestedId = normalizeText(raw?.id);
  const id = requestedId && !usedIds.has(requestedId) ? requestedId : crypto.randomUUID();
  usedIds.add(id);

  const advancedEnabled = Boolean(raw?.advancedEnabled);
  return {
    id,
    name,
    command,
    args: normalizeText(raw?.args),
    port: normalizeText(raw?.port),
    cwd: normalizeText(raw?.cwd),
    webLink: normalizeText(raw?.webLink),
    dependsOn: normalizeStringList(raw?.dependsOn),
    shell: raw?.shell !== false,
    enabled: raw?.enabled !== false,
    advancedEnabled,
    alternatePorts: advancedEnabled ? normalizeStringList(raw?.alternatePorts) : [],
    secondaryCwd: advancedEnabled ? normalizeText(raw?.secondaryCwd) : '',
    advancedCommand: advancedEnabled ? normalizeText(raw?.advancedCommand) : '',
    advancedArgs: advancedEnabled ? normalizeText(raw?.advancedArgs) : '',
    advancedShell: advancedEnabled ? raw?.advancedShell !== false : true,
  };
}

export function getImportAppsFromPayload(payload: any) {
  const apps = Array.isArray(payload) ? payload : payload?.apps;
  if (!Array.isArray(apps)) {
    throw new Error('Import payload must be an array of instances or an object with an apps array.');
  }
  if (apps.length === 0) {
    throw new Error('Import payload does not contain any instances.');
  }
  if (apps.length > 200) {
    throw new Error('Import payload contains too many instances. Maximum allowed is 200.');
  }
  return apps;
}
