 // ================================
// STATE MANAGER - Gestión de Estado Global
// ================================

const StateManager = {
    
    // ================================
    // VARIABLES DE ESTADO PRINCIPAL
    // ================================
    
    // Canvas y rendering
    backgroundImage: null,
    scale: null,
    scaleLine: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    
    // Modos de operación
    currentMode: 'normal', // normal, scaling, polygon, pipeline
    guidelineMode: 'normal', // normal, line, triangle, square
    pipelineType: 'gas', // gas, agua, electrica
    
    // Elementos del proyecto
    polygon: [],
    trees: [],
    pipelines: [],
    guidelines: [],
    
    // Elementos en construcción
    currentPipeline: null,
    currentGuideline: null,
    
    // Selecciones actuales
    selectedTree: null,
    selectedPipeline: null,
    
    // Configuración del proyecto
    projectName: 'Proyecto de Reforestación',
    
    // Configuración de capas visuales
    layerVisibility: {
        growthCircles: true,
        treeLabels: true,
        polygon: true,
        pipelines: true
    },

    // ================================
    // CONFIGURACIONES DE ÁRBOLES
    // ================================
    
    treeConfig: {
        // Árboles Nuevos (3-8 metros) - TODOS VERDES
        'NUEVO_3M': { name: 'Nuevo 3m', category: 'nuevo', diameter: 3, color: '#4caf50', icon: '🌱' },
        'NUEVO_4M': { name: 'Nuevo 4m', category: 'nuevo', diameter: 4, color: '#4caf50', icon: '🌿' },
        'NUEVO_5M': { name: 'Nuevo 5m', category: 'nuevo', diameter: 5, color: '#4caf50', icon: '🌲' },
        'NUEVO_6M': { name: 'Nuevo 6m', category: 'nuevo', diameter: 6, color: '#4caf50', icon: '🌳' },
        'NUEVO_7M': { name: 'Nuevo 7m', category: 'nuevo', diameter: 7, color: '#4caf50', icon: '🌴' },
        'NUEVO_8M': { name: 'Nuevo 8m', category: 'nuevo', diameter: 8, color: '#4caf50', icon: '🌲' },
        
        // Árboles Existentes (1-10 metros) - TODOS AZULES
        'EXISTENTE_1M': { name: 'Exist. 1m', category: 'existente', diameter: 1, color: '#2196f3', icon: '🌿' },
        'EXISTENTE_2M': { name: 'Exist. 2m', category: 'existente', diameter: 2, color: '#2196f3', icon: '🌱' },
        'EXISTENTE_3M': { name: 'Exist. 3m', category: 'existente', diameter: 3, color: '#2196f3', icon: '🌲' },
        'EXISTENTE_4M': { name: 'Exist. 4m', category: 'existente', diameter: 4, color: '#2196f3', icon: '🌳' },
        'EXISTENTE_5M': { name: 'Exist. 5m', category: 'existente', diameter: 5, color: '#2196f3', icon: '🌴' },
        'EXISTENTE_6M': { name: 'Exist. 6m', category: 'existente', diameter: 6, color: '#2196f3', icon: '🌲' },
        'EXISTENTE_7M': { name: 'Exist. 7m', category: 'existente', diameter: 7, color: '#2196f3', icon: '🌳' },
        'EXISTENTE_8M': { name: 'Exist. 8m', category: 'existente', diameter: 8, color: '#2196f3', icon: '🌴' },
        'EXISTENTE_9M': { name: 'Exist. 9m', category: 'existente', diameter: 9, color: '#2196f3', icon: '🌲' },
        'EXISTENTE_10M': { name: 'Exist. 10m', category: 'existente', diameter: 10, color: '#2196f3', icon: '🌳' }
    },

    // ================================
    // SISTEMA DE UNDO/REDO
    // ================================
    
    undoStack: [],
    redoStack: [],
    MAX_UNDO_STEPS: 50,

    // Tipos de acciones para el historial
    ACTION_TYPES: {
        ADD_TREE: 'add_tree',
        DELETE_TREE: 'delete_tree',
        MOVE_TREE: 'move_tree',
        ADD_PIPELINE: 'add_pipeline',
        DELETE_PIPELINE: 'delete_pipeline',
        MOVE_PIPELINE: 'move_pipeline',
        ADD_GUIDELINE: 'add_guideline',
        DELETE_GUIDELINE: 'delete_guideline',
        CLEAR_GUIDELINES: 'clear_guidelines'
    },

    // ================================
    // CONFIGURACIONES DE LÍNEAS GUÍA
    // ================================
    
    snapToGuides: true,
    showGuidelineMeasurements: true,
    SNAP_DISTANCE: 25,

    GUIDELINE_TYPES: {
        LINE: 'line',
        TRIANGLE: 'triangle',
        SQUARE: 'square'
    },

    // ================================
    // MÉTODOS DE GESTIÓN DE ESTADO
    // ================================

    init() {
        // Inicializar el estado del sistema
        this.resetUndoStacks();
        return true;
    },

    resetState() {
        // Resetear todo el estado a valores iniciales
        this.backgroundImage = null;
        this.scale = null;
        this.scaleLine = null;
        this.polygon = [];
        this.trees = [];
        this.pipelines = [];
        this.guidelines = [];
        this.currentPipeline = null;
        this.currentGuideline = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.selectedTree = null;
        this.selectedPipeline = null;
        this.currentMode = 'normal';
        this.guidelineMode = 'normal';
        this.resetUndoStacks();
    },

    resetUndoStacks() {
        this.undoStack = [];
        this.redoStack = [];
    },

    // ================================
    // SISTEMA DE UNDO/REDO
    // ================================

    saveUndoState(actionType, data) {
        // Limpiar redo stack cuando se hace una nueva acción
        this.redoStack = [];
        
        // Crear snapshot del estado actual
        const undoData = {
            actionType: actionType,
            timestamp: Date.now(),
            trees: JSON.parse(JSON.stringify(this.trees)),
            pipelines: JSON.parse(JSON.stringify(this.pipelines)),
            guidelines: JSON.parse(JSON.stringify(this.guidelines)),
            actionData: data
        };
        
        this.undoStack.push(undoData);
        
        // Limitar el tamaño del stack
        if (this.undoStack.length > this.MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }
    },

    undo() {
        if (this.undoStack.length === 0) {
            toastManager.warning('Sin Acciones', 'No hay acciones para deshacer');
            return;
        }
        
        // Guardar estado actual en redo stack antes de hacer undo
        const currentState = {
            actionType: 'current_state',
            trees: JSON.parse(JSON.stringify(this.trees)),
            pipelines: JSON.parse(JSON.stringify(this.pipelines)),
            guidelines: JSON.parse(JSON.stringify(this.guidelines))
        };
        this.redoStack.push(currentState);
        
        // Obtener la acción a deshacer
        const undoData = this.undoStack.pop();
        
        // Aplicar la acción de undo según el tipo
        this.applyUndoAction(undoData);
        
        // Limpiar selecciones
        this.selectedTree = null;
        this.selectedPipeline = null;
        
        this.updateAfterStateChange();
        EventHandler.updateStatus('Acción deshecha');
    },

    redo() {
        if (this.redoStack.length === 0) {
            toastManager.warning('Sin Acciones', 'No hay acciones para rehacer');
            return;
        }
        
        // Obtener estado a restaurar
        const redoData = this.redoStack.pop();
        
        // Guardar estado actual en undo stack
        this.saveUndoState('redo_action', null);
        
        // Restaurar estado
        this.trees = redoData.trees;
        this.pipelines = redoData.pipelines;
        this.guidelines = redoData.guidelines;
        
        // Limpiar selecciones
        this.selectedTree = null;
        this.selectedPipeline = null;
        
        this.updateAfterStateChange();
        EventHandler.updateStatus('Acción rehecha');
    },

    applyUndoAction(undoData) {
        switch (undoData.actionType) {
            case this.ACTION_TYPES.ADD_TREE:
                // Remover el último árbol agregado
                this.trees.pop();
                break;
                
            case this.ACTION_TYPES.DELETE_TREE:
                // Restaurar el árbol eliminado
                const deletedTreeData = undoData.actionData;
                this.trees.splice(deletedTreeData.index, 0, deletedTreeData.tree);
                break;
                
            case this.ACTION_TYPES.MOVE_TREE:
                // Restaurar posición anterior del árbol
                const moveTreeData = undoData.actionData;
                const treeToMove = this.trees.find(t => t.id === moveTreeData.treeId);
                if (treeToMove) {
                    treeToMove.x = moveTreeData.oldPosition.x;
                    treeToMove.y = moveTreeData.oldPosition.y;
                }
                break;
                
            case this.ACTION_TYPES.ADD_PIPELINE:
                // Remover la última tubería agregada
                this.pipelines.pop();
                break;
                
            case this.ACTION_TYPES.DELETE_PIPELINE:
                // Restaurar la tubería eliminada
                const deletedPipelineData = undoData.actionData;
                this.pipelines.splice(deletedPipelineData.index, 0, deletedPipelineData.pipeline);
                break;
                
            case this.ACTION_TYPES.MOVE_PIPELINE:
                // Restaurar posición anterior de la tubería
                const movePipelineData = undoData.actionData;
                const pipelineToMove = this.pipelines[movePipelineData.pipelineIndex];
                if (pipelineToMove) {
                    pipelineToMove.points = movePipelineData.oldPositions.map(pos => ({ x: pos.x, y: pos.y }));
                }
                break;
                
            case this.ACTION_TYPES.ADD_GUIDELINE:
                // Remover la última línea guía agregada
                this.guidelines.pop();
                break;
                
            case this.ACTION_TYPES.DELETE_GUIDELINE:
                // Restaurar la línea guía eliminada
                const deletedGuidelineData = undoData.actionData;
                this.guidelines.splice(deletedGuidelineData.index, 0, deletedGuidelineData.guideline);
                break;
                
            case this.ACTION_TYPES.CLEAR_GUIDELINES:
                // Restaurar todas las líneas guía
                this.guidelines = undoData.actionData.guidelines;
                break;
                
            default:
                // Fallback: restaurar estado completo
                this.trees = undoData.trees;
                this.pipelines = undoData.pipelines;
                this.guidelines = undoData.guidelines;
                break;
        }
    },

    updateAfterStateChange() {
        // Actualizar UI después de cambios de estado
        EventHandler.updateTreeCount();
        Infrastructure.updatePipelineInfo();
        CanvasEngine.render();
        
        // Actualizar leyenda si está visible
        const legend = document.getElementById('colorLegend');
        if (legend && !legend.classList.contains('collapsed')) {
            Legend.updateDynamicLegend();
        }
    },

    // ================================
    // GESTIÓN DE PROYECTO
    // ================================

    getProjectData() {
        // Convertir imagen de fondo a base64 si existe
        let backgroundImageData = null;
        if (this.backgroundImage) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.backgroundImage.width;
            tempCanvas.height = this.backgroundImage.height;
            tempCtx.drawImage(this.backgroundImage, 0, 0);
            backgroundImageData = tempCanvas.toDataURL('image/png');
        }
        
        return {
            version: '1.0',
            name: this.projectName,
            scale: this.scale,
            polygon: this.polygon,
            trees: this.trees,
            pipelines: this.pipelines,
            guidelines: this.guidelines,
            layerVisibility: this.layerVisibility,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY,
            backgroundImageData: backgroundImageData,
            timestamp: new Date().toISOString()
        };
    },

    loadProjectData(projectData) {
        // Cargar datos del proyecto
        this.projectName = projectData.name || 'Proyecto Cargado';
        this.scale = projectData.scale || null;
        this.polygon = projectData.polygon || [];
        this.trees = projectData.trees || [];
        this.pipelines = projectData.pipelines || [];
        this.guidelines = projectData.guidelines || [];
        this.layerVisibility = { ...this.layerVisibility, ...projectData.layerVisibility };
        this.zoom = projectData.zoom || 1;
        this.panX = projectData.panX || 0;
        this.panY = projectData.panY || 0;
        
        // Resetear undo/redo al cargar proyecto
        this.resetUndoStacks();
        
        // Limpiar selecciones
        this.selectedTree = null;
        this.selectedPipeline = null;
        this.currentPipeline = null;
        this.currentGuideline = null;
        this.currentMode = 'normal';
        this.guidelineMode = 'normal';
    },

    // ================================
    // UTILIDADES DE ESTADO
    // ================================

    hasContent() {
        return this.trees.length > 0 || 
               this.pipelines.length > 0 || 
               this.polygon.length > 0 || 
               this.backgroundImage !== null;
    },

    getTreeTypeStats() {
        const stats = {};
        this.trees.forEach(tree => {
            const category = tree.config.category;
            const diameter = tree.config.diameter;
            
            if (!stats[category]) stats[category] = {};
            stats[category][diameter] = (stats[category][diameter] || 0) + 1;
        });
        return stats;
    },

    getPipelineTypeStats() {
        const stats = {};
        this.pipelines.forEach(pipeline => {
            const type = pipeline.type;
            stats[type] = (stats[type] || 0) + 1;
        });
        return stats;
    },

    getTotalPipelineLength() {
        if (!this.scale) return 0;
        
        let totalLength = 0;
        this.pipelines.forEach(pipeline => {
            if (pipeline.points.length > 1) {
                for (let i = 0; i < pipeline.points.length - 1; i++) {
                    const start = pipeline.points[i];
                    const end = pipeline.points[i + 1];
                    const pixelLength = Math.sqrt(
                        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                    );
                    totalLength += pixelLength * this.scale;
                }
            }
        });
        
        return totalLength;
    },

    getPolygonArea() {
        if (this.polygon.length < 3 || !this.scale) return 0;
        
        let area = 0;
        for (let i = 0; i < this.polygon.length; i++) {
            const j = (i + 1) % this.polygon.length;
            area += this.polygon[i].x * this.polygon[j].y;
            area -= this.polygon[j].x * this.polygon[i].y;
        }
        
        const pixelArea = Math.abs(area) / 2;
        return Math.round(pixelArea * this.scale * this.scale);
    },

    // ================================
    // VALIDACIONES
    // ================================

    isValidTreeType(type) {
        return this.treeConfig.hasOwnProperty(type);
    },

    isValidPipelineType(type) {
        return ['gas', 'agua', 'electrica'].includes(type);
    },

    isValidMode(mode) {
        return ['normal', 'scaling', 'polygon', 'pipeline'].includes(mode);
    },

    isValidGuidelineMode(mode) {
        return ['normal', 'line', 'triangle', 'square'].includes(mode);
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

// Variables globales para compatibilidad con código existente
let canvas, ctx;
let backgroundImage = null;
let scale = null;
let scaleLine = null;
let polygon = [];
let trees = [];
let pipelines = [];
let guidelines = [];
let currentPipeline = null;
let currentGuideline = null;
let selectedTree = null;
let selectedPipeline = null;
let currentMode = 'normal';
let guidelineMode = 'normal';
let pipelineType = 'gas';
let zoom = 1;
let panX = 0, panY = 0;
let projectName = 'Proyecto de Reforestación';
let layerVisibility = {
    growthCircles: true,
    treeLabels: true,
    polygon: true,
    pipelines: true
};
let snapToGuides = true;
let showGuidelineMeasurements = true;
let treeConfig = {};

// Sincronizar variables globales con StateManager
function syncGlobalVariables() {
    // Asignar referencias directas a las propiedades de StateManager
    backgroundImage = StateManager.backgroundImage;
    scale = StateManager.scale;
    scaleLine = StateManager.scaleLine;
    polygon = StateManager.polygon;
    trees = StateManager.trees;
    pipelines = StateManager.pipelines;
    guidelines = StateManager.guidelines;
    currentPipeline = StateManager.currentPipeline;
    currentGuideline = StateManager.currentGuideline;
    selectedTree = StateManager.selectedTree;
    selectedPipeline = StateManager.selectedPipeline;
    currentMode = StateManager.currentMode;
    guidelineMode = StateManager.guidelineMode;
    pipelineType = StateManager.pipelineType;
    zoom = StateManager.zoom;
    panX = StateManager.panX;
    panY = StateManager.panY;
    projectName = StateManager.projectName;
    layerVisibility = StateManager.layerVisibility;
    snapToGuides = StateManager.snapToGuides;
    showGuidelineMeasurements = StateManager.showGuidelineMeasurements;
    treeConfig = StateManager.treeConfig;
}
