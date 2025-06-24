 
// ================================
// REPORTING - Sistema de Reportes y Análisis
// ================================

const Reporting = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    reportTemplates: {
        basic: 'Reporte Básico',
        detailed: 'Reporte Detallado',
        environmental: 'Análisis Ambiental',
        technical: 'Reporte Técnico'
    },

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        return true;
    },

    // ================================
    // GENERACIÓN DE REPORTES PRINCIPALES
    // ================================

    generateReport() {
        if (!this.hasDataForReport()) {
            toastManager.warning('Sin Datos', 'No hay suficientes datos para generar un reporte');
            return;
        }
        
        const reportData = this.collectReportData();
        const reportHTML = this.buildReportHTML(reportData);
        this.displayReport(reportHTML);
        
        toastManager.success('Reporte Generado', 'El análisis del proyecto está listo');
    },

    hasDataForReport() {
        return StateManager.trees.length > 0 || 
               StateManager.pipelines.length > 0 || 
               StateManager.polygon.length > 0;
    },

    collectReportData() {
        return {
            general: this.getGeneralInfo(),
            area: this.getAreaAnalysis(),
            trees: this.getTreeAnalysis(),
            infrastructure: this.getInfrastructureAnalysis(),
            environmental: this.getEnvironmentalAnalysis(),
            recommendations: this.getRecommendations()
        };
    },

    // ================================
    // ANÁLISIS GENERAL
    // ================================

    getGeneralInfo() {
        return {
            projectName: StateManager.projectName,
            reportDate: new Date().toLocaleDateString('es-ES'),
            hasScale: StateManager.scale !== null,
            scaleValue: StateManager.scale ? `1 píxel = ${StateManager.scale.toFixed(4)} metros` : 'No definida',
            hasImage: StateManager.backgroundImage !== null,
            imageInfo: StateManager.backgroundImage ? 
                `${StateManager.backgroundImage.width}x${StateManager.backgroundImage.height}px` : 'Sin imagen'
        };
    },

    // ================================
    // ANÁLISIS DE ÁREA
    // ================================

    getAreaAnalysis() {
        if (StateManager.polygon.length < 3) {
            return {
                hasArea: false,
                message: 'No hay área delimitada'
            };
        }
        
        const area = StateManager.scale ? StateManager.getPolygonArea() : 0;
        const perimeter = StateManager.scale ? this.calculatePerimeter() : 0;
        
        return {
            hasArea: true,
            points: StateManager.polygon.length,
            area: area,
            areaFormatted: area.toLocaleString('es-ES'),
            areaHectares: (area / 10000).toFixed(4),
            perimeter: perimeter.toFixed(1),
            density: StateManager.trees.length > 0 && area > 0 ? 
                (StateManager.trees.length / (area / 10000)).toFixed(1) : 0,
            efficiency: this.calculateAreaEfficiency()
        };
    },

    calculatePerimeter() {
        if (StateManager.polygon.length < 2 || !StateManager.scale) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < StateManager.polygon.length; i++) {
            const j = (i + 1) % StateManager.polygon.length;
            const pixelLength = Math.sqrt(
                Math.pow(StateManager.polygon[j].x - StateManager.polygon[i].x, 2) + 
                Math.pow(StateManager.polygon[j].y - StateManager.polygon[i].y, 2)
            );
            perimeter += pixelLength * StateManager.scale;
        }
        
        return perimeter;
    },

    calculateAreaEfficiency() {
        // Calcular eficiencia de uso del área basada en distribución de árboles
        if (StateManager.trees.length === 0 || StateManager.polygon.length < 3) return 0;
        
        const treesInside = StateManager.trees.filter(tree => 
            AreaDelimitation.isPointInPolygon({ x: tree.x, y: tree.y }, StateManager.polygon)
        );
        
        return ((treesInside.length / StateManager.trees.length) * 100).toFixed(1);
    },

    // ================================
    // ANÁLISIS DE ÁRBOLES
    // ================================

    getTreeAnalysis() {
        if (StateManager.trees.length === 0) {
            return {
                hasTrees: false,
                message: 'No hay árboles plantados'
            };
        }
        
        const treesByCategory = {};
        const treesByDiameter = {};
        let totalCoverage = 0;
        
        StateManager.trees.forEach(tree => {
            const category = tree.config.category;
            const diameter = tree.config.diameter;
            
            treesByCategory[category] = (treesByCategory[category] || 0) + 1;
            treesByDiameter[diameter] = (treesByDiameter[diameter] || 0) + 1;
            
            // Calcular cobertura aproximada
            const treeArea = Math.PI * Math.pow(diameter / 2, 2);
            totalCoverage += treeArea;
        });
        
        return {
            hasTrees: true,
            total: StateManager.trees.length,
            byCategory: treesByCategory,
            byDiameter: treesByDiameter,
            totalCoverage: totalCoverage.toFixed(1),
            averageDiameter: this.calculateAverageTreeDiameter(),
            distribution: this.analyzeTreeDistribution(),
            spacing: this.analyzeTreeSpacing()
        };
    },

    calculateAverageTreeDiameter() {
        if (StateManager.trees.length === 0) return 0;
        
        const totalDiameter = StateManager.trees.reduce((sum, tree) => 
            sum + tree.config.diameter, 0);
        
        return (totalDiameter / StateManager.trees.length).toFixed(1);
    },

    analyzeTreeDistribution() {
        if (StateManager.trees.length < 2) return 'Insuficientes datos';
        
        // Analizar distribución espacial básica
        const distances = [];
        for (let i = 0; i < StateManager.trees.length - 1; i++) {
            for (let j = i + 1; j < StateManager.trees.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(StateManager.trees[j].x - StateManager.trees[i].x, 2) + 
                    Math.pow(StateManager.trees[j].y - StateManager.trees[i].y, 2)
                );
                distances.push(distance);
            }
        }
        
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        
        if (StateManager.scale) {
            const realDistance = avgDistance * StateManager.scale;
            return `Distancia promedio: ${realDistance.toFixed(1)}m`;
        }
        
        return `Distancia promedio: ${avgDistance.toFixed(1)} píxeles`;
    },

    analyzeTreeSpacing() {
        if (StateManager.trees.length < 2) return 'Insuficientes datos';
        
        let minDistance = Infinity;
        let maxDistance = 0;
        
        for (let i = 0; i < StateManager.trees.length - 1; i++) {
            for (let j = i + 1; j < StateManager.trees.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(StateManager.trees[j].x - StateManager.trees[i].x, 2) + 
                    Math.pow(StateManager.trees[j].y - StateManager.trees[i].y, 2)
                );
                minDistance = Math.min(minDistance, distance);
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        
        if (StateManager.scale) {
            return {
                min: (minDistance * StateManager.scale).toFixed(1),
                max: (maxDistance * StateManager.scale).toFixed(1),
                unit: 'metros'
            };
        }
        
        return {
            min: minDistance.toFixed(1),
            max: maxDistance.toFixed(1),
            unit: 'píxeles'
        };
    },

    // ================================
    // ANÁLISIS DE INFRAESTRUCTURA
    // ================================

    getInfrastructureAnalysis() {
        if (StateManager.pipelines.length === 0) {
            return {
                hasInfrastructure: false,
                message: 'No hay infraestructura mapeada'
            };
        }
        
        const pipelinesByType = {};
        let totalLength = 0;
        
        StateManager.pipelines.forEach(pipeline => {
            const type = pipeline.type;
            pipelinesByType[type] = (pipelinesByType[type] || 0) + 1;
            
            // Calcular longitud si hay escala
            if (StateManager.scale && pipeline.points.length > 1) {
                for (let i = 0; i < pipeline.points.length - 1; i++) {
                    const start = pipeline.points[i];
                    const end = pipeline.points[i + 1];
                    const pixelLength = Math.sqrt(
                        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                    );
                    totalLength += pixelLength * StateManager.scale;
                }
            }
        });
        
        return {
            hasInfrastructure: true,
            total: StateManager.pipelines.length,
            byType: pipelinesByType,
            totalLength: totalLength.toFixed(1),
            complexity: this.calculateInfrastructureComplexity(),
            coverage: this.calculateInfrastructureCoverage()
        };
    },

    calculateInfrastructureComplexity() {
        // Calcular complejidad basada en número de puntos y tipos
        const totalPoints = StateManager.pipelines.reduce((sum, pipeline) => 
            sum + pipeline.points.length, 0);
        const uniqueTypes = new Set(StateManager.pipelines.map(p => p.type)).size;
        
        if (totalPoints < 10 && uniqueTypes <= 1) return 'Baja';
        if (totalPoints < 25 && uniqueTypes <= 2) return 'Media';
        return 'Alta';
    },

    calculateInfrastructureCoverage() {
        // Calcular qué porcentaje del área está cubierto por infraestructura
        if (StateManager.polygon.length < 3 || StateManager.pipelines.length === 0) return 0;
        
        // Simplificación: contar cuántos puntos de tubería están dentro del polígono
        let pointsInside = 0;
        let totalPoints = 0;
        
        StateManager.pipelines.forEach(pipeline => {
            pipeline.points.forEach(point => {
                totalPoints++;
                if (AreaDelimitation.isPointInPolygon(point, StateManager.polygon)) {
                    pointsInside++;
                }
            });
        });
        
        return totalPoints > 0 ? ((pointsInside / totalPoints) * 100).toFixed(1) : 0;
    },

    // ================================
    // ANÁLISIS AMBIENTAL
    // ================================

    getEnvironmentalAnalysis() {
        const analysis = {
            carbonCapture: this.calculateCarbonCapture(),
            biodiversity: this.calculateBiodiversityIndex(),
            sustainability: this.calculateSustainabilityScore(),
            impact: this.calculateEnvironmentalImpact()
        };
        
        return analysis;
    },

    calculateCarbonCapture() {
        // Estimación de captura de carbono basada en tipos y tamaños de árboles
        if (StateManager.trees.length === 0) return 0;
        
        let totalCapture = 0;
        StateManager.trees.forEach(tree => {
            // Fórmula simplificada: captura aumenta con el diámetro
            const baseCapture = tree.config.category === 'nuevo' ? 15 : 25; // kg CO2/año
            const sizeMultiplier = tree.config.diameter / 5; // Factor por tamaño
            totalCapture += baseCapture * sizeMultiplier;
        });
        
        return {
            annual: totalCapture.toFixed(1),
            perTree: (totalCapture / StateManager.trees.length).toFixed(1),
            lifetime: (totalCapture * 30).toFixed(1) // 30 años estimados
        };
    },

    calculateBiodiversityIndex() {
        // Índice de biodiversidad basado en variedad de especies y distribución
        if (StateManager.trees.length === 0) return 0;
        
        const speciesCount = new Set(StateManager.trees.map(tree => tree.type)).size;
        const maxPossibleSpecies = Object.keys(StateManager.treeConfig).length;
        const varietyScore = (speciesCount / maxPossibleSpecies) * 100;
        
        // Factor de distribución espacial
        const distributionScore = this.calculateDistributionUniformity();
        
        return {
            variety: varietyScore.toFixed(1),
            distribution: distributionScore,
            overall: ((varietyScore + distributionScore) / 2).toFixed(1)
        };
    },

    calculateDistributionUniformity() {
        // Calcular uniformidad de distribución espacial
        if (StateManager.trees.length < 4) return 50; // Valor neutral para pocos árboles
        
        // Análisis simplificado de cuadrantes
        const bounds = this.getTreeBounds();
        if (!bounds) return 50;
        
        const quadrants = [0, 0, 0, 0]; // NW, NE, SW, SE
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        StateManager.trees.forEach(tree => {
            if (tree.x < centerX && tree.y < centerY) quadrants[0]++;
            else if (tree.x >= centerX && tree.y < centerY) quadrants[1]++;
            else if (tree.x < centerX && tree.y >= centerY) quadrants[2]++;
            else quadrants[3]++;
        });
        
        // Calcular desviación estándar de distribución
        const mean = StateManager.trees.length / 4;
        const variance = quadrants.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 4;
        const uniformity = Math.max(0, 100 - (Math.sqrt(variance) / mean) * 100);
        
        return uniformity.toFixed(1);
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

    calculateSustainabilityScore() {
        let score = 0;
        let factors = 0;
        
        // Factor 1: Relación nuevos vs existentes
        const newTrees = StateManager.trees.filter(t => t.config.category === 'nuevo').length;
        const existingTrees = StateManager.trees.filter(t => t.config.category === 'existente').length;
        
        if (StateManager.trees.length > 0) {
            const ratio = newTrees / StateManager.trees.length;
            score += ratio > 0.7 ? 90 : ratio > 0.5 ? 70 : ratio > 0.3 ? 50 : 30;
            factors++;
        }
        
        // Factor 2: Densidad apropiada
        if (StateManager.polygon.length >= 3 && StateManager.scale) {
            const area = StateManager.getPolygonArea();
            const density = StateManager.trees.length / (area / 10000); // árboles por hectárea
            score += density > 100 && density < 300 ? 80 : density > 50 && density < 500 ? 60 : 40;
            factors++;
        }
        
        // Factor 3: Infraestructura planificada
        if (StateManager.pipelines.length > 0) {
            score += 75; // Bonus por planificación de infraestructura
            factors++;
        }
        
        return factors > 0 ? (score / factors).toFixed(1) : 0;
    },

    calculateEnvironmentalImpact() {
        return {
            positive: [
                'Captura de carbono atmosférico',
                'Mejora de la calidad del aire',
                'Creación de hábitat para fauna',
                'Reducción de erosión del suelo',
                'Regulación del ciclo hidrológico'
            ],
            considerations: [
                'Mantenimiento y riego inicial',
                'Planificación de infraestructura',
                'Monitoreo de crecimiento',
                'Gestión de plagas y enfermedades'
            ]
        };
    },

    // ================================
    // RECOMENDACIONES
    // ================================

    getRecommendations() {
        const recommendations = [];
        
        // Recomendaciones basadas en densidad
        if (StateManager.trees.length > 0 && StateManager.polygon.length >= 3 && StateManager.scale) {
            const area = StateManager.getPolygonArea();
            const density = StateManager.trees.length / (area / 10000);
            
            if (density < 50) {
                recommendations.push({
                    type: 'warning',
                    title: 'Densidad Baja',
                    message: 'Considere aumentar la densidad de plantación para optimizar el uso del espacio.'
                });
            } else if (density > 400) {
                recommendations.push({
                    type: 'warning',
                    title: 'Densidad Alta',
                    message: 'La densidad puede ser demasiado alta, considere reducir para evitar competencia.'
                });
            }
        }
        
        // Recomendaciones basadas en diversidad
        const species = new Set(StateManager.trees.map(tree => tree.type)).size;
        if (species < 3 && StateManager.trees.length > 10) {
            recommendations.push({
                type: 'info',
                title: 'Diversidad de Especies',
                message: 'Considere agregar más variedad de especies para mejorar la biodiversidad.'
            });
        }
        
        // Recomendaciones de escala
        if (!StateManager.scale) {
            recommendations.push({
                type: 'error',
                title: 'Escala Requerida',
                message: 'Defina la escala del proyecto para obtener mediciones precisas.'
            });
        }
        
        // Recomendaciones de infraestructura
        if (StateManager.trees.length > 20 && StateManager.pipelines.length === 0) {
            recommendations.push({
                type: 'info',
                title: 'Infraestructura de Riego',
                message: 'Considere planificar infraestructura de riego para el mantenimiento de los árboles.'
            });
        }
        
        return recommendations;
    },

    // ================================
    // CONSTRUCCIÓN DE REPORTE HTML
    // ================================

    buildReportHTML(data) {
        let html = '';
        
        // Información general
        html += this.buildGeneralSection(data.general);
        
        // Análisis de área
        if (data.area.hasArea) {
            html += this.buildAreaSection(data.area);
        }
        
        // Análisis de árboles
        if (data.trees.hasTrees) {
            html += this.buildTreeSection(data.trees);
        }
        
        // Análisis de infraestructura
        if (data.infrastructure.hasInfrastructure) {
            html += this.buildInfrastructureSection(data.infrastructure);
        }
        
        // Análisis ambiental
        html += this.buildEnvironmentalSection(data.environmental);
        
        // Recomendaciones
        if (data.recommendations.length > 0) {
            html += this.buildRecommendationsSection(data.recommendations);
        }
        
        return html;
    },

    buildGeneralSection(general) {
        return `
            <div class="report-section">
                <h4>📋 Información General</h4>
                <p><strong>Nombre del Proyecto:</strong> ${general.projectName}</p>
                <p><strong>Fecha del Reporte:</strong> ${general.reportDate}</p>
                <p><strong>Escala Definida:</strong> ${general.scaleValue}</p>
                <p><strong>Imagen de Fondo:</strong> ${general.hasImage ? `Sí (${general.imageInfo})` : 'No'}</p>
            </div>
        `;
    },

    buildAreaSection(area) {
        return `
            <div class="report-section">
                <h4>🗺️ Área del Proyecto</h4>
                <p><strong>Puntos del Perímetro:</strong> ${area.points}</p>
                <p><strong>Área Total:</strong> ${area.areaFormatted} m² (${area.areaHectares} hectáreas)</p>
                <p><strong>Perímetro:</strong> ${area.perimeter} metros</p>
                <p><strong>Densidad de Plantación:</strong> ${area.density} árboles/hectárea</p>
                <p><strong>Eficiencia de Uso:</strong> ${area.efficiency}% del área utilizada</p>
            </div>
        `;
    },

    buildTreeSection(trees) {
        let html = `
            <div class="report-section">
                <h4>🌳 Análisis de Vegetación</h4>
                <p><strong>Total de Árboles:</strong> ${trees.total}</p>
                <p><strong>Diámetro Promedio:</strong> ${trees.averageDiameter}m</p>
                <p><strong>Cobertura Total Estimada:</strong> ${trees.totalCoverage} m²</p>
                <p><strong>Distribución Espacial:</strong> ${trees.distribution}</p>
                
                <h5>Por Categoría:</h5>
        `;
        
        Object.entries(trees.byCategory).forEach(([category, count]) => {
            const percentage = ((count / trees.total) * 100).toFixed(1);
            const categoryName = category === 'nuevo' ? 'Nuevos (Plantación)' : 'Existentes';
            html += `<p>• ${categoryName}: ${count} árboles (${percentage}%)</p>`;
        });
        
        html += '<h5>Por Diámetro de Copa:</h5>';
        Object.entries(trees.byDiameter)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([diameter, count]) => {
                const percentage = ((count / trees.total) * 100).toFixed(1);
                html += `<p>• ${diameter}m de diámetro: ${count} árboles (${percentage}%)</p>`;
            });
        
        html += '</div>';
        return html;
    },

    buildInfrastructureSection(infrastructure) {
        let html = `
            <div class="report-section">
                <h4>🔧 Infraestructura</h4>
                <p><strong>Total de Líneas:</strong> ${infrastructure.total}</p>
                <p><strong>Longitud Total:</strong> ${infrastructure.totalLength} metros</p>
                <p><strong>Complejidad:</strong> ${infrastructure.complexity}</p>
                <p><strong>Cobertura del Área:</strong> ${infrastructure.coverage}%</p>
                
                <h5>Por Tipo:</h5>
        `;
        
        const typeNames = {
            gas: 'Tuberías de Gas',
            agua: 'Tuberías de Agua',
            electrica: 'Redes Eléctricas'
        };
        
        Object.entries(infrastructure.byType).forEach(([type, count]) => {
            html += `<p>• ${typeNames[type]}: ${count} líneas</p>`;
        });
        
        html += '</div>';
        return html;
    },

    buildEnvironmentalSection(environmental) {
        return `
            <div class="report-section">
                <h4>🌍 Análisis Ambiental</h4>
                
                <h5>Captura de Carbono:</h5>
                <p>• Anual: ${environmental.carbonCapture.annual} kg CO₂</p>
                <p>• Por árbol: ${environmental.carbonCapture.perTree} kg CO₂/año</p>
                <p>• Proyección 30 años: ${environmental.carbonCapture.lifetime} kg CO₂</p>
                
                <h5>Índice de Biodiversidad:</h5>
                <p>• Variedad de especies: ${environmental.biodiversity.variety}%</p>
                <p>• Distribución espacial: ${environmental.biodiversity.distribution}%</p>
                <p>• Puntuación general: ${environmental.biodiversity.overall}%</p>
                
                <h5>Puntuación de Sostenibilidad:</h5>
                <p>${environmental.sustainability}/100 puntos</p>
            </div>
        `;
    },

    buildRecommendationsSection(recommendations) {
        let html = `
            <div class="report-section">
                <h4>💡 Recomendaciones</h4>
        `;
        
        recommendations.forEach(rec => {
            const alertClass = rec.type === 'error' ? 'alert-warning' : 
                              rec.type === 'warning' ? 'alert-warning' : 'alert-success';
            html += `
                <div class="alert ${alertClass}">
                    <strong>${rec.title}:</strong> ${rec.message}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    },

    // ================================
    // VISUALIZACIÓN DE REPORTES
    // ================================

    displayReport(reportHTML) {
        const modal = document.getElementById('reportModal');
        const content = document.getElementById('reportContent');
        
        if (content) {
            content.innerHTML = reportHTML;
        }
        
        if (modal) {
            modal.style.display = 'block';
        }
    },

    // ================================
    // EXPORTACIÓN DE REPORTES
    // ================================

    exportReportToPNG() {
        this.generateReport();
        
        setTimeout(() => {
            const modal = document.getElementById('reportModal');
            const content = document.getElementById('reportContent');
            
            if (!content || !content.innerHTML.trim()) {
                toastManager.error('Sin Reporte', 'Primero genera un reporte');
                return;
            }
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 800;
            canvas.height = 1000;
            
            // Fondo blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Título
            ctx.fillStyle = '#1b5e20';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Reporte de Reforestación', canvas.width / 2, 40);
            
            this.drawReportContent(ctx, canvas);
            
            // Exportar
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${ProjectManagement.sanitizeFileName(StateManager.projectName)}_reporte_${ProjectManagement.getDateString()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toastManager.success('Reporte Exportado', 'El reporte se exportó como imagen PNG');
            });
        }, 100);
    },

    drawReportContent(ctx, canvas) {
        // Información básica
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333';
        
        let y = 80;
        const lineHeight = 25;
        const leftMargin = 50;
        
        // Información del proyecto
        ctx.fillText(`Proyecto: ${StateManager.projectName}`, leftMargin, y);
        y += lineHeight;
        ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, leftMargin, y);
        y += lineHeight * 2;
        
        // Estadísticas principales
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Estadísticas Principales:', leftMargin, y);
        y += lineHeight * 1.5;
        
        ctx.font = '14px Arial';
        ctx.fillText(`Total de Árboles: ${StateManager.trees.length}`, leftMargin, y);
        y += lineHeight;
        ctx.fillText(`Infraestructura: ${StateManager.pipelines.length} líneas`, leftMargin, y);
        y += lineHeight;
        
        if (StateManager.polygon.length > 0 && StateManager.scale) {
            const area = StateManager.getPolygonArea();
            ctx.fillText(`Área: ${area.toLocaleString('es-ES')} m²`, leftMargin, y);
            y += lineHeight;
        }
        
        // Análisis ambiental
        y += lineHeight;
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Impacto Ambiental:', leftMargin, y);
        y += lineHeight * 1.5;
        
        ctx.font = '14px Arial';
        const environmental = this.getEnvironmentalAnalysis();
        ctx.fillText(`Captura de CO₂: ${environmental.carbonCapture.annual} kg/año`, leftMargin, y);
        y += lineHeight;
        ctx.fillText(`Biodiversidad: ${environmental.biodiversity.overall}%`, leftMargin, y);
        y += lineHeight;
        ctx.fillText(`Sostenibilidad: ${environmental.sustainability}/100`, leftMargin, y);
        
        // Pie de página
        y = canvas.height - 40;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.fillText('Generado por el Sistema de Planeación de Reforestaciones', canvas.width / 2, y);
    },

    // ================================
    // EXPORTACIÓN AVANZADA
    // ================================

    exportDetailedReport() {
        const reportData = this.collectReportData();
        const detailedData = {
            ...reportData,
            technical: this.getTechnicalAnalysis(),
            financial: this.getFinancialEstimate(),
            timeline: this.getProjectTimeline()
        };
        
        const csvContent = this.generateCSVReport(detailedData);
        this.downloadCSV(csvContent, 'reporte_detallado');
        
        toastManager.success('Reporte Detallado', 'Reporte exportado en formato CSV');
    },

    generateCSVReport(data) {
        let csv = 'Categoría,Subcategoría,Valor,Unidad,Descripción\n';
        
        // Información general
        csv += `General,Nombre del Proyecto,"${data.general.projectName}",,\n`;
        csv += `General,Fecha del Reporte,${data.general.reportDate},,\n`;
        csv += `General,Tiene Escala,${data.general.hasScale ? 'Sí' : 'No'},,\n`;
        
        // Área
        if (data.area.hasArea) {
            csv += `Área,Superficie,${data.area.area},m²,\n`;
            csv += `Área,Superficie en Hectáreas,${data.area.areaHectares},ha,\n`;
            csv += `Área,Perímetro,${data.area.perimeter},m,\n`;
            csv += `Área,Densidad,${data.area.density},árboles/ha,\n`;
        }
        
        // Árboles
        if (data.trees.hasTrees) {
            csv += `Árboles,Total,${data.trees.total},unidades,\n`;
            csv += `Árboles,Diámetro Promedio,${data.trees.averageDiameter},m,\n`;
            csv += `Árboles,Cobertura Total,${data.trees.totalCoverage},m²,\n`;
            
            Object.entries(data.trees.byCategory).forEach(([category, count]) => {
                const categoryName = category === 'nuevo' ? 'Nuevos' : 'Existentes';
                csv += `Árboles,${categoryName},${count},unidades,\n`;
            });
        }
        
        // Infraestructura
        if (data.infrastructure.hasInfrastructure) {
            csv += `Infraestructura,Total de Líneas,${data.infrastructure.total},unidades,\n`;
            csv += `Infraestructura,Longitud Total,${data.infrastructure.totalLength},m,\n`;
            
            Object.entries(data.infrastructure.byType).forEach(([type, count]) => {
                csv += `Infraestructura,${type},${count},líneas,\n`;
            });
        }
        
        // Ambiental
        csv += `Ambiental,Captura CO₂ Anual,${data.environmental.carbonCapture.annual},kg,\n`;
        csv += `Ambiental,Biodiversidad,${data.environmental.biodiversity.overall},%,\n`;
        csv += `Ambiental,Sostenibilidad,${data.environmental.sustainability},puntos,\n`;
        
        return csv;
    },

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${ProjectManagement.getDateString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ================================
    // ANÁLISIS TÉCNICO AVANZADO
    // ================================

    getTechnicalAnalysis() {
        return {
            soilRequirements: this.analyzeSoilRequirements(),
            waterNeeds: this.calculateWaterNeeds(),
            maintenanceSchedule: this.generateMaintenanceSchedule(),
            growthProjections: this.calculateGrowthProjections()
        };
    },

    analyzeSoilRequirements() {
        const treeTypes = new Set(StateManager.trees.map(tree => tree.type));
        const requirements = [];
        
        if (treeTypes.size > 0) {
            requirements.push('Suelo bien drenado con pH 6.0-7.5');
            requirements.push('Profundidad mínima de 1.5 metros');
            requirements.push('Contenido orgánico del 3-5%');
        }
        
        return requirements;
    },

    calculateWaterNeeds() {
        if (StateManager.trees.length === 0) return 0;
        
        // Estimación simplificada: 50L/árbol/semana durante el primer año
        const weeklyNeeds = StateManager.trees.length * 50;
        const annualNeeds = weeklyNeeds * 52;
        
        return {
            weekly: weeklyNeeds,
            monthly: weeklyNeeds * 4.33,
            annual: annualNeeds,
            unit: 'litros'
        };
    },

    generateMaintenanceSchedule() {
        return [
            { month: 'Enero-Marzo', activity: 'Poda de formación y riego moderado' },
            { month: 'Abril-Junio', activity: 'Fertilización y control de plagas' },
            { month: 'Julio-Septiembre', activity: 'Riego intensivo y monitoreo' },
            { month: 'Octubre-Diciembre', activity: 'Preparación para temporada seca' }
        ];
    },

    calculateGrowthProjections() {
        const projections = [];
        const years = [1, 5, 10, 20];
        
        years.forEach(year => {
            const avgDiameter = StateManager.trees.reduce((sum, tree) => 
                sum + tree.config.diameter, 0) / StateManager.trees.length || 0;
            
            // Crecimiento estimado: 10% anual para nuevos, 5% para existentes
            const newTreeGrowth = avgDiameter * Math.pow(1.1, year);
            const existingTreeGrowth = avgDiameter * Math.pow(1.05, year);
            
            projections.push({
                year: year,
                avgDiameterNew: newTreeGrowth.toFixed(1),
                avgDiameterExisting: existingTreeGrowth.toFixed(1),
                coverageIncrease: ((newTreeGrowth / avgDiameter) * 100 - 100).toFixed(1)
            });
        });
        
        return projections;
    },

    // ================================
    // ESTIMACIÓN FINANCIERA
    // ================================

    getFinancialEstimate() {
        const costs = this.calculateProjectCosts();
        const benefits = this.calculateProjectBenefits();
        
        return {
            costs: costs,
            benefits: benefits,
            roi: this.calculateROI(costs, benefits),
            paybackPeriod: this.calculatePaybackPeriod(costs, benefits)
        };
    },

    calculateProjectCosts() {
        const treeCosts = this.calculateTreeCosts();
        const infrastructureCosts = this.calculateInfrastructureCosts();
        const maintenanceCosts = this.calculateMaintenanceCosts();
        
        return {
            trees: treeCosts,
            infrastructure: infrastructureCosts,
            maintenance: maintenanceCosts,
            total: treeCosts + infrastructureCosts + maintenanceCosts
        };
    },

    calculateTreeCosts() {
        // Costos estimados por árbol según categoría
        const costs = {
            nuevo: 150, // Pesos por árbol nuevo
            existente: 50 // Mantenimiento de árbol existente
        };
        
        let totalCost = 0;
        StateManager.trees.forEach(tree => {
            totalCost += costs[tree.config.category] || 100;
        });
        
        return totalCost;
    },

    calculateInfrastructureCosts() {
        // Costo estimado por metro de tubería
        const costs = {
            gas: 500, // Pesos por metro
            agua: 300,
            electrica: 800
        };
        
        let totalCost = 0;
        if (StateManager.scale) {
            StateManager.pipelines.forEach(pipeline => {
                if (pipeline.points.length > 1) {
                    for (let i = 0; i < pipeline.points.length - 1; i++) {
                        const start = pipeline.points[i];
                        const end = pipeline.points[i + 1];
                        const pixelLength = Math.sqrt(
                            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                        );
                        const realLength = pixelLength * StateManager.scale;
                        totalCost += realLength * (costs[pipeline.type] || 400);
                    }
                }
            });
        }
        
        return totalCost;
    },

    calculateMaintenanceCosts() {
        // Costo anual de mantenimiento: 20% del costo inicial
        const treeCosts = this.calculateTreeCosts();
        return treeCosts * 0.2;
    },

    calculateProjectBenefits() {
        const environmental = this.getEnvironmentalAnalysis();
        const carbonValue = parseFloat(environmental.carbonCapture.annual) * 25; // $25 por kg CO₂
        
        return {
            carbonCapture: carbonValue,
            propertyValue: StateManager.trees.length * 500, // Aumento de valor por árbol
            airQuality: StateManager.trees.length * 100, // Beneficio por calidad del aire
            total: carbonValue + (StateManager.trees.length * 600)
        };
    },

    calculateROI(costs, benefits) {
        if (costs.total === 0) return 0;
        return (((benefits.total * 10) - costs.total) / costs.total * 100).toFixed(1); // 10 años
    },

    calculatePaybackPeriod(costs, benefits) {
        if (benefits.total === 0) return 'N/A';
        return (costs.total / benefits.total).toFixed(1);
    },

    // ================================
    // CRONOGRAMA DEL PROYECTO
    // ================================

    getProjectTimeline() {
        const phases = [
            { phase: 'Preparación del Terreno', duration: 2, dependencies: [] },
            { phase: 'Instalación de Infraestructura', duration: 4, dependencies: ['Preparación del Terreno'] },
            { phase: 'Plantación de Árboles', duration: 3, dependencies: ['Preparación del Terreno'] },
            { phase: 'Sistema de Riego', duration: 2, dependencies: ['Instalación de Infraestructura'] },
            { phase: 'Mantenimiento Inicial', duration: 12, dependencies: ['Plantación de Árboles'] }
        ];
        
        return phases;
    },

    // ================================
    // REPORTES COMPARATIVOS
    // ================================

    generateComparisonReport(project1Data, project2Data) {
        // Para futuras implementaciones de comparación entre proyectos
        const comparison = {
            trees: {
                project1: project1Data.trees?.total || 0,
                project2: project2Data.trees?.total || 0
            },
            area: {
                project1: project1Data.area?.area || 0,
                project2: project2Data.area?.area || 0
            },
            sustainability: {
                project1: project1Data.environmental?.sustainability || 0,
                project2: project2Data.environmental?.sustainability || 0
            }
        };
        
        return comparison;
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function generateReport() {
    Reporting.generateReport();
}

function exportReportToPNG() {
    Reporting.exportReportToPNG();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}