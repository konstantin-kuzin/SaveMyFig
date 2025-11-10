import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class Logger {
  private logFile: string;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, 'figma-export-gui.log');
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Logger error:', error);
    }
 }

  private rotateLogsIfNeeded(): void {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        const dir = path.dirname(this.logFile);
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith('figma-export-gui'))
          .sort()
          .reverse();
        
        if (files.length >= this.maxLogFiles) {
          fs.unlinkSync(path.join(dir, files[files.length - 1]));
        }
        
        const timestamp = Date.now();
        fs.renameSync(this.logFile, `${this.logFile}.${timestamp}`);
      }
    } catch (error) {
      console.error('Log rotation error:', error);
    }
  }

  info(message: string): void { this.log('INFO', message); }
  warn(message: string): void { this.log('WARN', message); }
 error(message: string): void { this.log('ERROR', message); }
  debug(message: string): void { this.log('DEBUG', message); }
}