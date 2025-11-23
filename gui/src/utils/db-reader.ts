import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import * as sqlite3 from 'sqlite3';
import { Logger } from './logger';

export interface BackupRecord {
  file_key: string;
  project_name: string;
  file_name: string;
  last_backup_date: string | null;
  last_modified_date: string;
 next_attempt_date: string | null;
}

export class DatabaseManager {
  private logger: Logger;
  private dbPath: string;
  private db: sqlite3.Database | null = null;

  constructor() {
    this.logger = new Logger();

    const baseUserDataDir = app?.isPackaged
      ? path.join(app.getPath('userData'), '.userData')
      : path.join(process.cwd(), '..', '.userData');

    if (!fs.existsSync(baseUserDataDir)) {
      fs.mkdirSync(baseUserDataDir, { recursive: true });
    }

    this.dbPath = path.join(baseUserDataDir, 'figma_backups.db');
    this.initializeDatabase();
    
  }

  private initializeDatabase(): void {
    // Ensure file exists and schema is ready
    const db = this.getDB();
    db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        file_key           TEXT PRIMARY KEY,
        project_name       TEXT,
        file_name          TEXT,
        last_backup_date   TEXT,
        last_modified_date TEXT,
        next_attempt_date  TEXT
      )
    `, (err: Error | null) => {
      if (err) {
        this.logger.error('Failed to initialize database: ' + err.message);
      } else {
        this.logger.info('Database initialized at: ' + this.dbPath);
      }
    });
  }

  private getDB(): sqlite3.Database {
    if (!this.db) {
      this.db = new sqlite3.Database(this.dbPath);
    }
    return this.db;
 }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = this.getDB();
      
      db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          this.logger.error(`Database query error: ${err.message}`);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getBackupsNeedingBackup(): Promise<BackupRecord[]> {
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

  async getAllBackups(): Promise<BackupRecord[]> {
    const sql = 'SELECT * FROM backups ORDER BY last_backup_date DESC';
    return await this.query(sql);
  }

 async getStatistics(): Promise<{
    total: number;
    needingBackup: number;
    withErrors: number;
  }> {
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

  async resetErrors(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const db = this.getDB();
      
      db.run(`
        UPDATE backups
        SET next_attempt_date = NULL
        WHERE next_attempt_date IS NOT NULL
      `, function(this: sqlite3.RunResult, err: Error | null) {
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

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('Database connection closed');
    }
  }
}
