// node-checker.js
const { execSync } = require('child_process');
const { Logger } = require('./logger');

class NodeChecker {
  constructor() {
    this.logger = new Logger();
  }

  async checkNodeJS() {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim();
      const path = execSync('which node', { encoding: 'utf8' }).trim();
      const versionNumber = version.replace('v', '');
      const majorVersion = parseInt(versionNumber.split('.')[0]);
      
      return {
        installed: true,
        version,
        path,
        meetsRequirement: majorVersion >= 20
      };
    } catch (error) {
      this.logger.error('Node.js not found: ' + error);
      return { installed: false };
    }
  }

  async installNodeJS() {
    try {
      // Проверка наличия Homebrew
      execSync('which brew', { encoding: 'utf8' });
      
      // Установка Node.js через Homebrew
      execSync('brew install node@20', { stdio: 'pipe' });
      
      return {
        success: true,
        message: 'Node.js v20 успешно установлен через Homebrew'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Ошибка установки Node.js. Установите вручную: https://nodejs.org'
      };
    }
  }
}

module.exports = { NodeChecker };