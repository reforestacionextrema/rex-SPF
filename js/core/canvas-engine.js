 // ================================
// CANVAS ENGINE - Motor de Canvas y Rendering
// ================================

const CanvasEngine = {
    canvas: null,
    ctx: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragStartPosition: null,
    dragStartPipelinePositions: null,
    previewLine: null,

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.canvas = document.getElementById('mainCanvas');
        if (!this.canvas) {
            toastManager.error('Error del Sistema', 'No se pudo inicializar el canvas');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            toastManager.error('Error del Sistema', 'No se pudo obtener el contexto 2D del canvas');
            return false;
        }
        
        this.setupCanvas();
        this.setupCanvasEvents();
        this.render();
        return true;
    },

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        if (!container) return;
        
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },

    // ================================
    // EVENTOS DEL CANVAS
    // ================================

    setupCanvasEvents() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    // ================================
    // MANEJO DE EVENTOS
    // ================================

    handleCanvasClick(event) {
        const coords = this.getCanvasCoordinates(event);
        
        if (StateManager.currentMode === 'polygon') {
            AreaDelimitation.addPolygonPoint(coords);
            
            if (event.detail === 2 && StateManager.polygon.length >= 3) { // Doble clic
                AreaDelimitation.finishPolygon();
            }
        } else if (StateManager.currentMode === 'pipeline') {
            Infrastructure.addPipelinePoint(coords);
            
            // Limpiar preview después de agregar punto
            this.previewLine = null;
            
            if (event.detail === 2 && Infrastructure.currentPipeline.points.length >= 2) { // Doble clic
                Infrastructure.finishPipeline();
            }
        } else if (StateManager.guidelineMode !== 'normal') {
            // Modo líneas guía
            if (event.detail === 2 && Infrastructure.currentGuideline.points.length >= 2) { // Doble clic
                Infrastructure.finishGuideline();
            } else {
                Infrastructure.addGuidelinePoint(coords);
                this.previewLine = null;
            }
        } else if (StateManager.currentMode === 'normal') {
            this.handleNormalModeClick(coords);
        }
        
        this.render();
    },

    handleNormalModeClick(coords) {
        const clickedTree = TreePlanting.getTreeAt(coords.x, coords.y);
        const clickedPipeline = Infrastructure.getPipelineAt(coords.x, coords.y);
        
        if (clickedTree) {
            StateManager.selectedTree = clickedTree;
            StateManager.selectedPipeline = null;
        } else if (clickedPipeline) {
            StateManager.selectedPipeline = clickedPipeline;
            StateManager.selectedTree = null;
        } else {
            StateManager.selectedTree = null;
            StateManager.selectedPipeline = null;
        }
    },

    handleMouseDown(event) {
        const coords = this.getCanvasCoordinates(event);
        
        if (StateManager.currentMode === 'scaling' && !StateManager.scaleLine) {
            StateManager.scaleLine = { start: coords, end: coords };
            this.isDragging = true;
        } else if (StateManager.currentMode === 'normal') {
            const tree = TreePlanting.getTreeAt(coords.x, coords.y);
            const pipeline = Infrastructure.getPipelineAt(coords.x, coords.y);
            
            if (tree) {
                StateManager.selectedTree = tree;
                StateManager.selectedPipeline = null;
                this.isDragging = true;
                this.dragStart = { x: event.clientX, y: event.clientY };
                this.dragStartPosition = { x: tree.x, y: tree.y };
            } else if (pipeline) {
                StateManager.selectedPipeline = pipeline;
                StateManager.selectedTree = null;
                this.isDragging = true;
                this.dragStart = { 
                    x: event.clientX, 
                    y: event.clientY,
                    worldX: coords.x,
                    worldY: coords.y
                };
                this.dragStartPipelinePositions = pipeline.points.map(point => ({ x: point.x, y: point.y }));
            } else {
                StateManager.selectedTree = null;
                StateManager.selectedPipeline = null;
                this.isDragging = true;
                this.dragStart = { x: event.clientX - StateManager.panX, y: event.clientY - StateManager.panY };
                this.canvas.style.cursor = 'grabbing';
            }
        }
    },

    handleMouseMove(event) {
        if (!this.isDragging) {
            this.handleMouseMovePreview(event);
            return;
        }
        
        const coords = this.getCanvasCoordinates(event);
        
        if (StateManager.currentMode === 'scaling' && StateManager.scaleLine) {
            StateManager.scaleLine.end = coords;
            this.render();
        } else if (StateManager.currentMode === 'normal' && StateManager.selectedTree) {
            // Aplicar snap al mover árboles
            const snappedCoords = Infrastructure.snapToGuidelines(coords.x, coords.y);
            StateManager.selectedTree.x = snappedCoords.x;
            StateManager.selectedTree.y = snappedCoords.y;
            this.render();
        } else if (StateManager.currentMode === 'normal' && StateManager.selectedPipeline) {
            const deltaX = (event.clientX - this.dragStart.x) / StateManager.zoom;
            const deltaY = (event.clientY - this.dragStart.y) / StateManager.zoom;
            
            StateManager.selectedPipeline.points.forEach(point => {
                point.x += deltaX;
                point.y += deltaY;
            });
            
            this.dragStart.x = event.clientX;
            this.dragStart.y = event.clientY;
            this.render();
        } else if (StateManager.currentMode === 'normal' && !StateManager.selectedTree && !StateManager.selectedPipeline) {
            StateManager.panX = event.clientX - this.dragStart.x;
            StateManager.panY = event.clientY - this.dragStart.y;
            this.render();
        }
    },

    handleMouseMovePreview(event) {
        const coords = this.getCanvasCoordinates(event);
        
        if (StateManager.currentMode === 'pipeline' && Infrastructure.currentPipeline && Infrastructure.currentPipeline.points.length > 0) {
            // Preview para tubería en construcción
            const lastPoint = Infrastructure.currentPipeline.points[Infrastructure.currentPipeline.points.length - 1];
            this.previewLine = {
                type: 'pipeline',
                pipelineType: Infrastructure.currentPipeline.type,
                start: lastPoint,
                end: coords
            };
            this.render();
        } else if (StateManager.guidelineMode !== 'normal' && Infrastructure.currentGuideline && Infrastructure.currentGuideline.points.length > 0) {
            // Preview para línea guía en construcción
            const lastPoint = Infrastructure.currentGuideline.points[Infrastructure.currentGuideline.points.length - 1];
            this.previewLine = {
                type: 'guideline',
                start: lastPoint,
                end: coords
            };
            this.render();
        } else {
            // Limpiar preview si no estamos en modo de dibujo
            if (this.previewLine) {
                this.previewLine = null;
                this.render();
            }
        }
    },

    handleMouseUp(event) {
        if (this.isDragging && StateManager.selectedTree && this.dragStartPosition) {
            // Verificar si el árbol se movió significativamente
            const deltaX = Math.abs(StateManager.selectedTree.x - this.dragStartPosition.x);
            const deltaY = Math.abs(StateManager.selectedTree.y - this.dragStartPosition.y);
            
            if (deltaX > 1 || deltaY > 1) {
                StateManager.saveUndoState('MOVE_TREE', {
                    treeId: StateManager.selectedTree.id,
                    oldPosition: this.dragStartPosition,
                    newPosition: { x: StateManager.selectedTree.x, y: StateManager.selectedTree.y }
                });
            }
            this.dragStartPosition = null;
        } else if (this.isDragging && StateManager.selectedPipeline && this.dragStartPipelinePositions) {
            // Verificar si la tubería se movió
            let moved = false;
            for (let i = 0; i < StateManager.selectedPipeline.points.length; i++) {
                const oldPos = this.dragStartPipelinePositions[i];
                const newPos = StateManager.selectedPipeline.points[i];
                if (Math.abs(newPos.x - oldPos.x) > 1 || Math.abs(newPos.y - oldPos.y) > 1) {
                    moved = true;
                    break;
                }
            }
            
            if (moved) {
                StateManager.saveUndoState('MOVE_PIPELINE', {
                    pipelineIndex: StateManager.pipelines.indexOf(StateManager.selectedPipeline),
                    oldPositions: this.dragStartPipelinePositions,
                    newPositions: StateManager.selectedPipeline.points.map(p => ({ x: p.x, y: p.y }))
                });
            }
            this.dragStartPipelinePositions = null;
        }
        
        this.isDragging = false;
        this.canvas.style.cursor = StateManager.currentMode === 'normal' ? 'grab' : 'crosshair';
    },

    handleDragOver(event) {
        event.preventDefault();
    },

    handleDrop(event) {
        event.preventDefault();
        
        const treeType = event.dataTransfer.getData('text/plain');
        if (!treeType || !StateManager.backgroundImage) {
            if (!StateManager.backgroundImage) {
                toastManager.warning('Imagen Requerida', 'Primero carga una imagen satelital');
            }
            return;
        }
        
        const coords = this.getCanvasCoordinates(event);
        
        // Aplicar snap a líneas guía si está activado
        const snappedCoords = Infrastructure.snapToGuidelines(coords.x, coords.y);
        
        TreePlanting.addTree(treeType, snappedCoords.x, snappedCoords.y);
    },

    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, StateManager.zoom * zoomFactor));
        
        if (newZoom !== StateManager.zoom) {
            const zoomChange = newZoom / StateManager.zoom;
            StateManager.panX = mouseX - (mouseX - StateManager.panX) * zoomChange;
            StateManager.panY = mouseY - (mouseY - StateManager.panY) * zoomChange;
            StateManager.zoom = newZoom;
            this.render();
        }
    },

    // ================================
    // UTILIDADES
    // ================================

    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left - StateManager.panX) / StateManager.zoom,
            y: (event.clientY - rect.top - StateManager.panY) / StateManager.zoom
        };
    },

    handleResize() {
        const container = document.getElementById('canvasContainer');
        if (!container || !this.canvas) return;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Ajustar pan proporcionalmente
        if (oldWidth > 0 && oldHeight > 0) {
            StateManager.panX = (StateManager.panX / oldWidth) * this.canvas.width;
            StateManager.panY = (StateManager.panY / oldHeight) * this.canvas.height;
        }
        
        this.render();
    },

    // ================================
    // FUNCIONES DE ZOOM
    // ================================

    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const newZoom = Math.min(5, StateManager.zoom * 1.2);
        this.applyZoom(newZoom, centerX, centerY);
    },

    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const newZoom = Math.max(0.1, StateManager.zoom * 0.8);
        this.applyZoom(newZoom, centerX, centerY);
    },

    resetZoom() {
        if (StateManager.backgroundImage) {
            ImageManagement.centerAndFitImage();
        } else {
            StateManager.zoom = 1;
            StateManager.panX = 0;
            StateManager.panY = 0;
        }
        this.render();
    },

    applyZoom(newZoom, centerX, centerY) {
        const zoomChange = newZoom / StateManager.zoom;
        StateManager.panX = centerX - (centerX - StateManager.panX) * zoomChange;
        StateManager.panY = centerY - (centerY - StateManager.panY) * zoomChange;
        StateManager.zoom = newZoom;
        this.render();
    },

    // ================================
    // MOTOR DE RENDERING
    // ================================

    render() {
        if (!this.ctx) return;
        
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Aplicar transformaciones
        this.ctx.save();
        this.ctx.translate(StateManager.panX, StateManager.panY);
        this.ctx.scale(StateManager.zoom, StateManager.zoom);
        
        // Dibujar elementos en orden
        this.drawBackground();
        this.drawPolygon();
        this.drawGuidelines();
        this.drawPipelines();
        this.drawScaleLine();
        this.drawPreviewLine();
        this.drawTrees();
        
        this.ctx.restore();
    },

    // ================================
    // FUNCIONES DE DIBUJO
    // ================================

    drawBackground() {
        if (StateManager.backgroundImage) {
            this.ctx.drawImage(StateManager.backgroundImage, 0, 0);
        }
    },

    drawPolygon() {
        if (!StateManager.layerVisibility.polygon || StateManager.polygon.length === 0) return;
        
        this.ctx.strokeStyle = '#007bff';
        this.ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
        this.ctx.lineWidth = 3 / StateManager.zoom;
        
        this.ctx.beginPath();
        this.ctx.moveTo(StateManager.polygon[0].x, StateManager.polygon[0].y);
        
        for (let i = 1; i < StateManager.polygon.length; i++) {
            this.ctx.lineTo(StateManager.polygon[i].x, StateManager.polygon[i].y);
        }
        
        if (StateManager.currentMode !== 'polygon') {
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.stroke();
        
        // Dibujar puntos
        this.ctx.fillStyle = '#007bff';
        for (let point of StateManager.polygon) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4 / StateManager.zoom, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    },

    drawGuidelines() {
        Infrastructure.drawGuidelines(this.ctx, StateManager.zoom);
    },

    drawPipelines() {
        if (!StateManager.layerVisibility.pipelines) return;
        Infrastructure.drawPipelines(this.ctx, StateManager.zoom);
    },

    drawScaleLine() {
        if (!StateManager.scaleLine || StateManager.currentMode !== 'scaling') return;
        
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3 / StateManager.zoom;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(StateManager.scaleLine.start.x, StateManager.scaleLine.start.y);
        this.ctx.lineTo(StateManager.scaleLine.end.x, StateManager.scaleLine.end.y);
        this.ctx.stroke();
        
        // Dibujar puntos de inicio y fin
        this.ctx.fillStyle = '#ff0000';
        
        this.ctx.beginPath();
        this.ctx.arc(StateManager.scaleLine.start.x, StateManager.scaleLine.start.y, 4 / StateManager.zoom, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(StateManager.scaleLine.end.x, StateManager.scaleLine.end.y, 4 / StateManager.zoom, 0, 2 * Math.PI);
        this.ctx.fill();
    },

    drawPreviewLine() {
        if (!this.previewLine) return;
        
        this.ctx.save();
        
        if (this.previewLine.type === 'pipeline') {
            const pipelineStyles = {
                gas: { color: '#ffc107', width: 4 },
                agua: { color: '#2196f3', width: 4 },
                electrica: { color: '#ff5722', width: 3 }
            };
            
            const style = pipelineStyles[this.previewLine.pipelineType];
            if (style) {
                this.ctx.strokeStyle = style.color;
                this.ctx.lineWidth = style.width / StateManager.zoom;
                this.ctx.globalAlpha = 0.6;
                this.ctx.setLineDash([10 / StateManager.zoom, 5 / StateManager.zoom]);
                
                this.ctx.beginPath();
                this.ctx.moveTo(this.previewLine.start.x, this.previewLine.start.y);
                this.ctx.lineTo(this.previewLine.end.x, this.previewLine.end.y);
                this.ctx.stroke();
            }
        } else if (this.previewLine.type === 'guideline') {
            this.ctx.strokeStyle = '#9c27b0';
            this.ctx.lineWidth = 2 / StateManager.zoom;
            this.ctx.globalAlpha = 0.6;
            this.ctx.setLineDash([8 / StateManager.zoom, 4 / StateManager.zoom]);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.previewLine.start.x, this.previewLine.start.y);
            this.ctx.lineTo(this.previewLine.end.x, this.previewLine.end.y);
            this.ctx.stroke();
            
            // Mostrar distancia en tiempo real para líneas guía
            if (StateManager.scale && Infrastructure.showGuidelineMeasurements) {
                const pixelLength = Math.sqrt(
                    Math.pow(this.previewLine.end.x - this.previewLine.start.x, 2) + 
                    Math.pow(this.previewLine.end.y - this.previewLine.start.y, 2)
                );
                const realLength = pixelLength * StateManager.scale;
                
                const midX = (this.previewLine.start.x + this.previewLine.end.x) / 2;
                const midY = (this.previewLine.start.y + this.previewLine.end.y) / 2;
                
                this.ctx.globalAlpha = 0.9;
                this.ctx.fillStyle = '#9c27b0';
                this.ctx.font = `bold ${14 / StateManager.zoom}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                const text = `${realLength.toFixed(1)}m`;
                const textWidth = this.ctx.measureText(text).width;
                const padding = 4 / StateManager.zoom;
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.fillRect(
                    midX - textWidth/2 - padding, 
                    midY - 7/StateManager.zoom - padding, 
                    textWidth + padding*2, 
                    14/StateManager.zoom + padding*2
                );
                
                this.ctx.fillStyle = '#9c27b0';
                this.ctx.fillText(text, midX, midY);
            }
        }
        
        this.ctx.restore();
    },

    drawTrees() {
        TreePlanting.drawTrees(this.ctx, StateManager.zoom, StateManager.scale, StateManager.layerVisibility, StateManager.selectedTree);
    },

    // ================================
    // EXPORTACIÓN
    // ================================

    exportToPNG() {
        if (!StateManager.backgroundImage && StateManager.trees.length === 0 && StateManager.pipelines.length === 0 && StateManager.polygon.length === 0) {
            toastManager.warning('Sin Contenido', 'No hay contenido para exportar');
            return;
        }
        
        // Crear un canvas temporal para la exportación
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        // Determinar dimensiones basadas en el contenido
        let bounds = this.getContentBounds();
        if (!bounds && StateManager.backgroundImage) {
            bounds = {
                minX: 0,
                minY: 0,
                maxX: StateManager.backgroundImage.width,
                maxY: StateManager.backgroundImage.height
            };
        }
        
        if (!bounds) {
            toastManager.error('Sin Contenido', 'No se pudo determinar el área a exportar');
            return;
        }
        
        const margin = 50;
        exportCanvas.width = (bounds.maxX - bounds.minX) + margin * 2;
        exportCanvas.height = (bounds.maxY - bounds.minY) + margin * 2;
        
        // Configurar contexto de exportación
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        exportCtx.translate(margin - bounds.minX, margin - bounds.minY);
        
        // Guardar contexto original y configuraciones
        const originalCtx = this.ctx;
        const originalZoom = StateManager.zoom;
        const originalPanX = StateManager.panX;
        const originalPanY = StateManager.panY;
        
        // Configurar para exportación
        this.ctx = exportCtx;
        StateManager.zoom = 1;
        StateManager.panX = 0;
        StateManager.panY = 0;
        
        // Dibujar contenido
        if (StateManager.backgroundImage) {
            exportCtx.drawImage(StateManager.backgroundImage, 0, 0);
        }
        
        if (StateManager.layerVisibility.polygon && StateManager.polygon.length > 0) {
            this.drawPolygon();
        }
        
        if (StateManager.layerVisibility.pipelines) {
            this.drawPipelines();
        }
        
        this.drawTrees();
        
        // Restaurar contexto y configuraciones
        this.ctx = originalCtx;
        StateManager.zoom = originalZoom;
        StateManager.panX = originalPanX;
        StateManager.panY = originalPanY;
        
        // Descargar imagen
        exportCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${StateManager.projectName}_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toastManager.success('Imagen Exportada', 'El mapa se exportó como imagen PNG');
        });
    },

    getContentBounds() {
        let bounds = null;
        
        // Incluir árboles
        StateManager.trees.forEach(tree => {
            const radius = StateManager.scale ? (tree.config.diameter / 2) / StateManager.scale : tree.config.diameter * 10;
            const treeBounds = {
                minX: tree.x - radius,
                minY: tree.y - radius,
                maxX: tree.x + radius,
                maxY: tree.y + radius
            };
            
            if (!bounds) {
                bounds = treeBounds;
            } else {
                bounds.minX = Math.min(bounds.minX, treeBounds.minX);
                bounds.minY = Math.min(bounds.minY, treeBounds.minY);
                bounds.maxX = Math.max(bounds.maxX, treeBounds.maxX);
                bounds.maxY = Math.max(bounds.maxY, treeBounds.maxY);
            }
        });
        
        // Incluir polígono
        StateManager.polygon.forEach(point => {
            if (!bounds) {
                bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
            } else {
                bounds.minX = Math.min(bounds.minX, point.x);
                bounds.minY = Math.min(bounds.minY, point.y);
                bounds.maxX = Math.max(bounds.maxX, point.x);
                bounds.maxY = Math.max(bounds.maxY, point.y);
            }
        });
        
        // Incluir tuberías
        StateManager.pipelines.forEach(pipeline => {
            pipeline.points.forEach(point => {
                if (!bounds) {
                    bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
                } else {
                    bounds.minX = Math.min(bounds.minX, point.x);
                    bounds.minY = Math.min(bounds.minY, point.y);
                    bounds.maxX = Math.max(bounds.maxX, point.x);
                    bounds.maxY = Math.max(bounds.maxY, point.y);
                }
            });
        });
        
        return bounds;
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

// Exportar funciones para mantener compatibilidad con el HTML
function render() {
    CanvasEngine.render();
}

function zoomIn() {
    CanvasEngine.zoomIn();
}

function zoomOut() {
    CanvasEngine.zoomOut();
}

function resetZoom() {
    CanvasEngine.resetZoom();
}

function exportToPNG() {
    CanvasEngine.exportToPNG();
}
