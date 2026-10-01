// Servidor web local ultra ligero para la Biblioteca Gnóstica
// Resuelve las restricciones de seguridad de YouTube (Error 153) y Google Drive
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { exec } = require('child_process');

let PORT = 8080;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Cargar caché local si existe
let gdCache = {};
try {
    const cachePath = path.join(__dirname, 'gd_cached.json');
    if (fs.existsSync(cachePath)) {
        gdCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
} catch (e) {
    console.warn('No se pudo cargar gd_cached.json:', e);
}

async function fetchGoogleDriveFolder(folderId, prefix = '', depth = 0) {
    if (depth === 0 && gdCache[folderId] && gdCache[folderId].length > 0) {
        // Verificar si la caché ya tenía subcarpetas sin expandir (objetos sin extensión de audio o nombres de carpeta)
        const tieneSubcarpetasSinProcesar = gdCache[folderId].some(it => 
            !it.name.match(/\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i) && !it.name.includes(' - ')
        );
        if (!tieneSubcarpetasSinProcesar) {
            return gdCache[folderId];
        }
    }

    if (depth > 3) return [];

    try {
        const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) return (depth === 0 ? null : []);

        const html = await response.text();
        const entries = html.split('<div class="flip-entry"');
        const items = [];

        for (let i = 1; i < entries.length; i++) {
            const chunk = entries[i];
            const idMatch = chunk.match(/id="entry-([a-zA-Z0-9_-]+)"/);
            const titleMatch = chunk.match(/class="flip-entry-title"[\s\S]*?>([^<]+)</);

            if (!idMatch || !titleMatch) continue;

            const entryId = idMatch[1];
            const entryName = titleMatch[1].trim();

            const isFolder = chunk.includes('drive/folders/') || chunk.includes('aria-label="Folder"') || chunk.includes('drive-sprite-folder');

            if (isFolder) {
                const subPrefix = prefix ? `${prefix} - ${entryName}` : entryName;
                const subItems = await fetchGoogleDriveFolder(entryId, subPrefix, depth + 1);
                if (subItems && subItems.length > 0) {
                    items.push(...subItems);
                }
            } else {
                // Filtrar archivos no reproducibles como .sfk, .jpg, .png, etc.
                if (entryName.match(/\.(sfk|jpg|jpeg|png|gif|txt|pdf|docx|zip|rar|log|cue)$/i)) {
                    continue;
                }
                const displayName = prefix ? `${prefix} - ${entryName}` : entryName;
                items.push({ id: entryId, name: displayName });
            }
        }

        if (depth === 0 && items.length > 0) {
            items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            gdCache[folderId] = items;
            try {
                fs.writeFileSync(path.join(__dirname, 'gd_cached.json'), JSON.stringify(gdCache, null, 2), 'utf8');
            } catch (err) {}
            return items;
        }

        return items;
    } catch (e) {
        console.error('Error obteniendo carpeta Drive:', e);
    }
    return depth === 0 ? null : [];
}

function createServer(port) {
    const server = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // Endpoint para obtener pistas de Google Drive
        if (pathname === '/api/drive-folder') {
            const folderId = parsedUrl.searchParams.get('id');
            if (!folderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Falta parámetro id' }));
                return;
            }

            const items = await fetchGoogleDriveFolder(folderId);
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: !!items, items: items || [] }));
            return;
        }

        // Endpoint proxy para streaming de audio desde Google Drive
        // Permite reproducción fluida nativa HTML5 con soporte de Range (seeking/adelantar/retroceder)
        // y elimina el bloqueo de seguridad Cross-Site (403 Forbidden / NotSupportedError)
        if (pathname === '/api/audio-stream') {
            if (req.method === 'OPTIONS') {
                res.writeHead(204, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Accept, Content-Type'
                });
                res.end();
                return;
            }

            const fileId = parsedUrl.searchParams.get('id');
            if (!fileId) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Falta parámetro id');
                return;
            }

            const driveUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
            const driveHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            };
            if (req.headers.range) {
                driveHeaders['Range'] = req.headers.range;
            }

            try {
                const driveRes = await fetch(driveUrl, { headers: driveHeaders });
                const resHeaders = {
                    'Content-Type': driveRes.headers.get('content-type') || 'audio/mpeg',
                    'Accept-Ranges': 'bytes',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
                    'Cache-Control': 'public, max-age=3600'
                };
                if (driveRes.headers.get('content-range')) {
                    resHeaders['Content-Range'] = driveRes.headers.get('content-range');
                }
                if (driveRes.headers.get('content-length')) {
                    resHeaders['Content-Length'] = driveRes.headers.get('content-length');
                }

                res.writeHead(driveRes.status, resHeaders);
                if (driveRes.body) {
                    const stream = Readable.fromWeb(driveRes.body);
                    stream.on('error', (err) => {
                        console.warn('Audio stream error:', err.message);
                    });
                    stream.pipe(res);
                } else {
                    res.end();
                }
            } catch (err) {
                console.error('Error en proxy audio-stream:', err);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                }
                res.end('Error transmitiendo audio');
            }
            return;
        }

        let reqPath = pathname;
        if (reqPath === '/' || reqPath === '') {
            reqPath = '/index.html';
        }
        const filePath = path.join(__dirname, reqPath);

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Archivo no encontrado');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Access-Control-Allow-Origin': '*'
            });
            fs.createReadStream(filePath).pipe(res);
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Puerto ${port} ocupado, intentando con ${port + 1}...`);
            createServer(port + 1);
        } else {
            console.error('Error en el servidor:', err);
        }
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}/index.html`;
        console.log(`\n======================================================`);
        console.log(`  Biblioteca Gnostica 2da Camara - Servidor Activo`);
        console.log(`  Disponible en: ${url}`);
        console.log(`  (Presione Ctrl+C en esta consola para detenerlo)`);
        console.log(`======================================================\n`);
        
        exec(`start ${url}`);
    });
}

createServer(PORT);
