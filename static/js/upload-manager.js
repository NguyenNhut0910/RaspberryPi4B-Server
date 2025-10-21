/**
 * Upload Manager for bank transaction system
 * Singleton pattern - manages file uploads with new API system
 * Supports 1 video OR multiple images with event-based notifications
 */

class UploadManager {
    static instance = null;

    constructor() {
        // Enforce singleton pattern
        if (UploadManager.instance) {
            return UploadManager.instance;
        }

        // File management
        this.files = new Map(); // Map<file_id, fileInfo>
        this.pendingFiles = []; // Files to be uploaded
        this.uploadQueue = []; // Queue for sequential uploads

        // Upload state
        this.isUploading = false;
        this.activeUploads = new Map(); // Map<file_id, uploadInfo>

        // File type restrictions
        this.allowedVideoTypes = ['mp4', 'avi', 'mov', 'webm'];
        this.allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.maxFiles = 10;
        this.maxFileSize = 100 * 1024 * 1024; // 100MB

        // Event system
        this.eventListeners = new Map();

        UploadManager.instance = this;
        this.init();
    }

    static getInstance() {
        if (!UploadManager.instance) {
            UploadManager.instance = new UploadManager();
        }
        return UploadManager.instance;
    }


    init() {
        this.checkAPIHealth();
        this.setupEventSystem();
    }

    // ===========================================
    // EVENT SYSTEM
    // ===========================================

