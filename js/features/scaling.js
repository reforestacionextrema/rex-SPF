 
// ================================
// SCALING - Sistema de Escalado Manual
// ================================

const Scaling = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    minLineLength: 10, // Píxeles mínimos para una línea de escala válida
    maxScaleValue: 1000, // Metros máximos por línea de referencia
    minScaleValue: 0.001, // Metros mínimos por línea de referencia
    
    // Unidades de medida soportadas
    supportedUnits: {
        'm': { name: 'metros', factor: 1 },
        'km': { name: 'kilómetros', factor: 1000 },
        'cm': { name: 'centímetros', factor: 0.01 },
        'ft': { name: 'pies', factor: 0.3048 },
        'yd': { name: 'yardas', factor: 0.9144 },
        'in': { name: 'pulgadas', factor: 0.0254 }
    },
    
    // Historial de escalas para referencia
    scaleHistory: [],
    maxHistorySize: 10,

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.setupScaleInput();
        return true;
    },

    setupScaleInput() {
        const realLengthInput = document.getElementById('realLength');
        if (realLengthInput) {
            realLengthInput.addEventListener('input', this.validateScaleInput.bind(this));
            realLengthInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.setScale();
                }
            });
        }
    },

    // ================================
    // INICIO DEL PROCESO DE ESCALADO
    // ================================

    startScaling() {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Imagen Requerida', 'Primero carga una imagen satelital');
            return;
        }
        
        StateManager.currentMode = 'scaling';
        StateManager.scaleLine = null;
        this.showScaleInfo();
        CanvasEngine.canvas.style.cursor = 'crosshair';
        
        EventHandler.updateStatus('Modo escalado - Haz clic y arrastra para definir una línea de referencia');
        toastManager.info('Modo Escalado', 'Dibuja una línea sobre una distancia conocida en la imagen');
    },

    // ================================
    // VALIDACIÓN DE ENTRADA
    // ================================

    validateScaleInput(event) {
        const value = parseFloat(event.target.value);
        const input = event.target;
        
        // Limpiar estilos anteriores
        input.classList.remove('error', 'warning', 'success');
        
        if (isNaN(value) || value <= 0) {
            input.classList.add('error');
            this.showInputFeedback('Ingresa un valor numérico positivo', 'error');
        } else if (value < this.minScaleValue) {
            input.classList.add('warning');
            this.showInputFeedback(`Valor muy pequeño (mínimo: ${this.minScaleValue}m)`, 'warning');
        } else if (value > this.maxScaleValue) {
            input.classList.add('warning');
            this.showInputFeedback(`Valor muy grande (máximo: ${this.maxScaleValue}m)`, 'warning');
        } else {
            input.classList.add('success');
            this.showInputFeedback('Valor válido', 'success');
        }
    },

    showInputFeedback(message, type) {
        // Opcional: mostrar feedback visual en tiempo real
        // Por ahora solo cambiamos el color del input
    },

    // ================================
    // CONFIGURACIÓN DE ESCALA
    // ================================

    setScale() {
        const realLengthInput = document.getElementById('realLength');
        const realLength = parseFloat(realLengthInput ? realLengthInput.value : 0);
        
        if (!StateManager.scaleLine) {
            toastManager.error('Línea de Referencia Requerida', 'Primero dibuja una línea de referencia en la imagen');
            return;
        }
        
        if (!this.validateRealLength(realLength)) {
            return;
        }
        
        const pixelLength = this.calculatePixelLength(StateManager.scaleLine);
        
        if (pixelLength < this.minLineLength) {
            toastManager.error('Línea Muy Corta', 
                `Dibuja una línea más larga para mayor precisión (mínimo: ${this.minLineLength} píxeles)`);
            return;
        }
        
        // Calcular escala (metros por píxel)
        const scale = realLength / pixelLength;
        
        // Validar escala resultante
        if (!this.validateScale(scale)) {
            return;
        }
        
        // Aplicar escala
        this.applyScale(scale, realLength, pixelLength);
    },

    validateRealLength(realLength) {
        if (!realLength || realLength <= 0) {
            toastManager.error('Longitud Inválida', 'Ingresa la longitud real de la línea de referencia');
            return false;
        }
        
        if (realLength < this.minScaleValue) {
            toastManager.error('Valor Muy Pequeño', 
                `La longitud debe ser mayor a ${this.minScaleValue} metros`);
            return false;
        }
        
        if (realLength > this.maxScaleValue) {
            toastManager.error('Valor Muy Grande', 
                `La longitud debe ser menor a ${this.maxScaleValue} metros`);
            return false;
        }
        
        return true;
    },

    validateScale(scale) {
        const minScale = this.minScaleValue / 1000; // metros por píxel mínimo
        const maxScale = this.maxScaleValue / 10;   // metros por píxel máximo
        
        if (scale < minScale) {
            toastManager.error('Escala Muy Pequeña', 
                'La escala resultante es demasiado pequeña. Usa una línea más larga o una distancia menor.');
            return false;
        }
        
        if (scale > maxScale) {
            toastManager.error('Escala Muy Grande', 
                'La escala resultante es demasiado grande. Usa una línea más corta o una distancia mayor.');
            return false;
        }
        
        return true;
    },

    calculatePixelLength(scaleLine) {
        return Math.sqrt(
            Math.pow(scaleLine.end.x - scaleLine.start.x, 2) + 
            Math.pow(scaleLine.end.y - scaleLine.start.y, 2)
        );
    },

    // ================================
    // APLICACIÓN DE ESCALA
    // ================================

    applyScale(scale, realLength, pixelLength) {
        // Guardar en el estado
        StateManager.scale = scale;
        
        // Agregar al historial
        this.addToHistory(scale, realLength, pixelLength);
        
        // Actualizar UI
        this.updateScaleDisplay(scale);
        this.hideScaleInfo();
        this.showScaleResult();
        
        // Resetear modo
        this.resetScalingMode();
        
        // Feedback y logging
        this.logScaleInfo(scale, realLength, pixelLength);
        
        CanvasEngine.render();
        EventHandler.updateStatus('Escala definida - Ahora puedes delimitar el área y colocar árboles');
        toastManager.success('Escala Definida', 
            `Escala establecida: 1 píxel = ${scale.toFixed(4)} metros`);
    },

    addToHistory(scale, realLength, pixelLength) {
        const historyEntry = {
            scale: scale,
            realLength: realLength,
            pixelLength: pixelLength,
            timestamp: new Date(),
            precision: this.calculatePrecision(scale, pixelLength)
        };
        
        this.scaleHistory.unshift(historyEntry);
        
        // Mantener tamaño del historial
        if (this.scaleHistory.length > this.maxHistorySize) {
            this.scaleHistory = this.scaleHistory.slice(0, this.maxHistorySize);
        }
    },

    calculatePrecision(scale, pixelLength) {
        // Calcular precisión basada en la longitud de la línea
        if (pixelLength < 50) return 'Baja';
        if (pixelLength < 150) return 'Media';
        return 'Alta';
    },

    logScaleInfo(scale, realLength, pixelLength) {
        console.log('Escala configurada:', {
            scale: scale,
            realLength: realLength,
            pixelLength: pixelLength,
            metersPerPixel: scale,
            pixelsPerMeter: 1 / scale,
            precision: this.calculatePrecision(scale, pixelLength)
        });
    },

    // ================================
    // GESTIÓN DE UI
    // ================================

    updateScaleDisplay(scale) {
        const scaleValueElement = document.getElementById('scaleValue');
        if (scaleValueElement) {
            scaleValueElement.textContent = `1 píxel = ${scale.toFixed(4)} metros`;
        }
    },

    showScaleInfo() {
        const scaleInfoElement = document.getElementById('scaleInfo');
        if (scaleInfoElement) {
            scaleInfoElement.style.display = 'block';
        }
    },

    hideScaleInfo() {
        const scaleInfoElement = document.getElementById('scaleInfo');
        if (scaleInfoElement) {
            scaleInfoElement.style.display = 'none';
        }
    },

    showScaleResult() {
        const scaleResultElement = document.getElementById('scaleResult');
        if (scaleResultElement) {
            scaleResultElement.style.display = 'block';
        }
    },

    hideScaleResult() {
        const scaleResultElement = document.getElementById('scaleResult');
        if (scaleResultElement) {
            scaleResultElement.style.display = 'none';
        }
    },

    resetScalingMode() {
        StateManager.currentMode = 'normal';
        StateManager.scaleLine = null;
        CanvasEngine.canvas.style.cursor = 'grab';
        
        // Limpiar input
        const realLengthInput = document.getElementById('realLength');
        if (realLengthInput) {
            realLengthInput.value = '';
            realLengthInput.classList.remove('error', 'warning', 'success');
        }
    },

    // ================================
    // CONVERSIONES Y UTILIDADES
    // ================================

    convertUnits(value, fromUnit, toUnit) {
        if (!this.supportedUnits[fromUnit] || !this.supportedUnits[toUnit]) {
            throw new Error('Unidad no soportada');
        }
        
        // Convertir a metros primero, luego a la unidad objetivo
        const metersValue = value * this.supportedUnits[fromUnit].factor;
        return metersValue / this.supportedUnits[toUnit].factor;
    },

    pixelsToMeters(pixels) {
        if (!StateManager.scale) {
            throw new Error('Escala no definida');
        }
        return pixels * StateManager.scale;
    },

    metersToPixels(meters) {
        if (!StateManager.scale) {
            throw new Error('Escala no definida');
        }
        return meters / StateManager.scale;
    },

    // ================================
    // ANÁLISIS DE ESCALA
    // ================================

    getScaleInfo() {
        if (!StateManager.scale) {
            return {
                hasScale: false,
                message: 'No hay escala definida'
            };
        }
        
        return {
            hasScale: true,
            scale: StateManager.scale,
            scaleFormatted: `1 píxel = ${StateManager.scale.toFixed(4)} metros`,
            inverseScale: (1 / StateManager.scale).toFixed(2),
            inverseFormatted: `1 metro = ${(1 / StateManager.scale).toFixed(2)} píxeles`,
            precision: this.getCurrentPrecision(),
            recommendation: this.getScaleRecommendation()
        };
    },

    getCurrentPrecision() {
        if (this.scaleHistory.length === 0) return 'Desconocida';
        return this.scaleHistory[0].precision;
    },

    getScaleRecommendation() {
        if (!StateManager.scale) return 'Define una escala primero';
        
        const precision = this.getCurrentPrecision();
        
        switch (precision) {
            case 'Baja':
                return 'Considera redefinir la escala con una línea más larga para mayor precisión';
            case 'Media':
                return 'Precisión aceptable, pero una línea más larga mejoraría la exactitud';
            case 'Alta':
                return 'Excelente precisión de escala';
            default:
                return 'Precisión desconocida';
        }
    },

    // ================================
    // ESCALAS PREDEFINIDAS
    // ================================

    applyPredefinedScale(scaleType) {
        const predefinedScales = {
            satellite_high: 0.5,    // 0.5 metros por píxel (alta resolución)
            satellite_medium: 1.0,  // 1 metro por píxel (resolución media)
            satellite_low: 5.0,     // 5 metros por píxel (baja resolución)
            aerial_high: 0.1,       // 0.1 metros por píxel (foto aérea alta res)
            aerial_medium: 0.3,     // 0.3 metros por píxel (foto aérea media res)
            map_1_1000: 0.264,      // Escala 1:1000 aproximada
            map_1_5000: 1.32,       // Escala 1:5000 aproximada
            map_1_10000: 2.64       // Escala 1:10000 aproximada
        };
        
        const scale = predefinedScales[scaleType];
        if (!scale) {
            toastManager.error('Escala No Encontrada', 'El tipo de escala predefinida no existe');
            return;
        }
        
        // Aplicar escala predefinida
        StateManager.scale = scale;
        this.updateScaleDisplay(scale);
        this.showScaleResult();
        
        // Crear entrada en historial
        this.addToHistory(scale, scale * 100, 100); // Simular línea de 100px
        
        toastManager.success('Escala Predefinida', 
            `Escala ${scaleType} aplicada: ${scale} m/píxel`);
        
        CanvasEngine.render();
    },

    // ================================
    // CALIBRACIÓN AVANZADA
    // ================================

    calibrateWithMultipleReferences(references) {
        // Calibrar escala usando múltiples líneas de referencia
        if (!Array.isArray(references) || references.length < 2) {
            toastManager.error('Referencias Insuficientes', 'Se necesitan al menos 2 referencias');
            return;
        }
        
        const scales = references.map(ref => {
            const pixelLength = this.calculatePixelLength(ref.line);
            return ref.realLength / pixelLength;
        });
        
        // Calcular escala promedio
        const averageScale = scales.reduce((sum, scale) => sum + scale, 0) / scales.length;
        
        // Calcular desviación estándar
        const variance = scales.reduce((sum, scale) => sum + Math.pow(scale - averageScale, 2), 0) / scales.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficient = (standardDeviation / averageScale) * 100;
        
        // Aplicar si la variación es aceptable
        if (coefficient < 10) { // Menos del 10% de variación
            StateManager.scale = averageScale;
            this.updateScaleDisplay(averageScale);
            this.showScaleResult();
            
            toastManager.success('Calibración Múltiple', 
                `Escala calibrada con ${references.length} referencias (variación: ${coefficient.toFixed(1)}%)`);
        } else {
            toastManager.warning('Alta Variación', 
                `La variación entre referencias es alta (${coefficient.toFixed(1)}%). Verifica las medidas.`);
        }
    },

    // ================================
    // EXPORTACIÓN DE DATOS DE ESCALA
    // ================================

    exportScaleData() {
        if (!StateManager.scale) {
            toastManager.warning('Sin Escala', 'No hay datos de escala para exportar');
            return;
        }
        
        const scaleData = {
            currentScale: StateManager.scale,
            scaleInfo: this.getScaleInfo(),
            history: this.scaleHistory,
            metadata: {
                exportDate: new Date().toISOString(),
                projectName: StateManager.projectName,
                imageSize: StateManager.backgroundImage ? 
                    `${StateManager.backgroundImage.width}x${StateManager.backgroundImage.height}` : 'N/A'
            }
        };
        
        const blob = new Blob([JSON.stringify(scaleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `escala_${StateManager.projectName}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toastManager.success('Datos de Escala Exportados', 'Información de escala guardada en archivo JSON');
    },

    // ================================
    // IMPORTACIÓN DE ESCALA
    // ================================

    importScaleData(fileContent) {
        try {
            const scaleData = JSON.parse(fileContent);
            
            if (scaleData.currentScale && typeof scaleData.currentScale === 'number') {
                StateManager.scale = scaleData.currentScale;
                this.updateScaleDisplay(scaleData.currentScale);
                this.showScaleResult();
                
                // Importar historial si existe
                if (Array.isArray(scaleData.history)) {
                    this.scaleHistory = scaleData.history.slice(0, this.maxHistorySize);
                }
                
                toastManager.success('Escala Importada', 
                    `Escala cargada: ${scaleData.currentScale.toFixed(4)} m/píxel`);
                
                CanvasEngine.render();
            } else {
                throw new Error('Datos de escala inválidos');
            }
        } catch (error) {
            toastManager.error('Error de Importación', 'No se pudieron cargar los datos de escala');
        }
    },

    // ================================
    // HERRAMIENTAS DE MEDICIÓN
    // ================================

    measureDistance(point1, point2) {
        if (!StateManager.scale) {
            throw new Error('Escala no definida');
        }
        
        const pixelDistance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
        
        return {
            pixels: pixelDistance,
            meters: pixelDistance * StateManager.scale,
            formatted: `${(pixelDistance * StateManager.scale).toFixed(2)} metros`
        };
    },

    measureArea(polygon) {
        if (!StateManager.scale || !Array.isArray(polygon) || polygon.length < 3) {
            throw new Error('Escala no definida o polígono inválido');
        }
        
        let pixelArea = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            pixelArea += polygon[i].x * polygon[j].y;
            pixelArea -= polygon[j].x * polygon[i].y;
        }
        
        pixelArea = Math.abs(pixelArea) / 2;
        const realArea = pixelArea * StateManager.scale * StateManager.scale;
        
        return {
            pixels: pixelArea,
            squareMeters: realArea,
            hectares: realArea / 10000,
            formatted: `${realArea.toFixed(2)} m² (${(realArea / 10000).toFixed(4)} ha)`
        };
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function startScaling() {
    Scaling.startScaling();
}

function setScale() {
    Scaling.setScale();
}