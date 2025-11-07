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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sqlite3 = __importStar(require("sqlite3"));
const logger_1 = require("./logger");
class DatabaseManager {
    logger;
    dbPath;
    db = null;
    constructor() {
        this.logger = new logger_1.Logger();
        this.dbPath = path_1.default.join(process.cwd(), '..', 'figma_backups.db');
        this.initializeDatabase();
    }
    initializeDatabase() {
        if (!fs_1.default.existsSync(this.dbPath)) {
            this.logger.warn('Database file not found, using existing database or it will be created by original scripts');
        }
        else {
            this.logger.info('Database found at: ' + this.dbPath);
        }
    }
    getDB() {
        if (!this.db) {
            this.db = new sqlite3.Database(this.dbPath);
        }
        return this.db;
    }
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            const db = this.getDB();
            db.all(sql, params, (err, rows) => {
                if (err) {
                    this.logger.error(`Database query error: ${err.message}`);
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async getBackupsNeedingBackup() {
        const sql = `
      SELECT * FROM backups
      WHERE (last_modified_date > last_backup_date OR last_backup_date IS NULL)
        AND (next_attempt_date IS NULL OR next_attempt_date <= datetime('now'))
      ORDER BY
        CASE
          WHEN last_backup_date IS NULL THEN 0
          ELSE 1
        END,
        last_backup_date ASC
    `;
        return await this.query(sql);
    }
    async getAllBackups() {
        const sql = 'SELECT * FROM backups ORDER BY last_backup_date DESC';
        return await this.query(sql);
    }
    async getStatistics() {
        const total = await this.query('SELECT COUNT(*) as count FROM backups');
        const needingBackup = await this.query(`
      SELECT COUNT(*) as count FROM backups
      WHERE (last_modified_date > last_backup_date OR last_backup_date IS NULL)
        AND (next_attempt_date IS NULL OR next_attempt_date <= datetime('now'))
    `);
        const withErrors = await this.query(`
      SELECT COUNT(*) as count FROM backups
      WHERE next_attempt_date IS NOT NULL
    `);
        return {
            total: total[0].count,
            needingBackup: needingBackup[0].count,
            withErrors: withErrors[0].count
        };
    }
    async resetErrors() {
        return new Promise((resolve, reject) => {
            const db = this.getDB();
            db.run(`
        UPDATE backups
        SET next_attempt_date = NULL
        WHERE next_attempt_date IS NOT NULL
      `, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    const changes = this.changes;
                    resolve({
                        success: true,
                        message: `Сброшено ${changes} записей с ошибками`
                    });
                }
            });
        });
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.logger.info('Database connection closed');
        }
    }
}
exports.DatabaseManager = DatabaseManager;
