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
exports.EnvManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = require("dotenv");
const logger_1 = require("./logger");
class EnvManager {
    logger;
    envPath;
    constructor() {
        this.logger = new logger_1.Logger();
        this.envPath = path.join(process.cwd(), '.env');
    }
    async readEnv() {
        try {
            if (fs.existsSync(this.envPath)) {
                const envConfig = (0, dotenv_1.config)({ path: this.envPath });
                return envConfig.parsed || {};
            }
            return {};
        }
        catch (error) {
            this.logger.error('Error reading .env file: ' + error);
            return {};
        }
    }
    async writeEnv(config) {
        try {
            let content = '';
            content += `CONFIG_VERSION="1.0"\n`;
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
        }
        catch (error) {
            this.logger.error('Error writing .env file: ' + error);
            return {
                success: false,
                message: 'Ошибка сохранения конфигурации'
            };
        }
    }
    validateConfig(config) {
        const errors = [];
        if (!config.FIGMA_ACCESS_TOKEN) {
            errors.push('FIGMA_ACCESS_TOKEN обязателен');
        }
        else if (!config.FIGMA_ACCESS_TOKEN.startsWith('figd_')) {
            errors.push('FIGMA_ACCESS_TOKEN должен начинаться с "figd_"');
        }
        if (!config.DOWNLOAD_PATH) {
            errors.push('DOWNLOAD_PATH обязателен');
        }
        else {
            try {
                fs.accessSync(config.DOWNLOAD_PATH, fs.constants.W_OK);
            }
            catch {
                errors.push('DOWNLOAD_PATH недоступен для записи');
            }
        }
        if (!config.WAIT_TIMEOUT || isNaN(Number(config.WAIT_TIMEOUT)) || Number(config.WAIT_TIMEOUT) < 5000 || Number(config.WAIT_TIMEOUT) > 600) {
            errors.push('WAIT_TIMEOUT должен быть числом от 5000 до 60000');
        }
        if (!config.MAX_FILES || isNaN(Number(config.MAX_FILES)) || Number(config.MAX_FILES) < 1 || Number(config.MAX_FILES) > 200) {
            errors.push('MAX_FILES должен быть числом от 1 до 200');
        }
        let hasValidAccount = false;
        for (let i = 1; i <= 10; i++) {
            const accountType = config[`FIGMA_ACCOUNT_${i}_TYPE`];
            const accountEmail = config[`FIGMA_ACCOUNT_${i}_EMAIL`];
            const accountPassword = config[`FIGMA_ACCOUNT_${i}_PASSWORD`];
            const accountCookie = config[`FIGMA_ACCOUNT_${i}_AUTH_COOKIE`];
            if (accountType === 'password' && accountEmail && accountPassword) {
                hasValidAccount = true;
                break;
            }
            else if (accountType === 'cookie' && accountCookie) {
                hasValidAccount = true;
                break;
            }
            else if (accountEmail || accountPassword || accountCookie) {
                if (accountType === 'password' && (!accountEmail || !accountPassword)) {
                    errors.push(`Аккаунт ${i}: для типа 'password' требуются EMAIL и PASSWORD`);
                }
                else if (accountType === 'cookie' && !accountCookie) {
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
exports.EnvManager = EnvManager;
