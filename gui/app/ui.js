// Основной модуль рендерера приложения
import { initializeConfigTab } from './ui/config.js';
import { initializeWelcomeTab } from './ui/welcome.js';
import { initializeBackupTab } from './ui/backup.js';
import { initializeStatisticsTab } from './ui/statistics.js';
import { initializeSettingsTab } from './ui/settings.js';

class AppRenderer {
    constructor() {
        this.initializeNavigation();
        this.initializeTabs();
    }

    initializeNavigation() {
        console.log('Initializing navigation...');
        const navLinks = document.querySelectorAll('.nav-link');
        console.log(`Found ${navLinks.length} navigation links`);
        
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;
                console.log(`Navigation clicked: ${tabId}`);
                
                if (tabId) {
                    this.switchTab(tabId);
                    navLinks.forEach((l) => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // При переключении на config tab, перезагружаем данные
                    if (tabId === 'config') {
                        console.log('Switching to config tab, reloading data...');
                        setTimeout(() => {
                            if (window.electronAPI) {
                                initializeConfigTab().catch(error => {
                                    console.error('Error reinitializing config tab:', error);
                                });
                            }
                        }, 100);
                    }
                }
            });
        });
    }

    switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        document.querySelectorAll('.tab-content').forEach((tab) => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log(`Tab ${tabId} activated`);
            if (tabId === 'statistics') {
                document.dispatchEvent(new CustomEvent('statistics-tab-activated'));
            }
        } else {
            console.error(`Target tab ${tabId}-tab not found`);
        }
    }

    async initializeTabs() {
        console.log('Starting tabs initialization...');
        
        try {
            console.log('Initializing welcome tab...');
            await initializeWelcomeTab();
            console.log('✅ Welcome tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing welcome tab:', error);
        }

        try {
            console.log('Initializing config tab...');
            await initializeConfigTab();
            console.log('✅ Config tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing config tab:', error);
        }

        try {
            console.log('Initializing backup tab...');
            await initializeBackupTab();
            console.log('✅ Backup tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing backup tab:', error);
        }

        try {
            console.log('Initializing statistics tab...');
            await initializeStatisticsTab();
            console.log('✅ Statistics tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing statistics tab:', error);
        }

        try {
            console.log('Initializing settings tab...');
            await initializeSettingsTab();
            console.log('✅ Settings tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing settings tab:', error);
        }

        console.log('🎉 All tabs initialization completed');
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing AppRenderer...');
    new AppRenderer();
    console.log('🎉 AppRenderer initialized successfully');
});
