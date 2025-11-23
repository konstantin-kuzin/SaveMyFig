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
 *      - Files that have any pending retry (next_attempt_date IS NOT NULL)
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
const fs = require('node:fs');

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
  const baseRows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT file_key, last_modified_date
      FROM backups
      WHERE next_attempt_date IS NOT NULL
        OR last_backup_date IS NULL
        OR (last_modified_date IS NOT NULL AND last_modified_date > last_backup_date)
      ORDER BY
        CASE
          WHEN last_backup_date IS NULL THEN 0
          ELSE 1
        END,
        last_backup_date ASC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const downloadPath = process.env.DOWNLOAD_PATH;
  if (!downloadPath || !fs.existsSync(downloadPath)) {
    return baseRows;
  }

  // Add files whose backups are missing on disk to align with GUI statistics.
  const allKeys = await getAllFileKeys();
  if (!allKeys.length) return baseRows;

  const existingKeys = await findExistingBackupKeys(downloadPath, new Set(allKeys));
  const alreadyQueued = new Set(baseRows.map(row => row.file_key));
  const missingRows = allKeys
    .filter(key => !existingKeys.has(key) && !alreadyQueued.has(key))
    .map(key => ({ file_key: key, last_modified_date: null }));

  return [...baseRows, ...missingRows];
}

async function getAllFileKeys() {
  return new Promise((resolve, reject) => {
    db.all('SELECT file_key FROM backups', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.file_key).filter(Boolean));
    });
  });
}

async function findExistingBackupKeys(root, fileKeys) {
  const found = new Set();
  const stack = [root];

  while (stack.length > 0 && found.size < fileKeys.size) {
    const current = stack.pop();
    let entries;

    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      for (const key of fileKeys) {
        if (entry.name.includes(key)) {
          found.add(key);
          break;
        }
      }
    }
  }

  return found;
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
