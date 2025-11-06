"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            (await Promise.resolve().then(() => __importStar(require('fs')))).accessSync(brewPath, (await Promise.resolve().then(() => __importStar(require('fs')))).constants.W_OK);
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
