// Компонент экрана установки
export function initializeWelcomeTab() {
  const installBtn = document.getElementById('install-btn');
  const nodeStatus = document.getElementById('node-status')?.querySelector('.status-value');
  const npmStatus = document.getElementById('npm-status')?.querySelector('.status-value');
  
  if (installBtn && nodeStatus) {
    // Проверка Node.js при загрузке
    window.electronAPI.checkNodeJS().then((result) => {
      if (result.installed) {
        nodeStatus.textContent = `${result.version} ${result.meetsRequirement ? '✓' : '⚠️ (требуется v20+)'}`;
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
        npmStatus.textContent = `${result.version} ${result.meetsRequirement ? '✓' : '⚠️ (требуется v8+)'}`;
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
              const element = link;
              if (element.dataset.tab !== 'config') element.classList.remove('active');
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