    setupEventSystem() {
        // Define available events
        this.events = {
            FILE_ADDED: 'file:added',
            FILE_REMOVED: 'file:removed',
            FILE_VALIDATED: 'file:validated',
            VIDEO_THUMBNAIL_GENERATED: 'video:thumbnail_generated',
            UPLOAD_STARTED: 'upload:started',
            UPLOAD_PROGRESS: 'upload:progress',
            UPLOAD_COMPLETED: 'upload:completed',
            UPLOAD_FAILED: 'upload:failed',
            UPLOAD_CANCELLED: 'upload:cancelled',
            PROCESSING_STARTED: 'processing:started',
            PROCESSING_PROGRESS: 'processing:progress',
            PROCESSING_COMPLETED: 'processing:completed',
            PROCESSING_FAILED: 'processing:failed',
            API_ERROR: 'api:error',
            VALIDATION_ERROR: 'validation:error'
        };
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    removeEventListener(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emitEvent(eventType, data = {}) {
        console.log(`[UploadManager Event] ${eventType}:`, data);

        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    // ===========================================
    // FILE MANAGEMENT
    // ===========================================

    addFiles(fileList) {
        const files = Array.from(fileList);
        const results = [];

        for (const file of files) {
            const result = this.addFile(file);
            results.push(result);
        }

        return results;
    }

    addFile(file) {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.emitEvent(this.events.VALIDATION_ERROR, {
                file: file,
                errors: validation.errors
            });
            return { success: false, errors: validation.errors };
        }

        // Check file type restrictions
        const fileType = this.getFileType(file);

        // Rule: Only 1 video OR multiple images
        if (fileType === 'video') {
            if (this.pendingFiles.length > 0) {
                const error = 'Chỉ được upload 1 video duy nhất. Vui lòng xóa các file khác.';
                this.emitEvent(this.events.VALIDATION_ERROR, {
                    file: file,
                    errors: [error]
                });
                return { success: false, errors: [error] };
            }
        } else if (fileType === 'image') {
            const hasVideo = this.pendingFiles.some(f => this.getFileType(f.file) === 'video');
            if (hasVideo) {
                const error = 'Không thể thêm ảnh khi đã có video. Vui lòng xóa video trước.';
                this.emitEvent(this.events.VALIDATION_ERROR, {
                    file: file,
                    errors: [error]
                });
                return { success: false, errors: [error] };
            }
        }

        // Add to pending files
        const fileInfo = {
            id: this.generateFileId(),
            file: file,
            name: file.name,
            size: file.size,
            type: fileType,
            status: 'pending',
            addedAt: new Date(),
            metadata: null
        };

        this.pendingFiles.push(fileInfo);

        this.emitEvent(this.events.FILE_ADDED, { fileInfo });

        return { success: true, fileInfo };
    }

    removeFile(fileId) {
        // Remove from pending files
        const pendingIndex = this.pendingFiles.findIndex(f => f.id === fileId);
        if (pendingIndex > -1) {
            const fileInfo = this.pendingFiles[pendingIndex];
            this.pendingFiles.splice(pendingIndex, 1);

            this.emitEvent(this.events.FILE_REMOVED, { fileInfo });
            return true;
        }

        // Cancel active upload if exists
        if (this.activeUploads.has(fileId)) {
            this.cancelUpload(fileId);
            return true;
        }

        return false;
    }

    clearFiles() {
        const removedFiles = [...this.pendingFiles];
        this.pendingFiles = [];

        // Cancel all active uploads
        for (const fileId of this.activeUploads.keys()) {
            this.cancelUpload(fileId);
        }

        removedFiles.forEach(fileInfo => {
            this.emitEvent(this.events.FILE_REMOVED, { fileInfo });
        });
    }

    getFiles() {
        return {
            pending: [...this.pendingFiles],
            uploading: Array.from(this.activeUploads.values()),
            completed: Array.from(this.files.values()).filter(f => f.status === 'completed')
        };
    }

    getFileCount() {
        return {
            pending: this.pendingFiles.length,
            uploading: this.activeUploads.size,
            completed: Array.from(this.files.values()).filter(f => f.status === 'completed').length
        };
    }

    // ===========================================
    // FILE VALIDATION
    // ===========================================

    validateFile(file) {
        const errors = [];

        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File quá lớn. Kích thước tối đa: ${this.formatFileSize(this.maxFileSize)}`);
        }

        if (file.size === 0) {
            errors.push('File rỗng');
        }

        // Check file type
        const fileType = this.getFileType(file);
        if (fileType === 'unknown') {
            errors.push('Loại file không được hỗ trợ');
        }

        // Check total files limit
        if (this.pendingFiles.length >= this.maxFiles) {
            errors.push(`Không thể thêm quá ${this.maxFiles} files`);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            fileType: fileType
        };
    }

    getFileType(file) {
        const extension = file.name.split('.').pop().toLowerCase();

        if (this.allowedVideoTypes.includes(extension)) {
            return 'video';
        } else if (this.allowedImageTypes.includes(extension)) {
            return 'image';
        } else {
            return 'unknown';
        }
    }

    // ===========================================
    // API INTEGRATION
    // ===========================================

    async getFileMetadata(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/file/metadata', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    metadata: result.metadata
                };
            } else {
                this.emitEvent(this.events.API_ERROR, {
                    action: 'metadata',
                    error: result.message,
                    file: file
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.API_ERROR, {
                action: 'metadata',
                error: error.message,
                file: file
            });
            return { success: false, error: error.message };
        }
    }


    async uploadFile(fileInfo) {
        if (!fileInfo || !fileInfo.file) {
            this.emitEvent(this.events.VALIDATION_ERROR, {
                error: 'No file provided for upload'
            });
            return { success: false, error: 'No file provided' };
        }

        const file = fileInfo.file;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('destination', 'temp');

            this.emitEvent(this.events.UPLOAD_STARTED, { fileInfo });

            const response = await fetch('/api/file/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Get the first successful upload result
                const uploadResult = result.results && result.results.length > 0 ? result.results[0] : {};
                const fileId = result.file_ids && result.file_ids.length > 0 ? result.file_ids[0] : uploadResult.file_id;

                if (!fileId) {
                    throw new Error('No file ID returned from upload');
                }

                const uploadInfo = {
                    fileInfo: fileInfo,
                    fileId: fileId,
                    uploadResult: uploadResult,
                    status: 'uploading'
                };

                this.activeUploads.set(fileId, uploadInfo);
                this.files.set(fileId, {
                    ...fileInfo,
                    fileId: fileId,
                    status: 'uploading',
                    uploadedAt: new Date(),
                    uploadResult: uploadResult
                });

                // Remove from pending
                const pendingIndex = this.pendingFiles.findIndex(f => f.id === fileInfo.id);
                if (pendingIndex > -1) {
                    this.pendingFiles.splice(pendingIndex, 1);
                }

                this.emitEvent(this.events.UPLOAD_COMPLETED, {
                    fileInfo,
                    fileId: fileId,
                    result: uploadResult
                });

                // Start tracking progress
                this.trackUploadProgress(fileId);

                return { success: true, fileId: fileId, result: uploadResult };

            } else {
                this.emitEvent(this.events.UPLOAD_FAILED, {
                    fileInfo,
                    error: result.message
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.UPLOAD_FAILED, {
                fileInfo,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    async uploadAllFiles() {
        if (this.pendingFiles.length === 0) {
            this.emitEvent(this.events.VALIDATION_ERROR, {
                error: 'No files to upload'
            });
            return { success: false, error: 'No files to upload' };
        }

        this.isUploading = true;
        const results = [];

        try {
            // Upload files sequentially to avoid overwhelming the server
            for (const fileInfo of [...this.pendingFiles]) {
                const result = await this.uploadFile(fileInfo);
                results.push(result);

                if (!result.success) {
                    // Stop on first failure
                    break;
                }
            }

            return {
                success: results.every(r => r.success),
                results: results
            };

        } finally {
            this.isUploading = false;
        }
    }

    async cancelUpload(fileId) {
        try {
            const response = await fetch(`/api/file/cancel/${fileId}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.activeUploads.delete(fileId);
                this.files.delete(fileId);

                this.emitEvent(this.events.UPLOAD_CANCELLED, {
                    fileId,
                    result
                });

                return { success: true };
            } else {
                this.emitEvent(this.events.API_ERROR, {
                    action: 'cancel',
                    fileId,
                    error: result.message
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.API_ERROR, {
                action: 'cancel',
                fileId,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    // ===========================================
    // PROGRESS TRACKING
    // ===========================================

    async trackUploadProgress(fileId) {
        const maxAttempts = 100;
        let attempts = 0;

        const checkProgress = async () => {
            if (attempts >= maxAttempts) {
                this.emitEvent(this.events.UPLOAD_FAILED, {
                    fileId,
                    error: 'Progress tracking timeout'
                });
                return;
            }

            attempts++;

            try {
                const response = await fetch(`/api/file/progress/${fileId}`);
                const result = await response.json();

                if (result.success) {
                    const progress = result.progress;

                    this.emitEvent(this.events.UPLOAD_PROGRESS, {
                        fileId,
                        progress
                    });

                    // Update file info
                    if (this.files.has(fileId)) {
                        const fileInfo = this.files.get(fileId);
                        fileInfo.progress = progress;
                        fileInfo.status = progress.status;
                        this.files.set(fileId, fileInfo);
                    }

                    // Continue tracking if not completed
                    if (progress.status === 'processing' || progress.status === 'uploading') {
                        setTimeout(checkProgress, 1000); // Check every second
                    } else if (progress.status === 'completed') {
                        this.activeUploads.delete(fileId);
                        this.emitEvent(this.events.PROCESSING_COMPLETED, {
                            fileId,
                            progress
                        });
                    } else if (progress.status === 'failed') {
                        this.activeUploads.delete(fileId);
                        this.emitEvent(this.events.PROCESSING_FAILED, {
                            fileId,
                            progress,
                            error: progress.error_message
                        });
                    }
                } else {
                    this.emitEvent(this.events.API_ERROR, {
                        action: 'progress',
                        fileId,
                        error: result.message
                    });
                }

            } catch (error) {
                this.emitEvent(this.events.API_ERROR, {
                    action: 'progress',
                    fileId,
                    error: error.message
                });
            }
        };

        // Start tracking
        setTimeout(checkProgress, 1000);
    }

    async getFileProgress(fileId) {
        try {
            const response = await fetch(`/api/file/progress/${fileId}`);
            const result = await response.json();

            if (result.success) {
                return { success: true, progress: result.progress };
            } else {
                return { success: false, error: result.message };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===========================================
    // FILE LISTING AND MANAGEMENT
    // ===========================================

    async listUploadedFiles() {
        try {
            const response = await fetch('/api/file/list');
            const result = await response.json();

            if (result.success) {
                return { success: true, files: result.files };
            } else {
                this.emitEvent(this.events.API_ERROR, {
                    action: 'list',
                    error: result.message
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.API_ERROR, {
                action: 'list',
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    // ===========================================
    // VIDEO PROCESSING
    // ===========================================

    async getVideoInfo(fileId) {
        try {
            const fileInfo = this.files.get(fileId);
            if (!fileInfo || !fileInfo.uploadResult) {
                return { success: false, error: 'File not found' };
            }

            const response = await fetch('/api/video/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_path: fileInfo.uploadResult.file_path
                })
            });

            const result = await response.json();

            if (result.success) {
                return { success: true, videoInfo: result.video_info };
            } else {
                this.emitEvent(this.events.API_ERROR, {
                    action: 'video_info',
                    fileId,
                    error: result.message
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.API_ERROR, {
                action: 'video_info',
                fileId,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    async extractVideoFrames(fileId, config = {}) {
        try {
            const fileInfo = this.files.get(fileId);
            if (!fileInfo || !fileInfo.uploadResult) {
                console.error('File not found or missing upload result:', fileId, fileInfo);
                return { success: false, error: 'File not found or missing upload result' };
            }

            const filePath = fileInfo.uploadResult.file_path;
            if (!filePath) {
                console.error('Missing file_path in upload result:', fileInfo.uploadResult);
                return { success: false, error: 'file_path required but not found in upload result' };
            }

            const requestData = {
                file_path: filePath,
                fps: config.fps || 1
            };

            console.log('Extracting frames with data:', requestData);

            this.emitEvent(this.events.PROCESSING_STARTED, {
                fileId,
                action: 'frame_extraction',
                config: requestData
            });

            const response = await fetch('/api/video/extract-frames', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                this.emitEvent(this.events.PROCESSING_COMPLETED, {
                    fileId,
                    action: 'frame_extraction',
                    result
                });
                return { success: true, result };
            } else {
                this.emitEvent(this.events.PROCESSING_FAILED, {
                    fileId,
                    action: 'frame_extraction',
                    error: result.message
                });
                return { success: false, error: result.message };
            }

        } catch (error) {
            this.emitEvent(this.events.PROCESSING_FAILED, {
                fileId,
                action: 'frame_extraction',
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }


    async checkAPIHealth() {
        try {
            const response = await fetch('/api/health');
            const result = await response.json();

            this.emitEvent('api:health', {
                status: result.status,
                healthy: result.status === 'healthy'
            });

        } catch (error) {
            this.emitEvent('api:health', {
                status: 'error',
                healthy: false,
                error: error.message
            });
        }
    }

    // ===========================================
    // DRAG & DROP SUPPORT UTILITIES
    // ===========================================

    createDragDropHandler() {
        return {
            preventDefaults: (e) => {
                e.preventDefault();
                e.stopPropagation();
            },

            handleDragEnter: () => ({
                action: 'add-drag-over-class'
            }),

            handleDragLeave: () => ({
                action: 'remove-drag-over-class'
            }),

            handleDrop: (e) => {
                const files = e.dataTransfer.files;
                this.addFiles(files);
                return {
                    action: 'remove-drag-over-class',
                    filesAdded: files.length
                };
            }
        };
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    getUploadedFiles() {
        return Array.from(this.files.values()).filter(f => f.status === 'completed');
    }

    getActiveUploads() {
        return Array.from(this.activeUploads.values());
    }

    hasVideoFile() {
        return this.pendingFiles.some(f => f.type === 'video') ||
            Array.from(this.files.values()).some(f => f.type === 'video');
    }

    hasImageFiles() {
        return this.pendingFiles.some(f => f.type === 'image') ||
            Array.from(this.files.values()).some(f => f.type === 'image');
    }

    canAddMoreFiles() {
        return this.pendingFiles.length < this.maxFiles;
    }

    getTotalFileSize() {
        return this.pendingFiles.reduce((total, f) => total + f.size, 0);
    }

    // ===========================================
    // RESET AND CLEANUP
    // ===========================================

    reset() {
        // Cancel all active uploads
        for (const fileId of this.activeUploads.keys()) {
            this.cancelUpload(fileId);
        }

        // Clear all data
        this.files.clear();
        this.activeUploads.clear();
        this.pendingFiles = [];
        this.uploadQueue = [];
        this.isUploading = false;

        this.emitEvent('manager:reset', {});
    }

    destroy() {
        this.reset();
        this.eventListeners.clear();
        UploadManager.instance = null;
    }
}

// Export for use
window.UploadManager = UploadManager;

// Auto-initialize singleton when available
if (typeof window !== 'undefined') {
    window.UploadManager = UploadManager;
}

// Usage Example and Integration Guide:
/*

===========================================
INTEGRATION GUIDE
===========================================

1. GET SINGLETON INSTANCE:
const manager = UploadManager.getInstance();

2. SETUP EVENT LISTENERS:
manager.addEventListener('file:added', (data) => {
    console.log('File added:', data.fileInfo);
    // Update UI to show new file in list
});

manager.addEventListener('upload:progress', (data) => {
    console.log(`Upload progress for ${data.fileId}: ${data.progress.percent}%`);
    // Update progress bar in UI
});

manager.addEventListener('upload:completed', (data) => {
    console.log('Upload completed:', data.fileId);
    // Show success message, update file status
});

manager.addEventListener('validation:error', (data) => {
    console.error('Validation error:', data.errors);
    // Show error message to user
});

3. DRAG & DROP INTEGRATION:
const dropZone = document.getElementById('drop-zone');
const dragHandler = manager.createDragDropHandler();

// Setup drag & drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, dragHandler.preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const result = dragHandler.handleDrop(e);
    // Handle result actions if needed
}, false);

4. FILE INPUT INTEGRATION:
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (e) => {
    manager.addFiles(e.target.files);
});

5. UPLOAD BUTTON INTEGRATION:
document.getElementById('upload-btn').addEventListener('click', async () => {
    const result = await manager.uploadAllFiles();
    if (result.success) {
        console.log('All files uploaded successfully');
    } else {
        console.error('Upload failed:', result.results);
    }
});

6. FILE MANAGEMENT:
// Get current files
const files = manager.getFiles();
console.log('Pending files:', files.pending);
console.log('Uploading files:', files.uploading);
console.log('Completed files:', files.completed);

// Remove file
manager.removeFile(fileId);

// Clear all files
manager.clearFiles();

7. VIDEO PROCESSING:
const videoFiles = manager.getUploadedFiles().filter(f => f.type === 'video');
if (videoFiles.length > 0) {
    const videoFile = videoFiles[0];
    
    // Get video info
    const videoInfo = await manager.getVideoInfo(videoFile.fileId);
    if (videoInfo.success) {
        console.log('Video info:', videoInfo.videoInfo);
    }
    
    // Extract frames
    const frameResult = await manager.extractVideoFrames(videoFile.fileId, { fps: 1 });
    if (frameResult.success) {
        console.log('Frame extraction completed:', frameResult.result);
    }
}

8. API OPERATIONS:
// Get file metadata
const metadataResult = await manager.getFileMetadata(file);

// List uploaded files
const fileList = await manager.listUploadedFiles();

// Get progress for specific file
const progress = await manager.getFileProgress(fileId);

// Cancel upload
const cancelResult = await manager.cancelUpload(fileId);

9. VALIDATION RULES:
- Only 1 video OR multiple images allowed
- Maximum 10 files
- Maximum 100MB per file
- Supported video: mp4, avi, mov, webm
- Supported images: jpg, jpeg, png, gif, webp

10. EVENTS AVAILABLE:
- file:added, file:removed, file:validated
- upload:started, upload:progress, upload:completed, upload:failed, upload:cancelled
- processing:started, processing:progress, processing:completed, processing:failed
- validation:error, api:error, api:health, manager:reset

*/