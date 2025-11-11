import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Logger } from './logger';

export class EnvManager {
  private logger: Logger;
 private envPath: string;

  constructor() {
    this.logger = new Logger();
    // Ищем .env файл в корне проекта (на уровень выше gui/)
    this.envPath = path.join(process.cwd(), '..', '.env');
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
    } else {
      try {
        fs.accessSync(config.DOWNLOAD_PATH, fs.constants.W_OK);
      } catch {
        errors.push('DOWNLOAD_PATH недоступен для записи');
      }
    }

    // Валидация параметров таймаута
    if (!config.WAIT_TIMEOUT || isNaN(Number(config.WAIT_TIMEOUT)) || Number(config.WAIT_TIMEOUT) < 5000 || Number(config.WAIT_TIMEOUT) > 600) {
      errors.push('WAIT_TIMEOUT должен быть числом от 5000 до 60000');
    }

    // Валидация максимального количества файлов
    if (!config.MAX_FILES || isNaN(Number(config.MAX_FILES)) || Number(config.MAX_FILES) < 1 || Number(config.MAX_FILES) > 200) {
      errors.push('MAX_FILES должен быть числом от 1 до 200');
    }

    // Валидация аккаунтов
    let hasValidAccount = false;
    
    // Проверяем аккаунты по шаблону FIGMA_ACCOUNT_N_*
    for (let i = 1; i <= 10; i++) { // Проверяем до 10 аккаунтов
      const accountType = config[`FIGMA_ACCOUNT_${i}_TYPE`];
      const accountEmail = config[`FIGMA_ACCOUNT_${i}_EMAIL`];
      const accountPassword = config[`FIGMA_ACCOUNT_${i}_PASSWORD`];
      const accountCookie = config[`FIGMA_ACCOUNT_${i}_AUTH_COOKIE`];
      
      if (accountType === 'password' && accountEmail && accountPassword) {
        hasValidAccount = true;
        break;
      } else if (accountType === 'cookie' && accountCookie) {
        hasValidAccount = true;
        break;
      } else if (accountEmail || accountPassword || accountCookie) {
        // Если есть какие-то данные аккаунта, но не все, добавляем ошибку
        if (accountType === 'password' && (!accountEmail || !accountPassword)) {
          errors.push(`Аккаунт ${i}: для типа 'password' требуются EMAIL и PASSWORD`);
        } else if (accountType === 'cookie' && !accountCookie) {
          errors.push(`Аккаунт ${i}: для типа 'cookie' требуется AUTH_COOKIE`);
        }
      }
    }
    
    if (!hasValidAccount) {
      errors.push('Минимум один аккаунт Figma обязателен (Email+Password ИЛИ Cookie)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}