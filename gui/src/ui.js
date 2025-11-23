// Основной модуль рендерера приложения
import { initializeConfigTab } from './ui-config.js';
import { initializeBackupTab } from './ui-backup.js';
import { initializeStatisticsTab } from './ui-statistics.js';
import { initializeDiagnosticsTab } from './ui-diagnostics.js';

class AppRenderer {
    constructor() {
        this.initializeNavigation();
        this.initializeTabs();
        this.initializeUpdateBanner();
    }

    async initializeUpdateBanner() {
        const banner = document.getElementById('update-banner');
        const text = document.getElementById('update-banner-text');
        const actionBtn = document.getElementById('update-banner-action');
        const dismissBtn = document.getElementById('update-banner-dismiss');

        if (!window.electronAPI?.checkForUpdates) {
            console.warn('Update check API is not available');
            return;
        }

        try {
            // console.log('[Updates] Checking for updates...');
            const updateInfo = await window.electronAPI.checkForUpdates();
            // console.log('[Updates] Result:', updateInfo);

            if (!updateInfo || !updateInfo.isOutdated || !updateInfo.latestVersion) {
                // console.log('[Updates] App is up to date.', {
                //    current: updateInfo?.currentVersion,
                //    latest: updateInfo?.latestVersion
                //});
                banner?.classList.add('hidden');
                return;
            }

            const current = updateInfo.currentVersion || 'unknown';
            const latest = updateInfo.latestVersion;
            const targetUrl = updateInfo.url;
            // console.log(`[Updates] Local version: ${current}, latest on server: ${latest}`);

            if (text) {
                text.textContent = `A new version ${latest} is available. You have ${current} installed.`;
            }

            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    if (!targetUrl) {
                        console.warn('[Updates] Target URL is not available');
                        return;
                    }
                    if (window.electronAPI?.openExternal) {
                        window.electronAPI.openExternal(targetUrl);
                    } else {
                        window.open(targetUrl, '_blank');
                    }
                });
                if (!targetUrl) {
                    actionBtn.disabled = true;
                }
            }

            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    banner?.classList.add('hidden');
                });
            }

            banner?.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    initializeNavigation() {
        // console.log('Initializing navigation...');
        const navLinks = document.querySelectorAll('.nav-link');
        // console.log(`Found ${navLinks.length} navigation links`);
        
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;
                // console.log(`Navigation clicked: ${tabId}`);
                
                if (tabId) {
                    this.switchTab(tabId);
                    navLinks.forEach((l) => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // При переключении на config tab, перезагружаем данные
                    if (tabId === 'config') {
                        // console.log('Switching to config tab, reloading data...');
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
        // console.log(`Switching to tab: ${tabId}`);
        document.querySelectorAll('.tab-content').forEach((tab) => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            // console.log(`Tab ${tabId} activated`);
            if (tabId === 'statistics') {
                document.dispatchEvent(new CustomEvent('statistics-tab-activated'));
            } else if (tabId === 'diagnostics') {
                document.dispatchEvent(new CustomEvent('diagnostics-tab-activated'));
            }
        } else {
            console.error(`Target tab ${tabId}-tab not found`);
        }
    }

    async initializeTabs() {
        // console.log('Starting tabs initialization...');

        try {
            // console.log('Initializing config tab...');
            await initializeConfigTab();
            // console.log('✅ Config tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing config tab:', error);
        }

        try {
            // console.log('Initializing backup tab...');
            await initializeBackupTab();
            // console.log('✅ Backup tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing backup tab:', error);
        }

        try {
            // console.log('Initializing statistics tab...');
            await initializeStatisticsTab();
            // console.log('✅ Statistics tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing statistics tab:', error);
        }

        try {
            // console.log('Initializing diagnostics tab...');
            await initializeDiagnosticsTab();
            // console.log('✅ Diagnostics tab initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing diagnostics tab:', error);
        }

        // console.log('🎉 All tabs initialization completed');
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // console.log('🚀 DOM loaded, initializing AppRenderer...');
    new AppRenderer();
    // console.log('🎉 AppRenderer initialized successfully');
});
