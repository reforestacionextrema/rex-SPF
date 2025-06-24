 
// ================================
// MODALS - Sistema de Ventanas Modales
// ================================

const Modals = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    activeModals: new Set(),
    modalStack: [],
    backdropClickClose: true,
    escapeKeyClose: true,
    
    // Configuración de animaciones
    animations: {
        fadeIn: 'modal-fade-in',
        fadeOut: 'modal-fade-out',
        slideIn: 'modal-slide-in',
        slideOut: 'modal-slide-out'
    },
    
    // Templates de modales predefinidos
    templates: {
        confirmation: 'confirmation-template',
        input: 'input-template',
        info: 'info-template',
        error: 'error-template'
    },

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.setupModalEvents();
        this.createModalStyles();
        return true;
    },

    setupModalEvents() {
        // Event listener global para clics fuera del modal
        document.addEventListener('click', this.handleBackdropClick.bind(this));
        
        // Event listener global para tecla Escape
        document.addEventListener('keydown', this.handleEscapeKey.bind(this));
        
        // Event listener para cambios de visibilidad
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    },

    createModalStyles() {
        // Agregar estilos CSS para animaciones si no existen
        if (!document.getElementById('modal-animations')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'modal-animations';
            styleSheet.textContent = `
                .modal-fade-in {
                    animation: modalFadeIn 0.3s ease-out forwards;
                }
                
                .modal-fade-out {
                    animation: modalFadeOut 0.3s ease-in forwards;
                }
                
                .modal-slide-in {
                    animation: modalSlideIn 0.4s ease-out forwards;
                }
                
                .modal-slide-out {
                    animation: modalSlideOut 0.4s ease-in forwards;
                }
                
                @keyframes modalFadeIn {
                    from { 
                        opacity: 0; 
                        transform: scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1); 
                    }
                }
                
                @keyframes modalFadeOut {
                    from { 
                        opacity: 1; 
                        transform: scale(1); 
                    }
                    to { 
                        opacity: 0; 
                        transform: scale(0.95); 
                    }
                }
                
                @keyframes modalSlideIn {
                    from { 
                        opacity: 0; 
                        transform: translateY(-50px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                
                @keyframes modalSlideOut {
                    from { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                    to { 
                        opacity: 0; 
                        transform: translateY(-50px) scale(0.95); 
                    }
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(3px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: hidden;
                    position: relative;
                }
                
                .modal-header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1b5e20;
                    margin: 0;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #666;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .modal-close:hover {
                    background: rgba(0, 0, 0, 0.1);
                    color: #333;
                }
                
                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    max-height: 60vh;
                }
                
                .modal-footer {
                    padding: 16px 24px 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .modal-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .modal-btn-primary {
                    background: #4caf50;
                    color: white;
                }
                
                .modal-btn-primary:hover {
                    background: #45a049;
                }
                
                .modal-btn-secondary {
                    background: #f5f5f5;
                    color: #333;
                }
                
                .modal-btn-secondary:hover {
                    background: #eeeeee;
                }
                
                .modal-btn-danger {
                    background: #f44336;
                    color: white;
                }
                
                .modal-btn-danger:hover {
                    background: #da190b;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    },

    // ================================
    // GESTIÓN DE MODALES
    // ================================

    openModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal con ID '${modalId}' no encontrado`);
            return false;
        }
        
        // Configurar opciones
        const config = {
            animation: 'fadeIn',
            backdrop: true,
            keyboard: true,
            focus: true,
            onOpen: null,
            onClose: null,
            ...options
        };
        
        // Agregar a la pila de modales activos
        this.activeModals.add(modalId);
        this.modalStack.push({ id: modalId, config });
        
        // Mostrar modal
        modal.style.display = 'block';
        
        // Aplicar animación
        if (config.animation && this.animations[config.animation]) {
            modal.classList.add(this.animations[config.animation]);
        }
        
        // Enfocar en el modal si está configurado
        if (config.focus) {
            this.focusModal(modal);
        }
        
        // Ejecutar callback de apertura
        if (typeof config.onOpen === 'function') {
            config.onOpen(modal);
        }
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
        
        return true;
    },

    closeModal(modalId, force = false) {
        if (!modalId && this.modalStack.length > 0) {
            // Cerrar el modal más reciente si no se especifica ID
            modalId = this.modalStack[this.modalStack.length - 1].id;
        }
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal con ID '${modalId}' no encontrado`);
            return false;
        }
        
        // Buscar configuración del modal
        const modalIndex = this.modalStack.findIndex(m => m.id === modalId);
        const config = modalIndex >= 0 ? this.modalStack[modalIndex].config : {};
        
        // Ejecutar callback de cierre
        if (typeof config.onClose === 'function' && !force) {
            const shouldClose = config.onClose(modal);
            if (shouldClose === false) {
                return false; // Cancelar cierre
            }
        }
        
        // Aplicar animación de salida
        if (config.animation && this.animations[config.animation]) {
            const outAnimation = config.animation.replace('In', 'Out');
            if (this.animations[outAnimation]) {
                modal.classList.remove(this.animations[config.animation]);
                modal.classList.add(this.animations[outAnimation]);
                
                // Esperar a que termine la animación
                setTimeout(() => {
                    this.finalizeModalClose(modalId, modal);
                }, 300);
                
                return true;
            }
        }
        
        // Cerrar inmediatamente si no hay animación
        this.finalizeModalClose(modalId, modal);
        return true;
    },

    finalizeModalClose(modalId, modal) {
        // Ocultar modal
        modal.style.display = 'none';
        
        // Limpiar clases de animación
        Object.values(this.animations).forEach(animation => {
            modal.classList.remove(animation);
        });
        
        // Remover de estructuras de seguimiento
        this.activeModals.delete(modalId);
        this.modalStack = this.modalStack.filter(m => m.id !== modalId);
        
        // Restaurar scroll del body si no hay más modales
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }
    },

    // ================================
    // MODALES DINÁMICOS
    // ================================

    createDynamicModal(config) {
        const modalId = `dynamic-modal-${Date.now()}`;
        const modal = this.buildModalElement(modalId, config);
        
        document.body.appendChild(modal);
        
        // Abrir el modal
        this.openModal(modalId, {
            animation: config.animation || 'slideIn',
            onClose: () => {
                // Remover el modal del DOM al cerrarlo
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 350);
                return true;
            }
        });
        
        return modalId;
    },

    buildModalElement(modalId, config) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal modal-overlay';
        modal.style.display = 'none';
        
        const container = document.createElement('div');
        container.className = 'modal-container';
        container.style.width = config.width || 'auto';
        container.style.maxWidth = config.maxWidth || '600px';
        
        // Header
        if (config.title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.innerHTML = `
                <h3 class="modal-title">${config.title}</h3>
                <button class="modal-close" onclick="Modals.closeModal('${modalId}')">&times;</button>
            `;
            container.appendChild(header);
        }
        
        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = config.content || '';
        container.appendChild(body);
        
        // Footer
        if (config.buttons && config.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            config.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `modal-btn modal-btn-${button.type || 'secondary'}`;
                btn.textContent = button.text;
                btn.onclick = () => {
                    if (button.handler) {
                        const result = button.handler();
                        if (result !== false && button.close !== false) {
                            this.closeModal(modalId);
                        }
                    } else if (button.close !== false) {
                        this.closeModal(modalId);
                    }
                };
                footer.appendChild(btn);
            });
            
            container.appendChild(footer);
        }
        
        modal.appendChild(container);
        return modal;
    },

    // ================================
    // MODALES PREDEFINIDOS
    // ================================

    showConfirmation(options) {
        const config = {
            title: options.title || 'Confirmación',
            content: `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${options.icon || '❓'}</div>
                    <p style="font-size: 16px; color: #333; margin: 0;">${options.message || '¿Estás seguro?'}</p>
                </div>
            `,
            width: '400px',
            buttons: [
                {
                    text: options.cancelText || 'Cancelar',
                    type: 'secondary',
                    handler: () => {
                        if (options.onCancel) options.onCancel();
                        return true;
                    }
                },
                {
                    text: options.confirmText || 'Confirmar',
                    type: options.confirmType || 'primary',
                    handler: () => {
                        if (options.onConfirm) options.onConfirm();
                        return true;
                    }
                }
            ]
        };
        
        return this.createDynamicModal(config);
    },

    showAlert(options) {
        const icons = {
            info: '💡',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        const config = {
            title: options.title || 'Información',
            content: `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${options.icon || icons[options.type] || icons.info}</div>
                    <p style="font-size: 16px; color: #333; margin: 0;">${options.message}</p>
                </div>
            `,
            width: '400px',
            buttons: [
                {
                    text: options.buttonText || 'Aceptar',
                    type: 'primary',
                    handler: () => {
                        if (options.onClose) options.onClose();
                        return true;
                    }
                }
            ]
        };
        
        return this.createDynamicModal(config);
    },

    showInput(options) {
        const inputId = `input-${Date.now()}`;
        
        const config = {
            title: options.title || 'Entrada de Datos',
            content: `
                <div style="padding: 20px 0;">
                    <p style="margin-bottom: 16px; color: #333;">${options.message || 'Ingresa un valor:'}</p>
                    <input type="${options.inputType || 'text'}" 
                           id="${inputId}"
                           placeholder="${options.placeholder || ''}"
                           value="${options.defaultValue || ''}"
                           style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;"
                           ${options.required ? 'required' : ''}>
                    ${options.validation ? '<div id="validation-message" style="color: #f44336; font-size: 12px; margin-top: 8px;"></div>' : ''}
                </div>
            `,
            width: '450px',
            buttons: [
                {
                    text: 'Cancelar',
                    type: 'secondary',
                    handler: () => {
                        if (options.onCancel) options.onCancel();
                        return true;
                    }
                },
                {
                    text: 'Aceptar',
                    type: 'primary',
                    handler: () => {
                        const input = document.getElementById(inputId);
                        const value = input.value.trim();
                        
                        // Validación
                        if (options.required && !value) {
                            input.style.borderColor = '#f44336';
                            if (options.validation) {
                                document.getElementById('validation-message').textContent = 'Este campo es requerido';
                            }
                            return false;
                        }
                        
                        if (options.validation && !options.validation(value)) {
                            input.style.borderColor = '#f44336';
                            return false;
                        }
                        
                        if (options.onAccept) options.onAccept(value);
                        return true;
                    }
                }
            ]
        };
        
        const modalId = this.createDynamicModal(config);
        
        // Enfocar el input cuando se abra el modal
        setTimeout(() => {
            const input = document.getElementById(inputId);
            if (input) {
                input.focus();
                input.select();
                
                // Enter para aceptar
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const acceptButton = input.closest('.modal-container').querySelector('.modal-btn-primary');
                        if (acceptButton) acceptButton.click();
                    }
                });
            }
        }, 100);
        
        return modalId;
    },

    showImageViewer(options) {
        const config = {
            title: options.title || 'Visor de Imagen',
            content: `
                <div style="text-align: center;">
                    <img src="${options.src}" 
                         alt="${options.alt || ''}"
                         style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                    ${options.description ? `<p style="margin-top: 16px; color: #666; font-size: 14px;">${options.description}</p>` : ''}
                </div>
            `,
            maxWidth: '90vw',
            buttons: [
                {
                    text: 'Cerrar',
                    type: 'secondary'
                }
            ]
        };
        
        return this.createDynamicModal(config);
    },

    // ================================
    // EVENTOS Y INTERACCIONES
    // ================================

    handleBackdropClick(event) {
        if (!this.backdropClickClose || this.activeModals.size === 0) return;
        
        // Verificar si el click fue en el backdrop
        if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            if (topModal && topModal.config.backdrop !== false) {
                this.closeModal(topModal.id);
            }
        }
    },

    handleEscapeKey(event) {
        if (!this.escapeKeyClose || event.key !== 'Escape' || this.activeModals.size === 0) return;
        
        const topModal = this.modalStack[this.modalStack.length - 1];
        if (topModal && topModal.config.keyboard !== false) {
            this.closeModal(topModal.id);
        }
    },

    handleVisibilityChange() {
        // Pausar animaciones cuando la pestaña no está visible
        if (document.hidden && this.activeModals.size > 0) {
            this.activeModals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.animationPlayState = 'paused';
                }
            });
        } else if (!document.hidden && this.activeModals.size > 0) {
            this.activeModals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.animationPlayState = 'running';
                }
            });
        }
    },

    focusModal(modal) {
        // Enfocar el primer elemento focuseable del modal
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    },

    // ================================
    // UTILIDADES
    // ================================

    closeAllModals() {
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(modalId => {
            this.closeModal(modalId, true);
        });
    },

    isModalOpen(modalId) {
        return this.activeModals.has(modalId);
    },

    getActiveModals() {
        return Array.from(this.activeModals);
    },

    // ================================
    // CONFIGURACIÓN
    // ================================

    setBackdropClickClose(enabled) {
        this.backdropClickClose = enabled;
    },

    setEscapeKeyClose(enabled) {
        this.escapeKeyClose = enabled;
    },

    // ================================
    // MODALES ESPECÍFICOS DEL PROYECTO
    // ================================

    showProjectSettings() {
        const config = {
            title: '⚙️ Configuración del Proyecto',
            content: `
                <div style="display: grid; gap: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Nombre del Proyecto:</label>
                        <input type="text" id="project-name-modal" value="${StateManager.projectName}" 
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Espaciado Automático:</label>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="auto-spacing-modal" ${TreePlanting.autoSpacing ? 'checked' : ''}>
                            <span>Activar espaciado mínimo automático</span>
                        </label>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Distancia Mínima (metros):</label>
                        <input type="number" id="min-spacing-modal" value="${TreePlanting.minSpacingDistance}" 
                               min="0.1" max="50" step="0.1"
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                </div>
            `,
            width: '500px',
            buttons: [
                {
                    text: 'Cancelar',
                    type: 'secondary'
                },
                {
                    text: 'Guardar',
                    type: 'primary',
                    handler: () => {
                        const projectName = document.getElementById('project-name-modal').value.trim();
                        const autoSpacing = document.getElementById('auto-spacing-modal').checked;
                        const minSpacing = parseFloat(document.getElementById('min-spacing-modal').value);
                        
                        if (projectName) {
                            StateManager.projectName = projectName;
                            const display = document.getElementById('projectNameDisplay');
                            if (display) display.textContent = projectName;
                        }
                        
                        TreePlanting.autoSpacing = autoSpacing;
                        if (minSpacing > 0) {
                            TreePlanting.setMinimumSpacing(minSpacing);
                        }
                        
                        toastManager.success('Configuración Guardada', 'Los cambios han sido aplicados');
                        return true;
                    }
                }
            ]
        };
        
        return this.createDynamicModal(config);
    },

    showAbout() {
        const config = {
            title: '🌳 Acerca del Sistema',
            content: `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🌱</div>
                    <h3 style="color: #1b5e20; margin-bottom: 16px;">Sistema de Planeación de Reforestaciones</h3>
                    <p style="color: #666; margin-bottom: 20px;">Versión 1.0</p>
                    
                    <div style="text-align: left; margin: 20px 0;">
                        <h4 style="color: #2e7d32; margin-bottom: 12px;">Características:</h4>
                        <ul style="color: #666; line-height: 1.6;">
                            <li>Carga y escalado de imágenes satelitales</li>
                            <li>Delimitación precisa de áreas</li>
                            <li>Plantación inteligente con patrones</li>
                            <li>Infraestructura y líneas guía</li>
                            <li>Reportes y análisis ambiental</li>
                            <li>Exportación de proyectos</li>
                        </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        Desarrollado para planificación profesional de proyectos de reforestación
                    </p>
                </div>
            `,
            width: '450px',
            buttons: [
                {
                    text: 'Cerrar',
                    type: 'primary'
                }
            ]
        };
        
        return this.createDynamicModal(config);
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function closeModal(modalId) {
    Modals.closeModal(modalId);
}

function openModal(modalId, options) {
    return Modals.openModal(modalId, options);
}