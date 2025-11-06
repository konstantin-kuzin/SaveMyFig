// Компонент экрана конфигурации
export function initializeConfigTab() {
  const configForm = document.getElementById('config-form');
  const loadConfigBtn = document.getElementById('load-config');
  const selectPathBtn = document.getElementById('select-path');
  const addAccountBtn = document.getElementById('add-account');
  const generateFilesBtn = document.getElementById('generate-files');
  const toggleTokenBtn = document.getElementById('toggle-token');
  const tokenInput = document.getElementById('figma-token');

  // Обработчики событий будут добавлены здесь в будущем
  console.log('Config tab initialized');

  // Toggle token visibility
  if (toggleTokenBtn && tokenInput) {
    toggleTokenBtn.addEventListener('click', () => {
      if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        toggleTokenBtn.textContent = '👁️';
      } else {
        tokenInput.type = 'password';
        toggleTokenBtn.textContent = '👁️';
      }
    });
  }

  // Load config from .env file
  if (loadConfigBtn) {
    loadConfigBtn.addEventListener('click', async () => {
      try {
        const config = await window.electronAPI.readEnv();
        // Заполнить форму данными из конфигурации
        console.log('Loaded config:', config);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    });
  }

  // Select download path
  if (selectPathBtn) {
    selectPathBtn.addEventListener('click', async () => {
      try {
        const path = await window.electronAPI.selectDirectory();
        if (path) {
          const downloadPathInput = document.getElementById('download-path');
          if (downloadPathInput) {
            downloadPathInput.value = path;
          }
        }
      } catch (error) {
        console.error('Error selecting directory:', error);
      }
    });
  }

  // Add account
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      // Добавление нового аккаунта
      console.log('Add account clicked');
    });
  }

  // Generate files
  if (generateFilesBtn) {
    generateFilesBtn.addEventListener('click', async () => {
      try {
        console.log('Generate files clicked');
        // Логика генерации files.json
      } catch (error) {
        console.error('Error generating files:', error);
      }
    });
  }

  // Save config
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(configForm);
        const config = Object.fromEntries(formData.entries());
        const result = await window.electronAPI.writeEnv(config);
        if (result.success) {
          alert('Конфигурация сохранена!');
        } else {
          alert(`Ошибка сохранения: ${result.message}`);
        }
      } catch (error) {
        console.error('Error saving config:', error);
        alert('Ошибка при сохранении конфигурации');
      }
    });
  }
}