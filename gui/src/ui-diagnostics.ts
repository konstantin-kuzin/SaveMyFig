// Diagnostics screen component
export function initializeDiagnosticsTab(): void {
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

  const npmVersionEl = document.getElementById('npm-version');
  const npmPathEl = document.getElementById('npm-path');
  const guiVersionEl = document.getElementById('gui-version');
  const scriptVersionEl = document.getElementById('script-version');
  const depsStatusEl = document.getElementById('deps-status');
  const fsStatusEl = document.getElementById('fs-status');
  const apiStatusEl = document.getElementById('api-status');

  const loadAllDiagnostics = async () => {
    await Promise.all([
      loadSystemInfo(),
      loadDependencies(),
      loadFsStatus(),
      loadApiStatus(),
      loadLogs(true)
    ]);
  };

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => loadLogs());
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.clearLogs();
        if (!result?.success) {
          alert(result?.message || 'Failed to clear log');
          return;
        }
        if (diagnosticLog) {
          diagnosticLog.textContent = '';
        }
      } catch (error) {
        console.error('Error clearing logs:', error);
        alert('Failed to clear log');
      }
    });
  }

  if (openLogsFolderBtn) {
    openLogsFolderBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.openLogsFolder();
      } catch (error) {
        console.error('Error opening logs folder:', error);
        alert('Failed to open logs folder');
      }
    });
  }

  document.addEventListener('diagnostics-tab-activated', () => {
    loadAllDiagnostics();
  });

  loadAllDiagnostics();

  async function loadSystemInfo(): Promise<void> {
    try {
      const info = await window.electronAPI.getSystemInfo();
      if (nodeVersionEl) {
        nodeVersionEl.textContent = info?.node?.installed
          ? `${info.node.version}${info.node.meetsRequirement ? ' ✓' : ' (needs v20+)'}` 
          : 'Not found';
      }
      if (nodePathEl) nodePathEl.textContent = info?.node?.path || 'Not found';
      if (npmVersionEl) {
        const npm = info?.npm;
        npmVersionEl.textContent = npm?.installed
          ? `${npm.version}${npm.meetsRequirement ? ' ✓' : ' (needs v8+)'}` 
          : 'Not found';
      }
      if (npmPathEl) npmPathEl.textContent = info?.npm?.path || 'Not found';
      if (guiVersionEl) guiVersionEl.textContent = info?.guiVersion || '—';
      if (scriptVersionEl) scriptVersionEl.textContent = info?.scriptVersion || '—';
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  }

  async function loadDependencies(): Promise<void> {
    if (!depsStatusEl) return;
    try {
      const statuses = await window.electronAPI.getDependencyStatus();
      renderStatusList(depsStatusEl, statuses);
    } catch (error) {
      console.error('Failed to load dependency status:', error);
    }
  }

  async function loadFsStatus(): Promise<void> {
    if (!fsStatusEl) return;
    try {
      const statuses = await window.electronAPI.getFsStatus();
      renderStatusList(fsStatusEl, statuses);
    } catch (error) {
      console.error('Failed to check filesystem access:', error);
    }
  }

  async function loadApiStatus(): Promise<void> {
    if (!apiStatusEl) return;
    try {
      const statuses = await window.electronAPI.getApiStatus();
      renderStatusList(apiStatusEl, statuses);
    } catch (error) {
      console.error('Failed to check API access:', error);
    }
  }

  async function loadLogs(isInitial = false): Promise<void> {
    if (!diagnosticLog) return;
    try {
      const result = await window.electronAPI.readLogs();
      if (!result?.success) {
        if (!isInitial) {
          alert(result?.message || 'Failed to load logs');
        }
        return;
      }

      diagnosticLog.textContent = result.content || 'Log is empty';
      diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
    } catch (error) {
      console.error('Failed to load logs:', error);
      if (!isInitial) {
        alert('Failed to load logs');
      }
    }
  }

  function renderStatusList(container: HTMLElement, items: Array<{ name: string; ok: boolean; message: string }>): void {
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.textContent = 'No data';
      return;
    }

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'status-item';

      const title = document.createElement('div');
      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.gap = '8px';

      const dot = document.createElement('span');
      dot.className = `status-dot ${item.ok ? 'running' : 'error'}`;

      const name = document.createElement('strong');
      name.textContent = item.name;

      title.appendChild(dot);
      title.appendChild(name);

      const message = document.createElement('div');
      message.textContent = item.message;
      message.style.marginTop = '4px';
      message.style.color = item.ok ? 'var(--text-medium)' : 'var(--danger-color)';

      row.appendChild(title);
      row.appendChild(message);

      container.appendChild(row);
    });
  }
}
