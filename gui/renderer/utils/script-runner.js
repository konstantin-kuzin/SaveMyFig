"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptRunner = void 0;
const logger_1 = require("./logger");
const child_process_1 = require("child_process");
class ScriptRunner {
    logger;
    currentProcess = null;
    constructor() {
        this.logger = new logger_1.Logger();
    }
    async installDependencies() {
        try {
            this.logger.info('Starting npm install...');
            this.currentProcess = (0, child_process_1.spawn)('npm', ['install'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                this.logger.info(text);
            });
            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                this.logger.warn(text);
            });
            await new Promise((resolve, reject) => {
                this.currentProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Process exited with code ${code}`));
                    }
                });
                this.currentProcess.on('error', (error) => {
                    reject(error);
                });
            });
            this.logger.info('Installing Playwright browsers...');
            const playwrightProcess = (0, child_process_1.spawn)('npx', ['playwright', 'install'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            await new Promise((resolve, reject) => {
                playwrightProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Playwright process exited with code ${code}`));
                    }
                });
                playwrightProcess.on('error', (error) => {
                    reject(error);
                });
            });
            return {
                success: true,
                message: 'Зависимости успешно установлены'
            };
        }
        catch (error) {
            this.logger.error('Installation failed: ' + error.message);
            return {
                success: false,
                message: error.message || 'Неизвестная ошибка установки'
            };
        }
        finally {
            this.currentProcess = null;
        }
    }
    async runScript(command, onOutput, onProgress) {
        try {
            this.logger.info(`Running script: ${command}`);
            this.currentProcess = (0, child_process_1.spawn)('npm', ['run', command], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                this.logger.info(text);
                onOutput?.(text);
                const progress = this.parseProgress(text);
                if (progress) {
                    onProgress?.(progress);
                }
            });
            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                this.logger.warn(text);
                onOutput?.(text);
            });
            const result = await new Promise((resolve) => {
                this.currentProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve({
                            success: true,
                            message: `Команда ${command} выполнена успешно`
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            message: `Команда ${command} завершена с кодом ошибки ${code}`
                        });
                    }
                });
                this.currentProcess.on('error', (error) => {
                    resolve({
                        success: false,
                        message: `Ошибка выполнения команды ${command}: ${error.message}`
                    });
                });
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Script ${command} failed: ${error.message}`);
            return {
                success: false,
                message: error.message || 'Неизвестная ошибка выполнения скрипта'
            };
        }
        finally {
            this.currentProcess = null;
        }
    }
    stopScript() {
        if (this.currentProcess) {
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
        if (error.timedOut) {
            return 'Процесс превысил лимит времени';
        }
        if (error.signal) {
            return `Процесс завершен сигналом: ${error.signal}`;
        }
        if (error.exitCode !== undefined) {
            return `Процесс завершился с кодом ошибки ${error.exitCode}`;
        }
        return error.message || 'Неизвестная ошибка';
    }
}
exports.ScriptRunner = ScriptRunner;
