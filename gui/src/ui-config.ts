export async function initializeConfigTab(): Promise<void> {
  console.log('🔧 [CONFIG] Starting config tab initialization...');
  
  if (!window.electronAPI) {
    console.error('❌ [CONFIG] electronAPI not available');
    return;
  }

  console.log('✅ [CONFIG] electronAPI available');

  const figmaAccountEmailInput = document.getElementById('figma-account-1-email') as HTMLInputElement;
  const figmaAccountAuthCookieInput = document.getElementById('figma-account-1-auth-cookie') as HTMLInputElement;
  const figmaAccessTokenInput = document.getElementById('figma-access-token') as HTMLInputElement;
  const downloadPathInput = document.getElementById('download-path') as HTMLInputElement;
  const projectsInput = document.getElementById('projects') as HTMLTextAreaElement;
  const teamsInput = document.getElementById('teams') as HTMLTextAreaElement;
  const maxFilesInput = document.getElementById('max-files') as HTMLInputElement;
  const WAIT_TIMEOUT_VALUE = '10000';
  const MAX_FILES_DEFAULT = '5';

  console.log('[CONFIG] Checking form elements...');
  console.log('[CONFIG] figmaAccountEmailInput:', !!figmaAccountEmailInput);
  console.log('[CONFIG] figmaAccountAuthCookieInput:', !!figmaAccountAuthCookieInput);
  console.log('[CONFIG] figmaAccessTokenInput:', !!figmaAccessTokenInput);
  console.log('[CONFIG] downloadPathInput:', !!downloadPathInput);
  console.log('[CONFIG] projectsInput:', !!projectsInput);
  console.log('[CONFIG] teamsInput:', !!teamsInput);
  console.log('[CONFIG] WAIT_TIMEOUT forced value:', WAIT_TIMEOUT_VALUE);
  console.log('[CONFIG] maxFilesInput:', !!maxFilesInput);
  console.log('[CONFIG] MAX_FILES default value:', MAX_FILES_DEFAULT);

  async function loadEnvData(): Promise<void> {
    console.log('[CONFIG] Starting to load .env data...');
    
    try {
      console.log('🔄 [CONFIG] Calling window.electronAPI.readEnv()...');
      const config = await window.electronAPI.readEnv();
      console.log('📦 [CONFIG] Received config from API:', config);
      
      if (config && Object.keys(config).length > 0) {
        console.log('✅ [CONFIG] Config loaded successfully, updating form fields...');
        
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

        if (maxFilesInput) {
          const maxFilesValue = config.MAX_FILES && String(config.MAX_FILES).trim() !== ''
            ? config.MAX_FILES
            : MAX_FILES_DEFAULT;
          maxFilesInput.value = maxFilesValue;
          console.log('✅ [CONFIG] Set MAX_FILES:', maxFilesValue);
        } else {
          console.log('⚠️ [CONFIG] MAX_FILES input not found, unable to set value');
        }
        
        console.log('🎉 [CONFIG] All form fields updated successfully');
      } else {
        console.log('⚠️ [CONFIG] Config is empty or null, using default values');
        if (maxFilesInput) {
          maxFilesInput.value = MAX_FILES_DEFAULT;
        }
      }
    } catch (error) {
      console.error('❌ [CONFIG] Error loading config:', error);
      alert('Error loading data from .env file');
    }
  }

  async function getProjectRoot(): Promise<string> {
    try {
      const currentPath = window.location.href;
      console.log('[CONFIG] Current URL:', currentPath);
      
      const filePathMatch = currentPath.match(/file:\/\/(.+)\/gui\/dist\/.*$/);
      if (filePathMatch && filePathMatch[1]) {
        const projectRoot = decodeURIComponent(filePathMatch[1]);
        console.log('📂 [CONFIG] Project root from file path:', projectRoot);
        return projectRoot;
      }
      
      const scriptTags = document.querySelectorAll('script[src*="ui.js"]');
      if (scriptTags.length > 0) {
        const scriptSrc = scriptTags[0].getAttribute('src');
        if (scriptSrc) {
          const basePathMatch = scriptSrc.match(/^(.+)\/gui\/dist\/ui\.js$/);
          if (basePathMatch && basePathMatch[1]) {
            console.log('📂 [CONFIG] Project root from script src:', basePathMatch[1]);
            return basePathMatch[1];
          }
        }
      }
      
      const fallbackRoot = '/Users/Kuzin_K/Dev/Figma-export';
      console.log('[CONFIG] Using fallback project root:', fallbackRoot);
      return fallbackRoot;
      
    } catch (error) {
      console.error('❌ [CONFIG] Error detecting project root:', error);
      return '/Users/Kuzin_K/Dev/Figma-export';
    }
  }

  function getRelativePath(absolutePath: string, basePath: string): string {
    const absPath = absolutePath.replace(/\\/g, '/').replace(/\/+$/, '');
    const base = basePath.replace(/\\/g, '/').replace(/\/+$/, '');
    
    if (absPath.startsWith(base)) {
      const relative = absPath.substring(base.length);
      return relative.startsWith('/') ? relative.substring(1) : relative;
    }
    
    return absPath.split('/').pop() || absPath;
  }

  const selectPathBtn = document.getElementById('select-path');
  if (selectPathBtn && downloadPathInput) {
    selectPathBtn.addEventListener('click', async () => {
      try {
        console.log('[CONFIG] Opening directory selection dialog...');
        
        const projectRoot = await getProjectRoot();
        
        const absolutePath = await window.electronAPI.selectDirectory();
        if (absolutePath) {
          downloadPathInput.value = absolutePath;
          
          console.log('✅ [CONFIG] Selected folder:');
          console.log('   Absolute path:', absolutePath);
        } else {
          console.log('⚠️ [CONFIG] No folder selected');
        }
      } catch (error) {
        console.error('❌ [CONFIG] Error selecting folder:', error);
        alert('Error selecting folder');
      }
    });
    console.log('✅ [CONFIG] Directory selection button handler added');
  }

  console.log('🚀 [CONFIG] Starting auto-load of .env data...');
  await loadEnvData();
  
  type SaveHandlerElement = HTMLElement & {
    saveHandler?: EventListenerOrEventListenerObject;
  };

  const saveConfigBtn = document.getElementById('save-config') as SaveHandlerElement | null;
  if (saveConfigBtn) {
    const existingHandler = saveConfigBtn.saveHandler;
    if (existingHandler) {
      saveConfigBtn.removeEventListener('click', existingHandler);
    }
    
    const saveHandler = async () => {
      try {
        console.log('💾 [CONFIG] Starting config save process...');
        
        const configData: Record<string, string> = {};
        
        if (figmaAccountEmailInput?.value) {
          configData.FIGMA_ACCOUNT_1_EMAIL = figmaAccountEmailInput.value;
        }
        
        if (figmaAccountAuthCookieInput?.value) {
          configData.FIGMA_ACCOUNT_1_AUTH_COOKIE = figmaAccountAuthCookieInput.value;
        }
        
        if (figmaAccessTokenInput?.value) {
          configData.FIGMA_ACCESS_TOKEN = figmaAccessTokenInput.value;
        }
        
        if (downloadPathInput?.value) {
          configData.DOWNLOAD_PATH = downloadPathInput.value;
        }
        
        if (projectsInput?.value) {
          configData.PROJECTS = projectsInput.value;
        }
        
        if (teamsInput?.value) {
          configData.TEAMS = teamsInput.value;
        }

        if (maxFilesInput) {
          configData.MAX_FILES = maxFilesInput.value.trim();
        }
        
        configData.WAIT_TIMEOUT = WAIT_TIMEOUT_VALUE;
        
        console.log('📝 [CONFIG] Collected config data:', configData);
        
        console.log('🔍 [CONFIG] Validating config before saving...');
        const validationResponse = await window.electronAPI.validateConfig(configData);
        if (!validationResponse.valid) {
          console.error('❌ [CONFIG] Config validation failed:', validationResponse.errors);
          alert('Configuration validation error:\n' + validationResponse.errors.join('\n'));
          return;
        }
        
        console.log('💾 [CONFIG] Saving config to .env file...');
        const saveResponse = await window.electronAPI.writeEnv(configData);
        
        if (saveResponse.success) {
          console.log('✅ [CONFIG] Config saved successfully');
          alert('Settings saved successfully!');
        } else {
          console.error('❌ [CONFIG] Failed to save config:', saveResponse.message);
          alert('Error saving settings: ' + saveResponse.message);
        }
      } catch (error) {
        console.error('❌ [CONFIG] Error during config save:', error);
        alert('Error saving settings');
      }
    };
    
    saveConfigBtn.saveHandler = saveHandler;
    saveConfigBtn.addEventListener('click', saveHandler);
    console.log('✅ [CONFIG] Save config button handler added');
  }
  
  console.log('🎉 [CONFIG] Config tab initialization completed');
}
