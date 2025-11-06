// Компонент экрана настроек
export function initializeSettingsTab() {
  const refreshLogsBtn = document.getElementById('refresh-logs');
  const clearLogsBtn = document.getElementById('clear-logs');
  const openLogsFolderBtn = document.getElementById('open-logs-folder');
  const diagnosticLog = document.getElementById('diagnostic-log');

  // Инициализация системной информации
  initializeSystemInfo();
  initializeDependencyStatus();
  initializeFileSystemStatus();
  initializeFigmaAPIStatus();

  // Обработчики событий для логов
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      loadDiagnosticLogs();
    });
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (diagnosticLog) {
        diagnosticLog.textContent = '';
      }
    });
  }

  if (openLogsFolderBtn) {
    openLogsFolderBtn.addEventListener('click', () => {
      // Логика открытия папки с логами
      console.log('Open logs folder clicked');
    });
  }

  // Загрузка логов при инициализации
  loadDiagnosticLogs();
}

function initializeSystemInfo() {
  const nodeVersionEl = document.getElementById('node-version');
  const nodePathEl = document.getElementById('node-path');
  const npmVersionEl = document.getElementById('npm-version');
  const npmPathEl = document.getElementById('npm-path');
  const scriptVersionEl = document.getElementById('script-version');

  if (nodeVersionEl && nodePathEl) {
    window.electronAPI.checkNodeJS().then((result) => {
      if (result.installed) {
        nodeVersionEl.textContent = result.version;
        nodePathEl.textContent = result.path;
      } else {
        nodeVersionEl.textContent = 'Не установлен';
        nodePathEl.textContent = '-';
      }
    });
  }

  if (npmVersionEl && npmPathEl) {
    window.electronAPI.checkNpm().then((result) => {
      if (result.installed) {
        npmVersionEl.textContent = result.version;
        npmPathEl.textContent = result.path;
      } else {
        npmVersionEl.textContent = 'Не установлен';
        npmPathEl.textContent = '-';
      }
    });
  }

  // Установка версии скрипта (можно обновить позже)
  if (scriptVersionEl) {
    scriptVersionEl.textContent = '1.0.0';
  }
}

function initializeDependencyStatus() {
  const depsStatusEl = document.getElementById('deps-status');
  if (depsStatusEl) {
    depsStatusEl.innerHTML = `
      <div class="status-item">
        <span class="status-label">Node.js:</span>
        <span class="status-value" id="dep-nodejs-status">Проверка...</span>
      </div>
      <div class="status-item">
        <span class="status-label">npm:</span>
        <span class="status-value" id="dep-npm-status">Проверка...</span>
      </div>
      <div class="status-item">
        <span class="status-label">Electron:</span>
        <span class="status-value" id="dep-electron-status">Установлен</span>
      </div>
    `;
  }
}

function initializeFileSystemStatus() {
  const fsStatusEl = document.getElementById('fs-status');
  if (fsStatusEl) {
    fsStatusEl.innerHTML = `
      <div class="status-item">
        <span class="status-label">Чтение файлов:</span>
        <span class="status-value">Доступно</span>
      </div>
      <div class="status-item">
        <span class="status-label">Запись файлов:</span>
        <span class="status-value">Доступно</span>
      </div>
      <div class="status-item">
        <span class="status-label">База данных:</span>
        <span class="status-value" id="db-status">Проверка...</span>
      </div>
    `;
  }
}

function initializeFigmaAPIStatus() {
  const apiStatusEl = document.getElementById('api-status');
  if (apiStatusEl) {
    apiStatusEl.innerHTML = `
      <div class="status-item">
        <span class="status-label">Токен доступа:</span>
        <span class="status-value" id="token-status">Не настроен</span>
      </div>
      <div class="status-item">
        <span class="status-label">Подключение к API:</span>
        <span class="status-value" id="api-connection-status">Проверка...</span>
      </div>
    `;
  }
}

function loadDiagnosticLogs() {
  const diagnosticLog = document.getElementById('diagnostic-log');
  if (diagnosticLog) {
    const logEntries = [
      `[${new Date().toISOString()}] [INFO] Приложение запущено`,
      `[${new Date().toISOString()}] [INFO] Интерфейс инициализирован`,
      `[${new Date().toISOString()}] [DEBUG] ElectronAPI доступен: ${!!window.electronAPI}`,
    ];
    
    diagnosticLog.textContent = logEntries.join('\n');
  }
}