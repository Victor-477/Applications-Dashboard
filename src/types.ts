export interface AppConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  port: string;
  cwd: string;
  dependsOn?: string[];
  shell?: boolean;
  advancedEnabled?: boolean;
  alternatePorts?: string[];
  secondaryCwd?: string;
  advancedCommand?: string;
  advancedArgs?: string;
  advancedShell?: boolean;
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
