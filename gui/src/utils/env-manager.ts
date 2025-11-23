import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { config } from 'dotenv';
import { Logger } from './logger';

export class EnvManager {
  private logger: Logger;
  private envPath: string;
  private userDataDir: string;

  constructor() {
    this.logger = new Logger();

    const baseUserDataDir = app?.isPackaged
      ? path.join(app.getPath('userData'), '.userData')
      : path.join(process.cwd(), '..', '.userData');

    if (!fs.existsSync(baseUserDataDir)) {
      fs.mkdirSync(baseUserDataDir, { recursive: true });
    }

    this.userDataDir = baseUserDataDir;
    this.envPath = path.join(baseUserDataDir, '.env');
    this.logger.info('Looking for .env file at: ' + this.envPath);
  }

  async readEnv(): Promise<Record<string, string>> {
    try {
      if (fs.existsSync(this.envPath)) {
        const envConfig = config({ path: this.envPath });
        return envConfig.parsed || {};
      }
      return {};
    } catch (error) {
      this.logger.error('Error reading .env file: ' + error);
      return {};
    }
 }

  async writeEnv(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
    try {
      let content = '';
      content += `CONFIG_VERSION="1.0"\n`;
      for (const [key, value] of Object.entries(config)) {
        if (value && value.trim() !== '') {
          content += `${key}="${value.trim()}"\n`;
        }
      }

      fs.writeFileSync(this.envPath, content, 'utf8');
      this.logger.info('.env file updated successfully');
      
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      this.logger.error('Error writing .env file: ' + error);
      return {
        success: false,
        message: 'Failed to save configuration'
      };
    }
 }

  validateConfig(config: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.FIGMA_ACCESS_TOKEN) {
      errors.push('FIGMA_ACCESS_TOKEN is required');
    } else if (!config.FIGMA_ACCESS_TOKEN.startsWith('figd_')) {
      errors.push('FIGMA_ACCESS_TOKEN must start with "figd_"');
    }

    if (!config.DOWNLOAD_PATH) {
      errors.push('DOWNLOAD_PATH is required');
    }

    if (!config.WAIT_TIMEOUT || isNaN(Number(config.WAIT_TIMEOUT)) || Number(config.WAIT_TIMEOUT) < 5000 || Number(config.WAIT_TIMEOUT) > 60000) {
      errors.push('WAIT_TIMEOUT must be a number between 5000 and 60000 milliseconds');
    }

    const maxFiles = Number(config.MAX_FILES);
    if (config.MAX_FILES === undefined || config.MAX_FILES === null || String(config.MAX_FILES).trim() === '') {
      errors.push('MAX_FILES is required');
    } else if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 45) {
      errors.push('MAX_FILES must be an integer between 1 and 45');
    }

    if (config.DEBUG_MODE) {
      const debugMode = String(config.DEBUG_MODE).toLowerCase();
      if (!['on', 'off'].includes(debugMode)) {
        errors.push('DEBUG_MODE must be "on" or "off"');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getEnvPath(): string {
    return this.envPath;
  }

  getUserDataDir(): string {
    return this.userDataDir;
  }
}
