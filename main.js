// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC обработчики ---

ipcMain.handle('run-npm-install', async () => {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], { cwd: __dirname });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
      mainWindow.webContents.send('npm-output', data.toString());
    });
    child.stderr.on('data', (data) => {
      output += data.toString();
      mainWindow.webContents.send('npm-output', data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) resolve('success');
      else reject(new Error(`npm install failed with code ${code}`));
    });
  });
});

ipcMain.handle('save-env', async (event, envData) => {
  const envPath = path.join(__dirname, '.env');
  let content = '';
  for (const [key, value] of Object.entries(envData)) {
    if (value) content += `${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content);
  return 'saved';
});

ipcMain.handle('run-backup', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, './scripts/run-backup.js');
    const child = spawn('node', [scriptPath], { cwd: __dirname });

    child.stdout.on('data', (data) => {
      mainWindow.webContents.send('backup-output', data.toString());
    });
    child.stderr.on('data', (data) => {
      mainWindow.webContents.send('backup-output', data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) resolve('success');
      else reject(new Error(`Backup failed with code ${code}`));
    });
  });
});

ipcMain.handle('generate-report', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'generate-db-report.js');
    const child = spawn('node', [scriptPath], { cwd: __dirname });

    let report = '';
    child.stdout.on('data', (data) => {
      report += data.toString();
    });
    child.stderr.on('data', (data) => {
      report += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve(report);
      else reject(new Error(`Report failed with code ${code}`));
    });
  });
});

ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0] || '';
});