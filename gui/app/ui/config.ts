// Компонент экрана конфигурации для работы с .env файлом (только чтение и отображение)
export async function initializeConfigTab(): Promise<void> {
  console.log('🔧 [CONFIG] Starting config tab initialization...');
  
  if (!window.electronAPI) {
    console.error('❌ [CONFIG] electronAPI не доступен');
    return;
  }

  console.log('✅ [CONFIG] electronAPI доступен');

  // Находим все элементы формы
  const figmaAccountEmailInput = document.getElementById('figma-account-1-email') as HTMLInputElement;
  const figmaAccountAuthCookieInput = document.getElementById('figma-account-1-auth-cookie') as HTMLInputElement;
  const figmaAccessTokenInput = document.getElementById('figma-access-token') as HTMLInputElement;
  const downloadPathInput = document.getElementById('download-path') as HTMLInputElement;
  const projectsInput = document.getElementById('projects') as HTMLTextAreaElement;
  const teamsInput = document.getElementById('teams') as HTMLTextAreaElement;
  const waitTimeoutInput = document.getElementById('wait-timeout') as HTMLInputElement;

  // Проверяем наличие всех элементов
  console.log('🔍 [CONFIG] Checking form elements...');
  console.log('📧 [CONFIG] figmaAccountEmailInput:', !!figmaAccountEmailInput);
  console.log('🍪 [CONFIG] figmaAccountAuthCookieInput:', !!figmaAccountAuthCookieInput);
  console.log('🔑 [CONFIG] figmaAccessTokenInput:', !!figmaAccessTokenInput);
  console.log('📁 [CONFIG] downloadPathInput:', !!downloadPathInput);
  console.log('📋 [CONFIG] projectsInput:', !!projectsInput);
  console.log('👥 [CONFIG] teamsInput:', !!teamsInput);
  console.log('⏱️ [CONFIG] waitTimeoutInput:', !!waitTimeoutInput);

  // Функция для загрузки данных из .env файла
  async function loadEnvData(): Promise<void> {
    console.log('📖 [CONFIG] Starting to load .env data...');
    
    try {
      console.log('🔄 [CONFIG] Calling window.electronAPI.readEnv()...');
      const config = await window.electronAPI.readEnv();
      console.log('📦 [CONFIG] Received config from API:', config);
      
      if (config && Object.keys(config).length > 0) {
        console.log('✅ [CONFIG] Config loaded successfully, updating form fields...');
        
        // Заполняем поля данными из .env
        if (config.FIGMA_ACCOUNT_1_EMAIL) {
          figmaAccountEmailInput.value = config.FIGMA_ACCOUNT_1_EMAIL;
          console.log('✅ [CONFIG] Set FIGMA_ACCOUNT_1_EMAIL:', config.FIGMA_ACCOUNT_1_EMAIL);
        } else {
          console.log('⚠️ [CONFIG] FIGMA_ACCOUNT_1_EMAIL not found in config');
        }
        
        if (config.FIGMA_ACCOUNT_1_AUTH_COOKIE) {
          figmaAccountAuthCookieInput.value = config.FIGMA_ACCOUNT_1_AUTH_COOKIE;
          console.log('✅ [CONFIG] Set FIGMA_ACCOUNT_1_AUTH_COOKIE:', config.FIGMA_ACCOUNT_1_AUTH_COOKIE.substring(0, 50) + '...');
        } else {
          console.log('⚠️ [CONFIG] FIGMA_ACCOUNT_1_AUTH_COOKIE not found in config');
        }
        
        if (config.FIGMA_ACCESS_TOKEN) {
          figmaAccessTokenInput.value = config.FIGMA_ACCESS_TOKEN;
          console.log('✅ [CONFIG] Set FIGMA_ACCESS_TOKEN:', config.FIGMA_ACCESS_TOKEN.substring(0, 20) + '...');
        } else {
          console.log('⚠️ [CONFIG] FIGMA_ACCESS_TOKEN not found in config');
        }
        
        if (config.DOWNLOAD_PATH) {
          downloadPathInput.value = config.DOWNLOAD_PATH;
          console.log('✅ [CONFIG] Set DOWNLOAD_PATH:', config.DOWNLOAD_PATH);
        } else {
          console.log('⚠️ [CONFIG] DOWNLOAD_PATH not found in config');
        }
        
        if (config.PROJECTS) {
          projectsInput.value = config.PROJECTS;
          console.log('✅ [CONFIG] Set PROJECTS:', config.PROJECTS);
        } else {
          console.log('⚠️ [CONFIG] PROJECTS not found in config');
        }
        
        if (config.TEAMS) {
          teamsInput.value = config.TEAMS;
          console.log('✅ [CONFIG] Set TEAMS:', config.TEAMS);
        } else {
          console.log('⚠️ [CONFIG] TEAMS not found in config');
        }
        
        if (config.WAIT_TIMEOUT) {
          waitTimeoutInput.value = config.WAIT_TIMEOUT;
          console.log('✅ [CONFIG] Set WAIT_TIMEOUT:', config.WAIT_TIMEOUT);
        } else {
          waitTimeoutInput.value = '10000';
          console.log('⚠️ [CONFIG] WAIT_TIMEOUT not found, setting default: 10000');
        }
        
        console.log('🎉 [CONFIG] All form fields updated successfully');
      } else {
        console.log('⚠️ [CONFIG] Config is empty or null, using default values');
        waitTimeoutInput.value = '10000'; // Устанавливаем дефолтное значение
        console.log('📝 [CONFIG] Set default WAIT_TIMEOUT: 10000');
      }
    } catch (error) {
      console.error('❌ [CONFIG] Error loading config:', error);
      alert('Ошибка при загрузке данных из .env файла');
      waitTimeoutInput.value = '10000'; // Дефолтное значение в случае ошибки
      console.log('📝 [CONFIG] Set default WAIT_TIMEOUT due to error: 10000');
    }
  }

  // Автоматически загружаем данные при инициализации вкладки
  console.log('🚀 [CONFIG] Starting auto-load of .env data...');
  await loadEnvData();
  
  console.log('🎉 [CONFIG] Config tab initialization completed');
}
