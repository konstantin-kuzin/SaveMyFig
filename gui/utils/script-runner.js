// script-runner.js
const { Logger } = require('./logger');

class ScriptRunner {
  constructor() {
    this.logger = new Logger();
    this.currentProcess = null;
    this.execa = null;
  }

  async initialize() {
    if (!this.execa) {
      const execaModule = await import('execa');
      this.execa = execaModule.execa || execaModule.default || execaModule;
    }
  }

  async installDependencies() {
    try {
      await this.initialize();
      
      this.logger.info('Starting npm install...');
      
      this.currentProcess = this.execa('npm', ['install'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 600000 // 10 минут
      });

      this.currentProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        this.logger.info(text);
      });

      this.currentProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        this.logger.warn(text);
      });

      await this.currentProcess;
      
      // Установка Playwright browsers
      this.logger.info('Installing Playwright browsers...');
      await this.execa('npx', ['playwright', 'install'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 300000 // 5 минут
      });

      return {
        success: true,
        message: 'Зависимости успешно установлены'
      };
    } catch (error) {
      this.logger.error('Installation failed: ' + error.message);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    } finally {
      this.currentProcess = null;
    }
 }

  async runScript(
    command,
    onOutput
  ) {
    try {
      await this.initialize();
      
      this.logger.info(`Running script: ${command}`);
      
      this.currentProcess = this.execa('npm', ['run', command], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 3600000 // 1 час
      });

      this.currentProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        this.logger.info(text);
        onOutput?.(text);
        
        // Парсинг прогресса
        const progress = this.parseProgress(text);
        if (progress) {
          // Отправляем прогресс в renderer
        }
      });

      this.currentProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        this.logger.warn(text);
        onOutput?.(text);
      });

      const result = await this.currentProcess;
      
      return {
        success: true,
        message: `Команда ${command} выполнена успешно`
      };
    } catch (error) {
      this.logger.error(`Script ${command} failed: ${error.message}`);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    } finally {
      this.currentProcess = null;
    }
  }

 stopScript() {
    if (this.currentProcess && this.execa) {
      this.currentProcess.kill('SIGTERM');
      this.logger.info('Script stopped by user');
    }
  }

  parseProgress(text) {
    const patterns = [
      /(?:Downloaded|Скачано|Загрузили).*?(\d+)\/(\d+)/gi,
      /\[(\d+)\/(\d+)\]/gi,
      /Progress:?\s*(\d+)%/gi,
      /(\d+)\s*of\s*(\d+)\s*files?/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          current: parseInt(match[1], 10),
          total: parseInt(match[2], 10)
        };
      }
    }
    return null;
  }

  getErrorMessage(error) {
    if ((error).timedOut) {
      return 'Процесс превысил лимит времени';
    }
    if ((error).signal) {
      return `Процесс завершен сигналом: ${(error).signal}`;
    }
    if ((error).code !== undefined) {
      return `Процесс завершился с кодом ошибки ${(error).code}`;
    }
    return error.message || 'Неизвестная ошибка';
  }
}

module.exports = { ScriptRunner };