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

export type AppView = 'services' | 'settings' | 'ai' | 'patches';

export type SettingsTab = 'apps' | 'logs' | 'general';

export interface ProgramSettings {
  homepageUrl: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl: string;
  aiApiKeySet: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PatchNote {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface GitCommit {
  hash: string;
  subject: string;
  date: string;
  body?: string;
}

export interface AppState {
  config: AppConfig;
  status: 'stopped' | 'running';
  pid?: number;
  activePort?: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'system';
  message: string;
}

export interface SystemLogLine {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'system';
  source: string;
  message: string;
}
