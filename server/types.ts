import type express from 'express';

export interface AppConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  port: string;
  cwd: string;
  webLink?: string;
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
  homepageMode: 'internal' | 'custom';
  homepageUrl: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl: string;
  aiApiKey: string;
  themeMode: 'light' | 'dark';
  accentColor: string;
  dashboardLayout: 'cards' | 'list';
  aiChatEnabled: boolean;
  apiTesterEnabled: boolean;
  connectivityTesterEnabled: boolean;
  /** Port the panel's HTTP server listens on. 0 = use environment default. */
  internalApiPort: number;
  /** When true the server binds to 0.0.0.0 (LAN reachable). Otherwise 127.0.0.1. */
  internalApiRemoteAccess: boolean;
  /** Master switch for every advanced feature. Off hides them all without wiping their saved config. */
  advancedFeaturesEnabled: boolean;
  /** Individual toggle for the Apache-style static web server feature. */
  webServerEnabled: boolean;
  /** Port used by the static web server when it is running. */
  webServerPort: number;
  /** Absolute path of the folder currently served by the static web server. */
  webServerRootFolder: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'system';
  source: string;
  message: string;
}

export type QueryParams = express.Request['query'];
