// env-manager.js
const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');
const { Logger } = require('./logger');

class EnvManager {
  constructor() {
    this.logger = new Logger();
    this.envPath = path.join(process.cwd(), '.env');
  }

  async readEnv() {
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

  async writeEnv(config) {
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

  validateConfig(config) {
    const errors = [];
    
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

    // Валидация аккаунтов
    const hasAccount = 
      (config.FIGMA_ACCOUNT_1_EMAIL && config.FIGMA_ACCOUNT_1_PASSWORD) ||
      config.FIGMA_ACCOUNT_1_AUTH_COOKIE;
    
    if (!hasAccount) {
      errors.push('Минимум один аккаунт Figma обязателен');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { EnvManager };