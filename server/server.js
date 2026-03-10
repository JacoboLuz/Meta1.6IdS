const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = mysql.createPool({
    host: 'localhost',
    user: 'appuser',
    password: '1234',
    database: 'articles_db',
    waitForConnections: true,
    connectionLimit: 5
});

// ===== ENDPOINTS =====

// Obtener todos los artículos
app.get('/api/articles', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, file_name, file_size, authors, abstract, status, uploaded_at FROM articles ORDER BY uploaded_at DESC'
        );
        
        res.json({
            success: true,
            articles: rows.map(row => ({
                ...row,
                authors: JSON.parse(row.authors || '[]')
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sincronización masiva
app.post('/api/articles/sync', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { articles } = req.body;
        const results = { synced: [], failed: [] };
        
        for (const article of articles || []) {
            try {
                await connection.query(
                    `INSERT INTO articles (id, title, file_name, file_size, authors, abstract, status, uploaded_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     title = VALUES(title),
                     file_name = VALUES(file_name),
                     file_size = VALUES(file_size),
                     authors = VALUES(authors),
                     abstract = VALUES(abstract),
                     status = VALUES(status)`,
                    [
                        article.id,
                        article.title,
                        article.fileName,
                        article.fileSize,
                        JSON.stringify(article.authors || []),
                        article.abstract || '',
                        article.status,
                        article.uploadDate
                    ]
                );
                
                results.synced.push(article.id);
            } catch (err) {
                results.failed.push({ id: article.id, error: err.message });
            }
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Sincronización completada',
            results
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`🚀 Servidor en http://localhost:${port}`);
});