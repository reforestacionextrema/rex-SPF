 // ================================
// TREE PLANTING - Plantación y Gestión de Árboles
// ================================

const TreePlanting = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    // Configuración de plantación
    autoSpacing: false,
    minSpacingDistance: 5, // metros
    maxTreesPerHectare: 500,
    
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
        return true;
    },

    setupTreeInteractions() {
        // Los eventos de drag & drop se configuran en EventHandler
        // Aquí podríamos agregar configuraciones adicionales si fuera necesario
    },

    // ================================
    // PLANTACIÓN DE ÁRBOLES
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
        
        // Feedback opcional para plantación individual
        if (StateManager.trees.length % 10 === 0) {
            toastManager.info('Progreso', `${StateManager.trees.length} árboles plantados`);
        }
        
        return tree;
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
        
        // Validar espaciado mínimo si está activado
        if (this.autoSpacing && StateManager.scale) {
            const tooClose = this.checkMinimumSpacing(x, y, type);
            if (tooClose) {
                toastManager.warning('Muy Cerca', 
                    `Mantén al menos ${this.minSpacingDistance}m de distancia entre árboles`);
                return false;
            }
        }
        
        return true;
    },

    checkMinimumSpacing(x, y, type) {
        const minPixelDistance = this.minSpacingDistance / StateManager.scale;
        const currentTreeRadius = (this.treeConfig[type].diameter / 2) / StateManager.scale;
        
        for (let existingTree of StateManager.trees) {
            const distance = Math.sqrt(
                Math.pow(x - existingTree.x, 2) + Math.pow(y - existingTree.y, 2)
            );
            
            const existingTreeRadius = (existingTree.config.diameter / 2) / StateManager.scale;
            const minimumDistance = Math.max(minPixelDistance, currentTreeRadius + existingTreeRadius);
            
            if (distance < minimumDistance) {
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
    // PATRONES DE PLANTACIÓN
    // ================================

    plantPattern(patternType, area, treeType, spacing) {
        if (!StateManager.scale) {
            toastManager.error('Escala Requerida', 'Define la escala antes de usar patrones de plantación');
            return;
        }
        
        if (!area || area.length < 3) {
            toastManager.error('Área Requerida', 'Define un área antes de plantar en patrón');
            return;
        }
        
        const points = this.generatePatternPoints(patternType, area, spacing);
        const plantedbefore = StateManager.trees.length;
        
        // Guardar estado para undo
        StateManager.saveUndoState(StateManager.ACTION_TYPES.ADD_TREE, { 
            pattern: patternType, 
            count: points.length 
        });
        
        points.forEach(point => {
            if (AreaDelimitation.isPointInPolygon(point, area)) {
                const tree = this.createTree(treeType, point.x, point.y);
                StateManager.trees.push(tree);
            }
        });
        
        const plantedCount = StateManager.trees.length - plantedbefore;
        
        this.updateTreeCount();
        CanvasEngine.render();
        
        // Actualizar leyenda si está visible
        const legend = document.getElementById('colorLegend');
        if (legend && !legend.classList.contains('collapsed')) {
            Legend.updateDynamicLegend();
        }
        
        toastManager.success('Patrón Plantado', 
            `${plantedCount} árboles plantados en patrón ${this.plantingPatterns[patternType]}`);
    },

    generatePatternPoints(patternType, area, spacing) {
        const bounds = AreaDelimitation.getPolygonBounds(area);
        if (!bounds) return [];
        
        const spacingPixels = spacing / StateManager.scale;
        const points = [];
        
        switch (patternType) {
            case 'grid':
                points.push(...this.generateGridPattern(bounds, spacingPixels));
                break;
            case 'staggered':
                points.push(...this.generateStaggeredPattern(bounds, spacingPixels));
                break;
            case 'random':
                points.push(...this.generateRandomPattern(bounds, area, spacingPixels));
                break;
            case 'cluster':
                points.push(...this.generateClusterPattern(bounds, area, spacingPixels));
                break;
            case 'natural':
                points.push(...this.generateNaturalPattern(bounds, area, spacingPixels));
                break;
        }
        
        return points;
    },

    generateGridPattern(bounds, spacing) {
        const points = [];
        for (let x = bounds.minX; x <= bounds.maxX; x += spacing) {
            for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
                points.push({ x, y });
            }
        }
        return points;
    },

    generateStaggeredPattern(bounds, spacing) {
        const points = [];
        let rowOffset = 0;
        for (let y = bounds.minY; y <= bounds.maxY; y += spacing * 0.866) { // 0.866 ≈ sin(60°)
            for (let x = bounds.minX + rowOffset; x <= bounds.maxX; x += spacing) {
                points.push({ x, y });
            }
            rowOffset = rowOffset === 0 ? spacing / 2 : 0; // Alternar offset
        }
        return points;
    },

    generateRandomPattern(bounds, area, minSpacing) {
        const points = [];
        const maxAttempts = 1000;
        const targetDensity = 100; // puntos objetivo
        
        for (let i = 0; i < maxAttempts && points.length < targetDensity; i++) {
            const point = {
                x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
                y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
            };
            
            // Verificar espaciado mínimo
            const tooClose = points.some(existing => {
                const distance = Math.sqrt(
                    Math.pow(point.x - existing.x, 2) + Math.pow(point.y - existing.y, 2)
                );
                return distance < minSpacing;
            });
            
            if (!tooClose) {
                points.push(point);
            }
        }
        
        return points;
    },

    generateClusterPattern(bounds, area, spacing) {
        const points = [];
        const clusterCount = 5;
        const treesPerCluster = 8;
        
        // Generar centros de clusters
        for (let c = 0; c < clusterCount; c++) {
            const centerX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const centerY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            
            // Generar árboles alrededor del centro
            for (let t = 0; t < treesPerCluster; t++) {
                const angle = (t / treesPerCluster) * 2 * Math.PI;
                const radius = spacing * (0.5 + Math.random() * 1.5);
                
                points.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
        }
        
        return points;
    },

    generateNaturalPattern(bounds, area, minSpacing) {
        // Patrón que simula crecimiento natural con variaciones
        const points = [];
        const seeds = 3; // Puntos semilla
        
        // Generar puntos semilla
        for (let s = 0; s < seeds; s++) {
            const seedX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const seedY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            points.push({ x: seedX, y: seedY });
            
            // Generar "descendientes" alrededor de cada semilla
            this.generateNaturalCluster(points, seedX, seedY, minSpacing, 15);
        }
        
        return points;
    },

    generateNaturalCluster(points, centerX, centerY, minSpacing, count) {
        for (let i = 0; i < count; i++) {
            const attempts = 20;
            
            for (let attempt = 0; attempt < attempts; attempt++) {
                // Distribución con sesgo hacia el centro
                const distance = Math.random() * minSpacing * 3;
                const angle = Math.random() * 2 * Math.PI;
                
                const point = {
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance
                };
                
                // Verificar espaciado
                const tooClose = points.some(existing => {
                    const dist = Math.sqrt(
                        Math.pow(point.x - existing.x, 2) + Math.pow(point.y - existing.y, 2)
                    );
                    return dist < minSpacing;
                });
                
                if (!tooClose) {
                    points.push(point);
                    break;
                }
            }
        }
    },

    // ================================
    // ANÁLISIS Y ESTADÍSTICAS
    // ================================

    getTreeAnalysis() {
        if (StateManager.trees.length === 0) {
            return {
                hasTrees: false,
                message: 'No hay árboles plantados'
            };
        }
        
        const analysis = {
            hasTrees: true,
            total: StateManager.trees.length,
            byCategory: this.getTreesByCategory(),
            byDiameter: this.getTreesByDiameter(),
            spacing: this.analyzeSpacing(),
            distribution: this.analyzeDistribution(),
            health: this.analyzeHealth(),
            coverage: this.calculateCoverage(),
            density: this.calculateDensity()
        };
        
        return analysis;
    },

    getTreesByCategory() {
        const categories = {};
        StateManager.trees.forEach(tree => {
            const category = tree.config.category;
            categories[category] = (categories[category] || 0) + 1;
        });
        return categories;
    },

    getTreesByDiameter() {
        const diameters = {};
        StateManager.trees.forEach(tree => {
            const diameter = tree.config.diameter;
            diameters[diameter] = (diameters[diameter] || 0) + 1;
        });
        return diameters;
    },

    analyzeSpacing() {
        if (StateManager.trees.length < 2 || !StateManager.scale) {
            return { average: 0, min: 0, max: 0, unit: 'metros' };
        }
        
        const distances = [];
        
        for (let i = 0; i < StateManager.trees.length - 1; i++) {
            for (let j = i + 1; j < StateManager.trees.length; j++) {
                const pixelDistance = Math.sqrt(
                    Math.pow(StateManager.trees[j].x - StateManager.trees[i].x, 2) + 
                    Math.pow(StateManager.trees[j].y - StateManager.trees[i].y, 2)
                );
                distances.push(pixelDistance * StateManager.scale);
            }
        }
        
        return {
            average: (distances.reduce((sum, d) => sum + d, 0) / distances.length).toFixed(1),
            min: Math.min(...distances).toFixed(1),
            max: Math.max(...distances).toFixed(1),
            unit: 'metros'
        };
    },

    analyzeDistribution() {
        if (StateManager.trees.length < 4) {
            return { uniformity: 50, description: 'Insuficientes datos' };
        }
        
        // Análisis de cuadrantes para uniformidad
        const bounds = this.getTreeBounds();
        if (!bounds) return { uniformity: 0, description: 'Sin distribución' };
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const quadrants = [0, 0, 0, 0]; // NW, NE, SW, SE
        
        StateManager.trees.forEach(tree => {
            if (tree.x < centerX && tree.y < centerY) quadrants[0]++;
            else if (tree.x >= centerX && tree.y < centerY) quadrants[1]++;
            else if (tree.x < centerX && tree.y >= centerY) quadrants[2]++;
            else quadrants[3]++;
        });
        
        // Calcular uniformidad
        const expected = StateManager.trees.length / 4;
        const variance = quadrants.reduce((sum, count) => sum + Math.pow(count - expected, 2), 0) / 4;
        const uniformity = Math.max(0, 100 - (Math.sqrt(variance) / expected) * 100);
        
        let description = 'Muy uniforme';
        if (uniformity < 70) description = 'Moderadamente uniforme';
        if (uniformity < 40) description = 'Poco uniforme';
        if (uniformity < 20) description = 'Muy desigual';
        
        return {
            uniformity: uniformity.toFixed(1),
            description: description
        };
    },

    analyzeHealth() {
        if (StateManager.trees.length === 0) return { average: 0, healthy: 0, total: 0 };
        
        const totalHealth = StateManager.trees.reduce((sum, tree) => sum + (tree.health || 1), 0);
        const averageHealth = totalHealth / StateManager.trees.length;
        const healthyTrees = StateManager.trees.filter(tree => (tree.health || 1) > 0.8).length;
        
        return {
            average: (averageHealth * 100).toFixed(1),
            healthy: healthyTrees,
            total: StateManager.trees.length,
            percentage: ((healthyTrees / StateManager.trees.length) * 100).toFixed(1)
        };
    },

    calculateCoverage() {
        if (StateManager.trees.length === 0) return 0;
        
        let totalCoverage = 0;
        StateManager.trees.forEach(tree => {
            const radius = tree.config.diameter / 2;
            totalCoverage += Math.PI * radius * radius;
        });
        
        return totalCoverage.toFixed(1);
    },

    calculateDensity() {
        if (StateManager.trees.length === 0 || StateManager.polygon.length < 3 || !StateManager.scale) {
            return { value: 0, unit: 'árboles/ha', description: 'No calculable' };
        }
        
        const area = StateManager.getPolygonArea() / 10000; // Convertir a hectáreas
        const density = StateManager.trees.length / area;
        
        let description = 'Adecuada';
        if (density < 50) description = 'Baja';
        else if (density > 300) description = 'Alta';
        else if (density > 200) description = 'Moderada-Alta';
        
        return {
            value: density.toFixed(1),
            unit: 'árboles/ha',
            description: description
        };
    },

    getTreeBounds() {
        if (StateManager.trees.length === 0) return null;
        
        let minX = StateManager.trees[0].x, maxX = StateManager.trees[0].x;
        let minY = StateManager.trees[0].y, maxY = StateManager.trees[0].y;
        
        StateManager.trees.forEach(tree => {
            minX = Math.min(minX, tree.x);
            maxX = Math.max(maxX, tree.x);
            minY = Math.min(minY, tree.y);
            maxY = Math.max(maxY, tree.y);
        });
        
        return { minX, maxX, minY, maxY };
    },

    // ================================
    // HERRAMIENTAS DE OPTIMIZACIÓN
    // ================================

    optimizeSpacing() {
        if (StateManager.trees.length < 2 || !StateManager.scale) {
            toastManager.warning('Insuficientes Datos', 'Se necesitan al menos 2 árboles y escala definida');
            return;
        }
        
        const conflicts = this.findSpacingConflicts();
        if (conflicts.length === 0) {
            toastManager.success('Espaciado Óptimo', 'No se encontraron conflictos de espaciado');
            return;
        }
        
        // Resolver conflictos moviendo árboles ligeramente
        let resolved = 0;
        conflicts.forEach(conflict => {
            if (this.resolveSpacingConflict(conflict.tree1, conflict.tree2)) {
                resolved++;
            }
        });
        
        if (resolved > 0) {
            CanvasEngine.render();
            toastManager.success('Espaciado Optimizado', 
                `${resolved} conflictos de espaciado resueltos`);
        } else {
            toastManager.warning('Optimización Limitada', 
                'No se pudieron resolver automáticamente todos los conflictos');
        }
    },

    findSpacingConflicts() {
        const conflicts = [];
        const minDistance = this.minSpacingDistance / StateManager.scale;
        
        for (let i = 0; i < StateManager.trees.length - 1; i++) {
            for (let j = i + 1; j < StateManager.trees.length; j++) {
                const tree1 = StateManager.trees[i];
                const tree2 = StateManager.trees[j];
                
                const distance = Math.sqrt(
                    Math.pow(tree2.x - tree1.x, 2) + Math.pow(tree2.y - tree1.y, 2)
                );
                
                const requiredDistance = Math.max(minDistance, 
                    (tree1.config.diameter + tree2.config.diameter) / 2 / StateManager.scale);
                
                if (distance < requiredDistance) {
                    conflicts.push({
                        tree1: tree1,
                        tree2: tree2,
                        currentDistance: distance,
                        requiredDistance: requiredDistance
                    });
                }
            }
        }
        
        return conflicts;
    },

    resolveSpacingConflict(tree1, tree2) {
        // Intentar mover el árbol más reciente (mayor ID)
        const treeToMove = tree1.id > tree2.id ? tree1 : tree2;
        const staticTree = tree1.id > tree2.id ? tree2 : tree1;
        
        // Calcular nueva posición
        const angle = Math.atan2(treeToMove.y - staticTree.y, treeToMove.x - staticTree.x);
        const requiredDistance = (treeToMove.config.diameter + staticTree.config.diameter) / 2 / StateManager.scale + 1;
        
        const newX = staticTree.x + Math.cos(angle) * requiredDistance;
        const newY = staticTree.y + Math.sin(angle) * requiredDistance;
        
        // Verificar que la nueva posición sea válida
        if (this.validatePlantingPosition(newX, newY, treeToMove.type)) {
            treeToMove.x = newX;
            treeToMove.y = newY;
            return true;
        }
        
        return false;
    },

    // ================================
    // FUNCIONES DE DIBUJO
    // ================================

    drawTrees(ctx, zoom, scale, layerVisibility, selectedTree) {
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

    // ================================
    // GESTIÓN DE UI
    // ================================

    updateTreeCount() {
        const count = StateManager.trees.length;
        const treeCountElement = document.getElementById('treeCount');
        if (treeCountElement) {
            treeCountElement.textContent = `Árboles: ${count}`;
        }
    },

    // ================================
    // HERRAMIENTAS DE GESTIÓN
    // ================================

    bulkDeleteTrees(criteria) {
        const treesToDelete = StateManager.trees.filter(criteria);
        
        if (treesToDelete.length === 0) {
            toastManager.warning('Sin Coincidencias', 'No se encontraron árboles que coincidan con los criterios');
            return;
        }
        
        if (confirm(`¿Eliminar ${treesToDelete.length} árboles?`)) {
            StateManager.trees = StateManager.trees.filter(tree => !criteria(tree));
            
            this.updateTreeCount();
            CanvasEngine.render();
            
            toastManager.success('Árboles Eliminados', `${treesToDelete.length} árboles eliminados`);
        }
    },

    bulkUpdateTrees(criteria, updates) {
        const treesToUpdate = StateManager.trees.filter(criteria);
        
        if (treesToUpdate.length === 0) {
            toastManager.warning('Sin Coincidencias', 'No se encontraron árboles para actualizar');
            return;
        }
        
        treesToUpdate.forEach(tree => {
            Object.assign(tree, updates);
        });
        
        CanvasEngine.render();
        toastManager.success('Árboles Actualizados', `${treesToUpdate.length} árboles actualizados`);
    },

    // ================================
    // CONFIGURACIÓN DE ESPACIADO AUTOMÁTICO
    // ================================

    toggleAutoSpacing() {
        this.autoSpacing = !this.autoSpacing;
        
        const message = this.autoSpacing ? 
            'Espaciado automático activado' : 
            'Espaciado automático desactivado';
        
        toastManager.info('Espaciado Automático', message);
        
        return this.autoSpacing;
    },

    setMinimumSpacing(distance) {
        if (distance > 0 && distance <= 50) {
            this.minSpacingDistance = distance;
            toastManager.success('Espaciado Configurado', 
                `Distancia mínima establecida en ${distance} metros`);
        } else {
            toastManager.error('Distancia Inválida', 
                'La distancia debe estar entre 0.1 y 50 metros');
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
