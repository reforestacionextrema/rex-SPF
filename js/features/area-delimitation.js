 // ================================
// AREA DELIMITATION - Delimitación de Áreas del Predio
// ================================

const AreaDelimitation = {
    
    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        // Este módulo no requiere inicialización especial
        return true;
    },

    // ================================
    // GESTIÓN DE POLÍGONOS
    // ================================

    startPolygon() {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Imagen Requerida', 'Primero carga una imagen satelital');
            return;
        }
        
        StateManager.currentMode = 'polygon';
        StateManager.polygon = [];
        CanvasEngine.canvas.style.cursor = 'crosshair';
        
        EventHandler.updateStatus('Modo delimitación - Haz clic para crear puntos, doble clic para terminar');
        toastManager.info('Modo Delimitación', 'Haz clic para agregar puntos del perímetro. Doble clic para finalizar.');
    },

    addPolygonPoint(coords) {
        StateManager.polygon.push(coords);
        CanvasEngine.render();
    },

    finishPolygon() {
        if (StateManager.polygon.length < 3) {
            toastManager.error('Polígono Incompleto', 'Se necesitan al menos 3 puntos para crear un área');
            return;
        }
        
        StateManager.currentMode = 'normal';
        CanvasEngine.canvas.style.cursor = 'grab';
        
        if (StateManager.scale) {
            const area = this.calculatePolygonArea(StateManager.polygon, StateManager.scale);
            this.updatePolygonInfo(area);
            toastManager.success('Área Delimitada', `Área calculada: ${area.toLocaleString('es-ES')} m²`);
        } else {
            toastManager.warning('Escala No Definida', 'Define la escala para calcular el área en metros');
        }
        
        CanvasEngine.render();
        EventHandler.updateStatus('Área delimitada - Ahora puedes colocar árboles');
    },

    clearPolygon() {
        if (StateManager.polygon.length === 0) {
            toastManager.warning('Sin Área', 'No hay ningún área para limpiar');
            return;
        }
        
        StateManager.polygon = [];
        this.hidePolygonInfo();
        
        if (StateManager.currentMode === 'polygon') {
            StateManager.currentMode = 'normal';
            CanvasEngine.canvas.style.cursor = 'grab';
        }
        
        CanvasEngine.render();
        EventHandler.updateStatus('Área eliminada');
        toastManager.success('Área Eliminada', 'El perímetro ha sido eliminado');
    },

    // ================================
    // CÁLCULOS DE ÁREA
    // ================================

    calculatePolygonArea(points, pixelScale) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        const pixelArea = Math.abs(area) / 2;
        return Math.round(pixelArea * pixelScale * pixelScale); // Convertir a metros cuadrados
    },

    getPolygonPerimeter(points, pixelScale) {
        if (points.length < 2 || !pixelScale) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const pixelLength = Math.sqrt(
                Math.pow(points[j].x - points[i].x, 2) + 
                Math.pow(points[j].y - points[i].y, 2)
            );
            perimeter += pixelLength * pixelScale;
        }
        
        return perimeter;
    },

    // ================================
    // ANÁLISIS GEOMÉTRICO
    // ================================

    isPointInPolygon(point, polygon) {
        if (polygon.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    },

    getPolygonBounds(polygon) {
        if (polygon.length === 0) return null;
        
        let minX = polygon[0].x, maxX = polygon[0].x;
        let minY = polygon[0].y, maxY = polygon[0].y;
        
        for (let i = 1; i < polygon.length; i++) {
            minX = Math.min(minX, polygon[i].x);
            maxX = Math.max(maxX, polygon[i].x);
            minY = Math.min(minY, polygon[i].y);
            maxY = Math.max(maxY, polygon[i].y);
        }
        
        return { minX, maxX, minY, maxY };
    },

    getPolygonCenter(polygon) {
        if (polygon.length === 0) return null;
        
        let centerX = 0, centerY = 0;
        for (let point of polygon) {
            centerX += point.x;
            centerY += point.y;
        }
        
        return {
            x: centerX / polygon.length,
            y: centerY / polygon.length
        };
    },

    // ================================
    // VALIDACIONES
    // ================================

    validatePolygon(polygon) {
        const errors = [];
        
        if (polygon.length < 3) {
            errors.push('Se necesitan al menos 3 puntos para formar un área');
        }
        
        if (polygon.length > 100) {
            errors.push('Demasiados puntos (máximo 100)');
        }
        
        // Verificar si hay puntos duplicados
        for (let i = 0; i < polygon.length - 1; i++) {
            for (let j = i + 1; j < polygon.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(polygon[i].x - polygon[j].x, 2) + 
                    Math.pow(polygon[i].y - polygon[j].y, 2)
                );
                if (distance < 5) { // Menos de 5 píxeles de distancia
                    errors.push('Hay puntos muy cercanos entre sí');
                    break;
                }
            }
            if (errors.length > 0) break;
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    isPolygonSelfIntersecting(polygon) {
        if (polygon.length < 4) return false;
        
        for (let i = 0; i < polygon.length; i++) {
            const line1Start = polygon[i];
            const line1End = polygon[(i + 1) % polygon.length];
            
            for (let j = i + 2; j < polygon.length; j++) {
                // Evitar líneas adyacentes
                if (j === polygon.length - 1 && i === 0) continue;
                
                const line2Start = polygon[j];
                const line2End = polygon[(j + 1) % polygon.length];
                
                if (this.linesIntersect(line1Start, line1End, line2Start, line2End)) {
                    return true;
                }
            }
        }
        
        return false;
    },

    linesIntersect(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        
        if (denominator === 0) return false; // Líneas paralelas
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    },

    // ================================
    // UTILIDADES DE DISTRIBUCIÓN
    // ================================

    suggestTreeDistribution(area, treeRadius) {
        // Sugerir distribución óptima de árboles basada en el área
        if (!area || !treeRadius) return null;
        
        const treeArea = Math.PI * treeRadius * treeRadius;
        const maxTrees = Math.floor(area * 0.7 / treeArea); // 70% de cobertura máxima
        const optimalSpacing = treeRadius * 2.5; // Espaciado recomendado
        
        return {
            maxTrees: maxTrees,
            optimalSpacing: optimalSpacing,
            coverage: (maxTrees * treeArea / area * 100).toFixed(1)
        };
    },

    generateGridPoints(polygon, spacing) {
        // Generar puntos en grid dentro del polígono
        const bounds = this.getPolygonBounds(polygon);
        if (!bounds) return [];
        
        const points = [];
        for (let x = bounds.minX; x <= bounds.maxX; x += spacing) {
            for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
                const point = { x, y };
                if (this.isPointInPolygon(point, polygon)) {
                    points.push(point);
                }
            }
        }
        
        return points;
    },

    generateRandomPoints(polygon, count) {
        // Generar puntos aleatorios dentro del polígono
        const bounds = this.getPolygonBounds(polygon);
        if (!bounds) return [];
        
        const points = [];
        let attempts = 0;
        const maxAttempts = count * 10;
        
        while (points.length < count && attempts < maxAttempts) {
            const point = {
                x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
                y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
            };
            
            if (this.isPointInPolygon(point, polygon)) {
                points.push(point);
            }
            
            attempts++;
        }
        
        return points;
    },

    // ================================
    // GESTIÓN DE UI
    // ================================

    updatePolygonInfo(area) {
        const polygonAreaElement = document.getElementById('polygonArea');
        const polygonInfoElement = document.getElementById('polygonInfo');
        
        if (polygonAreaElement && polygonInfoElement) {
            polygonAreaElement.textContent = area.toLocaleString('es-ES');
            polygonInfoElement.style.display = 'block';
        }
    },

    hidePolygonInfo() {
        const polygonInfoElement = document.getElementById('polygonInfo');
        if (polygonInfoElement) {
            polygonInfoElement.style.display = 'none';
        }
    },

    // ================================
    // EXPORTACIÓN Y ANÁLISIS
    // ================================

    getPolygonAnalysis() {
        if (StateManager.polygon.length < 3) {
            return {
                hasPolygon: false,
                message: 'No hay área delimitada'
            };
        }
        
        const area = StateManager.scale ? this.calculatePolygonArea(StateManager.polygon, StateManager.scale) : 0;
        const perimeter = StateManager.scale ? this.getPolygonPerimeter(StateManager.polygon, StateManager.scale) : 0;
        const center = this.getPolygonCenter(StateManager.polygon);
        const bounds = this.getPolygonBounds(StateManager.polygon);
        const validation = this.validatePolygon(StateManager.polygon);
        const isIntersecting = this.isPolygonSelfIntersecting(StateManager.polygon);
        
        return {
            hasPolygon: true,
            points: StateManager.polygon.length,
            area: area,
            perimeter: perimeter.toFixed(1),
            center: center,
            bounds: bounds,
            validation: validation,
            isIntersecting: isIntersecting,
            areaInHectares: (area / 10000).toFixed(4)
        };
    },

    getTreesInPolygon() {
        if (StateManager.polygon.length < 3) return [];
        
        return StateManager.trees.filter(tree => 
            this.isPointInPolygon({ x: tree.x, y: tree.y }, StateManager.polygon)
        );
    },

    getTreesOutsidePolygon() {
        if (StateManager.polygon.length < 3) return StateManager.trees;
        
        return StateManager.trees.filter(tree => 
            !this.isPointInPolygon({ x: tree.x, y: tree.y }, StateManager.polygon)
        );
    },

    // ================================
    // HERRAMIENTAS AVANZADAS
    // ================================

    simplifyPolygon(tolerance = 5) {
        // Simplificar polígono eliminando puntos redundantes
        if (StateManager.polygon.length <= 3) return;
        
        const simplified = [StateManager.polygon[0]];
        
        for (let i = 1; i < StateManager.polygon.length - 1; i++) {
            const prev = StateManager.polygon[i - 1];
            const current = StateManager.polygon[i];
            const next = StateManager.polygon[i + 1];
            
            // Calcular distancia del punto actual a la línea entre anterior y siguiente
            const distance = this.pointToLineDistance(current, prev, next);
            
            if (distance > tolerance) {
                simplified.push(current);
            }
        }
        
        simplified.push(StateManager.polygon[StateManager.polygon.length - 1]);
        
        if (simplified.length >= 3) {
            StateManager.polygon = simplified;
            CanvasEngine.render();
            
            if (StateManager.scale) {
                const area = this.calculatePolygonArea(StateManager.polygon, StateManager.scale);
                this.updatePolygonInfo(area);
            }
            
            toastManager.success('Polígono Simplificado', `Reducido a ${simplified.length} puntos`);
        }
    },

    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = lineStart.x + param * C;
        const yy = lineStart.y + param * D;
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function startPolygon() {
    AreaDelimitation.startPolygon();
}

function clearPolygon() {
    AreaDelimitation.clearPolygon();
}

function calculatePolygonArea(points, scale) {
    return AreaDelimitation.calculatePolygonArea(points, scale);
}
