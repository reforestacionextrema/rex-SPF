 // ================================
// APP - Aplicación Principal y Coordinador
// ================================

const App = {
    
    // ================================
    // PROPIEDADES DE LA APLICACIÓN
    // ================================
    
    version: '1.0.0',
    name: 'Sistema de Planeación de Reforestaciones',
    initialized: false,
    startTime: null,
    
    // Estado de inicialización de módulos
    moduleStatus: {
        stateManager: false,
        canvasEngine: false,
        eventHandler: false,
        toastSystem: false,
        modals: false,
        legend: false,
        imageManagement: false,
        scaling: false,
        areaDelimitation: false,
        treePlanting: false,
        infrastructure: false,
        projectManagement: false,
        reporting: false
    },
    
    // Configuración de la aplicación
    config: {
        debug: false,
        autoSave: false,
        autoSaveInterval: 300000, // 5 minutos
        maxUndoSteps: 50,
        performance: {
            logTiming: false,
            profileModules: false
        }
    },
    
    // Métricas de rendimiento
    performance: {
        initTime: 0,
        moduleInitTimes: {},
        renderCount: 0,
        lastRenderTime: 0
    },

    // ================================
    // INICIALIZACIÓN PRINCIPAL
    // ================================
    
    async init() {
        console.log(`🌱 Iniciando ${this.name} v${this.version}`);
        this.startTime = performance.now();
        
        try {
            // Verificar compatibilidad del navegador
            if (!this.checkBrowserCompatibility()) {
                this.showCompatibilityError();
                return false;
            }
            
            // Configurar manejo global de errores
            this.setupErrorHandling();
            
            // Inicializar módulos en orden de dependencia
            await this.initializeModules();
            
            // Configurar sincronización entre módulos
            this.setupModuleSync();
            
            // Configurar auto-guardado si está habilitado
            if (this.config.autoSave) {
                this.setupAutoSave();
            }
            
            // Finalizar inicialización
            this.finalizationInit();
            
            // Marcar como inicializado
            this.initialized = true;
            this.performance.initTime = performance.now() - this.startTime;
            
            console.log(`✅ Aplicación inicializada en ${this.performance.initTime.toFixed(2)}ms`);
            
            // Mostrar mensaje de bienvenida
            this.showWelcomeMessage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error durante la inicialización:', error);
            this.handleInitializationError(error);
            return false;
        }
    },

    // ================================
    // INICIALIZACIÓN DE MÓDULOS
    // ================================
    
    async initializeModules() {
        const modules = [
            { name: 'stateManager', module: StateManager, critical: true },
            { name: 'toastSystem', module: toastManager, critical: true },
            { name: 'modals', module: Modals, critical: false },
            { name: 'legend', module: Legend, critical: false },
            { name: 'canvasEngine', module: CanvasEngine, critical: true },
            { name: 'eventHandler', module: EventHandler, critical: true },
            { name: 'imageManagement', module: ImageManagement, critical: false },
            { name: 'scaling', module: Scaling, critical: false },
            { name: 'areaDelimitation', module: AreaDelimitation, critical: false },
            { name: 'treePlanting', module: TreePlanting, critical: false },
            { name: 'infrastructure', module: Infrastructure, critical: false },
            { name: 'projectManagement', module: ProjectManagement, critical: false },
            { name: 'reporting', module: Reporting, critical: false }
        ];
        
        for (const { name, module, critical } of modules) {
            await this.initializeModule(name, module, critical);
        }
    },
    
    async initializeModule(name, module, critical = false) {
        const startTime = performance.now();
        
        try {
            console.log(`🔧 Inicializando módulo: ${name}`);
            
            // Verificar que el módulo existe y tiene método init
            if (!module || typeof module.init !== 'function') {
                throw new Error(`Módulo ${name} no tiene método init`);
            }
            
            // Inicializar módulo
            const result = await module.init();
            
            if (result === false) {
                throw new Error(`Módulo ${name} falló en la inicialización`);
            }
            
            // Marcar como inicializado
            this.moduleStatus[name] = true;
            this.performance.moduleInitTimes[name] = performance.now() - startTime;
            
            console.log(`✅ Módulo ${name} inicializado (${this.performance.moduleInitTimes[name].toFixed(2)}ms)`);
            
        } catch (error) {
            console.error(`❌ Error inicializando módulo ${name}:`, error);
            this.moduleStatus[name] = false;
            
            if (critical) {
                throw new Error(`Módulo crítico ${name} falló: ${error.message}`);
            } else {
                console.warn(`⚠️ Módulo no crítico ${name} falló, continuando...`);
            }
        }
    },

    // ================================
    // VERIFICACIONES DE COMPATIBILIDAD
    // ================================
    
    checkBrowserCompatibility() {
        const required = {
            canvas: !!document.createElement('canvas').getContext,
            localStorage: typeof Storage !== 'undefined',
            fileReader: typeof FileReader !== 'undefined',
            promises: typeof Promise !== 'undefined',
            fetch: typeof fetch !== 'undefined'
        };
        
        const missing = Object.entries(required)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);
        
        if (missing.length > 0) {
            console.error('❌ Características del navegador no soportadas:', missing);
            return false;
        }
        
        // Verificar versión mínima de navegadores conocidos
        const userAgent = navigator.userAgent;
        const browserChecks = [
            { name: 'Chrome', pattern: /Chrome\/(\d+)/, minVersion: 70 },
            { name: 'Firefox', pattern: /Firefox\/(\d+)/, minVersion: 65 },
            { name: 'Safari', pattern: /Version\/(\d+).*Safari/, minVersion: 12 },
            { name: 'Edge', pattern: /Edge\/(\d+)/, minVersion: 79 }
        ];
        
        let browserSupported = false;
        for (const { name, pattern, minVersion } of browserChecks) {
            const match = userAgent.match(pattern);
            if (match) {
                const version = parseInt(match[1]);
                browserSupported = version >= minVersion;
                console.log(`🌐 Navegador detectado: ${name} ${version} (mínimo: ${minVersion})`);
                break;
            }
        }
        
        if (!browserSupported) {
            console.warn('⚠️ Navegador no reconocido o versión antigua detectada');
        }
        
        return true; // Continuar incluso con navegadores no reconocidos
    },
    
    showCompatibilityError() {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 500px;
                ">
                    <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #1b5e20; margin-bottom: 16px;">Navegador No Compatible</h2>
                    <p style="color: #666; margin-bottom: 24px;">
                        Tu navegador no soporta las características necesarias para ejecutar esta aplicación.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Por favor actualiza tu navegador o usa Chrome, Firefox, Safari o Edge modernos.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(errorDiv);
    },

    // ================================
    // MANEJO DE ERRORES
    // ================================
    
    setupErrorHandling() {
        // Errores de JavaScript no capturados
        window.addEventListener('error', (event) => {
            this.handleGlobalError('JavaScript Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Promesas rechazadas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError('Unhandled Promise Rejection', event.reason);
            event.preventDefault(); // Prevenir logging en consola
        });
        
        // Errores de recursos (imágenes, scripts, etc.)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError(event.target, event);
            }
        }, true);
    },
    
    handleGlobalError(type, error, details = {}) {
        console.error(`🔥 ${type}:`, error, details);
        
        // Log error details
        const errorInfo = {
            type: type,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...details
        };
        
        // En producción, aquí enviarías el error a un servicio de logging
        if (this.config.debug) {
            console.log('Error Info:', errorInfo);
        }
        
        // Mostrar error al usuario solo si es crítico
        if (this.isCriticalError(error)) {
            toastManager?.error('Error del Sistema', 'Se produjo un error inesperado. Por favor recarga la página.');
        }
    },
    
    handleResourceError(element, event) {
        console.warn(`📁 Error cargando recurso: ${element.src || element.href}`);
        
        // Intentar recuperación para recursos críticos
        if (element.tagName === 'SCRIPT' && element.src.includes('core/')) {
            console.error('❌ Error cargando script crítico, la aplicación podría no funcionar correctamente');
        }
    },
    
    isCriticalError(error) {
        const criticalPatterns = [
            /StateManager/i,
            /CanvasEngine/i,
            /Cannot read property.*of undefined/i,
            /Network Error/i
        ];
        
        const errorMessage = error?.message || error?.toString() || '';
        return criticalPatterns.some(pattern => pattern.test(errorMessage));
    },
    
    handleInitializationError(error) {
        console.error('🔥 Error crítico durante inicialización:', error);
        
        // Mostrar mensaje de error amigable
        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 500px;
                ">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔧</div>
                    <h2 style="color: #c62828; margin-bottom: 16px;">Error de Inicialización</h2>
                    <p style="color: #666; margin-bottom: 24px;">
                        No se pudo inicializar la aplicación correctamente.
                    </p>
                    <button onclick="location.reload()" style="
                        background: #4caf50;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        Recargar Página
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorContainer);
    },

    // ================================
    // SINCRONIZACIÓN DE MÓDULOS
    // ================================
    
    setupModuleSync() {
        // Sincronizar variables globales con StateManager
        if (this.moduleStatus.stateManager) {
            syncGlobalVariables();
        }
        
        // Configurar eventos entre módulos
        this.setupInterModuleEvents();
    },
    
    setupInterModuleEvents() {
        // Eventos personalizados para comunicación entre módulos
        document.addEventListener('projectStateChanged', (event) => {
            if (this.moduleStatus.legend) {
                Legend.updateDynamicLegend();
            }
        });
        
        document.addEventListener('treeAdded', (event) => {
            this.performance.renderCount++;
        });
        
        document.addEventListener('canvasRender', (event) => {
            this.performance.lastRenderTime = performance.now();
        });
    },

    // ================================
    // AUTO-GUARDADO
    // ================================
    
    setupAutoSave() {
        if (!this.moduleStatus.projectManagement) {
            console.warn('⚠️ Auto-guardado deshabilitado: ProjectManagement no disponible');
            return;
        }
        
        setInterval(() => {
            this.performAutoSave();
        }, this.config.autoSaveInterval);
        
        console.log(`💾 Auto-guardado configurado cada ${this.config.autoSaveInterval / 1000} segundos`);
    },
    
    performAutoSave() {
        try {
            if (StateManager.hasContent()) {
                const autoSaveData = StateManager.getProjectData();
                autoSaveData.name = `${autoSaveData.name} (Auto-guardado)`;
                
                localStorage.setItem('reforestacion_autosave', JSON.stringify(autoSaveData));
                console.log('💾 Auto-guardado realizado');
            }
        } catch (error) {
            console.error('❌ Error en auto-guardado:', error);
        }
    },
    
    loadAutoSave() {
        try {
            const autoSaveData = localStorage.getItem('reforestacion_autosave');
            if (autoSaveData) {
                const data = JSON.parse(autoSaveData);
                
                Modals.showConfirmation({
                    title: 'Auto-guardado Encontrado',
                    message: '¿Deseas cargar el proyecto guardado automáticamente?',
                    icon: '💾',
                    onConfirm: () => {
                        ProjectManagement.loadProjectData(data);
                        toastManager.success('Auto-guardado Cargado', 'Proyecto restaurado desde auto-guardado');
                    },
                    onCancel: () => {
                        localStorage.removeItem('reforestacion_autosave');
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error cargando auto-guardado:', error);
            localStorage.removeItem('reforestacion_autosave');
        }
    },

    // ================================
    // FINALIZACIÓN E INTERFAZ
    // ================================
    
    finalizationInit() {
        // Verificar si hay auto-guardado disponible
        if (this.config.autoSave) {
            setTimeout(() => this.loadAutoSave(), 1000);
        }
        
        // Configurar métricas de rendimiento
        if (this.config.performance.logTiming) {
            this.setupPerformanceLogging();
        }
        
        // Registrar service worker si está disponible
        this.registerServiceWorker();
        
        // Configurar atajos de teclado globales
        this.setupGlobalShortcuts();
    },
    
    showWelcomeMessage() {
        setTimeout(() => {
            toastManager.info(
                'Sistema Iniciado',
                'Bienvenido al Sistema de Planeación de Reforestaciones. Comienza cargando una imagen satelital.',
                4000
            );
        }, 500);
    },
    
    setupPerformanceLogging() {
        // Log de rendimiento cada 30 segundos
        setInterval(() => {
            const stats = this.getPerformanceStats();
            console.log('📊 Performance Stats:', stats);
        }, 30000);
    },
    
    getPerformanceStats() {
        return {
            initTime: this.performance.initTime,
            moduleInitTimes: this.performance.moduleInitTimes,
            renderCount: this.performance.renderCount,
            lastRenderTime: this.performance.lastRenderTime,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
            } : 'No disponible'
        };
    },
    
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Solo registrar en producción
            if (location.protocol === 'https:' || location.hostname === 'localhost') {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('🔧 Service Worker registrado'))
                    .catch(err => console.log('⚠️ Service Worker no registrado:', err));
            }
        }
    },
    
    setupGlobalShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Shift + D para debug info
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.showDebugInfo();
            }
            
            // Ctrl/Cmd + Shift + R para reiniciar aplicación
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
                event.preventDefault();
                this.restartApplication();
            }
        });
    },

    // ================================
    // UTILIDADES Y DEBUG
    // ================================
    
    showDebugInfo() {
        const debugInfo = {
            app: {
                version: this.version,
                initialized: this.initialized,
                initTime: this.performance.initTime
            },
            modules: this.moduleStatus,
            state: {
                trees: StateManager.trees.length,
                pipelines: StateManager.pipelines.length,
                polygon: StateManager.polygon.length,
                scale: StateManager.scale,
                hasImage: !!StateManager.backgroundImage
            },
            performance: this.getPerformanceStats()
        };
        
        Modals.createDynamicModal({
            title: '🔧 Información de Debug',
            content: `<pre style="font-family: monospace; font-size: 12px; overflow: auto; max-height: 400px;">${JSON.stringify(debugInfo, null, 2)}</pre>`,
            width: '600px',
            buttons: [
                {
                    text: 'Copiar al Portapapeles',
                    type: 'secondary',
                    handler: () => {
                        navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                        toastManager.success('Copiado', 'Información copiada al portapapeles');
                    }
                },
                {
                    text: 'Cerrar',
                    type: 'primary'
                }
            ]
        });
    },
    
    restartApplication() {
        Modals.showConfirmation({
            title: 'Reiniciar Aplicación',
            message: '¿Estás seguro de que quieres reiniciar la aplicación? Se perderán los cambios no guardados.',
            icon: '🔄',
            confirmType: 'danger',
            onConfirm: () => {
                location.reload();
            }
        });
    },
    
    // ================================
    // API PÚBLICA
    // ================================
    
    getStatus() {
        return {
            initialized: this.initialized,
            version: this.version,
            modules: this.moduleStatus,
            performance: this.performance
        };
    },
    
    enableDebugMode() {
        this.config.debug = true;
        console.log('🐛 Modo debug activado');
    },
    
    disableDebugMode() {
        this.config.debug = false;
        console.log('🐛 Modo debug desactivado');
    },
    
    toggleAutoSave() {
        this.config.autoSave = !this.config.autoSave;
        
        if (this.config.autoSave) {
            this.setupAutoSave();
            toastManager.success('Auto-guardado Activado', 'Los proyectos se guardarán automáticamente');
        } else {
            toastManager.info('Auto-guardado Desactivado', 'Recuerda guardar manualmente tus proyectos');
        }
        
        return this.config.autoSave;
    }
};

// ================================
// INICIALIZACIÓN AUTOMÁTICA
// ================================

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(error => {
        console.error('🔥 Error crítico en inicialización:', error);
    });
});

// Exportar para acceso global en desarrollo
window.App = App;

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

// Función global para mostrar información de la aplicación
function showAppInfo() {
    Modals.showAbout();
}

// Función global para configuración del proyecto
function showProjectSettings() {
    Modals.showProjectSettings();
}

// Función global para debug (solo en desarrollo)
function showDebugInfo() {
    App.showDebugInfo();
}
