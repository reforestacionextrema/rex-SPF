 // ================================
// PROJECT MANAGEMENT - Gestión de Proyectos
// ================================

const ProjectManagement = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    currentVersion: '1.0',
    supportedVersions: ['1.0'],
    maxProjectSize: 100 * 1024 * 1024, // 100MB
    
    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.setupProjectInput();
        return true;
    },

    setupProjectInput() {
        const projectInput = document.getElementById('projectInput');
        if (projectInput) {
            projectInput.addEventListener('change', this.handleProjectLoad.bind(this));
        }
    },

    // ================================
    // EXPORTACIÓN DE PROYECTOS
    // ================================

    exportProject() {
        try {
            const projectData = this.createProjectData();
            const blob = this.createProjectBlob(projectData);
            this.downloadProjectFile(blob, projectData.name);
            
            toastManager.success('Proyecto Exportado', 
                `${projectData.name} guardado con imagen de fondo incluida`);
        } catch (error) {
            console.error('Error al exportar proyecto:', error);
            toastManager.error('Error de Exportación', 
                'No se pudo exportar el proyecto. Verifica que no exceda el tamaño máximo.');
        }
    },

    createProjectData() {
        // Obtener datos del proyecto desde StateManager
        const projectData = StateManager.getProjectData();
        
        // Agregar metadatos adicionales
        projectData.metadata = {
            exportedBy: 'Sistema de Planeación de Reforestaciones',
            exportVersion: this.currentVersion,
            exportDate: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            canvasSize: CanvasEngine.canvas ? 
                `${CanvasEngine.canvas.width}x${CanvasEngine.canvas.height}` : 'unknown'
        };
        
        // Calcular estadísticas del proyecto
        projectData.statistics = this.calculateProjectStatistics();
        
        return projectData;
    },

    calculateProjectStatistics() {
        const stats = {
            totalTrees: StateManager.trees.length,
            totalPipelines: StateManager.pipelines.length,
            totalGuidelines: StateManager.guidelines.length,
            polygonPoints: StateManager.polygon.length,
            hasBackgroundImage: StateManager.backgroundImage !== null,
            hasScale: StateManager.scale !== null
        };
        
        // Estadísticas de árboles por categoría
        stats.treesByCategory = {};
        StateManager.trees.forEach(tree => {
            const category = tree.config.category;
            stats.treesByCategory[category] = (stats.treesByCategory[category] || 0) + 1;
        });
        
        // Estadísticas de tuberías por tipo
        stats.pipelinesByType = {};
        StateManager.pipelines.forEach(pipeline => {
            const type = pipeline.type;
            stats.pipelinesByType[type] = (stats.pipelinesByType[type] || 0) + 1;
        });
        
        // Área del proyecto si está disponible
        if (StateManager.polygon.length >= 3 && StateManager.scale) {
            stats.projectArea = StateManager.getPolygonArea();
            stats.projectAreaHectares = (stats.projectArea / 10000).toFixed(4);
        }
        
        // Longitud total de tuberías
        if (StateManager.scale) {
            stats.totalPipelineLength = StateManager.getTotalPipelineLength();
        }
        
        return stats;
    },

    createProjectBlob(projectData) {
        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Verificar tamaño del archivo
        if (blob.size > this.maxProjectSize) {
            throw new Error(`El proyecto es demasiado grande (${(blob.size / (1024 * 1024)).toFixed(1)}MB). Máximo permitido: ${this.maxProjectSize / (1024 * 1024)}MB`);
        }
        
        return blob;
    },

    downloadProjectFile(blob, projectName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizeFileName(projectName)}_${this.getDateString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    sanitizeFileName(name) {
        // Limpiar nombre de archivo para evitar caracteres problemáticos
        return name.replace(/[<>:"/\\|?*]/g, '_').trim();
    },

    getDateString() {
        return new Date().toISOString().split('T')[0];
    },

    // ================================
    // CARGA DE PROYECTOS
    // ================================

    loadProject() {
        const projectInput = document.getElementById('projectInput');
        if (projectInput) {
            projectInput.click();
        }
    },

    handleProjectLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.validateProjectFile(file)) {
            return;
        }
        
        toastManager.info('Cargando Proyecto', 'Procesando archivo del proyecto...', 3000);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.processProjectFile(e.target.result);
        };
        
        reader.onerror = () => {
            toastManager.error('Error de Lectura', 'No se pudo leer el archivo del proyecto');
        };
        
        reader.readAsText(file);
    },

    validateProjectFile(file) {
        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.json')) {
            toastManager.error('Archivo Inválido', 'Por favor selecciona un archivo JSON válido');
            return false;
        }
        
        // Validar tamaño
        if (file.size > this.maxProjectSize) {
            toastManager.error('Archivo Muy Grande', 
                `El archivo es demasiado grande. Máximo permitido: ${this.maxProjectSize / (1024 * 1024)}MB`);
            return false;
        }
        
        return true;
    },

    processProjectFile(fileContent) {
        try {
            const projectData = JSON.parse(fileContent);
            
            if (!this.validateProjectData(projectData)) {
                return;
            }
            
            this.loadProjectData(projectData);
            
        } catch (error) {
            console.error('Error al procesar proyecto:', error);
            toastManager.error('Error de Formato', 'El archivo del proyecto está dañado o tiene un formato inválido.');
        }
    },

    validateProjectData(projectData) {
        // Validar estructura básica
        if (!projectData.version || !projectData.name) {
            toastManager.error('Proyecto Inválido', 'El archivo no tiene el formato correcto de proyecto');
            return false;
        }
        
        // Validar versión
        if (!this.supportedVersions.includes(projectData.version)) {
            toastManager.warning('Versión No Soportada', 
                `Versión ${projectData.version} no es compatible. Versiones soportadas: ${this.supportedVersions.join(', ')}`);
            // Continuar pero advertir
        }
        
        // Validar datos requeridos
        const requiredFields = ['trees', 'pipelines', 'polygon'];
        for (let field of requiredFields) {
            if (!Array.isArray(projectData[field])) {
                toastManager.error('Datos Corruptos', `El campo '${field}' no es válido en el proyecto`);
                return false;
            }
        }
        
        return true;
    },

    loadProjectData(projectData) {
        try {
            // Cargar imagen de fondo si existe
            if (projectData.backgroundImageData) {
                this.loadBackgroundImage(projectData).then(() => {
                    this.applyProjectData(projectData);
                    this.showLoadSuccess(projectData.name, true);
                }).catch(() => {
                    toastManager.warning('Imagen No Cargada', 'El proyecto se cargó pero la imagen de fondo falló');
                    this.applyProjectData(projectData);
                    this.showLoadSuccess(projectData.name, false);
                });
            } else {
                // Cargar proyecto sin imagen de fondo
                StateManager.backgroundImage = null;
                this.applyProjectData(projectData);
                this.showLoadSuccess(projectData.name, false);
            }
            
        } catch (error) {
            console.error('Error al cargar datos del proyecto:', error);
            toastManager.error('Error de Carga', 'No se pudieron cargar los datos del proyecto correctamente');
        }
    },

    loadBackgroundImage(projectData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                StateManager.backgroundImage = img;
                resolve();
            };
            img.onerror = reject;
            img.src = projectData.backgroundImageData;
        });
    },

    applyProjectData(projectData) {
        // Cargar datos en StateManager
        StateManager.loadProjectData(projectData);
        
        // Actualizar UI del proyecto
        this.updateProjectUI(projectData);
        
        // Actualizar información específica
        this.updateProjectInfo(projectData);
        
        // Renderizar y actualizar contadores
        this.finalizeProjectLoad();
    },

    updateProjectUI(projectData) {
        // Actualizar nombre del proyecto
        const projectNameDisplay = document.getElementById('projectNameDisplay');
        if (projectNameDisplay) {
            projectNameDisplay.textContent = StateManager.projectName;
        }
        
        // Actualizar información de imagen
        if (StateManager.backgroundImage) {
            const imageName = document.getElementById('imageName');
            const imageInfo = document.getElementById('imageInfo');
            if (imageName) imageName.textContent = 'Imagen del proyecto';
            if (imageInfo) imageInfo.style.display = 'block';
        } else {
            const imageInfo = document.getElementById('imageInfo');
            if (imageInfo) imageInfo.style.display = 'none';
            
            // Limpiar input de archivo
            const imageInput = document.getElementById('imageInput');
            if (imageInput) imageInput.value = '';
        }
        
        // Actualizar checkboxes de capas
        Object.keys(StateManager.layerVisibility).forEach(layer => {
            const checkbox = document.getElementById(`show${layer.charAt(0).toUpperCase() + layer.slice(1)}`);
            if (checkbox) {
                checkbox.checked = StateManager.layerVisibility[layer];
            }
        });
    },

    updateProjectInfo(projectData) {
        // Actualizar información de escala
        if (StateManager.scale) {
            const scaleValue = document.getElementById('scaleValue');
            const scaleResult = document.getElementById('scaleResult');
            if (scaleValue) scaleValue.textContent = `1 píxel = ${StateManager.scale.toFixed(4)} metros`;
            if (scaleResult) scaleResult.style.display = 'block';
        } else {
            const scaleResult = document.getElementById('scaleResult');
            if (scaleResult) scaleResult.style.display = 'none';
        }
        
        // Actualizar información de polígono
        if (StateManager.polygon.length > 0 && StateManager.scale) {
            const area = StateManager.getPolygonArea();
            const polygonArea = document.getElementById('polygonArea');
            const polygonInfo = document.getElementById('polygonInfo');
            if (polygonArea) polygonArea.textContent = area.toLocaleString('es-ES');
            if (polygonInfo) polygonInfo.style.display = 'block';
        } else {
            const polygonInfo = document.getElementById('polygonInfo');
            if (polygonInfo) polygonInfo.style.display = 'none';
        }
    },

    finalizeProjectLoad() {
        // Actualizar contadores
        EventHandler.updateTreeCount();
        Infrastructure.updatePipelineInfo();
        
        // Renderizar canvas
        CanvasEngine.render();
        
        // Actualizar leyenda si está visible
        const legend = document.getElementById('colorLegend');
        if (legend && !legend.classList.contains('collapsed')) {
            Legend.updateDynamicLegend();
        }
        
        // Actualizar estado
        EventHandler.updateStatus('Proyecto cargado exitosamente');
    },

    showLoadSuccess(projectName, hasImage) {
        const imageText = hasImage ? ' con imagen de fondo' : ' (sin imagen de fondo)';
        toastManager.success('Proyecto Cargado', `${projectName} cargado correctamente${imageText}`);
    },

    // ================================
    // PLANTILLAS DE PROYECTO
    // ================================

    createProjectTemplate(templateType) {
        const templates = {
            basic: {
                name: 'Proyecto Básico de Reforestación',
                description: 'Plantilla básica para comenzar un proyecto',
                trees: [],
                pipelines: [],
                polygon: [],
                guidelines: []
            },
            urban: {
                name: 'Reforestación Urbana',
                description: 'Plantilla para proyectos en zonas urbanas',
                trees: this.generateUrbanTreeLayout(),
                pipelines: [],
                polygon: this.generateUrbanPolygon(),
                guidelines: []
            },
            rural: {
                name: 'Reforestación Rural',
                description: 'Plantilla para proyectos en zonas rurales',
                trees: this.generateRuralTreeLayout(),
                pipelines: [],
                polygon: this.generateRuralPolygon(),
                guidelines: []
            }
        };
        
        const template = templates[templateType];
        if (!template) {
            toastManager.error('Plantilla No Encontrada', 'El tipo de plantilla solicitado no existe');
            return;
        }
        
        // Aplicar plantilla
        this.applyTemplate(template);
        toastManager.success('Plantilla Aplicada', `${template.name} aplicada correctamente`);
    },

    generateUrbanTreeLayout() {
        // Generar layout típico urbano con árboles más pequeños
        const trees = [];
        const treeTypes = ['NUEVO_3M', 'NUEVO_4M', 'EXISTENTE_2M', 'EXISTENTE_3M'];
        
        for (let i = 0; i < 20; i++) {
            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            trees.push({
                id: Date.now() + Math.random(),
                type: type,
                config: StateManager.treeConfig[type],
                x: 100 + (i % 5) * 80,
                y: 100 + Math.floor(i / 5) * 60
            });
        }
        
        return trees;
    },

    generateRuralTreeLayout() {
        // Generar layout típico rural con más espacio entre árboles
        const trees = [];
        const treeTypes = ['NUEVO_5M', 'NUEVO_6M', 'NUEVO_7M', 'EXISTENTE_4M', 'EXISTENTE_5M'];
        
        for (let i = 0; i < 15; i++) {
            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            trees.push({
                id: Date.now() + Math.random(),
                type: type,
                config: StateManager.treeConfig[type],
                x: 150 + (i % 3) * 120,
                y: 150 + Math.floor(i / 3) * 100
            });
        }
        
        return trees;
    },

    generateUrbanPolygon() {
        // Polígono rectangular típico urbano
        return [
            { x: 50, y: 50 },
            { x: 450, y: 50 },
            { x: 450, y: 350 },
            { x: 50, y: 350 }
        ];
    },

    generateRuralPolygon() {
        // Polígono irregular típico rural
        return [
            { x: 100, y: 100 },
            { x: 500, y: 80 },
            { x: 520, y: 400 },
            { x: 300, y: 450 },
            { x: 80, y: 300 }
        ];
    },

    applyTemplate(template) {
        // Limpiar proyecto actual
        StateManager.resetState();
        
        // Aplicar datos de plantilla
        StateManager.projectName = template.name;
        StateManager.trees = template.trees || [];
        StateManager.pipelines = template.pipelines || [];
        StateManager.polygon = template.polygon || [];
        StateManager.guidelines = template.guidelines || [];
        
        // Actualizar UI
        this.updateProjectUI({ name: template.name });
        this.finalizeProjectLoad();
    },

    // ================================
    // EXPORTACIÓN AVANZADA
    // ================================

    exportProjectSummary() {
        try {
            const summary = this.createProjectSummary();
            const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.sanitizeFileName(StateManager.projectName)}_resumen_${this.getDateString()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toastManager.success('Resumen Exportado', 'Resumen del proyecto exportado como archivo de texto');
        } catch (error) {
            console.error('Error al exportar resumen:', error);
            toastManager.error('Error de Exportación', 'No se pudo exportar el resumen del proyecto');
        }
    },

    createProjectSummary() {
        const stats = this.calculateProjectStatistics();
        const date = new Date().toLocaleString('es-ES');
        
        let summary = `RESUMEN DEL PROYECTO DE REFORESTACIÓN\n`;
        summary += `=========================================\n\n`;
        summary += `Nombre del Proyecto: ${StateManager.projectName}\n`;
        summary += `Fecha de Exportación: ${date}\n`;
        summary += `Versión del Sistema: ${this.currentVersion}\n\n`;
        
        summary += `ESTADÍSTICAS GENERALES\n`;
        summary += `----------------------\n`;
        summary += `Total de Árboles: ${stats.totalTrees}\n`;
        summary += `Total de Tuberías: ${stats.totalPipelines}\n`;
        summary += `Total de Líneas Guía: ${stats.totalGuidelines}\n`;
        summary += `Puntos del Perímetro: ${stats.polygonPoints}\n`;
        summary += `Imagen de Fondo: ${stats.hasBackgroundImage ? 'Sí' : 'No'}\n`;
        summary += `Escala Definida: ${stats.hasScale ? 'Sí' : 'No'}\n\n`;
        
        if (stats.projectArea) {
            summary += `ÁREA DEL PROYECTO\n`;
            summary += `-----------------\n`;
            summary += `Área Total: ${stats.projectArea.toLocaleString('es-ES')} m²\n`;
            summary += `Área en Hectáreas: ${stats.projectAreaHectares} ha\n\n`;
        }
        
        if (Object.keys(stats.treesByCategory).length > 0) {
            summary += `ÁRBOLES POR CATEGORÍA\n`;
            summary += `---------------------\n`;
            Object.entries(stats.treesByCategory).forEach(([category, count]) => {
                const categoryName = category === 'nuevo' ? 'Nuevos (Plantación)' : 'Existentes';
                summary += `${categoryName}: ${count}\n`;
            });
            summary += `\n`;
        }
        
        if (Object.keys(stats.pipelinesByType).length > 0) {
            summary += `INFRAESTRUCTURA POR TIPO\n`;
            summary += `------------------------\n`;
            Object.entries(stats.pipelinesByType).forEach(([type, count]) => {
                const typeNames = {
                    gas: 'Tuberías de Gas',
                    agua: 'Tuberías de Agua',
                    electrica: 'Redes Eléctricas'
                };
                summary += `${typeNames[type]}: ${count}\n`;
            });
            
            if (stats.totalPipelineLength) {
                summary += `Longitud Total: ${stats.totalPipelineLength.toFixed(1)} metros\n`;
            }
            summary += `\n`;
        }
        
        summary += `---\n`;
        summary += `Generado por el Sistema de Planeación de Reforestaciones\n`;
        
        return summary;
    },

    // ================================
    // UTILIDADES
    // ================================

    getProjectInfo() {
        return {
            name: StateManager.projectName,
            hasContent: StateManager.hasContent(),
            statistics: this.calculateProjectStatistics(),
            lastModified: new Date().toISOString(),
            canExport: true,
            estimatedSize: this.estimateProjectSize()
        };
    },

    estimateProjectSize() {
        try {
            const projectData = this.createProjectData();
            const jsonString = JSON.stringify(projectData);
            const sizeBytes = new Blob([jsonString]).size;
            
            if (sizeBytes < 1024) {
                return sizeBytes + ' B';
            } else if (sizeBytes < 1024 * 1024) {
                return (sizeBytes / 1024).toFixed(1) + ' KB';
            } else {
                return (sizeBytes / (1024 * 1024)).toFixed(1) + ' MB';
            }
        } catch (error) {
            return 'Desconocido';
        }
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function exportProject() {
    ProjectManagement.exportProject();
}

function loadProject() {
    ProjectManagement.loadProject();
}

function handleProjectLoad(event) {
    ProjectManagement.handleProjectLoad(event);
}
