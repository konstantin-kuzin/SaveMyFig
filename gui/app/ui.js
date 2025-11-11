// Основной модуль рендерера приложения


class AppRenderer {
    constructor() {
        this.initializeNavigation();
        this.initializeTabs();
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                    navLinks.forEach((l) => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach((tab) => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    async initializeTabs() {
        try {
            console.log('Initializing welcome tab...');
            await initializeWelcomeTab();
            console.log('Welcome tab initialized successfully');
        } catch (error) {
            console.error('Error initializing welcome tab:', error);
        }

        try {
            console.log('Initializing config tab...');
            await initializeConfigTab();
            console.log('Config tab initialized successfully');
        } catch (error) {
            console.error('Error initializing config tab:', error);
        }

        try {
            console.log('Initializing backup tab...');
            await initializeBackupTab();
            console.log('Backup tab initialized successfully');
        } catch (error) {
            console.error('Error initializing backup tab:', error);
        }

        try {
            console.log('About to initialize statistics tab...');
            await initializeStatisticsTab();
            console.log('Statistics tab initialized successfully');
        } catch (error) {
            console.error('Error initializing statistics tab:', error);
        }

        try {
            console.log('Initializing settings tab...');
            await initializeSettingsTab();
            console.log('Settings tab initialized successfully');
        } catch (error) {
            console.error('Error initializing settings tab:', error);
        }
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing AppRenderer...');
    new AppRenderer();
    console.log('AppRenderer initialized successfully');
});