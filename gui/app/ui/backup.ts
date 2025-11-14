// Компонент экрана выполнения бэкапа
export function initializeBackupTab(): void {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  const startBackupBtn = document.getElementById('start-backup') as HTMLButtonElement;
  //const stopBackupBtn = document.getElementById('stop-backup') as HTMLButtonElement;
  const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement;
  const backupLog = document.getElementById('backup-log');
  const scriptCommandSelect = document.getElementById('script-command') as HTMLSelectElement;
  const progressText = document.getElementById('progress-text');
  const statusDot = document.querySelector('.status-dot');
  
  let isRunning = false;
  
  // Обработчик запуска бэкапа
  if (startBackupBtn) {
    startBackupBtn.addEventListener('click', async () => {
      if (isRunning) return;
      
      const command = 'run-backup';
      isRunning = true;
      startBackupBtn.disabled = true;
      //stopBackupBtn.disabled = false;
      
      if (statusDot) statusDot.className = 'status-dot running';
      if (progressText) progressText.textContent = 'Running...';
      
      try {
        // Снимаем предыдущие подписки, чтобы не дублировать вывод при следующих запусках
        window.electronAPI.removeAllListeners?.('script-output');
        window.electronAPI.removeAllListeners?.('script-progress');

        // Подписываемся на вывод скрипта
        window.electronAPI.onScriptOutput((data: string) => {
          if (backupLog) {
            backupLog.textContent += data + '\n';
            backupLog.scrollTop = backupLog.scrollHeight;
          }
        });
        
        // Подписываемся на прогресс
        window.electronAPI.onScriptProgress((progress: any) => {
          if (progressText && progress) {
            progressText.textContent = `Выполнено: ${progress.current}/${progress.total}`;
          }
        });
        
        // Запускаем скрипт
        const result = await window.electronAPI.runScriptWithProgress(command);
        
        if (result.success) {
          if (progressText) progressText.textContent = 'Success';
        } else {
          if (progressText) progressText.textContent = `Error: ${result.message}`;
        }
      } catch (error) {
        console.error('Error while running script:', error);
        if (progressText) progressText.textContent = `Error: ${error}`;
      } finally {
        isRunning = false;
        startBackupBtn.disabled = false;
        //stopBackupBtn.disabled = true;
        
        if (statusDot) statusDot.className = 'status-dot idle';
        if (!progressText?.textContent?.includes('Error')) {
          if (progressText) progressText.textContent = 'Completed';
        }
      }
    });
  }
  
  // Обработчик остановки бэкапа
//  if (stopBackupBtn) {
//     stopBackupBtn.addEventListener('click', async () => {
//       if (!isRunning) return;
      
//       try {
//         await window.electronAPI.stopScript();
//         isRunning = false;
//         startBackupBtn.disabled = false;
//         stopBackupBtn.disabled = true;
        
//         if (statusDot) statusDot.className = 'status-dot idle';
//         if (progressText) progressText.textContent = 'Остановлено пользователем';
//       } catch (error) {
//         console.error('Ошибка при остановке скрипта:', error);
//       }
//     });
//  }
  
  // Обработчик очистки лога
 if (clearLogBtn && backupLog) {
    clearLogBtn.addEventListener('click', () => {
      backupLog.textContent = '';
    });
  }
}
