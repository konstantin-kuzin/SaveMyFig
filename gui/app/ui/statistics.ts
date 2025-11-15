// Компонент экрана статистики
export function initializeStatisticsTab(): void {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  const totalFilesEl = document.getElementById('total-files');
  const needingBackupEl = document.getElementById('needing-backup');
  const withErrorsEl = document.getElementById('with-errors');
  const backupsTbody = document.getElementById('backups-tbody');
  const refreshDataBtn = document.getElementById('refresh-data') as HTMLButtonElement;
  const resetErrorsBtn = document.getElementById('reset-errors') as HTMLButtonElement;
  const tableSearch = document.getElementById('table-search') as HTMLInputElement;
  const filterNeedingBackup = document.getElementById('filter-needing-backup') as HTMLInputElement;
  const tableHeaders = document.querySelectorAll('#backups-table th[data-sort]');
  
  let backupsData: any[] = [];
  const dateColumns = new Set(['last_backup_date', 'last_modified_date', 'next_attempt_date']);
  const sortState: { column: string | null; direction: 'asc' | 'desc' } = {
    column: null,
    direction: 'asc',
  };
  
  // Загрузка данных при инициализации
  loadStatistics();
  document.addEventListener('statistics-tab-activated', () => {
    console.log('[Statistics] Таб активирован, перезагружаем данные');
    loadStatistics();
  });
  backupsTbody?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('a[data-figma-link]');
    if (link && window.electronAPI?.openExternal) {
      event.preventDefault();
      const url = link.dataset.figmaLink || link.href;
      if (url) {
        window.electronAPI.openExternal(url);
      }
    }
  });
  
  // Обработчик обновления данных
  if (refreshDataBtn) {
    console.log('[Statistics] Кнопка "Обновить" найдена, привязываем обработчик');
    refreshDataBtn.addEventListener('click', () => {
      console.log('[Statistics] Клик по кнопке "Обновить" - вызываем loadStatistics()');
      loadStatistics();
    });
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
  async function loadStatistics(): Promise<void> {
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
      backupsData = await window.electronAPI.getAllBackups();
      console.log('[Statistics] Бэкапы получены:', backupsData.length, 'записей');
      applySortAndRender();
      console.log('[Statistics] Таблица обновлена');
    } catch (error) {
      console.error('[Statistics] Ошибка при загрузке статистики:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Ошибка при загрузке статистики: ${errorMessage}`);
    }
  }
  
  // Функция форматирования дат в формате dd.mm.yyyy HH:MM
  function formatDateTime(dateStr: string | null, defaultText: string): string {
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
 function renderTable(backups: any[]): void {
    if (!backupsTbody) return;
    
    backupsTbody.innerHTML = '';
    
    backups.forEach(backup => {
      const row = document.createElement('tr');
      
      // Форматируем даты
      const lastBackupDate = formatDateTime(backup.last_backup_date, '—');
      const lastModifiedDate = formatDateTime(backup.last_modified_date, '—');
      const nextAttemptDate = formatDateTime(backup.next_attempt_date, '—');
      const fileKey = backup.file_key || '';
      const fileName = backup.file_name || '';
      const figmaLink = fileKey ? `https://www.figma.com/file/${fileKey}` : null;
      const shortFileKey = fileKey ? `${fileKey.substring(0, 40)}${fileKey.length > 40 ? '…' : ''}` : '';
      
      row.innerHTML = `
        
        <td title="${backup.project_name || ''}">${backup.project_name || ''}</td>
        <td title="${fileName}">
          ${figmaLink ? `<a href="${figmaLink}" data-figma-link="${figmaLink}" target="_blank" rel="noopener noreferrer">${fileName}</a>` : fileName}
        </td>
        <td class="date">${lastBackupDate}</td>
        <td class="date">${lastModifiedDate}</td>
        <!-- <td>${nextAttemptDate}</td> -->
        <!-- <td title="${fileKey}">${shortFileKey}</td> -->
      `;
      
      backupsTbody.appendChild(row);
    });

    filterTable();
  }
  
  // Фильтрация таблицы
  function filterTable(): void {
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
        (row as HTMLElement).style.display = '';
      } else {
        (row as HTMLElement).style.display = 'none';
      }
    });
  }

  function handleSort(column: string): void {
    if (!column) return;
    
    if (sortState.column === column) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.column = column;
      sortState.direction = dateColumns.has(column) ? 'desc' : 'asc';
    }
    
    applySortAndRender();
  }

  function applySortAndRender(): void {
    const data = [...backupsData];
    
    if (sortState.column) {
      const isDateColumn = dateColumns.has(sortState.column);
      const multiplier = sortState.direction === 'asc' ? 1 : -1;
      
      data.sort((a, b) => {
        const aValue = a[sortState.column as string];
        const bValue = b[sortState.column as string];
        
        if (isDateColumn) {
          const aTime = aValue ? new Date(aValue).getTime() : 0;
          const bTime = bValue ? new Date(bValue).getTime() : 0;
          return (aTime - bTime) * multiplier;
        }
        
        const aText = (aValue ?? '').toString().toLowerCase();
        const bText = (bValue ?? '').toString().toLowerCase();
        return aText.localeCompare(bText) * multiplier;
      });
    }
    
    renderTable(data);
  }

  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      if (column) {
        handleSort(column);
      }
    });
  });
}
