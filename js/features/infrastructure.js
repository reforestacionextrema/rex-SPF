 
// ================================
// INFRASTRUCTURE - Tuberías y Líneas Guía
// ================================

const Infrastructure = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    currentPipeline: null,
    currentGuideline: null,
    snapToGuides: true,
    showGuidelineMeasurements: true,
    SNAP_DISTANCE: 25,

    // Estilos de tuberías
    pipelineStyles: {
        gas: { color: '#ffc107', width: 4, name: 'Tubería de Gas' },
        agua: { color: '#2196f3', width: 4, name: 'Tubería de Agua' },
        electrica: { color: '#ff5722', width: 3, name: 'Red Eléctrica' }
    },

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.syncWithStateManager();
        return true;
    },

    syncWithStateManager() {
        this.currentPipeline = StateManager.currentPipeline;
        this.currentGuideline = StateManager.currentGuideline;
        this.snapToGuides = StateManager.snapToGuides;
        this.showGuidelineMeasurements = StateManager.showGuidelineMeasurements;
    },

    // ================================
    // GESTIÓN DE TUBERÍAS
    // ================================

    startDrawingPipeline(type) {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Imagen Requerida', 'Primero carga una imagen satelital');
            return;
        }
        
        if (!this.isValidPipelineType(type)) {
            toastManager.error('Tipo Inválido', 'Tipo de tubería no válido');
            return;
        }
        
        StateManager.currentMode = 'pipeline';
        StateManager.pipelineType = type;
        this.currentPipeline = {
            type: type,
            points: [],
            name: `${this.pipelineStyles[type].name} ${StateManager.pipelines.filter(p => p.type === type).length + 1}`,
            id: Date.now() + Math.random()
        };
        StateManager.currentPipeline = this.currentPipeline;
        
        CanvasEngine.canvas.style.cursor = 'crosshair';
        
        const typeName = this.pipelineStyles[type].name.toLowerCase();
        EventHandler.updateStatus(`Modo ${typeName} - Haz clic para crear puntos, doble clic para terminar`);
        toastManager.info('Modo Infraestructura', `Dibujando ${typeName}. Haz clic para agregar puntos.`);
    },

    addPipelinePoint(coords) {
        if (!this.currentPipeline) return;
        
        // Aplicar snap a líneas guía si está activado
        const snappedCoords = this.snapToGuidelines(coords.x, coords.y);
        this.currentPipeline.points.push(snappedCoords);
        
        // Limpiar preview después de agregar punto
        CanvasEngine.previewLine = null;
        CanvasEngine.render();
    },

    finishPipeline() {
        if (!this.currentPipeline || this.currentPipeline.points.length < 2) {
            toastManager.error('Tubería Incompleta', 'Se necesitan al menos 2 puntos para crear una tubería');
            return;
        }
        
        // Guardar estado para undo antes de hacer cambios
        StateManager.saveUndoState(StateManager.ACTION_TYPES.ADD_PIPELINE, { 
            pipeline: JSON.parse(JSON.stringify(this.currentPipeline)) 
        });
        
        StateManager.pipelines.push(this.currentPipeline);
        this.currentPipeline = null;
        StateManager.currentPipeline = null;
        CanvasEngine.previewLine = null;
        StateManager.currentMode = 'normal';
        CanvasEngine.canvas.style.cursor = 'grab';
        
        this.updatePipelineInfo();
        CanvasEngine.render();
        EventHandler.updateStatus('Tubería completada');
        toastManager.success('Infraestructura Agregada', 'Tubería completada exitosamente');
    },

    clearPipelines() {
        if (StateManager.pipelines.length === 0 && !this.currentPipeline) {
            toastManager.warning('Sin Infraestructura', 'No hay tuberías para limpiar');
            return;
        }
        
        StateManager.pipelines = [];
        this.currentPipeline = null;
        StateManager.currentPipeline = null;
        StateManager.selectedPipeline = null;
        
        if (StateManager.currentMode === 'pipeline') {
            StateManager.currentMode = 'normal';
            CanvasEngine.canvas.style.cursor = 'grab';
        }
        
        this.updatePipelineInfo();
        CanvasEngine.render();
        EventHandler.updateStatus('Tuberías eliminadas');
        toastManager.success('Infraestructura Eliminada', 'Todas las tuberías han sido eliminadas');
    },

    // ================================
    // GESTIÓN DE LÍNEAS GUÍA
    // ================================

    startGuidelineMode(type) {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Imagen Requerida', 'Primero carga una imagen satelital');
            return;
        }
        
        StateManager.guidelineMode = type;
        this.currentGuideline = {
            type: type,
            points: [],
            id: Date.now() + Math.random(),
            visible: true
        };
        StateManager.currentGuideline = this.currentGuideline;
        
        CanvasEngine.canvas.style.cursor = 'crosshair';
        
        const typeNames = {
            line: 'línea guía',
            triangle: 'triángulo equilátero',
            square: 'cuadrado guía'
        };
        
        EventHandler.updateStatus(`Modo ${typeNames[type]} - Haz clic para crear puntos`);
        toastManager.info('Líneas Guía', `Dibujando ${typeNames[type]}. Haz clic para agregar puntos.`);
    },

    addGuidelinePoint(coords) {
        if (!this.currentGuideline) return;
        
        this.currentGuideline.points.push(coords);
        
        // Limpiar preview después de agregar punto
        CanvasEngine.previewLine = null;
        CanvasEngine.render();
    },

    finishGuideline() {
        if (!this.currentGuideline) return;
        
        let isValid = false;
        
        switch (this.currentGuideline.type) {
            case StateManager.GUIDELINE_TYPES.LINE:
                if (this.currentGuideline.points.length >= 2) {
                    isValid = true;
                }
                break;
            case StateManager.GUIDELINE_TYPES.TRIANGLE:
            case StateManager.GUIDELINE_TYPES.SQUARE:
                if (this.currentGuideline.points.length >= 2) {
                    this.completeGeometricShape();
                    isValid = true;
                }
                break;
        }
        
        if (isValid) {
            // Guardar estado para undo antes de agregar línea guía
            StateManager.saveUndoState(StateManager.ACTION_TYPES.ADD_GUIDELINE, { 
                guideline: JSON.parse(JSON.stringify(this.currentGuideline)) 
            });
            
            StateManager.guidelines.push(this.currentGuideline);
            toastManager.success('Línea Guía Creada', 'Línea guía agregada al proyecto');
        } else {
            toastManager.error('Línea Incompleta', 'Se necesitan al menos 2 puntos');
        }
        
        this.currentGuideline = null;
        StateManager.currentGuideline = null;
        CanvasEngine.previewLine = null;
        StateManager.guidelineMode = 'normal';
        CanvasEngine.canvas.style.cursor = 'grab';
        CanvasEngine.render();
        EventHandler.updateStatus('Línea guía completada');
    },

    completeGeometricShape() {
        if (!this.currentGuideline || this.currentGuideline.points.length < 2) return;
        
        const p1 = this.currentGuideline.points[0];
        const p2 = this.currentGuideline.points[1];
        
        if (this.currentGuideline.type === StateManager.GUIDELINE_TYPES.TRIANGLE) {
            // Crear triángulo equilátero
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            const angle = Math.atan2(dy, dx);
            const height = length * Math.sqrt(3) / 2;
            
            const p3 = {
                x: p1.x + (dx / 2) - height * Math.sin(angle),
                y: p1.y + (dy / 2) + height * Math.cos(angle)
            };
            
            this.currentGuideline.points = [p1, p2, p3, p1];
            
        } else if (this.currentGuideline.type === StateManager.GUIDELINE_TYPES.SQUARE) {
            // Crear cuadrado
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            
            const p3 = {
                x: p2.x - dy,
                y: p2.y + dx
            };
            
            const p4 = {
                x: p1.x - dy,
                y: p1.y + dx
            };
            
            this.currentGuideline.points = [p1, p2, p3, p4, p1];
        }
    },

    clearGuidelines() {
        if (StateManager.guidelines.length === 0 && !this.currentGuideline) {
            toastManager.warning('Sin Líneas Guía', 'No hay líneas guía para limpiar');
            return;
        }
        
        // Guardar estado para undo antes de limpiar
        if (StateManager.guidelines.length > 0) {
            StateManager.saveUndoState(StateManager.ACTION_TYPES.CLEAR_GUIDELINES, { 
                guidelines: JSON.parse(JSON.stringify(StateManager.guidelines)) 
            });
        }
        
        StateManager.guidelines = [];
        this.currentGuideline = null;
        StateManager.currentGuideline = null;
        
        if (StateManager.guidelineMode !== 'normal') {
            StateManager.guidelineMode = 'normal';
            CanvasEngine.canvas.style.cursor = 'grab';
        }
        
        CanvasEngine.render();
        EventHandler.updateStatus('Líneas guía eliminadas');
        toastManager.success('Líneas Guía Eliminadas', 'Todas las líneas guía han sido eliminadas');
    },

    // ================================
    // SISTEMA DE SNAP
    // ================================

    toggleSnapToGuides() {
        this.snapToGuides = !this.snapToGuides;
        StateManager.snapToGuides = this.snapToGuides;
        
        // Actualizar visual del botón
        const snapButton = document.querySelector('button[onclick="toggleSnapToGuides()"]');
        if (snapButton) {
            if (this.snapToGuides) {
                snapButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
                snapButton.textContent = '🧲 Snap ON';
            } else {
                snapButton.style.background = 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)';
                snapButton.textContent = '🧲 Snap OFF';
            }
        }
        
        EventHandler.updateStatus(`Snap a guías: ${this.snapToGuides ? 'activado' : 'desactivado'}`);
        toastManager.info('Snap a Guías', `Snap ${this.snapToGuides ? 'activado' : 'desactivado'}`);
    },

    toggleGuidelineMeasurements() {
        this.showGuidelineMeasurements = !this.showGuidelineMeasurements;
        StateManager.showGuidelineMeasurements = this.showGuidelineMeasurements;
        
        // Actualizar visual del botón
        const measureButton = document.querySelector('button[onclick="toggleGuidelineMeasurements()"]');
        if (measureButton) {
            if (this.showGuidelineMeasurements) {
                measureButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
                measureButton.textContent = '📐 Medidas ON';
            } else {
                measureButton.style.background = 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)';
                measureButton.textContent = '📐 Medidas OFF';
            }
        }
        
        CanvasEngine.render();
        EventHandler.updateStatus(`Medidas en líneas guía: ${this.showGuidelineMeasurements ? 'activadas' : 'desactivadas'}`);
        toastManager.info('Medidas de Líneas Guía', `Medidas ${this.showGuidelineMeasurements ? 'activadas' : 'desactivadas'}`);
    },

    toggleGuidelinesVisibility() {
        const visible = !StateManager.guidelines.every(g => g.visible);
        StateManager.guidelines.forEach(g => g.visible = visible);
        CanvasEngine.render();
        EventHandler.updateStatus(`Líneas guía: ${visible ? 'visibles' : 'ocultas'}`);
    },

    snapToGuidelines(x, y) {
        if (!this.snapToGuides || StateManager.guidelines.length === 0) {
            return { x, y };
        }
        
        let closestPoint = { x, y };
        let minDistance = this.SNAP_DISTANCE / StateManager.zoom;
        
        StateManager.guidelines.forEach(guideline => {
            if (!guideline.visible) return;
            
            // Snap a puntos específicos de la línea guía
            guideline.points.forEach(point => {
                const distance = Math.sqrt(
                    Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = { x: point.x, y: point.y };
                }
            });
            
            // Snap a cualquier punto a lo largo de las líneas
            for (let i = 0; i < guideline.points.length - 1; i++) {
                const p1 = guideline.points[i];
                const p2 = guideline.points[i + 1];
                
                const snapPoint = this.getClosestPointOnLine(x, y, p1.x, p1.y, p2.x, p2.y);
                const distance = Math.sqrt(
                    Math.pow(x - snapPoint.x, 2) + Math.pow(y - snapPoint.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = snapPoint;
                }
            }
        });
        
        return closestPoint;
    },

    getClosestPointOnLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return { x: x1, y: y1 };
        
        let t = Math.max(0, Math.min(1, dot / lenSq));
        
        return {
            x: x1 + t * C,
            y: y1 + t * D
        };
    },

    // ================================
    // DETECCIÓN DE ELEMENTOS
    // ================================

    getPipelineAt(x, y) {
        const tolerance = 10 / StateManager.zoom;
        
        for (let pipeline of StateManager.pipelines) {
            for (let i = 0; i < pipeline.points.length - 1; i++) {
                const start = pipeline.points[i];
                const end = pipeline.points[i + 1];
                
                const distance = this.distanceToLineSegment(x, y, start.x, start.y, end.x, end.y);
                if (distance <= tolerance) {
                    return pipeline;
                }
            }
        }
        return null;
    },

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let t = Math.max(0, Math.min(1, dot / lenSq));
        
        const projection = {
            x: x1 + t * C,
            y: y1 + t * D
        };
        
        return Math.sqrt(Math.pow(px - projection.x, 2) + Math.pow(py - projection.y, 2));
    },

    // ================================
    // FUNCIONES DE DIBUJO
    // ================================

    drawPipelines(ctx, zoom) {
        // Dibujar tuberías terminadas
        StateManager.pipelines.forEach(pipeline => {
            const style = this.pipelineStyles[pipeline.type];
            if (!style || pipeline.points.length < 2) return;
            
            ctx.strokeStyle = StateManager.selectedPipeline === pipeline ? '#ff0000' : style.color;
            ctx.lineWidth = style.width / zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(pipeline.points[0].x, pipeline.points[0].y);
            
            for (let i = 1; i < pipeline.points.length; i++) {
                ctx.lineTo(pipeline.points[i].x, pipeline.points[i].y);
            }
            
            ctx.stroke();
            
            // Dibujar puntos de conexión
            ctx.fillStyle = style.color;
            pipeline.points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3 / zoom, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
        
        // Dibujar tubería en construcción
        if (this.currentPipeline && this.currentPipeline.points.length > 0) {
            const style = this.pipelineStyles[this.currentPipeline.type];
            if (style) {
                ctx.strokeStyle = style.color;
                ctx.lineWidth = style.width / zoom;
                ctx.setLineDash([5 / zoom, 5 / zoom]);
                
                ctx.beginPath();
                ctx.moveTo(this.currentPipeline.points[0].x, this.currentPipeline.points[0].y);
                
                for (let i = 1; i < this.currentPipeline.points.length; i++) {
                    ctx.lineTo(this.currentPipeline.points[i].x, this.currentPipeline.points[i].y);
                }
                
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Dibujar puntos
                ctx.fillStyle = style.color;
                this.currentPipeline.points.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 3 / zoom, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        }
    },

    drawGuidelines(ctx, zoom) {
        // Dibujar líneas guía terminadas
        StateManager.guidelines.forEach(guideline => {
            if (!guideline.visible || guideline.points.length < 2) return;
            
            ctx.strokeStyle = '#9c27b0';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([10 / zoom, 5 / zoom]);
            ctx.globalAlpha = 0.7;
            
            ctx.beginPath();
            ctx.moveTo(guideline.points[0].x, guideline.points[0].y);
            
            for (let i = 1; i < guideline.points.length; i++) {
                ctx.lineTo(guideline.points[i].x, guideline.points[i].y);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            
            // Dibujar puntos de intersección
            ctx.fillStyle = '#9c27b0';
            guideline.points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3 / zoom, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            // Mostrar medidas en segmentos si está activado
            if (this.showGuidelineMeasurements && StateManager.scale) {
                this.drawGuidelineMeasurements(ctx, guideline, zoom);
            }
        });
        
        // Dibujar línea guía en construcción
        if (this.currentGuideline && this.currentGuideline.points.length > 0) {
            this.drawCurrentGuideline(ctx, zoom);
        }
    },

    drawGuidelineMeasurements(ctx, guideline, zoom) {
        ctx.globalAlpha = 0.9;
        ctx.font = `bold ${12 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < guideline.points.length - 1; i++) {
            const p1 = guideline.points[i];
            const p2 = guideline.points[i + 1];
            
            const pixelLength = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            const realLength = pixelLength * StateManager.scale;
            
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            const text = `${realLength.toFixed(1)}m`;
            const textWidth = ctx.measureText(text).width;
            const padding = 3 / zoom;
            
            // Fondo semitransparente para el texto
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
                midX - textWidth/2 - padding, 
                midY - 6/zoom - padding, 
                textWidth + padding*2, 
                12/zoom + padding*2
            );
            
            // Dibujar texto
            ctx.fillStyle = '#9c27b0';
            ctx.fillText(text, midX, midY);
        }
        
        ctx.globalAlpha = 1;
    },

    drawCurrentGuideline(ctx, zoom) {
        ctx.strokeStyle = '#9c27b0';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.globalAlpha = 0.9;
        
        ctx.beginPath();
        ctx.moveTo(this.currentGuideline.points[0].x, this.currentGuideline.points[0].y);
        
        for (let i = 1; i < this.currentGuideline.points.length; i++) {
            ctx.lineTo(this.currentGuideline.points[i].x, this.currentGuideline.points[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Mostrar medidas en segmentos ya confirmados durante construcción
        if (this.showGuidelineMeasurements && StateManager.scale && this.currentGuideline.points.length > 1) {
            this.drawGuidelineMeasurements(ctx, this.currentGuideline, zoom);
        }
        
        ctx.globalAlpha = 1;
        
        // Dibujar puntos
        ctx.fillStyle = '#9c27b0';
        this.currentGuideline.points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
        });
    },

    // ================================
    // GESTIÓN DE UI
    // ================================

    updatePipelineInfo() {
        const pipelineInfo = document.getElementById('pipelineInfo');
        const pipelineCount = document.getElementById('pipelineCount');
        
        if (StateManager.pipelines.length > 0) {
            if (pipelineCount) pipelineCount.textContent = StateManager.pipelines.length;
            if (pipelineInfo) pipelineInfo.style.display = 'block';
        } else {
            if (pipelineInfo) pipelineInfo.style.display = 'none';
        }
    },

    // ================================
    // ANÁLISIS Y ESTADÍSTICAS
    // ================================

    getPipelineAnalysis() {
        const analysis = {
            totalPipelines: StateManager.pipelines.length,
            totalLength: 0,
            byType: {}
        };
        
        StateManager.pipelines.forEach(pipeline => {
            const type = pipeline.type;
            if (!analysis.byType[type]) {
                analysis.byType[type] = {
                    count: 0,
                    length: 0,
                    name: this.pipelineStyles[type].name
                };
            }
            
            analysis.byType[type].count++;
            
            // Calcular longitud si hay escala
            if (StateManager.scale && pipeline.points.length > 1) {
                for (let i = 0; i < pipeline.points.length - 1; i++) {
                    const start = pipeline.points[i];
                    const end = pipeline.points[i + 1];
                    const pixelLength = Math.sqrt(
                        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                    );
                    const realLength = pixelLength * StateManager.scale;
                    analysis.byType[type].length += realLength;
                    analysis.totalLength += realLength;
                }
            }
        });
        
        return analysis;
    },

    // ================================
    // VALIDACIONES
    // ================================

    isValidPipelineType(type) {
        return this.pipelineStyles.hasOwnProperty(type);
    },

    validatePipeline(pipeline) {
        const errors = [];
        
        if (!pipeline.type || !this.isValidPipelineType(pipeline.type)) {
            errors.push('Tipo de tubería inválido');
        }
        
        if (!pipeline.points || pipeline.points.length < 2) {
            errors.push('Se necesitan al menos 2 puntos');
        }
        
        if (pipeline.points && pipeline.points.length > 50) {
            errors.push('Demasiados puntos (máximo 50)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function startDrawingPipeline(type) {
    Infrastructure.startDrawingPipeline(type);
}

function clearPipelines() {
    Infrastructure.clearPipelines();
}

function startGuidelineMode(type) {
    Infrastructure.startGuidelineMode(type);
}

function clearGuidelines() {
    Infrastructure.clearGuidelines();
}

function toggleSnapToGuides() {
    Infrastructure.toggleSnapToGuides();
}

function toggleGuidelineMeasurements() {
    Infrastructure.toggleGuidelineMeasurements();
}

function toggleGuidelinesVisibility() {
    Infrastructure.toggleGuidelinesVisibility();
}