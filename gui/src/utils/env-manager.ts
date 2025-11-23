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

    // In packaged apps process.cwd() may be '/', so rely on Electron userData path there.
    const baseUserDataDir = app?.isPackaged
      ? path.join(app.getPath('userData'), '.userData')
      : path.join(process.cwd(), '..', '.userData');

    if (!fs.existsSync(baseUserDataDir)) {
      fs.mkdirSync(baseUserDataDir, { recursive: true });
    }

    this.userDataDir = baseUserDataDir;
    // Ищем .env файл в .userData на уровень выше gui/
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
      
      // Добавляем версию конфигурации
      content += `CONFIG_VERSION="1.0"\n`;
      
      // Записываем все параметры
      for (const [key, value] of Object.entries(config)) {
        if (value && value.trim() !== '') {
          content += `${key}="${value.trim()}"\n`;
        }
      }

      fs.writeFileSync(this.envPath, content, 'utf8');
      this.logger.info('.env file updated successfully');
      
      return {
        success: true,
        message: 'Конфигурация сохранена успешно'
      };
    } catch (error) {
      this.logger.error('Error writing .env file: ' + error);
      return {
        success: false,
        message: 'Ошибка сохранения конфигурации'
      };
    }
 }

  validateConfig(config: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Валидация токена
    if (!config.FIGMA_ACCESS_TOKEN) {
      errors.push('FIGMA_ACCESS_TOKEN обязателен');
    } else if (!config.FIGMA_ACCESS_TOKEN.startsWith('figd_')) {
      errors.push('FIGMA_ACCESS_TOKEN должен начинаться с "figd_"');
    }

    // Валидация пути загрузки
    if (!config.DOWNLOAD_PATH) {
      errors.push('DOWNLOAD_PATH обязателен');
    }

    // Валидация параметров таймаута
    if (!config.WAIT_TIMEOUT || isNaN(Number(config.WAIT_TIMEOUT)) || Number(config.WAIT_TIMEOUT) < 5000 || Number(config.WAIT_TIMEOUT) > 60000) {
      errors.push('WAIT_TIMEOUT должен быть числом от 5000 до 60000');
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
