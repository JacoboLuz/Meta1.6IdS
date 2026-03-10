const Storage = (function() {
    const DB_NAME = 'ArticleDB';
    const DB_VERSION = 2;
    const STORES = {
        ARTICLES: 'articles',
        HISTORY: 'history'
    };
    
    let db = null;

    const init = async () => {
        if (db) return db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject('Error al abrir DB');
            
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(STORES.ARTICLES)) {
                    const store = db.createObjectStore(STORES.ARTICLES, { keyPath: 'id' });
                    store.createIndex('status', 'status');
                    store.createIndex('sync', 'syncNeeded');
                    store.createIndex('date', 'lastModified');
                }
                
                if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                    const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('articleId', 'articleId');
                    historyStore.createIndex('timestamp', 'timestamp');
                }
            };
        });
    };

    // Guardar artículo
    const save = async (article) => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.ARTICLES, STORES.HISTORY], 'readwrite');
            const store = tx.objectStore(STORES.ARTICLES);
            
            if (!article.id) {
                article.id = 'art_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Si es nuevo, registrar en historial
            const isNew = !article._existing;
            const oldStatus = article._oldStatus;
            
            article.lastModified = new Date().toISOString();
            article.syncNeeded = !article._fromSync;
            
            // Guardar artículo
            store.put(article);
            
            // Guardar en historial si cambió estado o es nuevo
            if (isNew || (oldStatus && oldStatus !== article.status)) {
                const historyStore = tx.objectStore(STORES.HISTORY);
                historyStore.add({
                    articleId: article.id,
                    status: article.status,
                    notes: isNew ? 'Artículo creado' : (article._statusNotes || 'Estado actualizado'),
                    timestamp: new Date().toISOString()
                });
            }
            
            tx.oncomplete = () => resolve({ success: true, id: article.id });
            tx.onerror = () => reject('Error al guardar');
        });
    };

    // Obtener artículo
    const get = async (id) => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.ARTICLES, 'readonly');
            const store = tx.objectStore(STORES.ARTICLES);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject('Error al obtener');
        });
    };

    // Obtener todos
    const getAll = async () => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.ARTICLES, 'readonly');
            const store = tx.objectStore(STORES.ARTICLES);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const articles = request.result || [];
                resolve(articles.sort((a, b) => 
                    new Date(b.lastModified) - new Date(a.lastModified)
                ));
            };
            request.onerror = () => reject('Error al obtener lista');
        });
    };

    // Obtener historial
    const getHistory = async (articleId) => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.HISTORY, 'readonly');
            const store = tx.objectStore(STORES.HISTORY);
            const index = store.index('articleId');
            const request = index.getAll(articleId);
            
            request.onsuccess = () => {
                const history = request.result || [];
                resolve(history.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                ));
            };
            request.onerror = () => reject('Error al obtener historial');
        });
    };

    // Actualizar estado
    const updateStatus = async (articleId, newStatus, notes = '') => {
        const article = await get(articleId);
        if (!article) throw new Error('Artículo no encontrado');
        
        article._oldStatus = article.status;
        article._statusNotes = notes;
        article.status = newStatus;
        
        return await save(article);
    };

    // Obtener pendientes de sincronización
    const getPendingSync = async () => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.ARTICLES, 'readonly');
            const store = tx.objectStore(STORES.ARTICLES);
            const index = store.index('sync');
            const request = index.getAll(true);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject('Error al obtener pendientes');
        });
    };

    // Marcar como sincronizado
    const markSynced = async (id) => {
        const article = await get(id);
        if (article) {
            article.syncNeeded = false;
            article._fromSync = true;
            await save(article);
        }
    };

    // Eliminar artículo
    const remove = async (id) => {
        const db = await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.ARTICLES, STORES.HISTORY], 'readwrite');
            
            tx.objectStore(STORES.ARTICLES).delete(id);
            
            // Eliminar historial asociado
            const historyStore = tx.objectStore(STORES.HISTORY);
            const index = historyStore.index('articleId');
            index.openCursor(id).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    historyStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
            
            tx.oncomplete = () => resolve({ success: true });
            tx.onerror = () => reject('Error al eliminar');
        });
    };

    return {
        save,
        get,
        getAll,
        getHistory,
        updateStatus,
        getPendingSync,
        markSynced,
        remove
    };
})();