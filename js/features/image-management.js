 // ================================
// IMAGE MANAGEMENT - Gestión de Imágenes Satelitales
// ================================

const ImageManagement = {
    
    // ================================
    // PROPIEDADES DEL MÓDULO
    // ================================
    
    supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    
    // ================================
    // INICIALIZACIÓN
    // ================================
    
    init() {
        this.setupImageInput();
        return true;
    },

    setupImageInput() {
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            // Ya se configura en EventHandler, pero podemos añadir validaciones adicionales
            imageInput.addEventListener('change', this.handleImageInputChange.bind(this));
        }
    },

    // ================================
    // CARGA DE IMÁGENES
    // ================================

    handleImageInputChange(event) {
        // Wrapper para compatibilidad, la función principal es loadImage
        this.loadImage(event);
    },

    loadImage(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar tipo de archivo
        if (!this.validateImageFile(file)) {
            return;
        }
        
        toastManager.info('Cargando Imagen', 'Procesando archivo de imagen...', 2000);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.processImageData(e.target.result, file.name);
        };
        
        reader.onerror = () => {
            toastManager.error('Error de Lectura', 'No se pudo leer el archivo seleccionado');
        };
        
        reader.readAsDataURL(file);
    },

    validateImageFile(file) {
        // Validar tipo de archivo
        if (!this.supportedFormats.includes(file.type)) {
            toastManager.error('Formato Inválido', 
                `Formato no soportado. Use: ${this.supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`);
            return false;
        }
        
        // Validar tamaño de archivo
        if (file.size > this.maxFileSize) {
            toastManager.error('Archivo Muy Grande', 
                `El archivo es demasiado grande. Máximo permitido: ${this.maxFileSize / (1024 * 1024)}MB`);
            return false;
        }
        
        return true;
    },

    processImageData(dataUrl, fileName) {
        const img = new Image();
        
        img.onload = () => {
            // Validar dimensiones de imagen
            if (!this.validateImageDimensions(img)) {
                return;
            }
            
            // Optimizar imagen si es necesario
            const optimizedImage = this.optimizeImage(img);
            
            // Guardar imagen en el estado
            StateManager.backgroundImage = optimizedImage;
            
            // Centrar y ajustar imagen en el canvas
            this.centerAndFitImage();
            
            // Actualizar UI
            this.updateImageInfo(fileName);
            this.showImageInfo();
            
            // Render y notificación
            CanvasEngine.render();
            EventHandler.updateStatus('Imagen cargada - Define la escala para comenzar');
            
            toastManager.success('Imagen Cargada', 
                `${fileName} se cargó correctamente. Ahora define la escala.`);
        };
        
        img.onerror = () => {
            toastManager.error('Error de Imagen', 
                'No se pudo cargar la imagen. Verifica que el archivo no esté dañado.');
        };
        
        img.src = dataUrl;
    },

    validateImageDimensions(img) {
        const minWidth = 100;
        const minHeight = 100;
        const maxWidth = 8192;
        const maxHeight = 8192;
        
        if (img.width < minWidth || img.height < minHeight) {
            toastManager.error('Imagen Muy Pequeña', 
                `La imagen debe ser al menos ${minWidth}x${minHeight} píxeles`);
            return false;
        }
        
        if (img.width > maxWidth || img.height > maxHeight) {
            toastManager.warning('Imagen Muy Grande', 
                `Imagen de ${img.width}x${img.height}px. Se recomienda usar imágenes menores a ${maxWidth}x${maxHeight}px para mejor rendimiento.`);
            // Continuar pero advertir
        }
        
        return true;
    },

    optimizeImage(img) {
        // Por ahora retornamos la imagen original
        // En el futuro se podría implementar redimensionamiento automático
        return img;
    },

    // ================================
    // CENTRADO Y AJUSTE
    // ================================

    centerAndFitImage() {
        if (!StateManager.backgroundImage || !CanvasEngine.canvas) return;
        
        const containerWidth = CanvasEngine.canvas.width;
        const containerHeight = CanvasEngine.canvas.height;
        const imgWidth = StateManager.backgroundImage.width;
        const imgHeight = StateManager.backgroundImage.height;
        
        // Calcular zoom para que la imagen se ajuste al canvas
        const scaleX = containerWidth / imgWidth;
        const scaleY = containerHeight / imgHeight;
        StateManager.zoom = Math.min(scaleX, scaleY) * 0.9; // 0.9 para dejar un margen
        
        // Centrar la imagen
        const scaledWidth = imgWidth * StateManager.zoom;
        const scaledHeight = imgHeight * StateManager.zoom;
        StateManager.panX = (containerWidth - scaledWidth) / 2;
        StateManager.panY = (containerHeight - scaledHeight) / 2;
    },

    // ================================
    // LIMPIEZA DE IMAGEN
    // ================================

    clearImage() {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Sin Imagen', 'No hay ninguna imagen para limpiar');
            return;
        }

        // Limpiar estado relacionado con imagen
        StateManager.backgroundImage = null;
        StateManager.scale = null;
        StateManager.polygon = [];
        StateManager.trees = [];
        StateManager.pipelines = [];
        StateManager.guidelines = [];
        StateManager.currentPipeline = null;
        StateManager.currentGuideline = null;
        StateManager.zoom = 1;
        StateManager.panX = 0;
        StateManager.panY = 0;
        StateManager.selectedTree = null;
        StateManager.selectedPipeline = null;
        StateManager.currentMode = 'normal';
        StateManager.guidelineMode = 'normal';
        
        // Limpiar input de archivo
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.value = '';
        }
        
        // Ocultar elementos de UI
        this.hideImageInfo();
        this.hideRelatedInfo();
        
        // Actualizar UI
        EventHandler.updateTreeCount();
        Infrastructure.updatePipelineInfo();
        CanvasEngine.render();
        EventHandler.updateStatus('Imagen eliminada - Sistema listo');
        
        toastManager.success('Imagen Eliminada', 'La imagen y todos los datos han sido limpiados');
    },

    // ================================
    // GESTIÓN DE UI
    // ================================

    updateImageInfo(fileName) {
        const imageNameElement = document.getElementById('imageName');
        if (imageNameElement) {
            imageNameElement.textContent = fileName;
        }
    },

    showImageInfo() {
        const imageInfoElement = document.getElementById('imageInfo');
        if (imageInfoElement) {
            imageInfoElement.style.display = 'block';
        }
    },

    hideImageInfo() {
        const imageInfoElement = document.getElementById('imageInfo');
        if (imageInfoElement) {
            imageInfoElement.style.display = 'none';
        }
    },

    hideRelatedInfo() {
        const elementsToHide = ['scaleResult', 'polygonInfo', 'scaleInfo', 'pipelineInfo'];
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    },

    // ================================
    // ANÁLISIS DE IMAGEN
    // ================================

    getImageInfo() {
        if (!StateManager.backgroundImage) {
            return {
                hasImage: false,
                message: 'No hay imagen cargada'
            };
        }
        
        const img = StateManager.backgroundImage;
        const fileSize = this.estimateImageSize(img);
        
        return {
            hasImage: true,
            width: img.width,
            height: img.height,
            aspectRatio: (img.width / img.height).toFixed(2),
            estimatedSize: fileSize,
            megapixels: ((img.width * img.height) / 1000000).toFixed(1),
            currentZoom: (StateManager.zoom * 100).toFixed(1) + '%',
            isLandscape: img.width > img.height,
            isSquare: Math.abs(img.width - img.height) < 10
        };
    },

    estimateImageSize(img) {
        // Estimación aproximada del tamaño de archivo basada en dimensiones
        const pixels = img.width * img.height;
        const estimatedBytes = pixels * 3; // Asumiendo 3 bytes por píxel para JPG
        
        if (estimatedBytes < 1024) {
            return estimatedBytes + ' B';
        } else if (estimatedBytes < 1024 * 1024) {
            return (estimatedBytes / 1024).toFixed(1) + ' KB';
        } else {
            return (estimatedBytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    },

    // ================================
    // HERRAMIENTAS DE IMAGEN
    // ================================

    getImagePixelData(x, y) {
        // Obtener datos de píxel en una coordenada específica
        if (!StateManager.backgroundImage || !CanvasEngine.canvas) return null;
        
        // Crear canvas temporal para análisis
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = StateManager.backgroundImage.width;
        tempCanvas.height = StateManager.backgroundImage.height;
        
        tempCtx.drawImage(StateManager.backgroundImage, 0, 0);
        
        try {
            const imageData = tempCtx.getImageData(x, y, 1, 1);
            const data = imageData.data;
            
            return {
                r: data[0],
                g: data[1],
                b: data[2],
                a: data[3],
                hex: '#' + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)
            };
        } catch (error) {
            console.warn('No se pudo acceder a los datos del píxel:', error);
            return null;
        }
    },

    // ================================
    // TRANSFORMACIONES
    // ================================

    rotateImage(degrees) {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Sin Imagen', 'No hay imagen para rotar');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = StateManager.backgroundImage;
        
        // Configurar canvas para rotación
        if (degrees === 90 || degrees === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }
        
        // Aplicar rotación
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(degrees * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // Crear nueva imagen
        const rotatedImg = new Image();
        rotatedImg.onload = () => {
            StateManager.backgroundImage = rotatedImg;
            this.centerAndFitImage();
            CanvasEngine.render();
            toastManager.success('Imagen Rotada', `Rotación de ${degrees}° aplicada`);
        };
        rotatedImg.src = canvas.toDataURL();
    },

    flipImage(horizontal = true) {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Sin Imagen', 'No hay imagen para voltear');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = StateManager.backgroundImage;
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Aplicar flip
        ctx.save();
        if (horizontal) {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width, 0);
        } else {
            ctx.scale(1, -1);
            ctx.drawImage(img, 0, -img.height);
        }
        ctx.restore();
        
        // Crear nueva imagen
        const flippedImg = new Image();
        flippedImg.onload = () => {
            StateManager.backgroundImage = flippedImg;
            CanvasEngine.render();
            toastManager.success('Imagen Volteada', 
                `Volteo ${horizontal ? 'horizontal' : 'vertical'} aplicado`);
        };
        flippedImg.src = canvas.toDataURL();
    },

    // ================================
    // EXPORTACIÓN DE IMAGEN
    // ================================

    exportImageWithOverlays() {
        if (!StateManager.backgroundImage) {
            toastManager.warning('Sin Imagen', 'No hay imagen para exportar');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = StateManager.backgroundImage.width;
        canvas.height = StateManager.backgroundImage.height;
        
        // Dibujar imagen base
        ctx.drawImage(StateManager.backgroundImage, 0, 0);
        
        // Aquí se podrían agregar overlays como escala, norte, etc.
        
        // Descargar
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${StateManager.projectName}_imagen_base.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toastManager.success('Imagen Exportada', 'Imagen base exportada correctamente');
        });
    },

    // ================================
    // CARGA DESDE URL
    // ================================

    loadImageFromUrl(url) {
        if (!url) {
            toastManager.error('URL Inválida', 'Por favor proporciona una URL válida');
            return;
        }
        
        toastManager.info('Cargando Imagen', 'Descargando imagen desde URL...', 3000);
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Para evitar problemas CORS cuando sea posible
        
        img.onload = () => {
            StateManager.backgroundImage = img;
            this.centerAndFitImage();
            this.updateImageInfo('Imagen desde URL');
            this.showImageInfo();
            CanvasEngine.render();
            
            toastManager.success('Imagen Cargada', 'Imagen cargada desde URL correctamente');
            EventHandler.updateStatus('Imagen cargada - Define la escala para comenzar');
        };
        
        img.onerror = () => {
            toastManager.error('Error de Carga', 
                'No se pudo cargar la imagen desde la URL. Verifica que la URL sea correcta y accesible.');
        };
        
        img.src = url;
    },

    // ================================
    // UTILIDADES
    // ================================

    getImageBounds() {
        if (!StateManager.backgroundImage) return null;
        
        return {
            width: StateManager.backgroundImage.width,
            height: StateManager.backgroundImage.height,
            scaledWidth: StateManager.backgroundImage.width * StateManager.zoom,
            scaledHeight: StateManager.backgroundImage.height * StateManager.zoom,
            offsetX: StateManager.panX,
            offsetY: StateManager.panY
        };
    },

    isPointOnImage(x, y) {
        if (!StateManager.backgroundImage) return false;
        
        return x >= 0 && x <= StateManager.backgroundImage.width &&
               y >= 0 && y <= StateManager.backgroundImage.height;
    }
};

// ================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ================================

function loadImage(event) {
    ImageManagement.loadImage(event);
}

function clearImage() {
    ImageManagement.clearImage();
}

function centerAndFitImage() {
    ImageManagement.centerAndFitImage();
}
