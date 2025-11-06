// Компонент экрана бэкапа
export function initializeBackupTab() {
  window.isBackupRunning = false;

  const startBackupBtn = document.getElementById('start-backup');
  const stopBackupBtn = document.getElementById('stop-backup');
  const clearLogBtn = document.getElementById('clear-log');
  const backupLog = document.getElementById('backup-log');
  const scriptCommandSelect = document.getElementById('script-command');
  const progressText = document.getElementById('progress-text');
  const statusDot = document.querySelector('.status-dot');

  let isRunning = false;

  if (startBackupBtn) {
    startBackupBtn.addEventListener('click', async () => {
      if (isRunning) return;

      const command = scriptCommandSelect?.value || 'start';
      isRunning = true;
      window.isBackupRunning = true;
      startBackupBtn.disabled = true;
      stopBackupBtn.disabled = false;

      if (statusDot) statusDot.className = 'status-dot running';
      if (progressText) progressText.textContent = 'Выполняется...';

      try {
        window.electronAPI.onScriptOutput((data) => {
          if (backupLog) {
            backupLog.textContent += data + '\n';
            backupLog.scrollTop = backupLog.scrollHeight;
          }
        });

        window.electronAPI.onScriptProgress((progress) => {
          if (progressText && progress) {
            progressText.textContent = `Выполнено: ${progress.current}/${progress.total}`;
          }
        });

        const result = await window.electronAPI.runScriptWithProgress(command);

        if (result.success) {
          if (progressText) progressText.textContent = 'Выполнено успешно';
        } else {
          if (progressText) progressText.textContent = `Ошибка: ${result.message}`;
        }
      } catch (error) {
        console.error('Ошибка при запуске скрипта:', error);
        if (progressText) progressText.textContent = `Ошибка: ${error}`;
      } finally {
        isRunning = false;
        window.isBackupRunning = false;
        startBackupBtn.disabled = false;
        stopBackupBtn.disabled = true;

        if (statusDot) statusDot.className = 'status-dot idle';
        if (!progressText?.textContent?.includes('Ошибка')) {
          if (progressText) progressText.textContent = 'Завершено';
        }
      }
    });
  }

  if (stopBackupBtn) {
    stopBackupBtn.addEventListener('click', async () => {
      if (!isRunning) return;

      try {
        await window.electronAPI.stopScript();
        isRunning = false;
        window.isBackupRunning = false;
        startBackupBtn.disabled = false;
        stopBackupBtn.disabled = true;

        if (statusDot) statusDot.className = 'status-dot idle';
        if (progressText) progressText.textContent = 'Остановлено пользователем';
      } catch (error) {
        console.error('Ошибка при остановке скрипта:', error);
      }
    });
  }

  if (clearLogBtn && backupLog) {
    clearLogBtn.addEventListener('click', () => {
      backupLog.textContent = '';
    });
  }
}