// renderer.ts - основная логика UI
import { initializeWelcomeTab } from './components/welcome';
import { initializeConfigTab } from './components/config';
import { initializeBackupTab } from './components/backup';
import { initializeStatisticsTab } from './components/statistics';
import { initializeSettingsTab } from './components/settings';

class AppRenderer {
  constructor() {
    this.initializeNavigation();
    this.initializeTabs();
 }

  private initializeNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link: Element) => {
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const tabId = (link as HTMLElement).dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
          navLinks.forEach((l: Element) => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });
  }

  private switchTab(tabId: string): void {
    // Скрыть все табы
    document.querySelectorAll('.tab-content').forEach((tab: Element) => {
      tab.classList.remove('active');
    });
    
    // Показать выбранный таб
    const targetTab = document.getElementById(`${tabId}-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  }

  private initializeTabs(): void {
    // Инициализация компонентов табов
    try {
      initializeWelcomeTab();
    } catch (error) {
      console.error('Error initializing welcome tab:', error);
    }
    try {
      initializeConfigTab();
    } catch (error) {
      console.error('Error initializing config tab:', error);
    }
    try {
      initializeBackupTab();
    } catch (error) {
      console.error('Error initializing backup tab:', error);
    }
    try {
      console.log('About to initialize statistics tab...');
      initializeStatisticsTab();
      console.log('Statistics tab initialized successfully');
    } catch (error) {
      console.error('Error initializing statistics tab:', error);
    }
    try {
      initializeSettingsTab();
    } catch (error) {
      console.error('Error initializing settings tab:', error);
    }
  }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  new AppRenderer();
});

// Экспорт для использования в других модулях
export { AppRenderer };