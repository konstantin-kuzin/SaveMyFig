// Основной модуль рендерера приложения
// Встроенные функции компонентов для избежания проблем с модулями

// Функция приветствия
async function initializeWelcomeTab() {
    const installBtn = document.getElementById('install-btn');
    const nodeStatus = document.getElementById('node-status')?.querySelector('.status-value');
    const npmStatus = document.getElementById('npm-status')?.querySelector('.status-value');
    
    console.log('[Welcome] Initializing welcome tab...');
    
    if (installBtn && nodeStatus) {
        // Проверка Node.js при загрузке
        window.electronAPI.checkNodeJS().then((result) => {
            if (result.installed) {
                nodeStatus.textContent = `${result.version} ${result.meetsRequirement ? '✓' : '⚠️ (требуется v20+)'} `;
                if (result.meetsRequirement) {
                    installBtn.disabled = false;
                }
            } else {
                nodeStatus.textContent = 'Не установлен';
            }
        });
    }
    
    if (npmStatus) {
        // Проверка npm при загрузке
        window.electronAPI.checkNpm().then((result) => {
            if (result.installed) {
                npmStatus.textContent = `${result.version} ${result.meetsRequirement ? '✓' : '⚠️ (требуется v8+)'} `;
            } else {
                npmStatus.textContent = 'Не установлен';
            }
        });
    }
    
    if (installBtn) {
        // Обработчик кнопки установки
        installBtn.addEventListener('click', async () => {
            installBtn.disabled = true;
            installBtn.textContent = 'Установка...';
            
            try {
                const result = await window.electronAPI.installDependencies();
                if (result.success) {
                    installBtn.textContent = 'Установлено!';
                    // Переключить на следующий таб через 2 секунды
                    setTimeout(() => {
                        const configLink = document.querySelector('.nav-link[data-tab="config"]');
                        const allLinks = document.querySelectorAll('.nav-link');
                        const welcomeTab = document.getElementById('welcome-tab');
                        const configTab = document.getElementById('config-tab');
                        
                        if (configLink) configLink.classList.add('active');
                        allLinks.forEach(link => {
                            if (link.dataset.tab !== 'config') link.classList.remove('active');
                        });
                        if (welcomeTab) welcomeTab.classList.remove('active');
                        if (configTab) configTab.classList.add('active');
                    }, 200);
                } else {
                    alert(`Ошибка установки: ${result.message}`);
                    installBtn.disabled = false;
                    installBtn.textContent = 'Установить зависимости';
                }
            } catch (error) {
                console.error('Ошибка при установке:', error);
                alert(`Ошибка при установке: ${error}`);
                installBtn.disabled = false;
                installBtn.textContent = 'Установить зависимости';
            }
        });
    }
}

// Функция конфигурации
async function initializeConfigTab() {
    console.log('[Config] Initializing config tab...');
    // Добавим обработчики для конфигурации
    const pathInput = document.getElementById('project-path');
    if (pathInput) {
        pathInput.addEventListener('click', async () => {
            try {
                const path = await window.electronAPI.selectDirectory();
                if (path) {
                    pathInput.value = path;
                }
            } catch (error) {
                console.error('Error selecting directory:', error);
            }
        });
    }
}

// Функция бэкапа
async function initializeBackupTab() {
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
    }
    
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
            
            const command = scriptCommandSelect?.value || 'run-backup';
            isRunning = true;
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

