/**
 * Toast Notification System
 * Global toast manager for the entire application
 */

class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.toastCounter = 0;
        this.init();
    }
    
    init() {
        this.createToastContainer();
    }
    
    createToastContainer() {
        // Remove existing container if any
        const existing = document.getElementById('toast-container');
        if (existing) {
            existing.remove();
        }
        
        // Create new container
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        this.toastContainer.style.zIndex = '9999';
        
        document.body.appendChild(this.toastContainer);
    }
    
    show(message, type = 'info', options = {}) {
        const toastId = `toast-${++this.toastCounter}`;
        const {
            title = this.getDefaultTitle(type),
            duration = this.getDefaultDuration(type),
            autoHide = true,
            showClose = true,
            icon = this.getDefaultIcon(type)
        } = options;
        
        const toast = this.createToast(toastId, message, type, title, icon, showClose);
        this.toastContainer.appendChild(toast);
        
        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: autoHide,
            delay: duration
        });
        
        // Show toast
        bsToast.show();
        
        // Auto-remove from DOM after hide
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        return {
            id: toastId,
            element: toast,
            bsToast: bsToast,
            hide: () => bsToast.hide()
        };
    }
    
    createToast(id, message, type, title, icon, showClose) {
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        const headerClass = this.getHeaderClass(type);
        const closeButton = showClose ? `
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        ` : '';
        
        toast.innerHTML = `
            <div class="toast-header ${headerClass}">
                <i class="${icon} me-2"></i>
                <strong class="me-auto">${title}</strong>
                ${closeButton}
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        return toast;
    }
    
    getDefaultTitle(type) {
        const titles = {
            success: 'Thành công',
            error: 'Lỗi',
            warning: 'Cảnh báo',
            info: 'Thông tin'
        };
        return titles[type] || 'Thông báo';
    }
    
    getDefaultIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || 'fas fa-bell';
    }
    
    getDefaultDuration(type) {
        const durations = {
            success: 4000,
            error: 6000,
            warning: 5000,
            info: 4000
        };
        return durations[type] || 4000;
    }
    
    getHeaderClass(type) {
        const classes = {
            success: 'bg-success text-white',
            error: 'bg-danger text-white',
            warning: 'bg-warning text-dark',
            info: 'bg-info text-white'
        };
        return classes[type] || 'bg-primary text-white';
    }
    
    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    // Clear all toasts
    clear() {
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => {
            const bsToast = bootstrap.Toast.getInstance(toast);
            if (bsToast) {
                bsToast.hide();
            }
        });
    }
    
    // Update upload-specific methods for backward compatibility
    showValidationResult(result) {
        if (result.success) {
            this.success(result.message, {
                title: 'Validation thành công',
                icon: 'fas fa-check-circle'
            });
        } else {
            this.error(result.message, {
                title: 'Validation thất bại',
                icon: 'fas fa-exclamation-triangle'
            });
        }
    }
    
    showUploadSuccess(result) {
        this.success(result.message, {
            title: 'Upload thành công',
            icon: 'fas fa-cloud-upload',
            duration: 5000
        });
    }
    
    showProcessingResult(result) {
        if (result.success) {
            const frameCount = result.frames ? result.frames.length : 0;
            this.success(`${result.message}. Đã tạo ${frameCount} frames.`, {
                title: 'Xử lý hoàn tất',
                icon: 'fas fa-cogs',
                duration: 6000
            });
        } else {
            this.error(result.message, {
                title: 'Xử lý thất bại',
                icon: 'fas fa-exclamation-triangle'
            });
        }
    }
    
    showError(message) {
        this.error(message, {
            title: 'Có lỗi xảy ra',
            icon: 'fas fa-exclamation-triangle'
        });
    }

    showWarning(message) {
        this.warning(message, {
            title: 'Cảnh báo',
            icon: 'fas fa-exclamation-circle'
        });
    }
    
    showProgress(message) {
        return this.info(message, {
            title: 'Đang xử lý',
            icon: 'fas fa-spinner fa-spin',
            autoHide: false,
            showClose: true
        });
    }
}

// Global instance
window.toastManager = new ToastManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Ensure toast manager is ready
    if (!window.toastManager) {
        window.toastManager = new ToastManager();
    }
});
