"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
class Logger {
    logFile;
    maxLogSize = 10 * 1024 * 1024;
    maxLogFiles = 5;
    constructor() {
        const userDataPath = electron_1.app ? electron_1.app.getPath('userData') : process.cwd();
        const logsDir = path_1.default.join(userDataPath, 'logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path_1.default.join(logsDir, 'figma-export-gui.log');
    }
    log(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        try {
            fs_1.default.appendFileSync(this.logFile, logEntry);
            this.rotateLogsIfNeeded();
        }
        catch (error) {
            console.error('Logger error:', error);
        }
    }
    rotateLogsIfNeeded() {
        try {
            const stats = fs_1.default.statSync(this.logFile);
            if (stats.size > this.maxLogSize) {
                const dir = path_1.default.dirname(this.logFile);
                const files = fs_1.default.readdirSync(dir)
                    .filter(f => f.startsWith('figma-export-gui'))
                    .sort()
                    .reverse();
                if (files.length >= this.maxLogFiles) {
                    fs_1.default.unlinkSync(path_1.default.join(dir, files[files.length - 1]));
                }
                const timestamp = Date.now();
                fs_1.default.renameSync(this.logFile, `${this.logFile}.${timestamp}`);
            }
        }
        catch (error) {
            console.error('Log rotation error:', error);
        }
    }
    info(message) { this.log('INFO', message); }
    warn(message) { this.log('WARN', message); }
    error(message) { this.log('ERROR', message); }
    debug(message) { this.log('DEBUG', message); }
}
exports.Logger = Logger;
