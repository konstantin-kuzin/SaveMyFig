// Компонент экрана диагностики
export function initializeSettingsTab(): void {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  const refreshLogsBtn = document.getElementById('refresh-logs') as HTMLButtonElement;
  const clearLogsBtn = document.getElementById('clear-logs') as HTMLButtonElement;
  const openLogsFolderBtn = document.getElementById('open-logs-folder') as HTMLButtonElement;
  const diagnosticLog = document.getElementById('diagnostic-log');
  const nodeVersionEl = document.getElementById('node-version');
  const nodePathEl = document.getElementById('node-path');
  
  // Загрузка системной информации при инициализации
  loadSystemInfo();
  
  // Обработчик обновления логов
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      // В реальном приложении здесь будет загрузка логов из файла
      if (diagnosticLog) {
        diagnosticLog.textContent += `[${new Date().toLocaleString()}] Логи обновлены\n`;
        diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
      }
    });
  }
  
 // Обработчик очистки логов
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (diagnosticLog) {
        diagnosticLog.textContent = '';
      }
    });
  }
  
  // Обработчик открытия папки с логами
  if (openLogsFolderBtn) {
    openLogsFolderBtn.addEventListener('click', () => {
      alert('Функция открытия папки с логами будет реализована в следующей версии');
    });
  }
  
  // Загрузка системной информации
  async function loadSystemInfo(): Promise<void> {
    try {
      // Проверяем Node.js
      const nodeInfo = await window.electronAPI.checkNodeJS();
      if (nodeVersionEl) nodeVersionEl.textContent = nodeInfo.version || 'Не найден';
      if (nodePathEl) nodePathEl.textContent = nodeInfo.path || 'Не найден';
      
      // Здесь можно добавить другие проверки системной информации
      const npmVersionEl = document.getElementById('npm-version');
      const npmPathEl = document.getElementById('npm-path');
      const guiVersionEl = document.getElementById('gui-version');
      const scriptVersionEl = document.getElementById('script-version');
      
      if (npmVersionEl) npmVersionEl.textContent = 'Проверка...';
      if (npmPathEl) npmPathEl.textContent = 'Проверка...';
      if (guiVersionEl) guiVersionEl.textContent = '1.0.0';
      if (scriptVersionEl) scriptVersionEl.textContent = 'Проверка...';
      
    } catch (error) {
      console.error('Ошибка при загрузке системной информации:', error);
    }
 }
}