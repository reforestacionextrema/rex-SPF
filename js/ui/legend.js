 // ================================
// LEGEND - Sistema de Leyenda Dinámica
// ================================

const Legend = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    isVisible: true,
    autoUpdate: true,
    showEmptyCategories: false,
    
    // Configuración de colores y estilos
    colorConfig: {
        trees: {
            nuevo: '#4caf50',
            existente: '#2196f3'
        },
        pipelines: {
            gas: '#ffc107',
            agua: '#2196f3',
            electrica: '#ff5722'
        },
        guidelines: '#9c27b0',
        polygon: '#007bff'
    },
    
    // Nombres legibles para categorías
    categoryNames: {
        trees: {
            nuevo: 'Árboles Nuevos',
            existente: 'Árboles Existentes'
        },
        pipelines: {
            gas: 'Tubería de Gas',
            agua: 'Tubería de Agua',
            electrica: 'Red Eléctrica'
        }
    },

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.setupLegendElements();
        this.updateDynamicLegend();
        return true;
    },

    setupLegendElements() {
        const legendToggle = document.getElementById('legendToggle');
        const legendElement = document.getElementById('colorLegend');
        
        if (legendToggle) {
            legendToggle.addEventListener('click', this.toggleLegend.bind(this));
        }
        
        // Configurar estado inicial
        if (legendElement) {
            this.isVisible = !legendElement.classList.contains('collapsed');
        }
    },

    // ================================
    // TOGGLE Y VISIBILIDAD
    // ================================

    toggleLegend() {
        const legend = document.getElementById('colorLegend');
        const toggle = document.getElementById('legendToggle');
        const showLegendCheckbox = document.getElementById('showLegend');
        
        if (!legend || !toggle) return;
        
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            legend.classList.remove('collapsed');
            toggle.style.display = 'none';
            if (showLegendCheckbox) showLegendCheckbox.checked = true;
            this.updateDynamicLegend();
        } else {
            legend.classList.add('collapsed');
            toggle.style.display = 'flex';
            if (showLegendCheckbox) showLegendCheckbox.checked = false;
        }
    },

    toggleLayerLegend(showLegend) {
        const legend = document.getElementById('colorLegend');
        const toggle = document.getElementById('legendToggle');
        
        if (!legend || !toggle) return;
        
        this.isVisible = showLegend;
        
        if (showLegend) {
            legend.classList.remove('collapsed');
            toggle.style.display = 'none';
            this.updateDynamicLegend();
        } else {
            legend.classList.add('collapsed');
            toggle.style.display = 'flex';
        }
    },

    // ================================
    // ACTUALIZACIÓN DINÁMICA
    // ================================

    updateDynamicLegend() {
        if (!this.isVisible || !this.autoUpdate) return;
        
        const legend = document.getElementById('colorLegend');
        if (!legend || legend.classList.contains('collapsed')) return;
        
        const legendContent = this.generateLegendContent();
        legend.innerHTML = legendContent;
    },

    generateLegendContent() {
        let html = this.generateLegendHeader();
        
        // Sección de árboles
        const treeSection = this.generateTreeSection();
        if (treeSection) html += treeSection;
        
        // Sección de infraestructura
        const infrastructureSection = this.generateInfrastructureSection();
        if (infrastructureSection) html += infrastructureSection;
        
        // Sección de líneas guía
        const guidelineSection = this.generateGuidelineSection();
        if (guidelineSection) html += guidelineSection;
        
        // Sección de área del proyecto
        const areaSection = this.generateAreaSection();
        if (areaSection) html += areaSection;
        
        // Sección de información adicional
        const infoSection = this.generateInfoSection();
        if (infoSection) html += infoSection;
        
        return html;
    },

    generateLegendHeader() {
        return `
            <h4>Leyenda del Proyecto
                <button class="legend-close-btn" onclick="Legend.closeLegendManually()" title="Ocultar leyenda">−</button>
            </h4>
        `;
    },

    // ================================
    // SECCIONES DE LA LEYENDA
    // ================================

    generateTreeSection() {
        const uniqueTreeTypes = [...new Set(StateManager.trees.map(tree => tree.type))];
        
        if (uniqueTreeTypes.length === 0 && !this.showEmptyCategories) {
            return '';
        }
        
        let html = '<div class="legend-section"><h5>Árboles</h5>';
        
        if (uniqueTreeTypes.length === 0) {
            html += '<div class="legend-item"><span style="color: #666; font-style: italic;">Sin árboles plantados</span></div>';
        } else {
            // Verificar si hay árboles nuevos
            const hasNewTrees = uniqueTreeTypes.some(type => 
                StateManager.treeConfig[type]?.category === 'nuevo');
            
            if (hasNewTrees) {
                const newTreeCount = StateManager.trees.filter(tree => 
                    tree.config.category === 'nuevo').length;
                
                html += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: ${this.colorConfig.trees.nuevo}"></div>
                        <span>${this.categoryNames.trees.nuevo} (${newTreeCount})</span>
                    </div>
                `;
            }
            
            // Verificar si hay árboles existentes
            const hasExistingTrees = uniqueTreeTypes.some(type => 
                StateManager.treeConfig[type]?.category === 'existente');
            
            if (hasExistingTrees) {
                const existingTreeCount = StateManager.trees.filter(tree => 
                    tree.config.category === 'existente').length;
                
                html += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: ${this.colorConfig.trees.existente}"></div>
                        <span>${this.categoryNames.trees.existente} (${existingTreeCount})</span>
                    </div>
                `;
            }
            
            // Información adicional de árboles
            html += this.generateTreeDetails(uniqueTreeTypes);
        }
        
        html += '</div>';
        return html;
    },

    generateTreeDetails(uniqueTreeTypes) {
        if (uniqueTreeTypes.length === 0) return '';
        
        const diameters = [...new Set(StateManager.trees.map(tree => tree.config.diameter))].sort((a, b) => a - b);
        const avgDiameter = StateManager.trees.length > 0 ? 
            (StateManager.trees.reduce((sum, tree) => sum + tree.config.diameter, 0) / StateManager.trees.length).toFixed(1) : 0;
        
        return `
            <div class="legend-item" style="margin-top: 8px; font-size: 0.7rem; color: #666;">
                <span>Diámetros: ${diameters.join(', ')}m | Promedio: ${avgDiameter}m</span>
            </div>
        `;
    },

    generateInfrastructureSection() {
        const uniquePipelineTypes = [...new Set(StateManager.pipelines.map(p => p.type))];
        
        if (uniquePipelineTypes.length === 0 && !this.showEmptyCategories) {
            return '';
        }
        
        let html = '<div class="legend-section"><h5>Infraestructura</h5>';
        
        if (uniquePipelineTypes.length === 0) {
            html += '<div class="legend-item"><span style="color: #666; font-style: italic;">Sin infraestructura</span></div>';
        } else {
            uniquePipelineTypes.forEach(type => {
                const count = StateManager.pipelines.filter(p => p.type === type).length;
                const color = this.colorConfig.pipelines[type];
                const name = this.categoryNames.pipelines[type];
                
                html += `
                    <div class="legend-item">
                        <div class="legend-line" style="background-color: ${color}"></div>
                        <span>${name} (${count})</span>
                    </div>
                `;
            });
            
            // Información adicional de infraestructura
            html += this.generateInfrastructureDetails();
        }
        
        html += '</div>';
        return html;
    },

    generateInfrastructureDetails() {
        if (StateManager.pipelines.length === 0 || !StateManager.scale) return '';
        
        const totalLength = StateManager.getTotalPipelineLength();
        
        return `
            <div class="legend-item" style="margin-top: 8px; font-size: 0.7rem; color: #666;">
                <span>Longitud total: ${totalLength.toFixed(1)}m</span>
            </div>
        `;
    },

    generateGuidelineSection() {
        if (StateManager.guidelines.length === 0 && !this.showEmptyCategories) {
            return '';
        }
        
        let html = '<div class="legend-section"><h5>Líneas Guía</h5>';
        
        if (StateManager.guidelines.length === 0) {
            html += '<div class="legend-item"><span style="color: #666; font-style: italic;">Sin líneas guía</span></div>';
        } else {
            const visibleGuidelines = StateManager.guidelines.filter(g => g.visible).length;
            
            html += `
                <div class="legend-item">
                    <div class="legend-line" style="background-color: ${this.colorConfig.guidelines}; border: 2px dashed ${this.colorConfig.guidelines}; background: transparent;"></div>
                    <span>Líneas de Alineación (${visibleGuidelines}/${StateManager.guidelines.length})</span>
                </div>
            `;
            
            // Información sobre snap y medidas
            if (Infrastructure.snapToGuides || Infrastructure.showGuidelineMeasurements) {
                html += '<div class="legend-item" style="margin-top: 8px; font-size: 0.7rem; color: #666;">';
                const features = [];
                if (Infrastructure.snapToGuides) features.push('Snap activado');
                if (Infrastructure.showGuidelineMeasurements) features.push('Medidas visibles');
                html += `<span>${features.join(' | ')}</span>`;
                html += '</div>';
            }
        }
        
        html += '</div>';
        return html;
    },

    generateAreaSection() {
        if (StateManager.polygon.length < 3 && !this.showEmptyCategories) {
            return '';
        }
        
        let html = '<div class="legend-section"><h5>Área del Proyecto</h5>';
        
        if (StateManager.polygon.length < 3) {
            html += '<div class="legend-item"><span style="color: #666; font-style: italic;">Sin área delimitada</span></div>';
        } else {
            html += `
                <div class="legend-item">
                    <div class="legend-polygon"></div>
                    <span>Límites del Predio (${StateManager.polygon.length} puntos)</span>
                </div>
            `;
            
            // Información del área
            if (StateManager.scale) {
                const area = StateManager.getPolygonArea();
                const hectares = (area / 10000).toFixed(3);
                
                html += `
                    <div class="legend-item" style="margin-top: 8px; font-size: 0.7rem; color: #666;">
                        <span>${area.toLocaleString('es-ES')} m² (${hectares} ha)</span>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        return html;
    },

    generateInfoSection() {
        let html = '<div class="legend-section"><h5>Información</h5>';
        
        // Estado de la escala
        if (StateManager.scale) {
            html += `
                <div class="legend-item" style="font-size: 0.7rem; color: #666;">
                    <span>📏 Escala: 1px = ${StateManager.scale.toFixed(4)}m</span>
                </div>
            `;
        } else {
            html += `
                <div class="legend-item" style="font-size: 0.7rem; color: #ff9800;">
                    <span>⚠️ Escala no definida</span>
                </div>
            `;
        }
        
        // Información de zoom
        html += `
            <div class="legend-item" style="font-size: 0.7rem; color: #666;">
                <span>🔍 Zoom: ${(StateManager.zoom * 100).toFixed(0)}%</span>
            </div>
        `;
        
        // Capas activas
        const activeLayers = Object.entries(StateManager.layerVisibility)
            .filter(([key, value]) => value)
            .map(([key]) => key).length;
        
        html += `
            <div class="legend-item" style="font-size: 0.7rem; color: #666;">
                <span>👁️ Capas activas: ${activeLayers}/4</span>
            </div>
        `;
        
        html += '</div>';
        return html;
    },

    // ================================
    // LEYENDA EXPORTABLE
    // ================================

    generateExportableLegend() {
        // Generar leyenda optimizada para exportación (sin elementos interactivos)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 300;
        canvas.height = 500;
        
        // Fondo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Título
        ctx.fillStyle = '#1b5e20';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Leyenda del Proyecto', 20, 30);
        
        let y = 60;
        const lineHeight = 25;
        const itemHeight = 20;
        
        // Árboles
        if (StateManager.trees.length > 0) {
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#1b5e20';
            ctx.fillText('Árboles', 20, y);
            y += lineHeight;
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            
            const hasNew = StateManager.trees.some(t => t.config.category === 'nuevo');
            const hasExisting = StateManager.trees.some(t => t.config.category === 'existente');
            
            if (hasNew) {
                this.drawLegendCircle(ctx, 30, y - 5, this.colorConfig.trees.nuevo);
                ctx.fillText('Árboles Nuevos', 50, y);
                y += itemHeight;
            }
            
            if (hasExisting) {
                this.drawLegendCircle(ctx, 30, y - 5, this.colorConfig.trees.existente);
                ctx.fillText('Árboles Existentes', 50, y);
                y += itemHeight;
            }
            
            y += 10;
        }
        
        // Infraestructura
        if (StateManager.pipelines.length > 0) {
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#1b5e20';
            ctx.fillText('Infraestructura', 20, y);
            y += lineHeight;
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            
            const uniqueTypes = [...new Set(StateManager.pipelines.map(p => p.type))];
            uniqueTypes.forEach(type => {
                this.drawLegendLine(ctx, 20, y - 5, 40, y - 5, this.colorConfig.pipelines[type]);
                ctx.fillText(this.categoryNames.pipelines[type], 50, y);
                y += itemHeight;
            });
            
            y += 10;
        }
        
        // Área del proyecto
        if (StateManager.polygon.length >= 3) {
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#1b5e20';
            ctx.fillText('Área del Proyecto', 20, y);
            y += lineHeight;
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            
            this.drawLegendPolygon(ctx, 30, y - 8, this.colorConfig.polygon);
            ctx.fillText('Límites del Predio', 50, y);
            y += itemHeight;
        }
        
        return canvas;
    },

    drawLegendCircle(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    drawLegendLine(ctx, x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    drawLegendPolygon(ctx, x, y, color) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color + '40';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 8, y - 6, 16, 12);
        ctx.strokeRect(x - 8, y - 6, 16, 12);
    },

    // ================================
    // CONFIGURACIÓN Y PERSONALIZACIÓN
    // ================================

    setAutoUpdate(enabled) {
        this.autoUpdate = enabled;
        if (enabled) {
            this.updateDynamicLegend();
        }
    },

    setShowEmptyCategories(show) {
        this.showEmptyCategories = show;
        if (this.autoUpdate) {
            this.updateDynamicLegend();
        }
    },

    updateColorConfig(category, subcategory, color) {
        if (this.colorConfig[category] && this.colorConfig[category][subcategory]) {
            this.colorConfig[category][subcategory] = color;
            if (this.autoUpdate) {
                this.updateDynamicLegend();
            }
        }
    },

    updateCategoryName(category, subcategory, name) {
        if (this.categoryNames[category] && this.categoryNames[category][subcategory]) {
            this.categoryNames[category][subcategory] = name;
            if (this.autoUpdate) {
                this.updateDynamicLegend();
            }
        }
    },

    // ================================
    // EVENTOS Y INTERACCIONES
    // ================================

    closeLegendManually() {
        const legend = document.getElementById('colorLegend');
        const toggle = document.getElementById('legendToggle');
        const showLegendCheckbox = document.getElementById('showLegend');
        
        if (legend && toggle) {
            // Ocultar leyenda
            legend.classList.add('collapsed');
            toggle.style.display = 'flex';
            this.isVisible = false;
            
            // Actualizar checkbox
            if (showLegendCheckbox) {
                showLegendCheckbox.checked = false;
            }
        }
    },

    // ================================
    // ANÁLISIS Y ESTADÍSTICAS
    // ================================

    getLegendStats() {
        return {
            isVisible: this.isVisible,
            autoUpdate: this.autoUpdate,
            sections: {
                trees: StateManager.trees.length > 0,
                infrastructure: StateManager.pipelines.length > 0,
                guidelines: StateManager.guidelines.length > 0,
                area: StateManager.polygon.length >= 3
            },
            totalElements: StateManager.trees.length + StateManager.pipelines.length + 
                          StateManager.guidelines.length + (StateManager.polygon.length >= 3 ? 1 : 0)
        };
    },

    // ================================
    // UTILIDADES
    // ================================

    refreshLegend() {
        if (this.isVisible) {
            this.updateDynamicLegend();
        }
    },

    exportLegendToPNG() {
        // Función para exportar solo la leyenda como imagen
        const canvas = this.generateExportableLegend();
        
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${StateManager.projectName}_leyenda_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toastManager.success('Leyenda Exportada', 'La leyenda se exportó como imagen PNG');
        });
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function toggleLegend() {
    Legend.toggleLegend();
}

function updateDynamicLegend() {
    Legend.updateDynamicLegend();
}

function exportLegendToPNG() {
    Legend.exportLegendToPNG();
}

function closeLegendManually() {
    Legend.closeLegendManually();
}
