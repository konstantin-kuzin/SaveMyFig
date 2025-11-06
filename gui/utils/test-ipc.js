// test-ipc.js - тестовый скрипт для проверки работы IPC

class TestIPC {
  constructor() {
    this.testData = {
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      app: {
        name: 'Figma Export GUI',
        version: '1.0.0'
      }
    };
  }

  // Тестовые методы для IPC handlers
  async checkNodeJS() {
    return {
      installed: true,
      version: this.testData.system.nodeVersion,
      path: process.execPath,
      meetsRequirement: true
    };
  }

  async installDependencies() {
    return {
      success: true,
      message: 'Зависимости успешно установлены'
    };
  }

  async readEnv() {
    return {
      FIGMA_ACCESS_TOKEN: 'figd_test_token',
      DOWNLOAD_PATH: '/Users/test/Downloads',
      WAIT_TIMEOUT: '10000',
      MAX_FILES: '45',
      RETRY_DELAY_HOURS: '72'
    };
  }

  async writeEnv(config) {
    return {
      success: true,
      message: 'Конфигурация сохранена успешно'
    };
  }

  async runScript(command) {
    return {
      success: true,
      message: `Команда ${command} выполнена успешно`
    };
  }

  async stopScript() {
    return {
      success: true,
      message: 'Скрипт остановлен пользователем'
    };
  }

  async queryDB(sql, params) {
    return [
      { id: 1, name: 'Test Record 1' },
      { id: 2, name: 'Test Record 2' }
    ];
  }

  async getBackupsNeedingBackup() {
    return [
      {
        file_key: 'test_file_1',
        project_name: 'Test Project',
        file_name: 'test.fig',
        last_backup_date: null,
        last_modified_date: '2023-01-01T00:00:00Z',
        next_attempt_date: null
      }
    ];
  }

  async getAllBackups() {
    return [
      {
        file_key: 'test_file_1',
        project_name: 'Test Project',
        file_name: 'test.fig',
        last_backup_date: null,
        last_modified_date: '2023-01-01T00:00:00Z',
        next_attempt_date: null
      },
      {
        file_key: 'test_file_2',
        project_name: 'Test Project 2',
        file_name: 'test2.fig',
        last_backup_date: '2023-01-01T00:00:00Z',
        last_modified_date: '2023-01-02T00:00:00Z',
        next_attempt_date: null
      }
    ];
  }

  async getStatistics() {
    return {
      total: 10,
      needingBackup: 5,
      withErrors: 2
    };
  }

  async resetErrors() {
    return {
      success: true,
      message: 'Ошибки сброшены успешно'
    };
  }

  async selectDirectory() {
    return '/Users/test/Selected/Directory';
  }

  async showNotification(options) {
    console.log('Notification:', options);
    return { success: true };
  }
}

module.exports = { TestIPC };