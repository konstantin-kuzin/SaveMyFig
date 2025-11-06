// db-reader.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { Logger } = require('./logger');

// Интерфейс для записей резервных копий
/**
 * @typedef {Object} BackupRecord
 * @property {string} file_key
 * @property {string} project_name
 * @property {string} file_name
 * @property {string|null} last_backup_date
 * @property {string} last_modified_date
 * @property {string|null} next_attempt_date
 */

class DatabaseManager {
  /**
   * @param {Logger} logger
   */
  constructor(logger) {
    this.logger = logger || new Logger();
    this.dbPath = path.join(process.cwd(), 'figma_backups.db');
    this.db = null;
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Проверяем существование базы данных
    if (!fs.existsSync(this.dbPath)) {
      this.logger.warn('Database file not found, using existing database or it will be created by original scripts');
    } else {
      this.logger.info('Database found at: ' + this.dbPath);
    }
  }

  getDB() {
    if (!this.db) {
      this.db = new sqlite3.Database(this.dbPath);
    }
    return this.db;
  }

  /**
   * @param {string} sql
   * @param {any[]} params
   * @returns {Promise<any[]>}
   */
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      const db = this.getDB();
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(`Database query error: ${err.message}`);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * @returns {Promise<BackupRecord[]>}
   */
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

  /**
   * @returns {Promise<BackupRecord[]>}
   */
  async getAllBackups() {
    const sql = 'SELECT * FROM backups ORDER BY last_backup_date DESC';
    return await this.query(sql);
  }

  /**
   * @returns {Promise<{total: number, needingBackup: number, withErrors: number}>}
   */
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

  /**
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resetErrors() {
    return new Promise((resolve, reject) => {
      const db = this.getDB();
      
      db.run(`
        UPDATE backups 
        SET next_attempt_date = NULL 
        WHERE next_attempt_date IS NOT NULL
      `, function(err) {
        if (err) {
          reject(err);
        } else {
          const changes = this.changes; // Количество измененных строк
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

module.exports = { DatabaseManager };