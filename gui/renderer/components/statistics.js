// Компонент экрана статистики
export function initializeStatisticsTab() {
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
  
  // Проверяем доступность electronAPI
  if (window.electronAPI) {
    console.log('[Statistics] electronAPI доступен');
  } else {
    console.error('[Statistics] electronAPI недоступен!');
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
        <td title="${backup.file_key}">${backup.file_key?.substring(0, 8) || ''}...</td>
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
    const searchTerm = tableSearch?.value.toLowerCase() || '';
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