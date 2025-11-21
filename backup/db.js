/**
 * This file implements interaction with a local SQLite database to store information about Figma file backups.
 *
 * Main functionality:
 * 1. Database initialization:
 *    - Creates connection to SQLite file .userData/figma_backups.db
 *    - Creates 'backups' table if it doesn't exist with fields:
 *      - file_key: unique key of the file in Figma
 *      - project_name: name of the project
 *      - file_name: name of the file
 *      - last_backup_date: date of last backup
 *      - last_modified_date: date of last modification in Figma
 *      - next_attempt_date: date of next backup attempt (if previous failed)
 *
 * 2. Functions:
 *    - getFilesToBackup(): returns list of files requiring backup
 *      - Files with modification date newer than last backup
 *      - Files without last backup date (new files)
 *      - Files with passed next attempt date (after error)
 *      - Sorted by priority: new files first, then by ascending last backup date
 *    - updateBackupInfo(fileKey, lastModifiedDate, projectName, fileName): updates/creates file record
 *      - Normalizes date (removes milliseconds for consistency)
 *      - Uses INSERT ... ON CONFLICT to update data
 *    - updateBackupDate(fileKey): updates last backup date and resets next_attempt_date
 *    - recordBackupFailure(fileKey): postpones next backup attempt by 72 hours
 *    - close(): closes database connection
 *
 * This module serves to track backup status and automatically identify files that need backing up.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../.userData/figma_backups.db'));

// Add at the top of the file with other constants
const DEFAULT_BACKUP_LIMIT = 1;

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS backups (
    file_key           TEXT PRIMARY KEY,
    project_name       TEXT,
    file_name          TEXT,
    last_backup_date   TEXT,
    last_modified_date TEXT,
    next_attempt_date  TEXT
  )`);
});

async function getFilesToBackup() {
  const utcNow = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT file_key, last_modified_date
      FROM backups
      WHERE (last_modified_date > last_backup_date OR last_backup_date IS NULL)
        AND (next_attempt_date IS NULL OR next_attempt_date <= ?)
      ORDER BY
        CASE
          WHEN last_backup_date IS NULL THEN 0
          ELSE 1
        END,
        last_backup_date ASC
    `, [utcNow], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function updateBackupInfo(fileKey, lastModifiedDate, projectName, fileName) {
  // Normalize date format to remove milliseconds for consistency
  let normalizedDate = lastModifiedDate;
  if (lastModifiedDate && lastModifiedDate.includes('.')) {
    // Remove milliseconds if present
    normalizedDate = lastModifiedDate.split('.')[0] + 'Z';
  }

  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO backups (file_key, last_modified_date, project_name, file_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(file_key) DO UPDATE SET
        last_modified_date = ?,
        project_name = ?,
        file_name = ?
    `, [fileKey, normalizedDate, projectName, fileName, normalizedDate, projectName, fileName], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function recordBackupFailure(fileKey) {
  const nextAttemptDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // +72 часа в UTC

  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE backups
      SET next_attempt_date = ?
      WHERE file_key = ?
    `, [nextAttemptDate, fileKey], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function updateBackupDate(fileKey) {
  const utcNow = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE backups
      SET last_backup_date = ?,
          next_attempt_date = NULL
      WHERE file_key = ?
    `, [utcNow, fileKey], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getFilesToBackup,
  updateBackupInfo,
  updateBackupDate,
  recordBackupFailure,
  close
};