// Функция статистики
async function initializeStatisticsTab() {
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
    }
    
    const totalFilesEl = document.getElementById('total-files');
    const needingBackupEl = document.getElementById('needing-backup');
    const withErrorsEl = document.getElementById('with-errors');
    const backupsTbody = document.getElementById('backups-tbody');
    const refreshDataBtn = document.getElementById('refresh-data');
    const resetErrorsBtn = document.getElementById('reset-errors');
    const tableSearch = document.getElementById('table-search');
    const filterNeedingBackup = document.getElementById('filter-needing-backup');
    
    console.log('[Statistics] Initializing statistics tab...');
    
    // Загрузка данных при инициализации
    loadStatistics();
    
    // Обработчик обновления данных
    if (refreshDataBtn) {
        console.log('[Statistics] Кнопка "Обновить" найдена, привязываем обработчик');
        refreshDataBtn.addEventListener('click', () => {
            console.log('[Statistics] Клик по кнопке "Обновить" - вызываем loadStatistics()');
            loadStatistics();
        });
    } else {
        console.error('[Statistics] Кнопка "Обновить" не найдена в DOM!');
    }
    
    // Обработчик сброса ошибок
    if (resetErrorsBtn) {
        resetErrorsBtn.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.resetErrors();
                if (result.success) {
                    alert(result.message);
                    loadStatistics(); // Обновляем данные после сброса
                } else {
                    alert(`Ошибка сброса: ${result.message}`);
                }
            } catch (error) {
                console.error('Ошибка при сбросе ошибок:', error);
                alert('Ошибка при сбросе ошибок');
            }
        });
    }
    
    // Обработчик поиска
    if (tableSearch) {
        tableSearch.addEventListener('input', () => {
            filterTable();
        });
    }
    
    // Обработчик фильтра "требующие бэкапа"
    if (filterNeedingBackup) {
        filterNeedingBackup.addEventListener('change', () => {
            filterTable();
        });
    }
    
    // Загрузка статистики
    async function loadStatistics() {
        try {
            console.log('[Statistics] Начало загрузки статистики...');
            
            // Загружаем статистику
            console.log('[Statistics] Запрос статистики...');
            const stats = await window.electronAPI.getStatistics();
            console.log('[Statistics] Статистика получена:', stats);
            
            if (totalFilesEl) {
                totalFilesEl.textContent = stats.total.toString();
                console.log('[Statistics] Обновлен элемент total-files:', stats.total);
            }
            if (needingBackupEl) {
                needingBackupEl.textContent = stats.needingBackup.toString();
                console.log('[Statistics] Обновлен элемент needing-backup:', stats.needingBackup);
            }
            if (withErrorsEl) {
                withErrorsEl.textContent = stats.withErrors.toString();
                console.log('[Statistics] Обновлен элемент with-errors:', stats.withErrors);
            }

            // Загружаем все бэкапы
            console.log('[Statistics] Запрос всех бэкапов...');
            const backups = await window.electronAPI.getAllBackups();
            console.log('[Statistics] Бэкапы получены:', backups.length, 'записей');
            renderTable(backups);
            console.log('[Statistics] Таблица обновлена');
        } catch (error) {
            console.error('[Statistics] Ошибка при загрузке статистики:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Ошибка при загрузке статистики: ${errorMessage}`);
        }
    }
    
    // Функция форматирования дат в формате dd.mm.yyyy HH:MM
    function formatDateTime(dateStr, defaultText) {
        if (!dateStr) return defaultText;
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return defaultText;
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    // Отображение таблицы
    function renderTable(backups) {
        if (!backupsTbody) return;
        
        backupsTbody.innerHTML = '';
        
        backups.forEach(backup => {
            const row = document.createElement('tr');
            
            // Форматируем даты
            const lastBackupDate = formatDateTime(backup.last_backup_date, 'Нет');
            const lastModifiedDate = formatDateTime(backup.last_modified_date, 'Неизвестно');
            const nextAttemptDate = formatDateTime(backup.next_attempt_date, 'Нет');
            
            row.innerHTML = `
                <td title="${backup.file_key}">${(backup.file_key || '').substring(0, 8)}...</td>
                <td title="${backup.project_name}">${backup.project_name || ''}</td>
                <td title="${backup.file_name}">${backup.file_name || ''}</td>
                <td>${lastBackupDate}</td>
                <td>${lastModifiedDate}</td>
                <td>${nextAttemptDate}</td>
            `;
            
            backupsTbody.appendChild(row);
        });
    }
    
    // Фильтрация таблицы
    function filterTable() {
        const searchTerm = (tableSearch?.value || '').toLowerCase();
        const needingBackupOnly = filterNeedingBackup?.checked || false;
        
        const rows = backupsTbody?.querySelectorAll('tr') || [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let matchesSearch = false;
            let matchesFilter = true;
            
            // Проверяем, соответствует ли строка поисковому запросу
            for (const cell of cells) {
                if (cell.textContent?.toLowerCase().includes(searchTerm)) {
                    matchesSearch = true;
                    break;
                }
            }
            
            // Проверяем, соответствует ли строка фильтру "требующие бэкапа"
            if (needingBackupOnly) {
                // Для простоты, в реальном приложении нужно будет сравнивать даты
                // Здесь мы просто покажем логику
                matchesFilter = true; // В реальном приложении тут будет проверка по датам
            }
            
            if (matchesSearch && matchesFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
}

// Функция настроек
async function initializeSettingsTab() {
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
    }
    
    const refreshLogsBtn = document.getElementById('refresh-logs');
    const clearLogsBtn = document.getElementById('clear-logs');
    const openLogsFolderBtn = document.getElementById('open-logs-folder');
    const diagnosticLog = document.getElementById('diagnostic-log');
    const nodeVersionEl = document.getElementById('node-version');
    const nodePathEl = document.getElementById('node-path');
    
    console.log('[Settings] Initializing settings tab...');
    
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
    async function loadSystemInfo() {
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

class AppRenderer {
    constructor() {
        this.initializeNavigation();
        this.initializeTabs();
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                    navLinks.forEach((l) => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach((tab) => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    async initializeTabs() {
        try {
            console.log('Initializing welcome tab...');
            await initializeWelcomeTab();
            console.log('Welcome tab initialized successfully');
        } catch (error) {
            console.error('Error initializing welcome tab:', error);
        }

        try {
            console.log('Initializing config tab...');
            await initializeConfigTab();
            console.log('Config tab initialized successfully');
        } catch (error) {
            console.error('Error initializing config tab:', error);
        }

        try {
            console.log('Initializing backup tab...');
            await initializeBackupTab();
            console.log('Backup tab initialized successfully');
        } catch (error) {
            console.error('Error initializing backup tab:', error);
        }

        try {
            console.log('About to initialize statistics tab...');
            await initializeStatisticsTab();
            console.log('Statistics tab initialized successfully');
        } catch (error) {
            console.error('Error initializing statistics tab:', error);
        }

        try {
            console.log('Initializing settings tab...');
            await initializeSettingsTab();
            console.log('Settings tab initialized successfully');
        } catch (error) {
            console.error('Error initializing settings tab:', error);
        }
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing AppRenderer...');
    new AppRenderer();
    console.log('AppRenderer initialized successfully');
});