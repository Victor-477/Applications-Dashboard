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

export type AppView = 'services' | 'settings' | 'ai' | 'patches' | 'about';

export type SettingsTab = 'apps' | 'logs' | 'general' | 'style';

export type ThemeMode = 'light' | 'dark';

export interface ProgramSettings {
  homepageUrl: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'openai-compatible';
  aiModel: string;
  aiBaseUrl: string;
  aiApiKeySet: boolean;
  themeMode: ThemeMode;
  accentColor: string;
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

export interface PatchSummarySection {
  title: string;
  items: string[];
}

export interface PatchSummary {
  title: string;
  description: string;
  currentVersion?: string;
  date?: string;
  mainArea?: string;
  sections: PatchSummarySection[];
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
