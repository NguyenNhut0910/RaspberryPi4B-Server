class SensorChart {
    constructor(element, config = {}) {
        this.context = this._getContext(element);
        this.config = this._generateConfig(config.data, config.options || {});
        this.chart = new Chart(this.context, this.config);
        this.limitPoints = config.limitPoints || 50;
        this.callbacks = {}
        if (config.onDataUpdate && typeof config.onDataUpdate === 'function') {
            this.callbacks.onDataUpdate = config.onDataUpdate;
        }
        this._checkDataLimit();
    }

    _getContext(el) {
        let e = null;
        if (typeof el === 'string') {
            if (el.startsWith('#') || el.startsWith('.') || el.startsWith('[')) {
                e = document.querySelector(el)
            } else {
                e = document.getElementById(el)
            }
        } else if (el instanceof HTMLElement) {
            e = el
        }
        if (e) {
            return e.getContext('2d');
        }
        return null;
    }

    _generateConfig(data = {}, options = {}) {
        options = Object.assign({
            colorPalette: 'default', // hoặc 'business', 'soft'
            backgroundOpacity: 0.2,
            fillArea: true, // Mặc định tô màu area, set false để tắt
            showLabel: true, // Mặc định hiển thị legend, set false để ẩn
        }, options || {});

        const config = ChartTheme.createLineChart({
            labels: data.labels,
            datasets: [{
                label: options.label || 'Sensor Data',
                data: data.data,
                fill: options.fillArea,
                borderWidth: 2,
                tension: 0.4
            }]
        }, options);

        // Ẩn/hiện legend dựa trên showLabel option
        if (!options.showLabel) {
            config.options.plugins = config.options.plugins || {};
            config.options.plugins.legend = {
                display: false
            };
        }

        return config;
    }

    _checkDataLimit() {
        if (!this.chart) return;
        if (!this.chart.data) return;

        // No data
        if (!this.chart.data.datasets || !this.chart.data.datasets.length) {
            this.noDataOverlay();
            return;
        }
        if (this.chart.data.datasets.every(ds => ds.data.length === 0)) {
            this.noDataOverlay();
            return;
        }

        // Hide overlay when data is available
        this.hideDataOverlay();

        if (this.limitPoints && this.chart.data.labels.length > this.limitPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
            this.chart.update('none');
        }
        this.chart.update();
        if (this.callbacks.onDataUpdate) {
            this.callbacks.onDataUpdate(this.chart);
        }
    }

    noDataOverlay() {
        // Get the canvas element
        const canvas = this.context.canvas;
        const rect = canvas.getBoundingClientRect();

        // Check if overlay already exists
        let overlay = canvas.parentElement.querySelector('.no-data-overlay');

        if (!overlay) {
            // Create overlay element
            overlay = document.createElement('div');
            overlay.className = 'no-data-overlay';
            overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(248, 249, 250, 0.9);
                    z-index: 10;
                    pointer-events: none;
                `;

            // Create icon
            const icon = document.createElement('i');
            icon.className = 'fal fa-chart-line-down';
            icon.style.cssText = `
                    font-size: 3rem;
                    color: #6c757d;
                    margin-bottom: 0.5rem;
                `;

            // Create text
            const text = document.createElement('span');
            text.textContent = 'Không có dữ liệu';
            text.style.cssText = `
                    color: #6c757d;
                    font-size: 0.9rem;
                    font-weight: 500;
                `;

            // Append elements
            overlay.appendChild(icon);
            overlay.appendChild(text);

            // Set parent position to relative if not already
            const parent = canvas.parentElement;
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }

            // Append overlay to parent
            parent.appendChild(overlay);
        }

        // Show overlay
        overlay.style.display = 'flex';
    }

    hideDataOverlay() {
        const canvas = this.context.canvas;
        const overlay = canvas.parentElement.querySelector('.no-data-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    setData(data) {
        this.chart.data.labels = data.labels;
        this.chart.data.datasets[0].data = data.data;
        this._checkDataLimit();
    }

    addDataPoint(label, value) {
        this.chart.data.labels.push(label);
        this.chart.data.datasets[0].data.push(value);
        this._checkDataLimit();
    }
}