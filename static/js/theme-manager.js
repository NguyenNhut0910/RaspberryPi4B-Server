/**
 * Theme Manager - Bootstrap 5.3+ Theme System
 * Lightweight theme management for the entire website
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'bs-theme';
        this.themes = ['light', 'dark', 'auto'];
        this.defaultTheme = 'auto';
        
        this.init();
    }

    init() {
        this.setTheme(this.getStoredTheme() || this.defaultTheme);
        this.watchSystemTheme();
        this.initializeThemeToggle();
    }

    getStoredTheme() {
        return localStorage.getItem(this.storageKey);
    }

    setStoredTheme(theme) {
        localStorage.setItem(this.storageKey, theme);
    }

    getActiveTheme() {
        const theme = this.getStoredTheme() || this.defaultTheme;
        if (theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }

    setTheme(theme) {
        if (!this.themes.includes(theme)) {
            theme = this.defaultTheme;
        }

        this.setStoredTheme(theme);

        if (theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-bs-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme);
        }

        this.updateThemeToggle(theme);
    }

    toggleTheme() {
        const currentTheme = this.getStoredTheme() || this.defaultTheme;
        let newTheme;

        switch (currentTheme) {
            case 'light':
                newTheme = 'dark';
                break;
            case 'dark':
                newTheme = 'auto';
                break;
            case 'auto':
            default:
                newTheme = 'light';
                break;
        }

        this.setTheme(newTheme);
        return newTheme;
    }

    watchSystemTheme() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const storedTheme = this.getStoredTheme();
            if (!storedTheme || storedTheme === 'auto') {
                this.setTheme('auto');
            }
        });
    }

    initializeThemeToggle() {
        const toggleBtns = document.querySelectorAll('[data-bs-theme-toggle]');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        });

        this.updateThemeToggle(this.getStoredTheme() || this.defaultTheme);
    }

    updateThemeToggle(theme) {
        const toggleBtns = document.querySelectorAll('[data-bs-theme-toggle]');
        
        toggleBtns.forEach(btn => {
            const icon = btn.querySelector('i') || btn.querySelector('.theme-icon');
            const text = btn.querySelector('.theme-text');
            
            if (icon) {
                icon.className = this.getThemeIcon(theme);
            }
            
            if (text) {
                text.textContent = this.getThemeText(theme);
            }

            btn.title = `Theme hiện tại: ${this.getThemeText(theme)}. Click để thay đổi.`;
        });
    }

    getThemeIcon(theme) {
        const iconMap = {
            'light': 'fal fa-sun',
            'dark': 'fal fa-moon',
            'auto': 'fal fa-adjust'
        };
        return iconMap[theme] || iconMap['auto'];
    }

    getThemeText(theme) {
        const textMap = {
            'light': 'Sáng',
            'dark': 'Tối',
            'auto': 'Tự động'
        };
        return textMap[theme] || textMap['auto'];
    }
}

// Initialize theme manager
let themeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
        window.themeManager = themeManager;
    });
} else {
    themeManager = new ThemeManager();
    window.themeManager = themeManager;
}
