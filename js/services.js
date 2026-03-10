const Services = (function() {
    const API_URL = 'http://localhost:3000/api';
    
    // ===== VALIDACIÓN =====
    const Validation = {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: {
            'application/pdf': 'pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'text/plain': 'txt'
        },
        
        validateFile: (file) => {
            if (!file) return { valid: false, error: 'No hay archivo' };
            if (!Validation.ALLOWED_TYPES[file.type]) {
                return { valid: false, error: 'Tipo no permitido. Usa PDF, DOCX o TXT' };
            }
            if (file.size > Validation.MAX_SIZE) {
                return { valid: false, error: 'El archivo excede 10MB' };
            }
            return { valid: true };
        },
        
        formatSize: (bytes) => {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    };
    
    // ===== ESTADOS =====
    const Status = {
        VALID: ['pendiente', 'en_revision', 'revision_completada', 'aceptado', 'rechazado'],
        
        getLabel: (status) => {
            const labels = {
                'pendiente': 'Pendiente',
                'en_revision': 'En Revisión',
                'revision_completada': 'Revisión Completada',
                'aceptado': 'Aceptado',
                'rechazado': 'Rechazado'
            };
            return labels[status] || status;
        },
        
        getBadgeClass: (status) => {
            const classes = {
                'pendiente': 'pending',
                'en_revision': 'review',
                'revision_completada': 'completed',
                'aceptado': 'accepted',
                'rechazado': 'rejected'
            };
            return classes[status] || '';
        },
        
        getValidTransitions: (current) => {
            const transitions = {
                'pendiente': ['en_revision', 'rechazado'],
                'en_revision': ['revision_completada', 'rechazado'],
                'revision_completada': ['aceptado', 'rechazado', 'en_revision'],
                'aceptado': [],
                'rechazado': ['pendiente']
            };
            return transitions[current] || [];
        }
    };
    
    // ===== SINCRONIZACIÓN =====
    const Sync = {
        isOnline: () => navigator.onLine,
        
        syncAll: async () => {
            if (!Sync.isOnline()) return { success: false, reason: 'offline' };
            
            try {
                const pending = await Storage.getPendingSync();
                if (pending.length === 0) return { success: true, synced: 0 };
                
                // Preparar datos para enviar (sin contenido del archivo para ahorrar ancho de banda)
                const articlesToSync = pending.map(a => ({
                    id: a.id,
                    title: a.title,
                    fileName: a.fileName,
                    fileSize: a.fileSize,
                    authors: a.authors,
                    abstract: a.abstract,
                    status: a.status,
                    uploadDate: a.uploadDate
                }));
                
                const response = await fetch(`${API_URL}/articles/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ articles: articlesToSync })
                });
                
                if (!response.ok) throw new Error('Error en sincronización');
                
                const result = await response.json();
                
                if (result.success) {
                    for (const article of pending) {
                        await Storage.markSynced(article.id);
                    }
                }
                
                return { success: true, synced: pending.length };
            } catch (error) {
                console.error('Sync error:', error);
                return { success: false, error: error.message };
            }
        },
        
        addListeners: (callbacks) => {
            window.addEventListener('online', () => {
                if (callbacks.onOnline) callbacks.onOnline();
                Sync.syncAll();
            });
            window.addEventListener('offline', () => {
                if (callbacks.onOffline) callbacks.onOffline();
            });
        }
    };
    
    // ===== CONVERSIÓN ARCHIVOS =====
    const FileConverter = {
        toBase64: (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        download: (article) => {
            const base64 = article.fileContent.split(',')[1] || article.fileContent;
            const contentType = article.fileContent.split(',')[0]?.split(':')[1]?.split(';')[0] || 'application/octet-stream';
            
            try {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: contentType });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = article.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error downloading:', error);
                throw error;
            }
        }
    };
    
    return {
        Validation,
        Status,
        Sync,
        FileConverter
    };
})();