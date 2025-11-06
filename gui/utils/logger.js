// logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    const userDataPath = process.cwd();
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, 'figma-export-gui.log');
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Logger error:', error);
    }
  }

  rotateLogsIfNeeded() {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        const dir = path.dirname(this.logFile);
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith('figma-export-gui'))
          .sort()
          .reverse();
        
        if (files.length >= 5) {
          fs.unlinkSync(path.join(dir, files[files.length - 1]));
        }
        
        const timestamp = Date.now();
        fs.renameSync(this.logFile, `${this.logFile}.${timestamp}`);
      }
    } catch (error) {
      console.error('Log rotation error:', error);
    }
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message); }
  error(message) { this.log('ERROR', message); }
  debug(message) { this.log('DEBUG', message); }
}

module.exports = { Logger };