/**
 * Chart.js Theme Helper - Bank Transaction Manager
 * JavaScript helper functions to use CSS variables with Chart.js
 */

class ChartThemeHelper {
    constructor() {
        this.updateCSSVariables();
        this.observeThemeChanges();
    }

    /**
     * Get CSS variable value
     */
    getCSSVariable(variable) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(variable)
            .trim();
    }

    /**
     * Update CSS variables when theme changes
     */
    updateCSSVariables() {
        this.colors = {
            primary: this.getCSSVariable('--chartjs-primary'),
            primaryRGB: this.getCSSVariable('--chartjs-primary-rgb'),
            success: this.getCSSVariable('--chartjs-success'),
            successRGB: this.getCSSVariable('--chartjs-success-rgb'),
            danger: this.getCSSVariable('--chartjs-danger'),
            dangerRGB: this.getCSSVariable('--chartjs-danger-rgb'),
            warning: this.getCSSVariable('--chartjs-warning'),
            warningRGB: this.getCSSVariable('--chartjs-warning-rgb'),
            info: this.getCSSVariable('--chartjs-info'),
            infoRGB: this.getCSSVariable('--chartjs-info-rgb'),
            secondary: this.getCSSVariable('--chartjs-secondary'),
            secondaryRGB: this.getCSSVariable('--chartjs-secondary-rgb'),
            purple: this.getCSSVariable('--chartjs-purple'),
            pink: this.getCSSVariable('--chartjs-pink'),
            orange: this.getCSSVariable('--chartjs-orange'),
            teal: this.getCSSVariable('--chartjs-teal'),
            indigo: this.getCSSVariable('--chartjs-indigo')
        };

        this.text = {
            primary: this.getCSSVariable('--chartjs-text'),
            muted: this.getCSSVariable('--chartjs-text-muted'),
            light: this.getCSSVariable('--chartjs-text-light')
        };

        this.typography = {
            fontFamily: this.getCSSVariable('--chartjs-font-family') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: parseInt(this.getCSSVariable('--chartjs-font-size')) || 12,
            fontSizeSm: parseInt(this.getCSSVariable('--chartjs-font-size-sm')) || 11,
            fontSizeLg: parseInt(this.getCSSVariable('--chartjs-font-size-lg')) || 14,
            fontWeight: parseInt(this.getCSSVariable('--chartjs-font-weight')) || 400,
            fontWeightBold: parseInt(this.getCSSVariable('--chartjs-font-weight-bold')) || 600
        };

        this.borders = {
            color: this.getCSSVariable('--chartjs-border'),
            grid: this.getCSSVariable('--chartjs-grid'),
            gridMuted: this.getCSSVariable('--chartjs-grid-muted'),
            width: parseInt(this.getCSSVariable('--chartjs-border-width')) || 2,
            radius: parseInt(this.getCSSVariable('--chartjs-border-radius')) || 4
        };

        this.points = {
            radius: parseInt(this.getCSSVariable('--chartjs-point-radius')) || 4,
            hoverRadius: parseInt(this.getCSSVariable('--chartjs-point-hover-radius')) || 6,
            tension: parseFloat(this.getCSSVariable('--chartjs-line-tension')) || 0.4
        };

        this.backgrounds = {
            primary: this.getCSSVariable('--chartjs-bg'),
            secondary: this.getCSSVariable('--chartjs-bg-secondary'),
            tooltip: this.getCSSVariable('--chartjs-bg-tooltip')
        };
    }

    /**
     * Observe theme changes and update variables
     */
    observeThemeChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'data-bs-theme') {
                    setTimeout(() => this.updateCSSVariables(), 50);
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-bs-theme']
        });
    }

    /**
     * Get default color palette
     */
    getColorPalette(type = 'default') {
        const palettes = {
            default: [
                this.colors.primary,
                this.colors.success,
                this.colors.danger,
                this.colors.warning,
                this.colors.info,
                this.colors.purple,
                this.colors.pink,
                this.colors.orange,
                this.colors.teal,
                this.colors.secondary
            ],
            business: [
                '#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#4CAF50',
                '#9C27B0', '#FF5722', '#607D8B', '#795548', '#FF9800'
            ],
            soft: [
                `rgba(${this.colors.primaryRGB}, 0.8)`,
                `rgba(${this.colors.successRGB}, 0.8)`,
                `rgba(${this.colors.dangerRGB}, 0.8)`,
                `rgba(${this.colors.warningRGB}, 0.8)`,
                `rgba(${this.colors.infoRGB}, 0.8)`,
                `rgba(111, 66, 193, 0.8)`,
                `rgba(232, 62, 140, 0.8)`,
                `rgba(253, 126, 20, 0.8)`,
                `rgba(32, 201, 151, 0.8)`,
                `rgba(${this.colors.secondaryRGB}, 0.8)`
            ]
        };

        return palettes[type] || palettes.default;
    }

    /**
     * Get background colors with opacity
     */
    getBackgroundColors(colors, opacity = 0.2) {
        return colors.map(color => {
            if (color.includes('rgba')) return color;
            if (color.includes('rgb')) {
                return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
            }
            // Convert hex to rgba
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        });
    }

    /**
     * Get Chart.js default configuration with theme
     */
    getDefaultConfig() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: this.typography.fontFamily,
                            size: this.typography.fontSize,
                            weight: this.typography.fontWeight
                        },
                        color: this.text.primary,
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: this.backgrounds.tooltip,
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: this.borders.color,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: {
                        family: this.typography.fontFamily,
                        size: this.typography.fontSize
                    },
                    padding: 12,
                    caretPadding: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: this.borders.grid,
                        borderColor: this.borders.color
                    },
                    ticks: {
                        color: this.text.muted,
                        font: {
                            family: this.typography.fontFamily,
                            size: this.typography.fontSize
                        }
                    }
                },
                y: {
                    grid: {
                        color: this.borders.grid,
                        borderColor: this.borders.color
                    },
                    ticks: {
                        color: this.text.muted,
                        font: {
                            family: this.typography.fontFamily,
                            size: this.typography.fontSize
                        }
                    }
                }
            }
        };
    }

    /**
     * Create a bar chart configuration
     */
    createBarChart(data, options = {}) {
        const colors = this.getColorPalette(options.colorPalette || 'default');
        const backgroundColors = this.getBackgroundColors(colors, options.backgroundOpacity || 0.2);

        return {
            type: 'bar',
            data: {
                ...data,
                datasets: data.datasets.map((dataset, index) => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || backgroundColors,
                    borderColor: dataset.borderColor || colors,
                    borderWidth: dataset.borderWidth || this.borders.width,
                    borderRadius: this.borders.radius,
                    borderSkipped: false
                }))
            },
            options: {
                ...this.getDefaultConfig(),
                ...options,
                elements: {
                    bar: {
                        borderRadius: this.borders.radius
                    }
                }
            }
        };
    }

    /**
     * Create a line chart configuration
     */
    createLineChart(data, options = {}) {
        const colors = this.getColorPalette(options.colorPalette || 'default');
        const backgroundColors = this.getBackgroundColors(colors, options.backgroundOpacity || 0.1);

        return {
            type: 'line',
            data: {
                ...data,
                datasets: data.datasets.map((dataset, index) => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || backgroundColors[index % colors.length],
                    borderColor: dataset.borderColor || colors[index % colors.length],
                    borderWidth: dataset.borderWidth || this.borders.width,
                    fill: dataset.fill !== undefined ? dataset.fill : options.fill || false,
                    tension: dataset.tension || this.points.tension,
                    pointRadius: dataset.pointRadius || this.points.radius,
                    pointHoverRadius: dataset.pointHoverRadius || this.points.hoverRadius,
                    pointBackgroundColor: dataset.pointBackgroundColor || colors[index % colors.length],
                    pointBorderColor: dataset.pointBorderColor || '#ffffff',
                    pointBorderWidth: 2
                }))
            },
            options: {
                ...this.getDefaultConfig(),
                ...options
            }
        };
    }

    /**
     * Create a pie/doughnut chart configuration
     */
    createPieChart(data, options = {}, isDoughnut = false) {
        const colors = this.getColorPalette(options.colorPalette || 'default');
        const backgroundColors = options.backgroundOpacity ? 
            this.getBackgroundColors(colors, options.backgroundOpacity) : colors;

        return {
            type: isDoughnut ? 'doughnut' : 'pie',
            data: {
                ...data,
                datasets: data.datasets.map((dataset, index) => ({
                    ...dataset,
                    backgroundColor: dataset.backgroundColor || backgroundColors,
                    borderColor: dataset.borderColor || this.backgrounds.primary,
                    borderWidth: dataset.borderWidth || this.borders.width,
                    hoverOffset: 4
                }))
            },
            options: {
                ...this.getDefaultConfig(),
                ...options,
                cutout: isDoughnut ? '50%' : 0
            }
        };
    }

    /**
     * Format Vietnamese currency
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(value);
    }

    /**
     * Format Vietnamese number
     */
    formatNumber(value) {
        return new Intl.NumberFormat('vi-VN').format(value);
    }

    /**
     * Add loading overlay to chart container
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const overlay = document.createElement('div');
            overlay.className = 'chart-loading-overlay';
            overlay.innerHTML = '<div class="chart-loading-spinner"></div>';
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
    }

    /**
     * Remove loading overlay from chart container
     */
    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const overlay = container.querySelector('.chart-loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }
}

// Create global instance
window.ChartTheme = new ChartThemeHelper();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartThemeHelper;
}

// Usage examples:
/*
// Basic usage
const chartConfig = ChartTheme.createBarChart({
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
    datasets: [{
        label: 'Doanh thu',
        data: [12, 19, 3, 5, 2]
    }]
});

// With custom options
const lineChartConfig = ChartTheme.createLineChart({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
        label: 'Giao dịch',
        data: [65, 59, 80, 81, 56]
    }]
}, {
    colorPalette: 'business',
    fill: true,
    backgroundOpacity: 0.3
});

// Currency formatting in tooltips
const configWithCurrency = {
    ...ChartTheme.getDefaultConfig(),
    plugins: {
        ...ChartTheme.getDefaultConfig().plugins,
        tooltip: {
            ...ChartTheme.getDefaultConfig().plugins.tooltip,
            callbacks: {
                label: function(context) {
                    return context.dataset.label + ': ' + ChartTheme.formatCurrency(context.parsed.y);
                }
            }
        }
    }
};

// Show loading
ChartTheme.showLoading('myChartContainer');

// Create chart
const myChart = new Chart(ctx, chartConfig);

// Hide loading
ChartTheme.hideLoading('myChartContainer');
*/