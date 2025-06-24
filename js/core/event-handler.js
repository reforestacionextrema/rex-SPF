 // ================================
// EVENT HANDLER - Manejo de Eventos Globales
// ================================

const EventHandler = {
    
    // ================================
    // INICIALIZACIÓN DE EVENTOS
    // ================================
    
    init() {
        this.setupGlobalEvents();
        this.setupKeyboardEvents();
        this.setupUIEvents();
        this.setupWindowEvents();
    },

    // ================================
    // EVENTOS GLOBALES
    // ================================

    setupGlobalEvents() {
        // Prevenir comportamientos por defecto
        document.addEventListener('dragstart', (e) => {
            if (!e.target.classList.contains('tree-item')) {
                e.preventDefault();
            }
        });

        // Manejar visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                CanvasEngine.isDragging = false;
                CanvasEngine.canvas.style.cursor = StateManager.currentMode === 'normal' ? 'grab' : 'crosshair';
            }
        });

        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('reportModal');
            if (event.target === modal) {
                Modals.closeModal('reportModal');
            }
        });
    },

    // ================================
    // EVENTOS DE TECLADO
    // ================================

    setupKeyboardEvents() {
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    },

    handleGlobalKeydown(event) {
        // Prevenir acciones por defecto en ciertas teclas
        if (['Delete', 'Backspace', 'Escape'].includes(event.key)) {
            event.preventDefault();
        }
        
        // Permitir navegación normal en inputs
        if (this.isInputFocused()) {
            this.handleInputKeydown(event);
            return;
        }

        // Manejar teclas según el contexto
        if (event.key === 'Delete' || event.key === 'Backspace') {
            this.handleDeleteKey();
        } else if (event.key === 'z' || event.key === 'Z') {
            this.handleUndoRedoKeys(event);
        } else if (event.key === 'y' || event.key === 'Y') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                StateManager.redo();
            }
        } else if (event.key === 'Escape') {
            this.handleEscapeKey();
        } else if (event.key === '+' || event.key === '=') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                CanvasEngine.zoomIn();
            }
        } else if (event.key === '-') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                CanvasEngine.zoomOut();
            }
        } else if (event.key === '0') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                CanvasEngine.resetZoom();
            }
        } else if (event.key === 's' || event.key === 'S') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                ProjectManagement.exportProject();
            }
        } else if (event.key === 'o' || event.key === 'O') {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                ProjectManagement.loadProject();
            }
        }
    },

    handleDeleteKey() {
        if (StateManager.selectedTree && StateManager.currentMode === 'normal') {
            this.deleteSelectedTree();
        } else if (StateManager.selectedPipeline && StateManager.currentMode === 'normal') {
            this.deleteSelectedPipeline();
        }
    },

    deleteSelectedTree() {
        const index = StateManager.trees.indexOf(StateManager.selectedTree);
        if (index > -1) {
            // Guardar estado para undo antes de eliminar
            StateManager.saveUndoState('DELETE_TREE', {
                tree: JSON.parse(JSON.stringify(StateManager.selectedTree)),
                index: index
            });
            
            const treeName = StateManager.selectedTree.config.name;
            StateManager.trees.splice(index, 1);
            StateManager.selectedTree = null;
            this.updateTreeCount();
            CanvasEngine.render();
            
            // Actualizar leyenda si está visible
            const legend = document.getElementById('colorLegend');
            if (legend && !legend.classList.contains('collapsed')) {
                Legend.updateDynamicLegend();
            }
            
            this.updateStatus('Árbol eliminado');
            toastManager.success('Árbol Eliminado', `${treeName} removido del proyecto`);
        }
    },

    deleteSelectedPipeline() {
        const index = StateManager.pipelines.indexOf(StateManager.selectedPipeline);
        if (index > -1) {
            // Guardar estado para undo antes de eliminar
            StateManager.saveUndoState('DELETE_PIPELINE', {
                pipeline: JSON.parse(JSON.stringify(StateManager.selectedPipeline)),
                index: index
            });
            
            const pipelineName = StateManager.selectedPipeline.name;
            StateManager.pipelines.splice(index, 1);
            StateManager.selectedPipeline = null;
            Infrastructure.updatePipelineInfo();
            CanvasEngine.render();
            
            // Actualizar leyenda si está visible
            const legend = document.getElementById('colorLegend');
            if (legend && !legend.classList.contains('collapsed')) {
                Legend.updateDynamicLegend();
            }
            
            this.updateStatus('Infraestructura eliminada');
            toastManager.success('Infraestructura Eliminada', `${pipelineName} removida del proyecto`);
        }
    },

    handleUndoRedoKeys(event) {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
                StateManager.redo(); // Ctrl+Shift+Z para rehacer
            } else {
                StateManager.undo(); // Ctrl+Z para deshacer
            }
        }
    },

    handleEscapeKey() {
        // Cancelar operación actual
        if (StateManager.currentMode === 'pipeline' && Infrastructure.currentPipeline) {
            Infrastructure.currentPipeline = null;
            CanvasEngine.previewLine = null;
            toastManager.info('Operación Cancelada', 'Dibujo de tubería cancelado');
        } else if (StateManager.currentMode === 'polygon') {
            toastManager.info('Operación Cancelada', 'Delimitación de área cancelada');
        } else if (StateManager.currentMode === 'scaling') {
            StateManager.scaleLine = null;
            toastManager.info('Operación Cancelada', 'Definición de escala cancelada');
        } else if (StateManager.guidelineMode !== 'normal') {
            Infrastructure.currentGuideline = null;
            CanvasEngine.previewLine = null;
            StateManager.guidelineMode = 'normal';
            toastManager.info('Operación Cancelada', 'Dibujo de línea guía cancelado');
        }
        
        StateManager.currentMode = 'normal';
        StateManager.selectedTree = null;
        StateManager.selectedPipeline = null;
        
        const scaleInfo = document.getElementById('scaleInfo');
        if (scaleInfo) scaleInfo.style.display = 'none';
        
        CanvasEngine.render();
        this.updateStatus('Operación cancelada - Modo normal');
    },

    // ================================
    // MANEJO DE INPUTS
    // ================================

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    },

    handleInputKeydown(event) {
        // Permitir navegación normal en inputs
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.stopPropagation();
        }

        // Manejar Enter y Escape en inputs específicos
        const target = event.target;
        
        if (target.id === 'realLength' && event.key === 'Enter') {
            event.preventDefault();
            Scaling.setScale();
        } else if (target.id === 'projectNameInput') {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.saveProjectName();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.cancelEditProjectName();
            }
        }
    },

    // ================================
    // EVENTOS DE UI
    // ================================

    setupUIEvents() {
        // Carga de imagen
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (event) => {
                ImageManagement.loadImage(event);
            });
        }

        // Input de escalado - manejar blur y enter
        const realLengthInput = document.getElementById('realLength');
        if (realLengthInput) {
            realLengthInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    Scaling.setScale();
                }
            });
        }

        // Input de nombre de proyecto
        const projectNameInput = document.getElementById('projectNameInput');
        if (projectNameInput) {
            projectNameInput.addEventListener('blur', () => {
                if (projectNameInput.style.display !== 'none') {
                    this.saveProjectName();
                }
            });
        }

        // Cargar proyecto
        const projectInput = document.getElementById('projectInput');
        if (projectInput) {
            projectInput.addEventListener('change', (event) => {
                ProjectManagement.handleProjectLoad(event);
            });
        }

        // Configurar drag and drop de árboles
        this.setupTreeDragAndDrop();
    },

    setupTreeDragAndDrop() {
        // Configurar eventos de drag and drop para todas las categorías
        const allTreeItems = document.querySelectorAll('.tree-item');
        allTreeItems.forEach(item => {
            if (item) {
                item.addEventListener('dragstart', this.handleTreeDragStart.bind(this));
            }
        });
    },

    handleTreeDragStart(event) {
        const treeType = event.target.closest('.tree-item').dataset.type;
        event.dataTransfer.setData('text/plain', treeType);
    },

    // ================================
    // EVENTOS DE VENTANA
    // ================================

    setupWindowEvents() {
        // Redimensionar canvas
        window.addEventListener('resize', this.debounce(() => {
            CanvasEngine.handleResize();
        }, 250));

        // Prevenir zoom del navegador en algunos casos
        window.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) {
                // Solo prevenir si no estamos en un input
                if (!this.isInputFocused()) {
                    event.preventDefault();
                }
            }
        });
    },

    // ================================
    // FUNCIONES DE PROYECTO
    // ================================

    editProjectName() {
        const display = document.getElementById('projectNameDisplay');
        const input = document.getElementById('projectNameInput');
        const editBtn = document.getElementById('editProjectBtn');
        const saveBtn = document.getElementById('saveProjectBtn');
        
        if (display && input && editBtn && saveBtn) {
            display.style.display = 'none';
            input.style.display = 'inline-block';
            input.value = StateManager.projectName;
            input.focus();
            input.select();
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-block';
        }
    },

    saveProjectName() {
        const display = document.getElementById('projectNameDisplay');
        const input = document.getElementById('projectNameInput');
        const editBtn = document.getElementById('editProjectBtn');
        const saveBtn = document.getElementById('saveProjectBtn');
        
        if (display && input && editBtn && saveBtn) {
            const newName = input.value.trim();
            if (newName) {
                StateManager.projectName = newName;
                display.textContent = StateManager.projectName;
            }
            
            display.style.display = 'inline-block';
            input.style.display = 'none';
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
        }
    },

    cancelEditProjectName() {
        const display = document.getElementById('projectNameDisplay');
        const input = document.getElementById('projectNameInput');
        const editBtn = document.getElementById('editProjectBtn');
        const saveBtn = document.getElementById('saveProjectBtn');
        
        if (display && input && editBtn && saveBtn) {
            display.style.display = 'inline-block';
            input.style.display = 'none';
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
        }
    },

    // ================================
    // FUNCIONES DE CAPAS
    // ================================

    toggleLayer(layerName) {
        StateManager.layerVisibility[layerName] = !StateManager.layerVisibility[layerName];
        CanvasEngine.render();
        
        // Actualizar leyenda si está visible
        const legend = document.getElementById('colorLegend');
        if (legend && !legend.classList.contains('collapsed')) {
            Legend.updateDynamicLegend();
        }
    },

    toggleLayerLegend() {
        const showLegend = document.getElementById('showLegend');
        if (showLegend) {
            Legend.toggleLayerLegend(showLegend.checked);
        }
    },

    // ================================
    // FUNCIONES DE CATEGORÍAS DE ÁRBOLES
    // ================================

    toggleTreeCategory(category) {
        const header = document.getElementById(`${category}-header`);
        const content = document.getElementById(`${category}-content`);
        const arrow = document.getElementById(`${category}-arrow`);
        
        if (!header || !content || !arrow) return;
        
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // Colapsar
            content.classList.remove('expanded');
            header.classList.remove('expanded');
            header.classList.add('collapsed');
            arrow.classList.remove('expanded');
            
            // Re-configurar drag and drop para elementos ocultos
            setTimeout(() => {
                const treeItems = content.querySelectorAll('.tree-item');
                treeItems.forEach(item => {
                    item.removeEventListener('dragstart', this.handleTreeDragStart.bind(this));
                });
            }, 300);
        } else {
            // Expandir
            content.classList.add('expanded');
            header.classList.remove('collapsed');
            header.classList.add('expanded');
            arrow.classList.add('expanded');
            
            // Configurar drag and drop para elementos visibles
            setTimeout(() => {
                const treeItems = content.querySelectorAll('.tree-item');
                treeItems.forEach(item => {
                    item.addEventListener('dragstart', this.handleTreeDragStart.bind(this));
                });
            }, 50);
        }
    },

    // ================================
    // UTILIDADES
    // ================================

    updateStatus(message) {
        const statusElement = document.getElementById('statusText');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },

    updateTreeCount() {
        const count = StateManager.trees.length;
        const treeCountElement = document.getElementById('treeCount');
        if (treeCountElement) {
            treeCountElement.textContent = `Árboles: ${count}`;
        }
    },

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
    },

    // ================================
    // LIMPIAR TODO
    // ================================

    clearAll() {
        if (!StateManager.backgroundImage && StateManager.trees.length === 0 && 
            StateManager.pipelines.length === 0 && StateManager.polygon.length === 0) {
            toastManager.warning('Sin Datos', 'No hay datos para limpiar');
            return;
        }
        
        if (confirm('¿Estás seguro de que quieres limpiar todo el proyecto?')) {
            StateManager.resetState();
            
            // Limpiar UI
            const imageInput = document.getElementById('imageInput');
            if (imageInput) imageInput.value = '';
            
            const elementsToHide = ['imageInfo', 'scaleResult', 'polygonInfo', 'scaleInfo', 'pipelineInfo'];
            elementsToHide.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.display = 'none';
            });
            
            this.updateTreeCount();
            CanvasEngine.render();
            this.updateStatus('Proyecto limpiado - Listo para comenzar');
            toastManager.success('Proyecto Limpiado', 'Todos los datos han sido eliminados');
        }
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

// Mantener funciones globales para compatibilidad con HTML
function editProjectName() {
    EventHandler.editProjectName();
}

function saveProjectName() {
    EventHandler.saveProjectName();
}

function toggleLayer(layerName) {
    EventHandler.toggleLayer(layerName);
}

function toggleLayerLegend() {
    EventHandler.toggleLayerLegend();
}

function toggleTreeCategory(category) {
    EventHandler.toggleTreeCategory(category);
}

function clearAll() {
    EventHandler.clearAll();
}
