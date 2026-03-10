let currentArticles = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando app...');
    
    await loadArticles();
    renderApp();
    setupEventListeners();
    
    // Sincronizar si hay conexión
    if (navigator.onLine) {
        setTimeout(() => Services.Sync.syncAll(), 2000);
    }
});

// ===== RENDERIZADO =====
const renderApp = () => {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="app-container">
            <header class="app-header">
                <h1>📚 Revisor de Artículos</h1>
                <div id="status" class="status-indicator ${navigator.onLine ? 'online' : 'offline'}">
                    <span class="status-dot"></span>
                    ${navigator.onLine ? 'Conectado' : 'Trabajando offline'}
                </div>
            </header>

            <div class="tabs">
                <button class="tab-btn active" data-tab="upload">📤 Subir artículo</button>
                <button class="tab-btn" data-tab="status">📋 Estados</button>
            </div>

            <div id="upload-tab" class="tab-content active">
                ${renderUploadForm()}
            </div>

            <div id="status-tab" class="tab-content">
                ${renderStatusView()}
            </div>

            <div id="message-area"></div>
        </div>
    `;
};

const renderUploadForm = () => `
    <div class="card">
        <h2 class="card-title">📤 Subir nuevo artículo</h2>
        
        <div class="form-group">
            <label>Título del artículo</label>
            <input type="text" id="title" placeholder="Título del artículo">
        </div>

        <div class="form-group">
            <label>Autores (separados por coma)</label>
            <input type="text" id="authors" placeholder="Juan Pérez, María García">
        </div>

        <div class="form-group">
            <label>Resumen</label>
            <textarea id="abstract" rows="3" placeholder="Breve resumen..."></textarea>
        </div>

        <div class="form-group">
            <label>Archivo</label>
            <input type="file" id="file" accept=".pdf,.docx,.txt">
            <div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 0.25rem;">
                PDF, DOCX o TXT (máx 10MB)
            </div>
        </div>

        <button id="uploadBtn" class="btn btn-primary" disabled>
            📦 Subir artículo
        </button>
    </div>
`;

const renderStatusView = () => `
    <div class="card">
        <h2 class="card-title">📋 Estado de artículos</h2>
        <div id="articles-list" class="articles-grid">
            ${renderArticlesList()}
        </div>
    </div>
`;

const renderArticlesList = () => {
    if (currentArticles.length === 0) {
        return '<p style="text-align: center; color: var(--gray-600); padding: 2rem;">No hay artículos</p>';
    }
    
    return currentArticles.map(article => `
        <div class="article-card" data-id="${article.id}">
            <div class="article-header">
                <div>
                    <div class="article-title">${article.title}</div>
                    <div class="article-meta">
                        ${Services.Validation.formatSize(article.fileSize)} • 
                        ${new Date(article.uploadDate).toLocaleDateString()}
                    </div>
                </div>
                <span class="status-badge ${Services.Status.getBadgeClass(article.status)}">
                    ${Services.Status.getLabel(article.status)}
                </span>
            </div>
            
            <div style="margin: 0.5rem 0; color: var(--gray-600); font-size: 0.875rem;">
                ${article.authors?.join(', ') || 'Sin autor'}
            </div>
            
            <div class="article-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="viewArticle('${article.id}')" style="flex:1;">👁️ Ver</button>
                <button class="btn btn-secondary" onclick="showStatusModal('${article.id}')" style="flex:1;">✏️ Cambiar estado</button>
            </div>
        </div>
    `).join('');
};

// ===== FUNCIONES PRINCIPALES =====
const loadArticles = async () => {
    try {
        currentArticles = await Storage.getAll();
        const list = document.getElementById('articles-list');
        if (list) list.innerHTML = renderArticlesList();
    } catch (error) {
        showMessage('Error al cargar artículos', 'error');
    }
};

const uploadArticle = async () => {
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Validar archivo
    const validation = Services.Validation.validateFile(file);
    if (!validation.valid) {
        showMessage(validation.error, 'error');
        return;
    }
    
    const title = document.getElementById('title').value.trim() || file.name.replace(/\.[^/.]+$/, '');
    const authors = document.getElementById('authors').value.split(',').map(a => a.trim()).filter(a => a);
    const abstract = document.getElementById('abstract').value.trim();
    
    try {
        // Convertir a Base64
        const fileContent = await Services.FileConverter.toBase64(file);
        
        const article = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileContent: fileContent,
            title: title,
            authors: authors.length ? authors : ['Autor pendiente'],
            abstract: abstract,
            status: 'pendiente',
            uploadDate: new Date().toISOString(),
            syncNeeded: true
        };
        
        const result = await Storage.save(article);
        
        if (result.success) {
            showMessage('✅ Artículo subido correctamente', 'success');
            
            // Resetear formulario
            document.getElementById('title').value = '';
            document.getElementById('authors').value = '';
            document.getElementById('abstract').value = '';
            fileInput.value = '';
            document.getElementById('uploadBtn').disabled = true;
            
            // Recargar lista
            await loadArticles();
            
            // Cambiar a pestaña de estados
            switchTab('status');
            
            // Sincronizar si hay conexión
            if (navigator.onLine) {
                Services.Sync.syncAll();
            }
        }
    } catch (error) {
        showMessage('Error al subir: ' + error.message, 'error');
    }
};

// ===== MODALES =====
window.viewArticle = async (articleId) => {
    const article = await Storage.get(articleId);
    if (!article) return;
    
    const history = await Storage.getHistory(articleId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            
            <h3 style="margin-bottom: 1rem;">${article.title}</h3>
            
            <p><strong>Autores:</strong> ${article.authors?.join(', ') || 'No especificado'}</p>
            
            ${article.abstract ? `
                <p><strong>Resumen:</strong><br>${article.abstract}</p>
            ` : ''}
            
            <div style="background: var(--gray-100); padding: 1rem; border-radius: 6px; margin: 1rem 0;">
                <p><strong>Archivo:</strong> ${article.fileName}</p>
                <p><strong>Tamaño:</strong> ${Services.Validation.formatSize(article.fileSize)}</p>
                <p><strong>Subido:</strong> ${new Date(article.uploadDate).toLocaleString()}</p>
                <p><strong>Estado:</strong> ${Services.Status.getLabel(article.status)}</p>
            </div>
            
            ${history.length > 0 ? `
                <h4>Historial de cambios:</h4>
                ${history.slice(0, 5).map(h => `
                    <div style="font-size: 0.875rem; margin: 0.5rem 0; padding: 0.5rem; background: var(--gray-50); border-radius: 4px; border-left: 3px solid var(--primary);">
                        <strong>${Services.Status.getLabel(h.status)}</strong> - ${new Date(h.timestamp).toLocaleString()}
                        ${h.notes ? `<br><small>${h.notes}</small>` : ''}
                    </div>
                `).join('')}
            ` : ''}
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button onclick="downloadArticle('${article.id}')" class="btn btn-primary" style="flex:1;">📥 Descargar</button>
                <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="flex:1;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

window.showStatusModal = (articleId) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            
            <h3 style="margin-bottom: 1rem;">Actualizar estado</h3>
            
            <select id="modal-status" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--gray-200); border-radius: 6px;">
                ${Services.Status.VALID.map(s => `
                    <option value="${s}">${Services.Status.getLabel(s)}</option>
                `).join('')}
            </select>
            
            <textarea id="modal-notes" placeholder="Notas (opcional)" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--gray-200); border-radius: 6px;" rows="3"></textarea>
            
            <div style="display: flex; gap: 1rem;">
                <button onclick="confirmStatusUpdate('${articleId}')" class="btn btn-primary" style="flex:1;">Actualizar</button>
                <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="flex:1;">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

window.confirmStatusUpdate = async (articleId) => {
    const select = document.getElementById('modal-status');
    const notes = document.getElementById('modal-notes');
    
    try {
        await Storage.updateStatus(articleId, select.value, notes.value);
        await loadArticles();
        showMessage('✅ Estado actualizado', 'success');
        
        // Cerrar modal
        document.querySelector('.modal').remove();
        
        // Sincronizar si hay conexión
        if (navigator.onLine) {
            Services.Sync.syncAll();
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
};

window.downloadArticle = async (articleId) => {
    const article = await Storage.get(articleId);
    if (!article) return;
    
    try {
        Services.FileConverter.download(article);
    } catch (error) {
        showMessage('Error al descargar', 'error');
    }
};

// ===== UTILIDADES =====
const showMessage = (text, type) => {
    const area = document.getElementById('message-area');
    if (area) {
        area.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => area.innerHTML = '', 3000);
    }
};

const switchTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
};

const setupEventListeners = () => {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Upload
    const fileInput = document.getElementById('file');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileInput && uploadBtn) {
        fileInput.addEventListener('change', () => {
            uploadBtn.disabled = !fileInput.files[0];
        });
        
        uploadBtn.addEventListener('click', uploadArticle);
    }
    
    // Estado de conexión
    const updateOnlineStatus = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.className = `status-indicator ${navigator.onLine ? 'online' : 'offline'}`;
            statusEl.innerHTML = `
                <span class="status-dot"></span>
                ${navigator.onLine ? 'Conectado' : 'Trabajando offline'}
            `;
        }
    };
    
    Services.Sync.addListeners({
        onOnline: () => {
            updateOnlineStatus();
            showMessage('🔄 Conexión restablecida - Sincronizando...', 'success');
        },
        onOffline: () => {
            updateOnlineStatus();
            showMessage('📴 Modo offline activado', 'info');
        }
    });
};