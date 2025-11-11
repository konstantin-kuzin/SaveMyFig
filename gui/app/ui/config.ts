// Компонент экрана конфигурации
export function initializeConfigTab(): void {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    return;
  }
  const configForm = document.getElementById('config-form') as HTMLFormElement;
  const figmaTokenInput = document.getElementById('figma-token') as HTMLInputElement;
  const downloadPathInput = document.getElementById('download-path') as HTMLInputElement;
  const selectPathBtn = document.getElementById('select-path') as HTMLButtonElement;
  const toggleTokenBtn = document.getElementById('toggle-token') as HTMLButtonElement;
  const addAccountBtn = document.getElementById('add-account') as HTMLButtonElement;
  const accountsContainer = document.getElementById('accounts-container');
  const loadConfigBtn = document.getElementById('load-config') as HTMLButtonElement;
  
  // Обработчик переключения видимости токена
  if (toggleTokenBtn && figmaTokenInput) {
    toggleTokenBtn.addEventListener('click', () => {
      figmaTokenInput.type = figmaTokenInput.type === 'password' ? 'text' : 'password';
    });
  }
  
  // Обработчик выбора папки
  if (selectPathBtn && downloadPathInput) {
    selectPathBtn.addEventListener('click', async () => {
      try {
        const path = await window.electronAPI.selectDirectory();
        if (path) {
          downloadPathInput.value = path;
        }
      } catch (error) {
        console.error('Ошибка при выборе папки:', error);
        alert('Ошибка при выборе папки');
      }
    });
  }
  
  // Обработчик добавления аккаунта
  if (addAccountBtn && accountsContainer) {
    let accountCounter = 1;
    
    addAccountBtn.addEventListener('click', () => {
      const accountId = `account-${accountCounter}`;
      const accountHtml = `
        <div class="account-item" id="${accountId}">
          <div class="account-header">
            <h4>Аккаунт ${accountCounter + 1}</h4>
            <button type="button" class="btn btn-danger remove-account">🗑️ Удалить</button>
          </div>
          <div class="account-type-selector">
            <label>
              <input type="radio" name="account-${accountCounter}-type" value="password" checked> Email + Password
            </label>
            <label>
              <input type="radio" name="account-${accountCounter}-type" value="cookie"> Auth Cookie
            </label>
          </div>
          <div class="account-fields">
            <div class="form-group">
              <label>Тип аккаунта:</label>
              <select class="form-control account-type">
                <option value="password">Email + Password</option>
                <option value="cookie">Auth Cookie</option>
              </select>
            </div>
            <div class="form-group password-fields">
              <label>Email:</label>
              <input type="email" class="form-control account-email" placeholder="user@example.com">
            </div>
            <div class="form-group password-fields">
              <label>Пароль:</label>
              <input type="password" class="form-control account-password" placeholder="password">
            </div>
            <div class="form-group cookie-fields" style="display: none;">
              <label>Auth Cookie:</label>
              <input type="text" class="form-control account-cookie" placeholder="__Host-figma.authn=...">
            </div>
          </div>
          <div class="account-actions">
            <button type="button" class="btn btn-secondary test-credentials">🔐 Проверить доступ</button>
          </div>
        </div>
      `;
      
      accountsContainer.insertAdjacentHTML('beforeend', accountHtml);
      accountCounter++;
      
      // Добавляем обработчики для нового аккаунта
      const newAccount = document.getElementById(accountId);
      if (newAccount) {
        const removeBtn = newAccount.querySelector('.remove-account') as HTMLButtonElement;
        const accountTypeSelect = newAccount.querySelector('.account-type') as HTMLSelectElement;
        const passwordFields = newAccount.querySelectorAll('.password-fields');
        const cookieFields = newAccount.querySelectorAll('.cookie-fields');
        const typeRadios = newAccount.querySelectorAll('input[type="radio"]');
        
        // Обработчик удаления аккаунта
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            newAccount.remove();
          });
        }
        
        // Обработчик смены типа аккаунта
        if (accountTypeSelect) {
          accountTypeSelect.addEventListener('change', () => {
            if (accountTypeSelect.value === 'password') {
              passwordFields.forEach(field => (field as HTMLElement).style.display = 'block');
              cookieFields.forEach(field => (field as HTMLElement).style.display = 'none');
            } else {
              passwordFields.forEach(field => (field as HTMLElement).style.display = 'none');
              cookieFields.forEach(field => (field as HTMLElement).style.display = 'block');
            }
          });
        }
        
        // Обработчики для радио-кнопок
        typeRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            if ((radio as HTMLInputElement).value === 'password') {
              passwordFields.forEach(field => (field as HTMLElement).style.display = 'block');
              cookieFields.forEach(field => (field as HTMLElement).style.display = 'none');
            } else {
              passwordFields.forEach(field => (field as HTMLElement).style.display = 'none');
              cookieFields.forEach(field => (field as HTMLElement).style.display = 'block');
            }
          });
        });
      }
    });
  }
  
  // Обработчик загрузки конфигурации
  if (loadConfigBtn) {
    loadConfigBtn.addEventListener('click', async () => {
      try {
        const config = await window.electronAPI.readEnv();
        if (config) {
          // Заполняем поля формы
          if (config.FIGMA_ACCESS_TOKEN) {
            figmaTokenInput.value = config.FIGMA_ACCESS_TOKEN;
          }
          if (config.DOWNLOAD_PATH) {
            downloadPathInput.value = config.DOWNLOAD_PATH;
          }
          if (config.WAIT_TIMEOUT) {
            (document.getElementById('wait-timeout') as HTMLInputElement).value = config.WAIT_TIMEOUT;
          }
          if (config.MAX_FILES) {
            (document.getElementById('max-files') as HTMLInputElement).value = config.MAX_FILES;
          }
          if (config.RETRY_DELAY_HOURS) {
            (document.getElementById('retry-delay') as HTMLInputElement).value = config.RETRY_DELAY_HOURS;
          }
          
          // Загружаем аккаунты
          for (let i = 1; i <= 10; i++) {
            const accountType = config[`FIGMA_ACCOUNT_${i}_TYPE`];
            const accountEmail = config[`FIGMA_ACCOUNT_${i}_EMAIL`];
            const accountPassword = config[`FIGMA_ACCOUNT_${i}_PASSWORD`];
            const accountCookie = config[`FIGMA_ACCOUNT_${i}_AUTH_COOKIE`];
            
            if (accountType || accountEmail || accountPassword || accountCookie) {
              // Создаем аккаунт в UI
              if (addAccountBtn) addAccountBtn.click();
              
              // Ждем, пока аккаунт будет добавлен, и заполняем его
              setTimeout(() => {
                const newAccount = document.querySelectorAll('.account-item')[i-1];
                if (newAccount) {
                  if (accountType) {
                    const typeSelect = newAccount.querySelector('.account-type') as HTMLSelectElement;
                    if (typeSelect) typeSelect.value = accountType;
                    
                    if (accountType === 'password' && accountEmail && accountPassword) {
                      const emailInput = newAccount.querySelector('.account-email') as HTMLInputElement;
                      const passwordInput = newAccount.querySelector('.account-password') as HTMLInputElement;
                      if (emailInput) emailInput.value = accountEmail;
                      if (passwordInput) passwordInput.value = accountPassword;
                    } else if (accountType === 'cookie' && accountCookie) {
                      const cookieInput = newAccount.querySelector('.account-cookie') as HTMLInputElement;
                      if (cookieInput) cookieInput.value = accountCookie;
                    }
                  }
                }
              }, 100);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке конфигурации:', error);
        alert('Ошибка при загрузке конфигурации');
      }
    });
  }
  
  // Обработчик отправки формы
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        // Собираем данные формы
        const formData = new FormData(configForm);
        const config: Record<string, string> = {};
        
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            config[key] = value;
          }
        }
        
        // Добавляем аккаунты
        const accounts = document.querySelectorAll('.account-item');
        accounts.forEach((account, index) => {
          const typeSelect = account.querySelector('.account-type') as HTMLSelectElement;
          if (typeSelect) {
            config[`FIGMA_ACCOUNT_${index + 1}_TYPE`] = typeSelect.value;
            
            if (typeSelect.value === 'password') {
              const emailInput = account.querySelector('.account-email') as HTMLInputElement;
              const passwordInput = account.querySelector('.account-password') as HTMLInputElement;
              if (emailInput) config[`FIGMA_ACCOUNT_${index + 1}_EMAIL`] = emailInput.value;
              if (passwordInput) config[`FIGMA_ACCOUNT_${index + 1}_PASSWORD`] = passwordInput.value;
            } else if (typeSelect.value === 'cookie') {
              const cookieInput = account.querySelector('.account-cookie') as HTMLInputElement;
              if (cookieInput) config[`FIGMA_ACCOUNT_${index + 1}_AUTH_COOKIE`] = cookieInput.value;
            }
          }
        });
        
        // Валидируем конфигурацию
        const validation = await window.electronAPI.validateConfig(config);
        if (!validation.valid) {
          alert(`Ошибки валидации:\n${validation.errors.join('\n')}`);
          return;
        }
        
        // Сохраняем конфигурацию
        const result = await window.electronAPI.writeEnv(config);
        if (result.success) {
          alert('Конфигурация успешно сохранена!');
        } else {
          alert(`Ошибка сохранения: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при сохранении конфигурации:', error);
        alert('Ошибка при сохранении конфигурации');
      }
    });
  }
}
