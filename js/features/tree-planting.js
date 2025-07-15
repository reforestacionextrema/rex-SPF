// ================================
// TREE PLANTING - Plantación y Gestión de Árboles (DISTANCIA BORDE A BORDE)
// ================================

const TreePlanting = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    // Configuración de plantación
    autoSpacing: false,
    minSpacingDistance: 5, // metros
    maxTreesPerHectare: 500,
    
    // Nueva configuración para líneas de distancia
    showDistanceLines: true,
    maxDistanceLineRange: 8, // metros - máximo para mostrar líneas
    distanceLineStyle: {
        color: '#66bb6a',
        width: 1,
        opacity: 0.7,
        dashPattern: [5, 3]
    },
    
    // Patrones de plantación
    plantingPatterns: {
        grid: 'Patrón en Cuadrícula',
        staggered: 'Patrón Escalonado',
        random: 'Distribución Aleatoria',
        cluster: 'Agrupaciones',
        natural: 'Distribución Natural'
    },
    
    // Configuración de tipos de árboles (heredada de StateManager)
    treeConfig: null,

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.treeConfig = StateManager.treeConfig;
        this.setupTreeInteractions();
        this.addDistanceLinesUI();
        return true;
    },

    setupTreeInteractions() {
        // Los eventos de drag & drop se configuran en EventHandler
        // Aquí podríamos agregar configuraciones adicionales si fuera necesario
    },

    addDistanceLinesUI() {
        // Agregar control de líneas de distancia al UI
        const visualLayersSection = document.querySelector('.section h3');
        if (visualLayersSection && visualLayersSection.textContent.includes('👁️ Capas Visuales')) {
            const section = visualLayersSection.parentElement;
            
            // Crear toggle para líneas de distancia
            const distanceToggle = document.createElement('div');
            distanceToggle.className = 'toggle-container';
            distanceToggle.innerHTML = `
                <label class="toggle">
                    <input type="checkbox" id="showDistanceLines" ${this.showDistanceLines ? 'checked' : ''} onchange="TreePlanting.toggleDistanceLines()">
                    <span class="slider"></span>
                </label>
                <span class="toggle-label">Distancias entre árboles (≤${this.maxDistanceLineRange}m)</span>
            `;
            
            section.appendChild(distanceToggle);
        }
    },

    // ================================
    // GESTIÓN DE LÍNEAS DE DISTANCIA
    // ================================

    toggleDistanceLines() {
        const checkbox = document.getElementById('showDistanceLines');
        if (checkbox) {
            this.showDistanceLines = checkbox.checked;
            CanvasEngine.render();
            
            const message = this.showDistanceLines ? 
                'Líneas de distancia entre todos los árboles activadas' : 
                'Líneas de distancia desactivadas';
            
            toastManager.info('Líneas de Distancia', message);
        }
    },

    setMaxDistanceRange(range) {
        if (range > 0 && range <= 30) {
            this.maxDistanceLineRange = range;
            
            // Actualizar UI label si existe
            const distanceLabel = Array.from(document.querySelectorAll('.toggle-label'))
                .find(el => el.textContent.includes('Distancias entre árboles'));
            
            if (distanceLabel) {
                distanceLabel.textContent = `Distancias entre árboles (≤${range}m)`;
            }
            
            CanvasEngine.render();
            toastManager.success('Rango Actualizado', `Rango máximo establecido en ${range} metros`);
        } else {
            toastManager.error('Rango Inválido', 'El rango debe estar entre 1 y 30 metros');
        }
    },

    calculateTreeDistances() {
        if (!StateManager.scale || StateManager.trees.length < 2) {
            return [];
        }

        const distances = [];
        // Usar TODOS los árboles
        const allTrees = StateManager.trees;
        
        for (let i = 0; i < allTrees.length - 1; i++) {
            for (let j = i + 1; j < allTrees.length; j++) {
                const tree1 = allTrees[i];
                const tree2 = allTrees[j];
                
                // Calcular distancia centro a centro en píxeles
                const centerToCenter = Math.sqrt(
                    Math.pow(tree2.x - tree1.x, 2) + 
                    Math.pow(tree2.y - tree1.y, 2)
                );
                
                // Convertir a metros (centro a centro)
                const realDistance = centerToCenter * StateManager.scale;
                
                // Solo incluir si está dentro del rango máximo
                if (realDistance <= this.maxDistanceLineRange && realDistance > 0) {
                    distances.push({
                        tree1: tree1,
                        tree2: tree2,
                        centerToCenter: centerToCenter,
                        realDistance: realDistance,
                        midPoint: {
                            x: (tree1.x + tree2.x) / 2,
                            y: (tree1.y + tree2.y) / 2
                        }
                    });
                }
            }
        }
        
        return distances;
    },

    // ================================
    // PLANTACIÓN DE ÁRBOLES (ACTUALIZADO)
    // ================================

    addTree(type, x, y) {
        if (!this.validateTreeType(type)) {
            toastManager.error('Tipo Inválido', 'Tipo de árbol no reconocido');
            return null;
        }
        
        if (!this.validatePlantingPosition(x, y, type)) {
            return null;
        }
        
        // Guardar estado para undo antes de hacer cambios
        StateManager.saveUndoState(StateManager.ACTION_TYPES.ADD_TREE, { type, x, y });
        
        const tree = this.createTree(type, x, y);
        StateManager.trees.push(tree);
        
        this.updateTreeCount();
        CanvasEngine.render();
        
        // Actualizar leyenda si está visible
        const legend = document.getElementById('colorLegend');
        if (legend && !legend.classList.contains('collapsed')) {
            Legend.updateDynamicLegend();
        }
        
        // Mostrar información de distancia para cualquier árbol (nuevo o existente)
        if (this.showDistanceLines && StateManager.scale) {
            this.checkNewTreeDistances(tree);
        }
        
        // Feedback opcional para plantación individual
        if (StateManager.trees.length % 10 === 0) {
            toastManager.info('Progreso', `${StateManager.trees.length} árboles plantados`);
        }
        
        return tree;
    },

    checkNewTreeDistances(newTree) {
        const distances = this.calculateTreeDistances();
        const treeDistances = distances.filter(d => 
            d.tree1.id === newTree.id || d.tree2.id === newTree.id
        );
        
        if (treeDistances.length > 0) {
            const closestDistance = Math.min(...treeDistances.map(d => d.realDistance));
            
            // Clasificar la distancia
            let statusMessage = '';
            let toastType = 'info';
            
            if (closestDistance < 3) {
                statusMessage = `¡Muy cerca! Distancia centro a centro: ${closestDistance.toFixed(1)}m`;
                toastType = 'warning';
            } else if (closestDistance < 5) {
                statusMessage = `Cerca. Distancia centro a centro: ${closestDistance.toFixed(1)}m`;
                toastType = 'warning';
            } else {
                statusMessage = `Distancia centro a centro: ${closestDistance.toFixed(1)}m`;
                toastType = 'info';
            }
            
            if (toastType === 'warning') {
                toastManager.warning('Espaciado', statusMessage, { duration: 3000 });
            } else {
                toastManager.info('Distancia', statusMessage, { duration: 2000 });
            }
        }
    },

    createTree(type, x, y) {
        return {
            id: Date.now() + Math.random(),
            type: type,
            config: this.treeConfig[type],
            x: x,
            y: y,
            plantedDate: new Date().toISOString(),
            growth: 0, // Factor de crecimiento (0-1)
            health: 1, // Estado de salud (0-1)
            notes: ''
        };
    },

    validateTreeType(type) {
        return this.treeConfig && this.treeConfig.hasOwnProperty(type);
    },

    validatePlantingPosition(x, y, type) {
        // Validar que la posición esté dentro de la imagen
        if (StateManager.backgroundImage) {
            if (x < 0 || x > StateManager.backgroundImage.width || 
                y < 0 || y > StateManager.backgroundImage.height) {
                toastManager.warning('Posición Inválida', 'El árbol debe estar dentro de la imagen');
                return false;
            }
        }
        
        // Validar espaciado mínimo si está activado (usando distancia centro a centro)
        if (this.autoSpacing && StateManager.scale) {
            const tooClose = this.checkMinimumSpacing(x, y, type);
            if (tooClose) {
                toastManager.warning('Muy Cerca', 
                    `Mantén al menos ${this.minSpacingDistance}m de distancia centro a centro entre árboles`);
                return false;
            }
        }
        
        return true;
    },

    checkMinimumSpacing(x, y, type) {
        const minPixelDistance = this.minSpacingDistance / StateManager.scale;
        
        for (let existingTree of StateManager.trees) {
            const centerDistance = Math.sqrt(
                Math.pow(x - existingTree.x, 2) + Math.pow(y - existingTree.y, 2)
            );
            
            // Usar distancia centro a centro
            if (centerDistance < minPixelDistance) {
                return true; // Demasiado cerca
            }
        }
        
        return false; // Espaciado adecuado
    },

    // ================================
    // DETECCIÓN Y SELECCIÓN
    // ================================

    getTreeAt(x, y) {
        for (let i = StateManager.trees.length - 1; i >= 0; i--) {
            const tree = StateManager.trees[i];
            const distance = Math.sqrt(Math.pow(x - tree.x, 2) + Math.pow(y - tree.y, 2));
            const radius = StateManager.scale ? 
                (tree.config.diameter / 2) / StateManager.scale : 
                tree.config.diameter * 10;
            
            if (distance <= radius) {
                return tree;
            }
        }
        return null;
    },

    selectTree(tree) {
        StateManager.selectedTree = tree;
        CanvasEngine.render();
    },

    clearSelection() {
        StateManager.selectedTree = null;
        CanvasEngine.render();
    },

    // ================================
    // FUNCIONES DE DIBUJO (ACTUALIZADO)
    // ================================

    drawTrees(ctx, zoom, scale, layerVisibility, selectedTree) {
        // Primero dibujar las líneas de distancia (debajo de los árboles)
        if (this.showDistanceLines && scale) {
            this.drawDistanceLines(ctx, zoom, scale);
        }
        
        // Luego dibujar los árboles
        StateManager.trees.forEach(tree => {
            const radius = scale ? (tree.config.diameter / 2) / scale : tree.config.diameter * 10;
            const isSelected = selectedTree === tree;
            
            // Definir colores más oscuros para el punto central
            const centerColor = tree.config.category === 'nuevo' ? '#2e7d32' : '#1565c0';
            
            // Dibujar círculo de crecimiento
            if (layerVisibility.growthCircles) {
                ctx.strokeStyle = isSelected ? '#ff0000' : tree.config.color;
                ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
                ctx.fillStyle = tree.config.color + '20';
                
                ctx.beginPath();
                ctx.arc(tree.x, tree.y, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
            
            // Dibujar centro del árbol con color más oscuro
            ctx.fillStyle = isSelected ? '#ff0000' : centerColor;
            ctx.beginPath();
            ctx.arc(tree.x, tree.y, 4 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Dibujar etiqueta con solo el tamaño
            if (layerVisibility.treeLabels) {
                ctx.fillStyle = '#000000';
                ctx.font = `${12 / zoom}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(`${tree.config.diameter}m`, tree.x, tree.y - radius - 8 / zoom);
            }
            
            // Indicador de salud si no está al 100%
            if (tree.health && tree.health < 1) {
                const healthColor = tree.health > 0.7 ? '#ffeb3b' : tree.health > 0.4 ? '#ff9800' : '#f44336';
                ctx.fillStyle = healthColor;
                ctx.beginPath();
                ctx.arc(tree.x + radius * 0.7, tree.y - radius * 0.7, 3 / zoom, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    },

    drawDistanceLines(ctx, zoom, scale) {
        const distances = this.calculateTreeDistances();
        
        if (distances.length === 0) return;
        
        ctx.save();
        
        // Configurar estilo de línea
        ctx.strokeStyle = this.distanceLineStyle.color;
        ctx.lineWidth = this.distanceLineStyle.width / zoom;
        ctx.globalAlpha = this.distanceLineStyle.opacity;
        ctx.setLineDash(this.distanceLineStyle.dashPattern.map(d => d / zoom));
        
        // Configurar estilo de texto
        ctx.fillStyle = this.distanceLineStyle.color;
        ctx.font = `bold ${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        distances.forEach(distanceInfo => {
            // Dibujar línea de centro a centro
            ctx.beginPath();
            ctx.moveTo(distanceInfo.tree1.x, distanceInfo.tree1.y);
            ctx.lineTo(distanceInfo.tree2.x, distanceInfo.tree2.y);
            ctx.stroke();
            
            // Dibujar pequeños círculos en los centros para mayor claridad
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = this.distanceLineStyle.color;
            
            ctx.beginPath();
            ctx.arc(distanceInfo.tree1.x, distanceInfo.tree1.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(distanceInfo.tree2.x, distanceInfo.tree2.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Dibujar etiqueta de distancia en el punto medio
            ctx.globalAlpha = this.distanceLineStyle.opacity;
            const distanceText = `${distanceInfo.realDistance.toFixed(1)}m`;
            const textWidth = ctx.measureText(distanceText).width;
            const padding = 2 / zoom;
            
            // Fondo para el texto
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(
                distanceInfo.midPoint.x - textWidth/2 - padding, 
                distanceInfo.midPoint.y - 5/zoom - padding, 
                textWidth + padding*2, 
                10/zoom + padding*2
            );
            
            // Borde del fondo
            ctx.strokeStyle = this.distanceLineStyle.color;
            ctx.lineWidth = 0.5 / zoom;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(
                distanceInfo.midPoint.x - textWidth/2 - padding, 
                distanceInfo.midPoint.y - 5/zoom - padding, 
                textWidth + padding*2, 
                10/zoom + padding*2
            );
            
            // Texto de distancia
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.distanceLineStyle.color;
            ctx.fillText(distanceText, distanceInfo.midPoint.x, distanceInfo.midPoint.y);
        });
        
        ctx.restore();
    },

    // ================================
    // CONFIGURACIÓN Y HERRAMIENTAS
    // ================================

    setDistanceLineStyle(style) {
        this.distanceLineStyle = { ...this.distanceLineStyle, ...style };
        CanvasEngine.render();
    },

    showDistanceConfiguration() {
        // Mostrar modal de configuración de líneas de distancia
        if (typeof Modals !== 'undefined') {
            const config = {
                title: '📏 Configuración de Distancias Entre Árboles',
                content: `
                    <div style="display: grid; gap: 16px;">
                        <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
                            <h4 style="margin: 0 0 8px 0; color: #2e7d32;">ℹ️ Medición Centro a Centro</h4>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">
                                Las distancias se miden entre <strong>todos los árboles</strong> (nuevos y existentes), 
                                desde el centro de un árbol hasta el centro del otro. 
                                Esto da la distancia de separación entre troncos.
                            </p>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Rango Máximo (metros):</label>
                            <input type="number" id="maxDistanceRange" value="${this.maxDistanceLineRange}" 
                                   min="1" max="20" step="0.5"
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Color de Líneas:</label>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="color" id="lineColor" value="${this.distanceLineStyle.color}" 
                                       style="width: 50px; height: 35px; padding: 2px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;">
                                <div style="width: 30px; height: 20px; background-color: ${this.distanceLineStyle.color}; border: 1px solid #ccc; border-radius: 4px;"></div>
                                <span style="font-size: 0.9rem; color: #666;">${this.distanceLineStyle.color}</span>
                            </div>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Opacidad:</label>
                            <input type="range" id="lineOpacity" value="${this.distanceLineStyle.opacity * 100}" 
                                   min="10" max="100" step="10"
                                   style="width: 100%;">
                            <span id="opacityValue" style="font-size: 0.9rem; color: #666;">${Math.round(this.distanceLineStyle.opacity * 100)}%</span>
                        </div>
                        
                        <div>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="showDistanceLinesModal" ${this.showDistanceLines ? 'checked' : ''}>
                                <span>Mostrar líneas de distancia entre todos los árboles</span>
                            </label>
                        </div>
                    </div>
                `,
                width: '450px',
                maxWidth: '90vw',
                animation: 'slideIn',
                backdrop: false, // Deshabilitar el fondo oscuro
                keyboard: true,
                buttons: [
                    {
                        text: 'Cancelar',
                        type: 'secondary'
                    },
                    {
                        text: 'Aplicar',
                        type: 'primary',
                        handler: () => {
                            const maxRange = parseFloat(document.getElementById('maxDistanceRange').value);
                            const color = document.getElementById('lineColor').value;
                            const opacity = parseFloat(document.getElementById('lineOpacity').value) / 100;
                            const showLines = document.getElementById('showDistanceLinesModal').checked;
                            
                            this.setMaxDistanceRange(maxRange);
                            this.setDistanceLineStyle({ color, opacity });
                            this.showDistanceLines = showLines;
                            
                            // Actualizar checkbox en la UI principal
                            const mainCheckbox = document.getElementById('showDistanceLines');
                            if (mainCheckbox) mainCheckbox.checked = showLines;
                            
                            CanvasEngine.render();
                            toastManager.success('Configuración Aplicada', 'Líneas de distancia entre árboles actualizadas');
                            return true;
                        }
                    }
                ]
            };
            
            const modalId = Modals.createDynamicModal(config);
            
            // Configurar actualizadores en tiempo real
            setTimeout(() => {
                const opacitySlider = document.getElementById('lineOpacity');
                const opacityValue = document.getElementById('opacityValue');
                const colorInput = document.getElementById('lineColor');
                const colorPreview = document.querySelector('div[style*="background-color"]');
                const colorText = document.querySelector('span[style*="color: #666"]');
                
                if (opacitySlider && opacityValue) {
                    opacitySlider.addEventListener('input', () => {
                        opacityValue.textContent = `${opacitySlider.value}%`;
                    });
                }
                
                if (colorInput && colorPreview && colorText) {
                    colorInput.addEventListener('input', () => {
                        const newColor = colorInput.value;
                        colorPreview.style.backgroundColor = newColor;
                        colorText.textContent = newColor;
                    });
                }
            }, 100);
        }
    },

    // ================================
    // ANÁLISIS DE DISTANCIAS
    // ================================

    getDistanceAnalysis() {
        if (!StateManager.scale) {
            return {
                hasDistances: false,
                message: 'Escala no definida'
            };
        }
        
        const distances = this.calculateTreeDistances();
        
        if (distances.length === 0) {
            return {
                hasDistances: false,
                message: 'No hay árboles suficientes o están fuera del rango'
            };
        }
        
        const distanceValues = distances.map(d => d.realDistance);
        const avgDistance = distanceValues.reduce((sum, d) => sum + d, 0) / distanceValues.length;
        const minDistance = Math.min(...distanceValues);
        const maxDistance = Math.max(...distanceValues);
        
        // Clasificar distancias centro a centro entre todos los árboles
        const veryClose = distanceValues.filter(d => d < 3).length;
        const close = distanceValues.filter(d => d >= 3 && d < 6).length;
        const moderate = distanceValues.filter(d => d >= 6 && d < 10).length;
        const far = distanceValues.filter(d => d >= 10).length;
        
        return {
            hasDistances: true,
            total: distances.length,
            average: avgDistance.toFixed(1),
            min: minDistance.toFixed(1),
            max: maxDistance.toFixed(1),
            distribution: {
                veryClose: veryClose,
                close: close,
                moderate: moderate,
                far: far
            },
            recommendation: this.getSpacingRecommendation(avgDistance, minDistance)
        };
    },

    getSpacingRecommendation(avgDistance, minDistance) {
        if (minDistance < 2) {
            return 'Algunos árboles están muy cercanos. Las copas podrían superponerse al crecer.';
        } else if (minDistance < 4) {
            return 'Árboles cercanos. Bueno para jardines densos, pero vigila el crecimiento.';
        } else if (avgDistance < 6) {
            return 'Espaciado compacto. Apropiado para áreas urbanas o jardines densos.';
        } else if (avgDistance < 10) {
            return 'Espaciado óptimo para la mayoría de especies. Permite buen desarrollo.';
        } else {
            return 'Espaciado amplio. Ideal para árboles de gran crecimiento y desarrollo completo.';
        }
    },

    // ================================
    // RESTO DE MÉTODOS ORIGINALES
    // ================================
    
    updateTreeCount() {
        const count = StateManager.trees.length;
        const treeCountElement = document.getElementById('treeCount');
        if (treeCountElement) {
            treeCountElement.textContent = `Árboles: ${count}`;
        }
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function addTree(type, x, y) {
    return TreePlanting.addTree(type, x, y);
}

function getTreeAt(x, y) {
    return TreePlanting.getTreeAt(x, y);
}

function updateTreeCount() {
    TreePlanting.updateTreeCount();
}

function toggleDistanceLines() {
    TreePlanting.toggleDistanceLines();
}

function showDistanceConfiguration() {
    TreePlanting.showDistanceConfiguration();
}