"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeChecker = void 0;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
class NodeChecker {
    logger;
    constructor() {
        this.logger = new logger_1.Logger();
    }
    async checkNodeJS() {
        try {
            const version = (0, child_process_1.execSync)('node --version', { encoding: 'utf8' }).trim();
            const path = (0, child_process_1.execSync)('which node', { encoding: 'utf8' }).trim();
            const versionNumber = version.replace('v', '');
            const majorVersion = parseInt(versionNumber.split('.')[0]);
            return {
                installed: true,
                version,
                path,
                meetsRequirement: majorVersion >= 20
            };
        }
        catch (error) {
            this.logger.error('Node.js not found: ' + error);
            return { installed: false };
        }
    }
    async installNodeJS() {
        try {
            (0, child_process_1.execSync)('which brew', { encoding: 'utf8' });
            (0, child_process_1.execSync)('brew install node@20', { stdio: 'pipe' });
            return {
                success: true,
                message: 'Node.js v20 успешно установлен через Homebrew'
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Ошибка установки Node.js. Установите вручную: https://nodejs.org'
            };
        }
    }
    async checkPermissions() {
        const brewPath = '/usr/local/bin';
        try {
            require('fs').accessSync(brewPath, require('fs').constants.W_OK);
            return { canWrite: true };
        }
        catch {
            try {
                const result = (0, child_process_1.execSync)('sudo -n echo test', { encoding: 'utf8' });
                if (result.trim() === 'test') {
                    return { canWrite: true, needsSudo: true };
                }
                return {
                    canWrite: false,
                    suggestion: 'Требуется пароль sudo для установки Homebrew'
                };
            }
            catch {
                return {
                    canWrite: false,
                    suggestion: 'Требуются права администратора для установки Homebrew'
                };
            }
        }
    }
}
exports.NodeChecker = NodeChecker;
