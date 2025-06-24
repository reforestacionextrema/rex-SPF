 
// ================================
// TOAST SYSTEM - Sistema de Notificaciones Toast
// ================================

class ToastManager {
    
    // ================================
    // PROPIEDADES DE LA CLASE
    // ================================
    
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.counter = 0;
        this.maxToasts = 5;
        this.defaultDuration = 5000;
        this.positions = {
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
            'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
        };
        this.currentPosition = 'bottom-right';
        this.soundEnabled = false;
        this.animationDuration = 400;
        
        this.init();
    }
    
    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.createContainer();
        this.createStyles();
        this.setupGlobalHandlers();
    }
    
    createContainer() {
        // Buscar contenedor existente o crear uno nuevo
        this.container = document.getElementById('toastContainer');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        
        this.updateContainerPosition();
    }
    
    createStyles() {
        // Verificar si los estilos ya existen
        if (document.getElementById('toast-system-styles')) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'toast-system-styles';
        styleSheet.textContent = `
            .toast-container {
                position: fixed;
                z-index: 9999;
                display: flex;
                flex-direction: column-reverse;
                gap: 10px;
                max-width: 400px;
                pointer-events: none;
                ${this.positions[this.currentPosition]}
            }
            
            .toast-container.top-position {
                flex-direction: column;
            }
            
            .toast {
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 12px;
                padding: 16px 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border-left: 4px solid;
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 320px;
                max-width: 400px;
                transform: translateX(420px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                opacity: 0;
                pointer-events: auto;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            .toast.left-position {
                transform: translateX(-420px);
            }
            
            .toast.center-position {
                transform: translateY(-100px) scale(0.9);
            }
            
            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .toast.show.center-position {
                transform: translateY(0) scale(1);
            }
            
            .toast.hide {
                transform: translateX(420px);
                opacity: 0;
            }
            
            .toast.hide.left-position {
                transform: translateX(-420px);
            }
            
            .toast.hide.center-position {
                transform: translateY(-100px) scale(0.9);
            }
            
            .toast::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: inherit;
                animation: toast-progress var(--duration, 5s) linear forwards;
                border-radius: 0 0 12px 12px;
            }
            
            @keyframes toast-progress {
                from { width: 100%; }
                to { width: 0%; }
            }
            
            .toast.paused::before {
                animation-play-state: paused;
            }
            
            .toast.no-progress::before {
                display: none;
            }
            
            .toast-icon {
                font-size: 20px;
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: toast-icon-bounce 0.6s ease-out;
            }
            
            @keyframes toast-icon-bounce {
                0%, 20%, 60%, 100% { transform: translateY(0); }
                40% { transform: translateY(-6px); }
                80% { transform: translateY(-3px); }
            }
            
            .toast-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .toast-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                line-height: 1.3;
                margin: 0;
            }
            
            .toast-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin: 0;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 18px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }
            
            .toast-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #666;
                transform: scale(1.1);
            }
            
            .toast-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }
            
            .toast-action {
                background: transparent;
                border: 1px solid #ddd;
                color: #666;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .toast-action:hover {
                background: #f5f5f5;
                border-color: #ccc;
            }
            
            .toast-action.primary {
                background: #4caf50;
                border-color: #4caf50;
                color: white;
            }
            
            .toast-action.primary:hover {
                background: #45a049;
                border-color: #45a049;
            }
            
            /* Toast Types */
            .toast.success {
                border-left-color: #4caf50;
            }
            
            .toast.success .toast-icon {
                color: #4caf50;
            }
            
            .toast.success::before {
                background: linear-gradient(90deg, #4caf50, #66bb6a);
            }
            
            .toast.error {
                border-left-color: #f44336;
            }
            
            .toast.error .toast-icon {
                color: #f44336;
            }
            
            .toast.error::before {
                background: linear-gradient(90deg, #f44336, #ef5350);
            }
            
            .toast.warning {
                border-left-color: #ff9800;
            }
            
            .toast.warning .toast-icon {
                color: #ff9800;
            }
            
            .toast.warning::before {
                background: linear-gradient(90deg, #ff9800, #ffb74d);
            }
            
            .toast.info {
                border-left-color: #2196f3;
            }
            
            .toast.info .toast-icon {
                color: #2196f3;
            }
            
            .toast.info::before {
                background: linear-gradient(90deg, #2196f3, #42a5f5);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .toast-container {
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .toast {
                    min-width: auto;
                    max-width: none;
                }
            }
            
            /* High contrast mode */
            @media (prefers-contrast: high) {
                .toast {
                    border: 2px solid #333;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .toast {
                    transition: opacity 0.2s ease;
                }
                
                .toast-icon {
                    animation: none;
                }
                
                .toast::before {
                    animation-duration: 0.2s;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }
    
    setupGlobalHandlers() {
        // Manejar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAllToasts();
            } else {
                this.resumeAllToasts();
            }
        });
        
        // Manejar redimensionamiento de ventana
        window.addEventListener('resize', this.debounce(() => {
            this.updateContainerPosition();
        }, 250));
    }
    
    // ================================
    // MÉTODOS PRINCIPALES
    // ================================
    
    show(type, title, message, options = {}) {
        // Validar límite de toasts
        if (this.toasts.size >= this.maxToasts) {
            this.removeOldestToast();
        }
        
        const toastId = ++this.counter;
        const config = this.normalizeOptions(type, title, message, options);
        const toast = this.createToast(toastId, config);
        
        this.container.appendChild(toast);
        this.toasts.set(toastId, { element: toast, config });
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove si tiene duración
        if (config.duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, config.duration);
        }
        
        // Ejecutar callback onShow si existe
        if (config.onShow) {
            config.onShow(toastId, toast);
        }
        
        // Reproducir sonido si está habilitado
        if (this.soundEnabled && config.sound) {
            this.playSound(type);
        }
        
        return toastId;
    }
    
    hide(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        const { element: toast, config } = toastData;
        
        // Ejecutar callback onHide si existe
        if (config.onHide) {
            const shouldHide = config.onHide(toastId, toast);
            if (shouldHide === false) return; // Cancelar ocultado
        }
        
        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toastId);
        }, this.animationDuration);
    }
    
    // ================================
    // MÉTODOS DE CONVENIENCIA
    // ================================
    
    success(title, message, options) {
        return this.show('success', title, message, options);
    }
    
    error(title, message, options = {}) {
        return this.show('error', title, message, { 
            duration: options.duration || 7000, 
            ...options 
        });
    }
    
    warning(title, message, options = {}) {
        return this.show('warning', title, message, { 
            duration: options.duration || 6000, 
            ...options 
        });
    }
    
    info(title, message, options) {
        return this.show('info', title, message, options);
    }
    
    // ================================
    // TOAST ESPECIALES
    // ================================
    
    loading(title, message, options = {}) {
        return this.show('info', title, message, {
            duration: 0, // No auto-hide
            icon: '⏳',
            closable: false,
            ...options
        });
    }
    
    progress(title, message, progress = 0, options = {}) {
        const toastId = this.show('info', title, message, {
            duration: 0,
            icon: '📊',
            progress: true,
            ...options
        });
        
        this.updateProgress(toastId, progress);
        return toastId;
    }
    
    updateProgress(toastId, progress) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        const progressBar = toastData.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
        
        const progressText = toastData.element.querySelector('.toast-progress-text');
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }
    
    actionToast(type, title, message, actions, options = {}) {
        return this.show(type, title, message, {
            actions: actions,
            duration: 0, // No auto-hide for action toasts
            ...options
        });
    }
    
    // ================================
    // CREACIÓN DE ELEMENTOS
    // ================================
    
    normalizeOptions(type, title, message, options) {
        return {
            type: type || 'info',
            title: title || '',
            message: message || '',
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            icon: options.icon || this.getDefaultIcon(type),
            closable: options.closable !== false,
            sound: options.sound !== false,
            actions: options.actions || [],
            progress: options.progress || false,
            onShow: options.onShow,
            onHide: options.onHide,
            onClick: options.onClick
        };
    }
    
    createToast(toastId, config) {
        const toast = document.createElement('div');
        toast.className = `toast ${config.type}`;
        toast.dataset.toastId = toastId;
        
        // Agregar clases de posición
        if (this.currentPosition.includes('left')) {
            toast.classList.add('left-position');
        } else if (this.currentPosition.includes('center')) {
            toast.classList.add('center-position');
        }
        
        // Configurar duración para la barra de progreso
        if (config.duration > 0) {
            toast.style.setProperty('--duration', `${config.duration}ms`);
        } else {
            toast.classList.add('no-progress');
        }
        
        // Construir contenido
        let actionsHTML = '';
        if (config.actions.length > 0) {
            actionsHTML = '<div class="toast-actions">';
            config.actions.forEach((action, index) => {
                actionsHTML += `
                    <button class="toast-action ${action.type || ''}" 
                            onclick="toastManager.handleActionClick(${toastId}, ${index})">
                        ${action.text}
                    </button>
                `;
            });
            actionsHTML += '</div>';
        }
        
        let progressHTML = '';
        if (config.progress) {
            progressHTML = `
                <div style="margin-top: 8px;">
                    <div style="background: #e0e0e0; height: 4px; border-radius: 2px; overflow: hidden;">
                        <div class="toast-progress-bar" style="background: ${this.getProgressColor(config.type)}; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <div class="toast-progress-text" style="font-size: 11px; color: #666; margin-top: 4px;">0%</div>
                </div>
            `;
        }
        
        toast.innerHTML = `
            <div class="toast-icon">${config.icon}</div>
            <div class="toast-content">
                <div class="toast-title">${config.title}</div>
                ${config.message ? `<div class="toast-message">${config.message}</div>` : ''}
                ${progressHTML}
                ${actionsHTML}
            </div>
            ${config.closable ? `<button class="toast-close" onclick="toastManager.hide(${toastId})">&times;</button>` : ''}
        `;
        
        // Event listeners
        this.setupToastEvents(toast, toastId, config);
        
        return toast;
    }
    
    setupToastEvents(toast, toastId, config) {
        // Pausar/reanudar en hover
        toast.addEventListener('mouseenter', () => {
            toast.classList.add('paused');
        });
        
        toast.addEventListener('mouseleave', () => {
            toast.classList.remove('paused');
        });
        
        // Click en el toast
        if (config.onClick) {
            toast.addEventListener('click', (e) => {
                if (!e.target.classList.contains('toast-close') && 
                    !e.target.classList.contains('toast-action')) {
                    config.onClick(toastId, toast);
                }
            });
        }
        
        // Accesibilidad
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', config.type === 'error' ? 'assertive' : 'polite');
    }
    
    // ================================
    // MANEJO DE ACCIONES
    // ================================
    
    handleActionClick(toastId, actionIndex) {
        const toastData = this.toasts.get(toastId);
        if (!toastData || !toastData.config.actions[actionIndex]) return;
        
        const action = toastData.config.actions[actionIndex];
        
        if (action.handler) {
            const result = action.handler(toastId);
            if (result !== false && action.autoClose !== false) {
                this.hide(toastId);
            }
        } else if (action.autoClose !== false) {
            this.hide(toastId);
        }
    }
    
    // ================================
    // GESTIÓN MASIVA
    // ================================
    
    clear() {
        this.toasts.forEach((_, toastId) => {
            this.hide(toastId);
        });
    }
    
    clearType(type) {
        this.toasts.forEach((toastData, toastId) => {
            if (toastData.config.type === type) {
                this.hide(toastId);
            }
        });
    }
    
    pauseAllToasts() {
        this.toasts.forEach(({ element }) => {
            element.classList.add('paused');
        });
    }
    
    resumeAllToasts() {
        this.toasts.forEach(({ element }) => {
            element.classList.remove('paused');
        });
    }
    
    removeOldestToast() {
        if (this.toasts.size === 0) return;
        
        const oldestToastId = this.toasts.keys().next().value;
        this.hide(oldestToastId);
    }
    
    // ================================
    // CONFIGURACIÓN
    // ================================
    
    setPosition(position) {
        if (!this.positions[position]) {
            console.warn(`Toast position '${position}' not supported`);
            return;
        }
        
        this.currentPosition = position;
        this.updateContainerPosition();
    }
    
    updateContainerPosition() {
        if (!this.container) return;
        
        // Remover estilos inline anteriores
        this.container.style.cssText = '';
        
        // Aplicar nueva posición
        this.container.style.cssText = this.positions[this.currentPosition];
        
        // Agregar clase para dirección de apilado
        if (this.currentPosition.includes('top')) {
            this.container.classList.add('top-position');
        } else {
            this.container.classList.remove('top-position');
        }
    }
    
    setMaxToasts(max) {
        this.maxToasts = Math.max(1, Math.min(10, max));
    }
    
    setDefaultDuration(duration) {
        this.defaultDuration = Math.max(1000, duration);
    }
    
    enableSound(enabled = true) {
        this.soundEnabled = enabled;
    }
    
    // ================================
    // UTILIDADES
    // ================================
    
    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
    
    getProgressColor(type) {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        return colors[type] || colors.info;
    }
    
    playSound(type) {
        // Implementación básica de sonido
        if ('AudioContext' in window) {
            try {
                const audioContext = new AudioContext();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Frecuencias diferentes para cada tipo
                const frequencies = {
                    success: 800,
                    error: 400,
                    warning: 600,
                    info: 500
                };
                
                oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (error) {
                console.warn('Could not play toast sound:', error);
            }
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // ================================
    // INFORMACIÓN Y ESTADÍSTICAS
    // ================================
    
    getStats() {
        const stats = {
            total: this.toasts.size,
            byType: {},
            activeToasts: Array.from(this.toasts.keys()),
            position: this.currentPosition,
            maxToasts: this.maxToasts,
            soundEnabled: this.soundEnabled
        };
        
        this.toasts.forEach(({ config }) => {
            stats.byType[config.type] = (stats.byType[config.type] || 0) + 1;
        });
        
        return stats;
    }
    
    isActive(toastId) {
        return this.toasts.has(toastId);
    }
    
    getToast(toastId) {
        return this.toasts.get(toastId);
    }
}

// ================================
// INSTANCIA GLOBAL
// ================================

// Crear instancia global del sistema de toast
const toastManager = new ToastManager();

// Exportar para compatibilidad
window.toastManager = toastManager;