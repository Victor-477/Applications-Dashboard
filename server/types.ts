import type express from 'express';

export interface AppConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  port: string;
  cwd: string;
  dependsOn?: string[];
  shell?: boolean;
  enabled?: boolean;
  advancedEnabled?: boolean;
  alternatePorts?: string[];
  secondaryCwd?: string;
  advancedCommand?: string;
  advancedArgs?: string;
  advancedShell?: boolean;
}

export interface ProgramSettingsFile {
  homepageUrl: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl: string;
  aiApiKey: string;
  themeMode: 'light' | 'dark';
  accentColor: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'system';
  source: string;
  message: string;
}

export type QueryParams = express.Request['query'];
