// Inicialización de la aplicación
document.getElementById('searchContainer').style.display = 'none';
document.addEventListener('DOMContentLoaded', () => {
    mostrarHistorial();
    configurarEventosModal();
    actualizarBadgesFavoritos();
});

// Variables globales para resultados en memoria
window._resultadosCategoria = [];
window._resultadosBusqueda = [];
window._resultadosFavoritos = [];

function toggleMenu() {
    const menu = document.querySelector('.menu');
    menu.classList.toggle('active');
}

// Búsqueda global al presionar Enter en el campo de texto del buscador
const searchInputElement = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clearSearchBtn');
if (searchInputElement) {
    searchInputElement.addEventListener('input', function () {
        if (clearSearchBtn) {
            clearSearchBtn.style.display = this.value.trim().length > 0 ? 'flex' : 'none';
        }
    });
    searchInputElement.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscar();
        } else if (e.key === 'Escape') {
            limpiarBusquedaGeneral();
        }
    });
}

function limpiarBusquedaGeneral() {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const btn = document.getElementById('clearSearchBtn');
    if (btn) btn.style.display = 'none';
}

// Filtro en tiempo real para la lista de materiales de categoría
const filtroCategoriaInput = document.getElementById('filtro-categoria-input');
if (filtroCategoriaInput) {
    filtroCategoriaInput.addEventListener('input', filtrarMaterialesCategoria);
    filtroCategoriaInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            limpiarFiltroCategoria();
        }
    });
}

// Autenticación de usuario
document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    const usuario = document.getElementById('usuario').value.trim();
    const documento = document.getElementById('documento').value.trim();
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;

    // Feedback visual en botón de login
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Ingresando...';

    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETMIEMBRO/gapp/${documento}`);
        if (!response.ok) {
            throw new Error('El dni cargado no se encuentra en la base de datos.');
        }

        const data = await response.json();

        if (data && data[0].registration && data[0].registration.toString() === usuario) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('searchContainer').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'inline-flex';
            document.querySelectorAll('.menu-link').forEach(link => {
                link.style.display = 'block';
            });
            await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Login/${documento}`);
        } else {
            alert('Id de la federación o documento incorrecto.');
        }
    } catch (error) {
        console.error('Error al conectar con la API:', error);
        alert(`Error al ingresar con el documento ${documento}.`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
});

// Extrae de forma limpia el ID del archivo y retorna la URL del visor embebido oficial de Google Drive
function normalizarDriveUrl(url) {
    if (!url) return '';
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
    }

    // Extraer File ID de Google Drive (compatible con /file/d/ID y id=ID)
    const matchFile = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile && matchFile[1]) {
        return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
    }
    const matchId = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
        return `https://drive.google.com/file/d/${matchId[1]}/preview`;
    }
    if (clean.includes('drive.google.com') && !clean.endsWith('/preview')) {
        return clean.replace(/\/view(\?.*)?$/, '/preview');
    }
    return clean;
}

// Helper para normalizar URL de carátula/imagen
function sanitizarUrlImagen(url) {
    if (!url) return '';
    let clean = String(url).trim();
    if (!clean) return '';
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
        clean = 'https://' + clean;
    }
    return clean;
}

// Helper para limpiar descripciones con HTML/saltos de línea para previews
function limpiarDescripcion(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/<br\s*[\/]?>/gi, ' — ')
        .replace(/<[^>]+>/g, '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Helper para construir enlaces según tipo de material (videos)
function resolverEnlace(item) {
    const tipo = (item.tipo_de_material || '').toLowerCase();
    if (tipo === 'video') {
        return `material/video.php?source=${item.url_link}&name=${encodeURIComponent(item.titulo || '')}&url_imagen=${encodeURIComponent(item.url_imagen || '')}`;
    } else {
        return `${item.url_link}`;
    }
}

// Helper para obtener icono y clase según tipo de material
function obtenerBadgeMaterial(tipoMaterial) {
    const tipo = (tipoMaterial || '').toLowerCase();
    let icono = 'bi-file-earmark';
    let claseBadge = 'badge-libro';

    if (tipo === 'libro') {
        icono = 'bi-book';
        claseBadge = 'badge-libro';
    } else if (tipo === 'audio') {
        icono = 'bi-soundwave';
        claseBadge = 'badge-audio';
    } else if (tipo === 'video') {
        icono = 'bi-camera-reels';
        claseBadge = 'badge-video';
    }

    return `<span class="material-badge ${claseBadge}"><i class="bi ${icono}"></i> ${tipoMaterial || 'Material'}</span>`;
}

// Extraer lista limpia de temas/conferencias a partir de la descripción de audios
function extraerPistasAudio(descripcion) {
    if (!descripcion) return [];
    const textoLimpio = descripcion.replace(/<br\s*[\/]?>/gi, '\n');
    return textoLimpio
        .split('\n')
        .map(t => t.trim().replace(/^[-–•*\d.]+\s*/, '').replace(/\s*[-–]$/, ''))
        .filter(t => t.length > 2);
}

// ==========================================================================
// VISOR MODAL DE LIBROS (PDF DE GOOGLE DRIVE)
// ==========================================================================
function abrirLectorPdf(index, origen) {
    const lista = (origen === 'categoria') ? window._resultadosCategoria : ((origen === 'favoritos') ? window._resultadosFavoritos : window._resultadosBusqueda);
    if (!lista || !lista[index]) return;

    const item = lista[index];
    const modal = document.getElementById('modalLectorPdf');
    const frame = document.getElementById('pdfFrame');
    const spinner = document.getElementById('pdfLoadingSpinner');
    const tituloEl = document.getElementById('pdfModalTitulo');
    const autorEl = document.getElementById('pdfModalAutor');

    tituloEl.textContent = item.titulo || 'Visor de Libro';
    autorEl.textContent = item.autor ? `Autor: ${item.autor}` : 'Biblioteca Digital';

    // Mostrar overlay de carga
    if (spinner) {
        spinner.classList.remove('hidden');
    }

    const finalUrl = normalizarDriveUrl(item.url_link);

    // Ocultar spinner cuando el iframe cargue o tras timeout de seguridad
    if (frame) {
        frame.onload = function () {
            if (spinner) spinner.classList.add('hidden');
        };
        setTimeout(() => {
            if (spinner) spinner.classList.add('hidden');
        }, 1200);

        // Inyectar el PDF de Google Drive directamente en el iframe
        frame.src = finalUrl;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarLectorPdf() {
    const modal = document.getElementById('modalLectorPdf');
    const frame = document.getElementById('pdfFrame');
    if (modal) {
        modal.style.display = 'none';
    }
    if (frame) {
        frame.src = 'about:blank';
    }
    const container = document.getElementById('pdfModalContainer');
    if (container) {
        container.classList.remove('fullscreen');
        const icon = document.getElementById('pdfFullscreenIcon');
        if (icon) {
            icon.className = 'bi bi-arrows-fullscreen';
        }
    }
    verificarRestauracionScroll();
}

function toggleFullscreenPdf() {
    const container = document.getElementById('pdfModalContainer');
    const icon = document.getElementById('pdfFullscreenIcon');
    if (!container) return;

    const isFull = container.classList.toggle('fullscreen');
    if (icon) {
        icon.className = isFull ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
    }
}

// ==========================================================================
// VISOR INTEGRADO DE CARPETA Y REPRODUCTOR INTERNO DE AUDIOS
// ==========================================================================
let listaAudiosEnMemoria = [];
let audioActualIndex = -1;
let vistaAudioActual = 'lista'; // 'lista' o 'drive'

// Base de carpetas de audio conocidas para carga ultrarrápida (cargadas desde carpetas_conocidas.js)
const CARPETAS_AUDIOS_CONOCIDAS = window.CARPETAS_AUDIOS_CONOCIDAS || {};

function extraerFolderIdGoogleDrive(url) {
    if (!url) return '';
    const clean = url.trim();
    const matchFolder = clean.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (matchFolder && matchFolder[1]) return matchFolder[1];
    const matchId = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    return '';
}

window._materialActualAudio = null;
window._materialActualVideo = null;

function renderizarDescripcionResumida(descEl, item, tipo) {
    if (!descEl) return;
    const raw = (item && item.descripcion) ? item.descripcion.trim() : '';
    if (!raw) {
        descEl.style.display = 'none';
        descEl.innerHTML = '';
        return;
    }

    if (tipo === 'audio') {
        window._materialActualAudio = item;
    } else {
        window._materialActualVideo = item;
    }

    // Limpiar etiquetas HTML para calcular longitud real
    const textoPlano = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const esLarga = textoPlano.length > 90 || /<br\s*[\/]?>/i.test(raw);
    const themeClass = tipo === 'video' ? 'video-theme' : '';

    if (esLarga) {
        const resumen = textoPlano.substring(0, 85).trim() + '...';
        descEl.innerHTML = `<span>${escapeHtml(resumen)}</span><button type="button" class="btn-leer-desc ${themeClass}" onclick="abrirModalDetalleDescripcion('${tipo}')" title="Leer descripción completa"><i class="bi bi-info-circle me-1"></i>Leer más</button>`;
    } else {
        descEl.innerHTML = `<span>${escapeHtml(textoPlano)}</span>`;
    }
    descEl.style.display = 'block';
}

function abrirModalDetalleDescripcion(tipo) {
    const item = (tipo === 'video') ? window._materialActualVideo : window._materialActualAudio;
    if (!item || !item.descripcion) return;

    const modal = document.getElementById('modalDetalleDescripcion');
    const tituloEl = document.getElementById('modalDescTitulo');
    const autorEl = document.getElementById('modalDescAutor');
    const cuerpoEl = document.getElementById('modalDescCuerpo');
    const iconEl = document.getElementById('modalDescIcon');

    if (tituloEl) tituloEl.textContent = item.titulo || 'Detalles del Material';
    if (autorEl) autorEl.textContent = item.autor ? `Autor: ${item.autor}` : 'Biblioteca Gnóstica';
    if (iconEl) {
        iconEl.className = tipo === 'video' 
            ? 'bi bi-camera-reels-fill text-purple fs-5 flex-shrink-0' 
            : 'bi bi-soundwave text-success fs-5 flex-shrink-0';
    }
    if (cuerpoEl) {
        const formateado = item.descripcion
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
        cuerpoEl.textContent = formateado;
    }

    if (modal) modal.style.display = 'flex';
}

function cerrarModalDetalleDescripcion(event) {
    if (event && event.target && event.target.closest && event.target.closest('.modal-desc-container')) {
        return;
    }
    const modal = document.getElementById('modalDetalleDescripcion');
    if (modal) modal.style.display = 'none';
}

async function abrirCarpetaAudios(index, origen) {
    const lista = (origen === 'categoria') ? window._resultadosCategoria : ((origen === 'favoritos') ? window._resultadosFavoritos : window._resultadosBusqueda);
    if (!lista || !lista[index]) return;

    const item = lista[index];
    const modal = document.getElementById('modalAudios');
    const tituloEl = document.getElementById('audioModalTitulo');
    const autorEl = document.getElementById('audioModalAutor');
    const externalBtn = document.getElementById('audioExternalLinkBtn');
    const spinner = document.getElementById('audioLoadingSpinner');
    const filesList = document.getElementById('audioFilesList');
    const filesCount = document.getElementById('audioFilesCount');
    const openDriveBtn = document.getElementById('audioOpenDriveBtn');
    const driveFrame = document.getElementById('audioDriveFrame');

    tituloEl.textContent = item.titulo || 'Colección de Audios';
    autorEl.textContent = item.autor ? `Autor: ${item.autor}` : 'Biblioteca Digital';

    const descEl = document.getElementById('audioModalDescripcion');
    renderizarDescripcionResumida(descEl, item, 'audio');

    const url = (item.url_link || '').trim();
    if (externalBtn) externalBtn.href = url;
    if (openDriveBtn) openDriveBtn.href = url;

    // Detener y ocultar reproductor activo anterior
    detenerReproductorInterno();

    // Mostrar modal con spinner
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (spinner) spinner.classList.remove('hidden');
    if (filesList) filesList.innerHTML = '';
    listaAudiosEnMemoria = [];
    audioActualIndex = -1;

    // Asegurar vista de lista inicial
    aplicarVistaAudio('lista');

    const folderId = extraerFolderIdGoogleDrive(url);
    const esGoogleDrive = !!folderId;

    if (esGoogleDrive) {
        if (openDriveBtn) {
            openDriveBtn.innerHTML = '<i class="bi bi-google me-1"></i> Abrir en Google Drive';
            openDriveBtn.href = url;
            openDriveBtn.style.display = 'inline-flex';
        }

        // Cargar iframe de la carpeta de Drive como respaldo / vista alternativa
        if (driveFrame) {
            driveFrame.src = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
        }

        // 1. Revisar si la carpeta está en la base conocida (pre-cacheadas en carpetas_conocidas.js)
        if (CARPETAS_AUDIOS_CONOCIDAS[folderId] && CARPETAS_AUDIOS_CONOCIDAS[folderId].length > 0) {
            listaAudiosEnMemoria = CARPETAS_AUDIOS_CONOCIDAS[folderId];
            renderizarArchivosMp3(listaAudiosEnMemoria);
            if (spinner) spinner.classList.add('hidden');
            return;
        }

        // 2. Intentar obtener archivos dinámicamente mediante el endpoint local del servidor
        try {
            const resp = await fetch(`/api/drive-folder?id=${encodeURIComponent(folderId)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.items && data.items.length > 0) {
                    listaAudiosEnMemoria = data.items;
                    CARPETAS_AUDIOS_CONOCIDAS[folderId] = data.items;
                    renderizarArchivosMp3(listaAudiosEnMemoria);
                    if (spinner) spinner.classList.add('hidden');
                    return;
                }
            }
        } catch (e) {
            console.warn('Endpoint /api/drive-folder no disponible:', e);
        }

        // 3. Si no se obtuvieron pistas parseadas, mostrar la vista directa de Google Drive
        if (spinner) spinner.classList.add('hidden');
        aplicarVistaAudio('drive');
        if (filesCount) filesCount.textContent = 'Carpeta de Google Drive';
    } else {
        // Enlace no-Drive (ej. OneDrive)
        if (spinner) spinner.classList.add('hidden');
        if (openDriveBtn) {
            openDriveBtn.innerHTML = '<i class="bi bi-microsoft me-1"></i> Abrir en OneDrive';
            openDriveBtn.href = url;
            openDriveBtn.style.display = 'inline-flex';
        }
        if (filesCount) filesCount.textContent = 'Alojado en Microsoft OneDrive';
        if (filesList) {
            filesList.innerHTML = `
                <div class="p-4 text-center">
                    <div class="mb-3">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #eff6ff; display: inline-flex; align-items: center; justify-content: center; color: #0284c7;">
                            <i class="bi bi-cloud-arrow-up" style="font-size: 2rem;"></i>
                        </div>
                    </div>
                    <h5 class="fw-bold text-dark mb-2">${escapeHtml(item.titulo || 'Colección de Conferencias')}</h5>
                    <p class="text-muted mx-auto mb-4" style="max-width: 480px; font-size: 0.9rem; line-height: 1.5;">
                        Esta colección se encuentra en <strong>Microsoft OneDrive</strong>.<br>
                        Para contar con la lista de audios y reproductor integrado en esta ventana, se debe vincular la carpeta a <strong>Google Drive</strong>.
                    </p>
                    <a href="${url}" target="_blank" class="btn btn-primary px-4 py-2 fw-semibold" style="border-radius: 50px; box-shadow: 0 4px 12px rgba(37,99,235,0.2);">
                        <i class="bi bi-box-arrow-up-right me-2"></i> Escuchar Audios en OneDrive
                    </a>
                </div>
            `;
        }
    }
}

let reproductorAudioGlobal = null;

function formatearTiempoAudio(seg) {
    if (isNaN(seg) || seg < 0) return '00:00';
    const s = Math.floor(seg % 60);
    const m = Math.floor((seg / 60) % 60);
    const h = Math.floor(seg / 3600);
    const sStr = String(s).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    if (h > 0) {
        return h + ':' + mStr + ':' + sStr;
    }
    return mStr + ':' + sStr;
}

function obtenerReproductorAudio() {
    if (!reproductorAudioGlobal) {
        reproductorAudioGlobal = new Audio();
        reproductorAudioGlobal.preload = 'auto';

        reproductorAudioGlobal.addEventListener('play', () => {
            if (audioActualIndex >= 0) {
                const icon = document.getElementById(`playIcon_${audioActualIndex}`);
                if (icon) icon.className = 'bi bi-pause-fill';
                const row = document.getElementById(`audioRow_${audioActualIndex}`);
                if (row) row.classList.add('playing');
            }
        });

        reproductorAudioGlobal.addEventListener('pause', () => {
            if (audioActualIndex >= 0) {
                const icon = document.getElementById(`playIcon_${audioActualIndex}`);
                if (icon) icon.className = 'bi bi-play-fill';
            }
        });

        reproductorAudioGlobal.addEventListener('timeupdate', () => {
            if (audioActualIndex < 0) return;
            const cur = reproductorAudioGlobal.currentTime;
            const dur = reproductorAudioGlobal.duration;
            const curEl = document.getElementById(`audioTimeCurrent_${audioActualIndex}`);
            const durEl = document.getElementById(`audioTimeDuration_${audioActualIndex}`);
            const fillEl = document.getElementById(`audioProgressFill_${audioActualIndex}`);

            if (curEl) curEl.textContent = formatearTiempoAudio(cur);
            if (durEl && !isNaN(dur) && dur > 0) durEl.textContent = formatearTiempoAudio(dur);
            if (fillEl && !isNaN(dur) && dur > 0) {
                const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
                fillEl.style.width = pct + '%';
            }
        });

        reproductorAudioGlobal.addEventListener('loadedmetadata', () => {
            if (audioActualIndex < 0) return;
            const durEl = document.getElementById(`audioTimeDuration_${audioActualIndex}`);
            if (durEl && !isNaN(reproductorAudioGlobal.duration) && reproductorAudioGlobal.duration > 0) {
                durEl.textContent = formatearTiempoAudio(reproductorAudioGlobal.duration);
            }
        });

        reproductorAudioGlobal.addEventListener('ended', () => {
            reproducirAudioSiguiente();
        });

        reproductorAudioGlobal.addEventListener('error', (e) => {
            console.warn('Error en reproducción nativa de audio:', e);
            const icon = document.getElementById(`playIcon_${audioActualIndex}`);
            if (icon) icon.className = 'bi bi-play-fill';

            // Si falla la reproducción nativa (ej. al abrir como file:// por restricciones CORS de Google Drive)
            // se activa el fallback embebido con el reproductor nativo de Google Drive
            if (audioActualIndex >= 0 && listaAudiosEnMemoria && listaAudiosEnMemoria[audioActualIndex]) {
                const item = listaAudiosEnMemoria[audioActualIndex];
                const progressWrapper = document.getElementById(`audioProgressWrapper_${audioActualIndex}`);
                const fallbackWrapper = document.getElementById(`audioFallbackWrapper_${audioActualIndex}`);
                if (progressWrapper) progressWrapper.style.display = 'none';
                if (fallbackWrapper) {
                    fallbackWrapper.style.display = 'block';
                    fallbackWrapper.innerHTML = `
                        <div style="margin-top: 6px; padding: 4px; background: #000; border-radius: 8px; overflow: hidden;">
                            <iframe src="https://drive.google.com/file/d/${item.id}/preview" style="width: 100%; height: 56px; border: none; display: block;" allow="autoplay"></iframe>
                        </div>
                    `;
                }
            }
        });
    }
    return reproductorAudioGlobal;
}

function renderizarArchivosMp3(items) {
    const filesList = document.getElementById('audioFilesList');
    const filesCount = document.getElementById('audioFilesCount');
    if (!filesList) return;

    if (filesCount) {
        filesCount.textContent = `${items.length} audios listos para reproducir`;
    }

    filesList.innerHTML = items.map((item, idx) => {
        const streamUrl = `https://docs.google.com/uc?export=download&id=${item.id}`;
        const numStr = (idx + 1).toString().padStart(2, '0');

        return `
            <div class="audio-file-row" id="audioRow_${idx}">
                <div class="audio-file-top">
                    <div class="audio-file-left" onclick="reproducirAudioEnModal(${idx})">
                        <button type="button" class="audio-play-circle-btn" onclick="event.stopPropagation(); reproducirAudioEnModal(${idx})" title="Reproducir / Pausar">
                            <i class="bi bi-play-fill" id="playIcon_${idx}"></i>
                        </button>
                        <span class="audio-track-num text-muted">${numStr}</span>
                        <span class="audio-file-name-text" title="${escapeHtml(item.name)}">
                            ${escapeHtml(item.name)}
                        </span>
                    </div>
                    <div class="audio-file-actions">
                        <a href="${streamUrl}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(item.name)}" title="Descargar MP3" class="audio-download-btn">
                            <i class="bi bi-download"></i>
                        </a>
                    </div>
                </div>
                <!-- Barra de progreso individual del audio -->
                <div class="audio-row-player" id="audioPlayerBox_${idx}" style="display: none;">
                    <div class="audio-row-progress-wrapper" id="audioProgressWrapper_${idx}">
                        <span class="audio-time-label" id="audioTimeCurrent_${idx}">00:00</span>
                        <div class="audio-progress-track" id="audioProgressTrack_${idx}" onclick="adelantarAudio(event, ${idx})" title="Hacer clic para adelantar o retroceder">
                            <div class="audio-progress-fill" id="audioProgressFill_${idx}" style="width: 0%;"></div>
                        </div>
                        <span class="audio-time-label" id="audioTimeDuration_${idx}">--:--</span>
                    </div>
                    <div id="audioFallbackWrapper_${idx}" style="display: none;"></div>
                </div>
            </div>
        `;
    }).join('');
}

function reproducirAudioEnModal(index) {
    if (!listaAudiosEnMemoria || !listaAudiosEnMemoria[index]) return;
    const player = obtenerReproductorAudio();

    // Caso 1: Clic en la misma pista ya activa -> Alternar Pausa / Play
    if (audioActualIndex === index) {
        const icon = document.getElementById(`playIcon_${index}`);
        const row = document.getElementById(`audioRow_${index}`);
        if (player.paused) {
            player.play().catch(e => console.warn(e));
            if (icon) icon.className = 'bi bi-pause-fill';
            if (row) row.classList.add('playing');
        } else {
            player.pause();
            if (icon) icon.className = 'bi bi-play-fill';
            if (row) row.classList.remove('playing');
        }
        return;
    }

    // Caso 2: Clic en otra pista -> Limpiar la pista anterior
    if (audioActualIndex >= 0) {
        const prevRow = document.getElementById(`audioRow_${audioActualIndex}`);
        const prevIcon = document.getElementById(`playIcon_${audioActualIndex}`);
        const prevBox = document.getElementById(`audioPlayerBox_${audioActualIndex}`);
        const prevFill = document.getElementById(`audioProgressFill_${audioActualIndex}`);
        const prevFallback = document.getElementById(`audioFallbackWrapper_${audioActualIndex}`);
        const prevProgress = document.getElementById(`audioProgressWrapper_${audioActualIndex}`);
        if (prevRow) prevRow.classList.remove('playing');
        if (prevIcon) prevIcon.className = 'bi bi-play-fill';
        if (prevBox) prevBox.style.display = 'none';
        if (prevFill) prevFill.style.width = '0%';
        if (prevProgress) prevProgress.style.display = 'flex';
        if (prevFallback) {
            prevFallback.style.display = 'none';
            prevFallback.innerHTML = '';
        }
    }

    audioActualIndex = index;
    const item = listaAudiosEnMemoria[index];
    const currentRow = document.getElementById(`audioRow_${index}`);
    const currentIcon = document.getElementById(`playIcon_${index}`);
    const currentBox = document.getElementById(`audioPlayerBox_${index}`);
    const currentProgress = document.getElementById(`audioProgressWrapper_${index}`);
    const currentFallback = document.getElementById(`audioFallbackWrapper_${index}`);

    if (currentRow) {
        currentRow.classList.add('playing');
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (currentIcon) currentIcon.className = 'bi bi-pause-fill';
    if (currentBox) currentBox.style.display = 'block';
    if (currentProgress) currentProgress.style.display = 'flex';
    if (currentFallback) {
        currentFallback.style.display = 'none';
        currentFallback.innerHTML = '';
    }

    // Determinar URL de streaming:
    // Si corre en servidor HTTP (ej: localhost:8080), usa el proxy streaming para evitar CORS 403 de Drive
    // Si corre desde file:///, usa la URL directa con fallback al reproductor embebido
    let streamUrl;
    if (window.location.protocol.startsWith('http')) {
        streamUrl = `/api/audio-stream?id=${encodeURIComponent(item.id)}`;
    } else {
        streamUrl = `https://docs.google.com/uc?export=download&id=${encodeURIComponent(item.id)}`;
    }

    player.src = streamUrl;
    player.play().catch(e => {
        console.warn('Autoplay bloqueado o error en reproducción directa:', e);
        if (currentIcon) currentIcon.className = 'bi bi-play-fill';
        if (!window.location.protocol.startsWith('http')) {
            if (currentProgress) currentProgress.style.display = 'none';
            if (currentFallback) {
                currentFallback.style.display = 'block';
                currentFallback.innerHTML = `
                    <div style="margin-top: 6px; padding: 4px; background: #000; border-radius: 8px; overflow: hidden;">
                        <iframe src="https://drive.google.com/file/d/${item.id}/preview" style="width: 100%; height: 56px; border: none; display: block;" allow="autoplay"></iframe>
                    </div>
                `;
            }
        }
    });
}

function adelantarAudio(event, index) {
    event.stopPropagation();
    if (audioActualIndex !== index || !reproductorAudioGlobal) return;
    const track = document.getElementById(`audioProgressTrack_${index}`);
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    if (width <= 0) return;
    const pct = Math.max(0, Math.min(1, clickX / width));
    if (!isNaN(reproductorAudioGlobal.duration) && reproductorAudioGlobal.duration > 0) {
        reproductorAudioGlobal.currentTime = pct * reproductorAudioGlobal.duration;
    }
}

function reproducirAudioSiguiente() {
    if (!listaAudiosEnMemoria || listaAudiosEnMemoria.length === 0) return;
    const nextIndex = (audioActualIndex + 1) % listaAudiosEnMemoria.length;
    reproducirAudioEnModal(nextIndex);
}

function reproducirAudioAnterior() {
    if (!listaAudiosEnMemoria || listaAudiosEnMemoria.length === 0) return;
    const prevIndex = (audioActualIndex - 1 + listaAudiosEnMemoria.length) % listaAudiosEnMemoria.length;
    reproducirAudioEnModal(prevIndex);
}

function detenerReproductorInterno() {
    if (reproductorAudioGlobal) {
        reproductorAudioGlobal.pause();
        reproductorAudioGlobal.src = '';
    }
    if (audioActualIndex >= 0) {
        const prevRow = document.getElementById(`audioRow_${audioActualIndex}`);
        const prevIcon = document.getElementById(`playIcon_${audioActualIndex}`);
        const prevBox = document.getElementById(`audioPlayerBox_${audioActualIndex}`);
        const prevFill = document.getElementById(`audioProgressFill_${audioActualIndex}`);
        const prevFallback = document.getElementById(`audioFallbackWrapper_${audioActualIndex}`);
        const prevProgress = document.getElementById(`audioProgressWrapper_${audioActualIndex}`);
        if (prevRow) prevRow.classList.remove('playing');
        if (prevIcon) prevIcon.className = 'bi bi-play-fill';
        if (prevBox) prevBox.style.display = 'none';
        if (prevFill) prevFill.style.width = '0%';
        if (prevProgress) prevProgress.style.display = 'flex';
        if (prevFallback) {
            prevFallback.style.display = 'none';
            prevFallback.innerHTML = '';
        }
    }
    audioActualIndex = -1;
}

function toggleAudioFolderView(forzarVista) {
    const nuevaVista = forzarVista || (vistaAudioActual === 'lista' ? 'drive' : 'lista');
    aplicarVistaAudio(nuevaVista);
}

function aplicarVistaAudio(vista) {
    vistaAudioActual = vista;
    const filesContainer = document.getElementById('audioFilesContainer');
    const frameWrapper = document.getElementById('audioFrameWrapper');
    const textToggle = document.getElementById('textToggleAudioView');
    const iconToggle = document.getElementById('iconToggleAudioView');

    if (vista === 'drive') {
        if (filesContainer) filesContainer.style.display = 'none';
        if (frameWrapper) frameWrapper.style.display = 'flex';
        if (textToggle) textToggle.textContent = 'Ver Lista de Audios';
        if (iconToggle) iconToggle.className = 'bi bi-music-note-list';
    } else {
        if (filesContainer) filesContainer.style.display = 'flex';
        if (frameWrapper) frameWrapper.style.display = 'none';
        if (textToggle) textToggle.textContent = 'Ver Carpeta Drive';
        if (iconToggle) iconToggle.className = 'bi bi-folder2';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cerrarModalAudios() {
    const modal = document.getElementById('modalAudios');
    const driveFrame = document.getElementById('audioDriveFrame');

    detenerReproductorInterno();

    if (driveFrame) {
        driveFrame.src = 'about:blank';
    }

    if (modal) {
        modal.style.display = 'none';
    }
    const container = document.getElementById('audioModalContainer');
    if (container) {
        container.classList.remove('fullscreen');
        const icon = document.getElementById('audioFullscreenIcon');
        if (icon) {
            icon.className = 'bi bi-arrows-fullscreen';
        }
    }
    cerrarModalDetalleDescripcion();
    verificarRestauracionScroll();
}

function toggleFullscreenAudio() {
    const container = document.getElementById('audioModalContainer');
    const icon = document.getElementById('audioFullscreenIcon');
    if (!container) return;

    const isFull = container.classList.toggle('fullscreen');
    if (icon) {
        icon.className = isFull ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
    }
}

// ==========================================================================
// VISOR INTEGRADO DE VIDEOS CON PLAYLIST MULTI-PARTE
// ==========================================================================
let listaVideosPlaylist = [];
let videoActualIndex = 0;

function extraerIdsVideos(cadena) {
    if (!cadena) return [];
    const partes = cadena.split(/[,;]/);
    const ids = [];

    partes.forEach(parte => {
        let limpia = parte.trim();
        if (!limpia) return;

        // Si es una URL completa de YouTube, extraer el ID
        const matchYtWatch = limpia.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (matchYtWatch && matchYtWatch[1]) {
            ids.push(matchYtWatch[1]);
            return;
        }
        const matchYtShort = limpia.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (matchYtShort && matchYtShort[1]) {
            ids.push(matchYtShort[1]);
            return;
        }
        const matchYtEmbed = limpia.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        if (matchYtEmbed && matchYtEmbed[1]) {
            ids.push(matchYtEmbed[1]);
            return;
        }

        // Si es directamente un ID alfanumérico limpio
        const matchDirect = limpia.match(/^[a-zA-Z0-9_-]+$/);
        if (matchDirect) {
            ids.push(limpia);
        }
    });

    return ids;
}

function abrirReproductorVideo(index, origen) {
    const lista = (origen === 'categoria') ? window._resultadosCategoria : ((origen === 'favoritos') ? window._resultadosFavoritos : window._resultadosBusqueda);
    if (!lista || !lista[index]) return;

    const item = lista[index];
    const modal = document.getElementById('modalVideos');
    const tituloEl = document.getElementById('videoModalTitulo');
    const autorEl = document.getElementById('videoModalAutor');
    const playlistContainer = document.getElementById('videoPlaylistItems');
    const playlistCountEl = document.getElementById('videoPlaylistCount');
    const toggleBtn = document.getElementById('btnToggleVideoPlaylist');

    tituloEl.textContent = item.titulo || 'Video';
    autorEl.textContent = item.autor ? `Autor: ${item.autor}` : 'Biblioteca Digital';

    const descEl = document.getElementById('videoModalDescripcion');
    renderizarDescripcionResumida(descEl, item, 'video');

    const rawIds = extraerIdsVideos(item.url_link);
    if (rawIds.length === 0) {
        alert('No se encontraron videos disponibles para este material.');
        return;
    }

    listaVideosPlaylist = rawIds.map((vidId, i) => {
        return {
            id: vidId,
            partNum: i + 1,
            title: `Parte ${i + 1}`,
            fullTitle: `${item.titulo || 'Video'} — Parte ${i + 1}`,
            thumb: `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`
        };
    });

    if (playlistCountEl) {
        playlistCountEl.textContent = `${listaVideosPlaylist.length} ${listaVideosPlaylist.length === 1 ? 'parte' : 'partes'}`;
    }

    // Renderizar panel de la lista de reproducción
    if (playlistContainer) {
        playlistContainer.innerHTML = listaVideosPlaylist.map((v, i) => `
            <div class="video-playlist-item" id="videoPlaylistItem_${i}" onclick="reproducirVideoEnModal(${i})" title="Reproducir ${v.title}">
                <div class="video-item-thumb-box">
                    <img src="${v.thumb}" class="video-item-thumb-img" alt="${v.title}" onerror="this.src='images/preview_images/default.jpg'">
                    <div class="video-item-play-overlay">
                        <i class="bi bi-play-fill" id="videoThumbIcon_${i}"></i>
                    </div>
                </div>
                <div class="video-item-info">
                    <span class="video-item-part-title">${v.title}</span>
                    <span class="video-item-part-sub">${escapeHtml(item.titulo || 'Conferencia')}</span>
                </div>
            </div>
        `).join('');
    }

    const esSingle = listaVideosPlaylist.length <= 1;
    if (toggleBtn) {
        toggleBtn.style.display = esSingle ? 'none' : 'inline-flex';
    }

    const sidebar = document.getElementById('videoPlaylistSidebar');
    const stage = document.querySelector('.video-main-stage');
    const textToggle = document.getElementById('textToggleVideoPlaylist');
    const navBar = document.querySelector('.video-navigation-bar');

    if (sidebar) {
        if (esSingle) {
            sidebar.classList.add('hidden');
        } else {
            sidebar.classList.remove('hidden');
        }
    }
    if (stage) {
        if (esSingle) {
            stage.classList.add('playlist-hidden');
        } else {
            stage.classList.remove('playlist-hidden');
        }
    }
    if (navBar) {
        navBar.style.display = esSingle ? 'none' : 'flex';
    }
    if (textToggle) {
        textToggle.textContent = 'Ocultar Lista';
    }

    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reproducir primer video
    reproducirVideoEnModal(0);
}

function reproducirVideoEnModal(indice) {
    if (!listaVideosPlaylist || !listaVideosPlaylist[indice]) return;

    // Si la lista estaba levantada hacia arriba en móvil, restaurarla automáticamente
    restaurarPlaylistMobile();

    const vid = listaVideosPlaylist[indice];
    const iframe = document.getElementById('videoPlayerFrame');
    const parteBadge = document.getElementById('videoParteBadge');
    const counterEl = document.getElementById('videoNavCounter');
    const titleEl = document.getElementById('videoNavTitle');

    // Desmarcar anterior
    if (videoActualIndex >= 0) {
        const prevItem = document.getElementById(`videoPlaylistItem_${videoActualIndex}`);
        const prevIcon = document.getElementById(`videoThumbIcon_${videoActualIndex}`);
        if (prevItem) prevItem.classList.remove('active');
        if (prevIcon) prevIcon.className = 'bi bi-play-fill';
    }

    videoActualIndex = indice;

    // Marcar actual
    const currentItem = document.getElementById(`videoPlaylistItem_${indice}`);
    const currentIcon = document.getElementById(`videoThumbIcon_${indice}`);
    if (currentItem) {
        currentItem.classList.add('active');
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (currentIcon) {
        currentIcon.className = 'bi bi-soundwave';
    }

    // Actualizar cabecera y barra de navegación
    const total = listaVideosPlaylist.length;
    if (parteBadge) parteBadge.textContent = `Parte ${indice + 1} de ${total}`;
    if (counterEl) counterEl.textContent = `Parte ${indice + 1} / ${total}`;
    if (titleEl) titleEl.textContent = vid.fullTitle;

    // Actualizar botón de enlace externo
    const extBtn = document.getElementById('videoExternalLinkBtn');
    if (extBtn) {
        extBtn.href = `https://www.youtube.com/watch?v=${vid.id}`;
    }

    // Gestionar aviso de protocolo file:///
    const noticeEl = document.getElementById('videoFileProtocolNotice');
    if (noticeEl) {
        if (window.location.protocol === 'file:') {
            noticeEl.classList.remove('d-none');
            noticeEl.classList.add('d-flex');
            const extNoticeBtn = document.getElementById('videoNoticeOpenExternalBtn');
            if (extNoticeBtn) {
                extNoticeBtn.href = `https://www.youtube.com/watch?v=${vid.id}`;
            }
        } else {
            noticeEl.classList.add('d-none');
            noticeEl.classList.remove('d-flex');
        }
    }

    // Cargar iframe de YouTube con parámetros estándar y reproducción en línea
    if (iframe) {
        iframe.src = `https://www.youtube.com/embed/${vid.id}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
    }
}

function toggleExpandPlaylistMobile() {
    const sidebar = document.getElementById('videoPlaylistSidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('expanded-mobile');
}

function restaurarPlaylistMobile() {
    const sidebar = document.getElementById('videoPlaylistSidebar');
    if (sidebar && sidebar.classList.contains('expanded-mobile')) {
        sidebar.classList.remove('expanded-mobile');
    }
}

function reproducirVideoSiguiente() {
    if (!listaVideosPlaylist || listaVideosPlaylist.length === 0) return;
    const next = (videoActualIndex + 1) % listaVideosPlaylist.length;
    reproducirVideoEnModal(next);
}

function reproducirVideoAnterior() {
    if (!listaVideosPlaylist || listaVideosPlaylist.length === 0) return;
    const prev = (videoActualIndex - 1 + listaVideosPlaylist.length) % listaVideosPlaylist.length;
    reproducirVideoEnModal(prev);
}

function toggleVideoPlaylist() {
    const sidebar = document.getElementById('videoPlaylistSidebar');
    const stage = document.querySelector('.video-main-stage');
    const textToggle = document.getElementById('textToggleVideoPlaylist');
    if (!sidebar) return;

    const isHidden = sidebar.classList.toggle('hidden');
    if (stage) {
        stage.classList.toggle('playlist-hidden', isHidden);
    }
    if (textToggle) {
        textToggle.textContent = isHidden ? 'Ver Lista' : 'Ocultar Lista';
    }
}

function toggleFullscreenVideo() {
    const container = document.getElementById('videoModalContainer');
    const icon = document.getElementById('videoFullscreenIcon');
    if (!container) return;

    const isFull = container.classList.toggle('fullscreen');
    if (icon) {
        icon.className = isFull ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
    }
}

function cerrarModalVideos() {
    const modal = document.getElementById('modalVideos');
    const iframe = document.getElementById('videoPlayerFrame');
    const container = document.getElementById('videoModalContainer');

    if (iframe) {
        iframe.src = 'about:blank';
    }
    if (modal) {
        modal.style.display = 'none';
    }
    if (container) {
        container.classList.remove('fullscreen');
        const icon = document.getElementById('videoFullscreenIcon');
        if (icon) icon.className = 'bi bi-arrows-fullscreen';
    }

    restaurarPlaylistMobile();
    cerrarModalDetalleDescripcion();
    verificarRestauracionScroll();
}

// ==========================================================================
// BÚSQUEDA POR CATEGORÍA
// Material: 1 LIBRO, 2 VIDEO, 3 AUDIO
// Autor:    1 VMSAW, 2 VMLD
// ==========================================================================
// ==========================================================================
// BÚSQUEDA POR CATEGORÍA CON FILTRO EN TIEMPO REAL
// Material: 1 LIBRO, 2 VIDEO, 3 AUDIO
// Autor:    1 VMSAW, 2 VMLD
// ==========================================================================
async function buscarPorCategoria(material, autor) {
    const resultsDiv = document.getElementById('resultsEspecial');
    const tituloResultsDiv = document.getElementById('tituloResultsEspecial');
    const filtroContainer = document.getElementById('filtroCategoriaContainer');
    const filtroInput = document.getElementById('filtro-categoria-input');
    const clearFiltroBtn = document.getElementById('clearFiltroBtn');

    if (filtroInput) filtroInput.value = '';
    if (clearFiltroBtn) clearFiltroBtn.style.display = 'none';
    if (filtroContainer) filtroContainer.style.display = 'none';

    // Estado de carga con spinner minimalista
    resultsDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner-minimal"></div>
            <span>Cargando materiales...</span>
        </div>
    `;
    tituloResultsDiv.innerHTML = '';

    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETALLMATERIAL/1/gapp/${material}/100/${autor}/0`);
        const results = await response.json();
        await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Busqueda-Categoria/${material}--${autor}`);

        if (results && results.length > 0) {
            window._resultadosCategoria = results;
            window._categoriaActualAutor = results[0].autor || '';
            window._categoriaActualTipo = results[0].tipo_de_material || '';

            // Mostrar buscador / filtro específico para esta lista de materiales
            if (filtroContainer) {
                filtroContainer.style.display = 'flex';
                if (filtroInput) {
                    const tipoNombre = (results[0].tipo_de_material || 'materiales').toLowerCase();
                    filtroInput.placeholder = `Filtrar en esta lista de ${tipoNombre} (ej. título o tema)...`;
                }
            }

            actualizarTituloCategoria(results.length, results.length);
            renderizarResultadosCategoria(results, '');

        } else {
            if (filtroContainer) filtroContainer.style.display = 'none';
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p>No se encontraron resultados en esta categoría.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error(err);
        if (filtroContainer) filtroContainer.style.display = 'none';
        resultsDiv.innerHTML = `
            <div class="empty-state text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Ocurrió un error al buscar materiales. Intenta nuevamente.</p>
            </div>
        `;
    }
}

function actualizarTituloCategoria(mostrados, total) {
    const tituloResultsDiv = document.getElementById('tituloResultsEspecial');
    if (!tituloResultsDiv) return;

    const autor = window._categoriaActualAutor || '';
    const tipo = window._categoriaActualTipo || '';
    const badgeFiltro = (mostrados < total)
        ? `<span class="badge bg-secondary ms-2" style="font-size: 0.8rem; font-weight: 500;">Mostrando ${mostrados} de ${total}</span>`
        : `<span class="badge bg-light text-muted border ms-2" style="font-size: 0.8rem; font-weight: 500;">${total} materiales</span>`;

    tituloResultsDiv.innerHTML = `
        <h3>
            <i class="bi bi-collection-play"></i> 
            ${autor} <span style="font-weight: 400; color: var(--text-muted);">— ${tipo}</span>
            ${badgeFiltro}
        </h3>
    `;
}

function renderizarResultadosCategoria(items, filtro = '') {
    const resultsDiv = document.getElementById('resultsEspecial');
    if (!resultsDiv) return;

    if (!items || items.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-funnel"></i>
                <p>No se encontraron materiales que coincidan con "${escapeHtml(filtro)}".</p>
            </div>
        `;
        return;
    }

    resultsDiv.innerHTML = items.map((r) => {
        const originalIndex = window._resultadosCategoria ? window._resultadosCategoria.indexOf(r) : 0;
        const i = (originalIndex >= 0) ? originalIndex : 0;

        const tipo = (r.tipo_de_material || '').toLowerCase();
        const badge = obtenerBadgeMaterial(r.tipo_de_material);
        const esLibro = (tipo === 'libro');
        const esAudio = (tipo === 'audio');
        const esVideo = (tipo === 'video');

        const tituloMostrado = filtro ? resaltarTexto(r.titulo, filtro) : escapeHtml(r.titulo);

        let accionClick = '';
        if (esLibro) {
            accionClick = `abrirLectorPdf(${i}, 'categoria')`;
        } else if (esAudio) {
            accionClick = `abrirCarpetaAudios(${i}, 'categoria')`;
        } else if (esVideo) {
            accionClick = `abrirReproductorVideo(${i}, 'categoria')`;
        } else {
            accionClick = r.descripcion ? `mostrarDetalle(${i}, 'categoria')` : '';
        }

        let elementoTitulo = '';
        if (esLibro) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirLectorPdf(${i}, 'categoria'); event.stopPropagation();" title="Ver PDF directamente">
                    ${tituloMostrado}
                </button>
            `;
        } else if (esAudio) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirCarpetaAudios(${i}, 'categoria'); event.stopPropagation();" title="Ver carpeta de audios">
                    ${tituloMostrado}
                </button>
            `;
        } else if (esVideo) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirReproductorVideo(${i}, 'categoria'); event.stopPropagation();" title="Reproducir video">
                    ${tituloMostrado}
                </button>
            `;
        } else {
            const enlaceDestino = resolverEnlace(r);
            elementoTitulo = `
                <a href="${enlaceDestino}" target="_blank" onclick="event.stopPropagation()">
                    ${tituloMostrado}
                </a>
            `;
        }

        // Tapa / portada
        const imgUrl = sanitizarUrlImagen(r.url_imagen);
        const coverHtml = imgUrl ? `
            <div class="result-card-cover">
                <img src="${imgUrl}" alt="${escapeHtml(r.titulo || 'Material')}" loading="lazy" onerror="this.closest('.result-card-cover').style.display='none';">
            </div>
        ` : '';

        // Descripción real de la API
        const descLimpia = limpiarDescripcion(r.descripcion);
        let descHtml = '';
        if (descLimpia) {
            const descCorta = descLimpia.length > 200 ? descLimpia.substring(0, 200) + '...' : descLimpia;
            const descTexto = filtro ? resaltarTexto(descCorta, filtro) : escapeHtml(descCorta);
            descHtml = `<p class="card-text card-text-preview mb-0 mt-1">${descTexto}</p>`;
        } else if (esAudio) {
            descHtml = `<p class="card-text card-text-preview text-muted small mb-0 mt-1"><i class="bi bi-music-note-list me-1"></i>Colección de audios y conferencias.</p>`;
        } else if (esVideo) {
            descHtml = `<p class="card-text card-text-preview text-muted small mb-0 mt-1"><i class="bi bi-camera-reels me-1"></i>Serie de conferencias en video.</p>`;
        }

        const favId = obtenerIdMaterial(r);
        const esFav = esFavorito(r);

        return `
        <div class="result-item" onclick="${accionClick}">
            <div class="result-card-inner">
                ${coverHtml}
                <div class="result-card-body">
                    <div class="d-flex align-items-center justify-content-between gap-2">
                        <div class="card-title mb-0">
                            ${elementoTitulo}
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${badge}
                            <button type="button" class="btn-fav ${esFav ? 'active' : ''}" data-fav-id="${favId}" onclick="toggleFavoritoClick(event, 'categoria', ${i})" title="${esFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
                                <i class="bi ${esFav ? 'bi-star-fill text-warning' : 'bi-star'}"></i>
                            </button>
                        </div>
                    </div>
                    ${descHtml}
                </div>
            </div>
        </div>`;
    }).join('');
}

function filtrarMaterialesCategoria() {
    const input = document.getElementById('filtro-categoria-input');
    const query = (input ? input.value : '').trim();
    const clearBtn = document.getElementById('clearFiltroBtn');
    if (clearBtn) {
        clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }

    if (!window._resultadosCategoria || window._resultadosCategoria.length === 0) return;

    if (!query) {
        actualizarTituloCategoria(window._resultadosCategoria.length, window._resultadosCategoria.length);
        renderizarResultadosCategoria(window._resultadosCategoria, '');
        return;
    }

    function normalizar(str) {
        return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    const queryNorm = normalizar(query);
    const filtrados = window._resultadosCategoria.filter(item => {
        return normalizar(item.titulo).includes(queryNorm) ||
               normalizar(item.descripcion).includes(queryNorm);
    });

    actualizarTituloCategoria(filtrados.length, window._resultadosCategoria.length);
    renderizarResultadosCategoria(filtrados, query);
}

function limpiarFiltroCategoria() {
    const input = document.getElementById('filtro-categoria-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const clearBtn = document.getElementById('clearFiltroBtn');
    if (clearBtn) clearBtn.style.display = 'none';

    if (window._resultadosCategoria) {
        actualizarTituloCategoria(window._resultadosCategoria.length, window._resultadosCategoria.length);
        renderizarResultadosCategoria(window._resultadosCategoria, '');
    }
}

// ==========================================================================
// BÚSQUEDA LIBRE GLOBAL (SOLAPA BUSCADOR)
// ==========================================================================
async function buscar() {
    const searchInput = document.getElementById('search-input');
    const query = (searchInput ? searchInput.value : '').trim();
    const resultsDiv = document.getElementById('results');

    if (!query) return;

    // Estado de carga con spinner minimalista
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="loading-state">
                <div class="spinner-minimal"></div>
                <span>Buscando resultados...</span>
            </div>
        `;
    }

    // Cambiar a la pestaña de resultados si no está activa
    const resultadosTabBtn = document.getElementById('resultados-tab');
    if (resultadosTabBtn && window.bootstrap && window.bootstrap.Tab) {
        const tab = window.bootstrap.Tab.getOrCreateInstance(resultadosTabBtn);
        tab.show();
    }

    guardarBusqueda(query);

    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETMATERIALSEARCH/1/biblioteca/${encodeURIComponent(query)}/0`);
        const results = await response.json();
        await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Busqueda/${encodeURIComponent(query)}`);

        if (results && results.length > 0) {
            window._resultadosBusqueda = results;
            window._queryActualBusqueda = query;
            window._gruposBusqueda = agruparResultadosBusqueda(results, query);
            window._filtroPillBusqueda = 'todos';

            renderizarResultadosBusquedaAgrupados();
        } else {
            window._resultadosBusqueda = [];
            window._gruposBusqueda = [];
            if (resultsDiv) {
                resultsDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="bi bi-search"></i>
                        <p>No se encontraron resultados para "${escapeHtml(query)}".</p>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error(err);
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="empty-state text-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Ocurrió un error en la búsqueda. Intenta nuevamente.</p>
                </div>
            `;
        }
    }
}

// Variables globales para agrupación de búsqueda
window._gruposBusqueda = [];
window._queryActualBusqueda = '';
window._filtroPillBusqueda = 'todos';

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function centrarFragmento(texto, query, radio = 85) {
    if (!texto) return '';
    function quitarAcentos(s) {
        return (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    const textoNorm = quitarAcentos(texto);
    const queryNorm = quitarAcentos(query);
    const idx = textoNorm.indexOf(queryNorm);

    if (idx === -1) {
        return texto.length > 200 ? texto.substring(0, 197) + '...' : texto;
    }

    const inicio = Math.max(0, idx - radio);
    const fin = Math.min(texto.length, idx + query.length + radio + 40);

    let fragmento = texto.substring(inicio, fin).trim();
    if (inicio > 0) fragmento = '...' + fragmento;
    if (fin < texto.length) fragmento = fragmento + '...';

    return fragmento;
}

function agruparResultadosBusqueda(results, query) {
    function normalizar(str) {
        return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    const queryNorm = normalizar(query);
    const gruposMap = new Map();

    results.forEach((item, index) => {
        const tipo = (item.tipo_de_material || 'Material').trim();
        const autor = (item.autor || '').trim();
        const titulo = (item.titulo || '').trim();
        const key = `${tipo.toLowerCase()}||${autor.toLowerCase()}||${titulo.toLowerCase()}`;

        if (!gruposMap.has(key)) {
            const coincideTitulo = normalizar(titulo).includes(queryNorm);
            gruposMap.set(key, {
                id: `grp_${gruposMap.size}`,
                item: item,
                originalIndex: index,
                tipo: tipo,
                titulo: titulo,
                autor: autor,
                coincideTitulo: coincideTitulo,
                fragmentos: []
            });
        }

        const grp = gruposMap.get(key);
        if (item.descripcion && item.descripcion.trim().length > 0) {
            const desc = item.descripcion.trim();
            if (!grp.fragmentos.includes(desc)) {
                grp.fragmentos.push(desc);
            }
        }
    });

    const grupos = Array.from(gruposMap.values());

    // Ordenar: primero coincidencias en título, luego por cantidad de citas
    grupos.sort((a, b) => {
        if (a.coincideTitulo && !b.coincideTitulo) return -1;
        if (!a.coincideTitulo && b.coincideTitulo) return 1;
        return b.fragmentos.length - a.fragmentos.length;
    });

    return grupos;
}

function filtrarPillBusqueda(filtro) {
    window._filtroPillBusqueda = filtro;
    renderizarResultadosBusquedaAgrupados();
}

function toggleCitas(id) {
    const el = document.getElementById(`citas-${id}`);
    const btn = document.getElementById(`btn-toggle-${id}`);
    if (!el || !btn) return;

    if (el.style.display === 'none') {
        el.style.display = 'block';
        btn.classList.add('active');
        btn.innerHTML = `<i class="bi bi-chevron-up me-1"></i> Ocultar citas ▴`;
    } else {
        el.style.display = 'none';
        btn.classList.remove('active');
        const count = el.getAttribute('data-total') || '';
        btn.innerHTML = `<i class="bi bi-chevron-down me-1"></i> Ver ${count} ${count === '1' ? 'cita' : 'citas'} ▾`;
    }
}

function mostrarTodasLasCitas(id, btn) {
    const extra = document.getElementById(`citas-extra-${id}`);
    if (extra) {
        extra.style.display = 'flex';
        extra.style.flexDirection = 'column';
        extra.style.gap = '10px';
    }
    if (btn) btn.style.display = 'none';
}

function renderizarResultadosBusquedaAgrupados() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    const grupos = window._gruposBusqueda || [];
    const query = window._queryActualBusqueda || '';
    const filtro = window._filtroPillBusqueda || 'todos';

    if (grupos.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-search"></i>
                <p>No se encontraron resultados para "${escapeHtml(query)}".</p>
            </div>
        `;
        return;
    }

    // Calcular totales para las pills
    const totalTodos = grupos.length;
    const totalTitulo = grupos.filter(g => g.coincideTitulo).length;
    const totalLibros = grupos.filter(g => g.tipo.toLowerCase() === 'libro').length;
    const totalAudios = grupos.filter(g => g.tipo.toLowerCase() === 'audio').length;
    const totalVideos = grupos.filter(g => g.tipo.toLowerCase() === 'video').length;

    // Filtrar según pill seleccionada
    let gruposFiltrados = grupos;
    if (filtro === 'titulo') {
        gruposFiltrados = grupos.filter(g => g.coincideTitulo);
    } else if (filtro === 'libro') {
        gruposFiltrados = grupos.filter(g => g.tipo.toLowerCase() === 'libro');
    } else if (filtro === 'audio') {
        gruposFiltrados = grupos.filter(g => g.tipo.toLowerCase() === 'audio');
    } else if (filtro === 'video') {
        gruposFiltrados = grupos.filter(g => g.tipo.toLowerCase() === 'video');
    }

    // Construir barra de pills
    const pillsHtml = `
        <div class="search-filter-pills">
            <button type="button" class="filter-pill ${filtro === 'todos' ? 'active' : ''}" onclick="filtrarPillBusqueda('todos')">
                Todos <span class="pill-count">${totalTodos}</span>
            </button>
            ${totalTitulo > 0 ? `
                <button type="button" class="filter-pill ${filtro === 'titulo' ? 'active' : ''}" onclick="filtrarPillBusqueda('titulo')">
                    <i class="bi bi-bullseye"></i> En Título <span class="pill-count">${totalTitulo}</span>
                </button>
            ` : ''}
            ${totalLibros > 0 ? `
                <button type="button" class="filter-pill ${filtro === 'libro' ? 'active' : ''}" onclick="filtrarPillBusqueda('libro')">
                    <i class="bi bi-book"></i> Libros <span class="pill-count">${totalLibros}</span>
                </button>
            ` : ''}
            ${totalAudios > 0 ? `
                <button type="button" class="filter-pill ${filtro === 'audio' ? 'active' : ''}" onclick="filtrarPillBusqueda('audio')">
                    <i class="bi bi-soundwave"></i> Audios <span class="pill-count">${totalAudios}</span>
                </button>
            ` : ''}
            ${totalVideos > 0 ? `
                <button type="button" class="filter-pill ${filtro === 'video' ? 'active' : ''}" onclick="filtrarPillBusqueda('video')">
                    <i class="bi bi-camera-reels"></i> Videos <span class="pill-count">${totalVideos}</span>
                </button>
            ` : ''}
        </div>
    `;

    if (gruposFiltrados.length === 0) {
        resultsDiv.innerHTML = `
            ${pillsHtml}
            <div class="empty-state">
                <i class="bi bi-funnel"></i>
                <p>No hay resultados en esta sección de filtro.</p>
            </div>
        `;
        return;
    }

    const cardsHtml = gruposFiltrados.map((g) => {
        const i = g.originalIndex;
        const tipoLower = g.tipo.toLowerCase();
        const badge = obtenerBadgeMaterial(g.tipo);
        const esLibro = (tipoLower === 'libro');
        const esAudio = (tipoLower === 'audio');
        const esVideo = (tipoLower === 'video');

        // Título con resaltado si coincide
        const tituloHtml = g.coincideTitulo ? resaltarTexto(g.titulo, query) : escapeHtml(g.titulo);

        // Elemento título y botón de acción principal
        let elementoTitulo = '';
        let botonPrincipal = '';

        if (esLibro) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirLectorPdf(${i}, 'busqueda');" title="Leer libro en pantalla completa">
                    ${tituloHtml}
                </button>
            `;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-primary btn-open-material" onclick="abrirLectorPdf(${i}, 'busqueda');">
                    <i class="bi bi-book"></i> Leer Libro
                </button>
            `;
        } else if (esAudio) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirCarpetaAudios(${i}, 'busqueda');" title="Ver colección de audios">
                    ${tituloHtml}
                </button>
            `;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-success btn-open-material" onclick="abrirCarpetaAudios(${i}, 'busqueda');">
                    <i class="bi bi-soundwave"></i> Escuchar Audios
                </button>
            `;
        } else if (esVideo) {
            elementoTitulo = `
                <button type="button" class="book-trigger-btn" onclick="abrirReproductorVideo(${i}, 'busqueda');" title="Ver serie de videos">
                    ${tituloHtml}
                </button>
            `;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-purple btn-open-material" style="color: #7e22ce; border-color: #d8b4fe;" onclick="abrirReproductorVideo(${i}, 'busqueda');">
                    <i class="bi bi-camera-reels"></i> Ver Video
                </button>
            `;
        } else {
            const enlaceDestino = resolverEnlace(g.item);
            elementoTitulo = `
                <a href="${enlaceDestino}" target="_blank">
                    ${tituloHtml}
                </a>
            `;
            botonPrincipal = `
                <a href="${enlaceDestino}" target="_blank" class="btn btn-sm btn-outline-secondary btn-open-material">
                    <i class="bi bi-box-arrow-up-right"></i> Abrir Enlace
                </a>
            `;
        }

        // Citas / fragmentos
        let botonVerCitas = '';
        let citasContainerHtml = '';

        if (g.fragmentos.length > 0) {
            const totalCitas = g.fragmentos.length;
            botonVerCitas = `
                <button type="button" class="btn btn-sm btn-light border text-secondary btn-toggle-citas" id="btn-toggle-${g.id}" onclick="toggleCitas('${g.id}')">
                    <i class="bi bi-chevron-down me-1"></i> Ver ${totalCitas} ${totalCitas === 1 ? 'cita' : 'citas'} ▾
                </button>
            `;

            // Primeras 3 citas visibles
            const visibles = g.fragmentos.slice(0, 3);
            const ocultas = g.fragmentos.slice(3);

            const renderCita = (txt, idx) => {
                const centrado = centrarFragmento(txt, query, 85);
                const resaltado = resaltarTexto(centrado, query);
                return `
                    <div class="cita-item">
                        <span class="cita-num">${idx + 1}.</span> ${resaltado}
                    </div>
                `;
            };

            const visiblesHtml = visibles.map((t, idx) => renderCita(t, idx)).join('');
            const ocultasHtml = ocultas.length > 0 ? `
                <div id="citas-extra-${g.id}" style="display: none;">
                    ${ocultas.map((t, idx) => renderCita(t, idx + 3)).join('')}
                </div>
                <button type="button" class="btn btn-link btn-sm text-decoration-none p-0 mt-2 text-primary fw-semibold" onclick="mostrarTodasLasCitas('${g.id}', this)">
                    <i class="bi bi-plus-circle me-1"></i> Mostrar las ${ocultas.length} citas restantes de esta obra...
                </button>
            ` : '';

            citasContainerHtml = `
                <div id="citas-${g.id}" class="citas-container mt-3" data-total="${totalCitas}" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted small fw-semibold">
                            <i class="bi bi-chat-quote-fill text-warning me-1"></i> Párrafos donde se menciona "${escapeHtml(query)}":
                        </span>
                    </div>
                    <div class="citas-list">
                        ${visiblesHtml}
                        ${ocultasHtml}
                    </div>
                </div>
            `;
        }

        // Tapa / portada
        const imgUrl = sanitizarUrlImagen(g.item ? g.item.url_imagen : '');
        const coverHtml = imgUrl ? `
            <div class="result-card-cover">
                <img src="${imgUrl}" alt="${escapeHtml(g.titulo || 'Material')}" loading="lazy" onerror="this.closest('.result-card-cover').style.display='none';">
            </div>
        ` : '';

        // Descripción de la obra si existe
        const descLimpia = limpiarDescripcion(g.item ? g.item.descripcion : '');
        let descHtml = '';
        if (descLimpia) {
            const descCorta = descLimpia.length > 200 ? descLimpia.substring(0, 200) + '...' : descLimpia;
            const descTexto = query ? resaltarTexto(descCorta, query) : escapeHtml(descCorta);
            descHtml = `<p class="card-text card-text-preview text-muted small mb-0 mt-2">${descTexto}</p>`;
        }

        const favId = obtenerIdMaterial(g.item);
        const esFav = esFavorito(g.item);

        return `
            <div class="card result-item grouped-card mb-3">
                <div class="result-card-inner">
                    ${coverHtml}
                    <div class="result-card-body">
                        <div class="grouped-title-area">
                            <div class="d-flex align-items-center justify-content-between gap-2">
                                <h4 class="card-title mb-1">
                                    ${elementoTitulo}
                                </h4>
                                <button type="button" class="btn-fav ${esFav ? 'active' : ''}" data-fav-id="${favId}" onclick="toggleFavoritoClick(event, 'busqueda', ${i})" title="${esFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
                                    <i class="bi ${esFav ? 'bi-star-fill text-warning' : 'bi-star'}"></i>
                                </button>
                            </div>
                            <div class="grouped-meta">
                                <span class="grouped-author"><i class="bi bi-person"></i> ${escapeHtml(g.autor) || 'Biblioteca'}</span>
                                ${badge}
                                ${g.coincideTitulo ? '<span class="badge badge-titulo-match"><i class="bi bi-bullseye me-1"></i>En título</span>' : ''}
                                ${g.fragmentos.length > 0 ? `<span class="badge badge-menciones"><i class="bi bi-chat-quote me-1"></i>${g.fragmentos.length} ${g.fragmentos.length === 1 ? 'mención' : 'menciones en texto'}</span>` : ''}
                            </div>
                            ${descHtml}
                        </div>

                        <div class="grouped-actions mt-3 d-flex flex-wrap gap-2 align-items-center">
                            ${botonPrincipal}
                            ${botonVerCitas}
                        </div>

                        ${citasContainerHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    resultsDiv.innerHTML = pillsHtml + cardsHtml;
}

// ==========================================================================
// MODAL DE DETALLE (PARA VIDEOS Y OTROS MATERIALES)
// ==========================================================================
function mostrarDetalle(index, origen = 'busqueda') {
    const lista = (origen === 'categoria') ? window._resultadosCategoria : ((origen === 'favoritos') ? window._resultadosFavoritos : window._resultadosBusqueda);
    if (!lista || !lista[index]) return;
    
    const data = lista[index];
    const tipo = (data.tipo_de_material || '').toLowerCase();

    // Redirección directa para libros, audios y videos
    if (tipo === 'libro') {
        abrirLectorPdf(index, origen);
        return;
    }
    if (tipo === 'audio') {
        abrirCarpetaAudios(index, origen);
        return;
    }
    if (tipo === 'video') {
        abrirReproductorVideo(index, origen);
        return;
    }

    const modal = document.getElementById('modalDetalle');
    const contenido = document.getElementById('modalContenido');

    const busqueda = (document.getElementById('search-input').value || '').trim();
    const textoOriginal = data.descripcion || 'Sin descripción detallada disponible.';
    const detalleResaltado = busqueda ? resaltarTexto(textoOriginal, busqueda) : textoOriginal;

    const badge = obtenerBadgeMaterial(data.tipo_de_material);
    const enlaceDestino = resolverEnlace(data);

    const botonAccion = `
        <a href="${enlaceDestino}" target="_blank" class="modal-action-btn mb-0">
            <i class="bi bi-box-arrow-up-right"></i> Abrir Recurso
        </a>
    `;

    contenido.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            ${badge}
            ${botonAccion}
        </div>
        <div class="titulo">${data.titulo}</div>
        ${data.autor ? `<p class="text-muted small mb-3"><i class="bi bi-person me-1"></i><strong>Autor:</strong> ${data.autor}</p>` : ''}
        <div class="detalle-preview">${detalleResaltado}</div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    const modal = document.getElementById('modalDetalle');
    if (modal) {
        modal.style.display = 'none';
    }
    verificarRestauracionScroll();
}

function verificarRestauracionScroll() {
    const modalDetalle = document.getElementById('modalDetalle');
    const modalLector = document.getElementById('modalLectorPdf');
    const modalAudios = document.getElementById('modalAudios');
    const modalVideos = document.getElementById('modalVideos');

    const detalleAbierto = modalDetalle && modalDetalle.style.display === 'block';
    const lectorAbierto = modalLector && modalLector.style.display === 'flex';
    const audiosAbierto = modalAudios && modalAudios.style.display === 'flex';
    const videosAbierto = modalVideos && modalVideos.style.display === 'flex';

    if (!detalleAbierto && !lectorAbierto && !audiosAbierto && !videosAbierto) {
        document.body.style.overflow = '';
    }
}

// Configurar cierre de modales por clic exterior y tecla Escape
function configurarEventosModal() {
    const modalDetalle = document.getElementById('modalDetalle');
    const modalLectorPdf = document.getElementById('modalLectorPdf');
    const modalAudios = document.getElementById('modalAudios');
    const modalVideos = document.getElementById('modalVideos');

    if (modalDetalle) {
        modalDetalle.addEventListener('click', function (e) {
            if (e.target === modalDetalle) {
                cerrarModal();
            }
        });
    }

    if (modalLectorPdf) {
        modalLectorPdf.addEventListener('click', function (e) {
            if (e.target === modalLectorPdf) {
                cerrarLectorPdf();
            }
        });
    }

    if (modalAudios) {
        modalAudios.addEventListener('click', function (e) {
            if (e.target === modalAudios) {
                cerrarModalAudios();
            }
        });
    }

    if (modalVideos) {
        modalVideos.addEventListener('click', function (e) {
            if (e.target === modalVideos) {
                cerrarModalVideos();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (modalVideos && modalVideos.style.display === 'flex') {
                cerrarModalVideos();
            } else if (modalAudios && modalAudios.style.display === 'flex') {
                cerrarModalAudios();
            } else if (modalLectorPdf && modalLectorPdf.style.display === 'flex') {
                cerrarLectorPdf();
            } else if (modalDetalle && modalDetalle.style.display === 'block') {
                cerrarModal();
            }
        }
    });
}

// Resaltado de texto sin distorsión por acentos
function resaltarTexto(textoOriginal, busqueda) {
    function quitarAcentos(texto) {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    const textoSinAcentos = quitarAcentos(textoOriginal);
    const busquedaSinAcentos = quitarAcentos(busqueda);

    if (!busquedaSinAcentos.trim()) return textoOriginal;

    const queryEscapada = busquedaSinAcentos.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${queryEscapada})`, 'gi');

    let partes = [];
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(textoSinAcentos)) !== null) {
        const inicio = match.index;
        const fin = regex.lastIndex;
        partes.push(
            textoOriginal.slice(lastIndex, inicio),
            `<mark>${textoOriginal.slice(inicio, fin)}</mark>`
        );
        lastIndex = fin;
    }

    partes.push(textoOriginal.slice(lastIndex));
    return partes.join('');
}

// Cerrar sesión
function deslogear() {
    cerrarLectorPdf();
    cerrarModalAudios();
    cerrarModalVideos();
    cerrarModal();
    document.getElementById('searchContainer').style.display = 'none';
    document.getElementById('logoutLink').style.display = 'none';
    document.querySelectorAll('.menu-link').forEach(link => {
        link.style.display = 'none';
    });
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('loginForm').reset();
    
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) resultsDiv.innerHTML = '';
    const resultsEsp = document.getElementById('resultsEspecial');
    if (resultsEsp) resultsEsp.innerHTML = '';
    const tituloEsp = document.getElementById('tituloResultsEspecial');
    if (tituloEsp) tituloEsp.innerHTML = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    const filtroInput = document.getElementById('filtro-categoria-input');
    if (filtroInput) filtroInput.value = '';
    const clearFiltroBtn = document.getElementById('clearFiltroBtn');
    if (clearFiltroBtn) clearFiltroBtn.style.display = 'none';
    const filtroContainer = document.getElementById('filtroCategoriaContainer');
    if (filtroContainer) filtroContainer.style.display = 'none';

    window._resultadosBusqueda = [];
    window._gruposBusqueda = [];
    window._queryActualBusqueda = '';
    window._filtroPillBusqueda = 'todos';

    const menu = document.querySelector('.menu');
    if (menu && menu.classList.contains('active')) {
        menu.classList.remove('active');
    }
}

// Guardar búsqueda en localStorage
function guardarBusqueda(query) {
    if (!query.trim()) return;

    let historial = JSON.parse(localStorage.getItem('historialBusquedas')) || [];
    historial = historial.filter(item => item.toLowerCase() !== query.toLowerCase());
    historial.unshift(query);
    historial = historial.slice(0, 10);

    localStorage.setItem('historialBusquedas', JSON.stringify(historial));
    mostrarHistorial();
}

// Mostrar historial en la página
function mostrarHistorial() {
    const historial = JSON.parse(localStorage.getItem('historialBusquedas')) || [];
    const lista = document.getElementById('history-list');
    if (!lista) return;

    lista.innerHTML = '';

    if (historial.length === 0) {
        lista.innerHTML = `
            <li class="list-group-item text-muted justify-content-center" style="cursor: default;">
                <i class="bi bi-clock-history me-2"></i> No hay búsquedas recientes
            </li>
        `;
        return;
    }

    historial.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="history-item-left">
                <i class="bi bi-clock-history"></i>
                <span>${item}</span>
            </div>
            <i class="bi bi-arrow-up-left text-muted small" title="Cargar búsqueda"></i>
        `;
        li.onclick = () => {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = item;
            const buscadorTabBtn = document.getElementById('buscador-tab');
            if (buscadorTabBtn && window.bootstrap && window.bootstrap.Tab) {
                const tab = window.bootstrap.Tab.getOrCreateInstance(buscadorTabBtn);
                tab.show();
            }
            buscar();
        };
        lista.appendChild(li);
    });
}

// ==========================================================================
// SECCIÓN FAVORITOS (LOCALSTORAGE & GESTIÓN MULTI-MATERIAL)
// ==========================================================================
const CLAVE_FAVORITOS_STORAGE = 'biblioteca_favoritos_v1';
window._filtroTipoFavoritos = 'todos';
window._busquedaTextoFavoritos = '';

function obtenerIdMaterial(item) {
    if (!item) return '';
    const tipo = (item.tipo_de_material || '').trim().toLowerCase();
    const titulo = (item.titulo || '').trim().toLowerCase();
    const autor = (item.autor || '').trim().toLowerCase();
    return `${tipo}___${titulo}___${autor}`;
}

function cargarFavoritos() {
    try {
        const raw = localStorage.getItem(CLAVE_FAVORITOS_STORAGE);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Error leyendo favoritos:', e);
        return [];
    }
}

function guardarFavoritos(lista) {
    try {
        localStorage.setItem(CLAVE_FAVORITOS_STORAGE, JSON.stringify(lista));
    } catch (e) {
        console.error('Error guardando favoritos:', e);
    }
    actualizarBadgesFavoritos();
    actualizarIconosFavoritosEnPantalla();
}

function esFavorito(item) {
    if (!item) return false;
    const id = obtenerIdMaterial(item);
    const favs = cargarFavoritos();
    return favs.some(f => f.id === id);
}

function toggleFavoritoClick(event, origen, index) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    let item = null;
    if (origen === 'categoria') {
        item = window._resultadosCategoria ? window._resultadosCategoria[index] : null;
    } else if (origen === 'busqueda') {
        item = window._resultadosBusqueda ? window._resultadosBusqueda[index] : null;
    } else if (origen === 'favoritos') {
        item = window._resultadosFavoritos ? window._resultadosFavoritos[index] : null;
    } else if (typeof origen === 'object') {
        item = origen;
    }

    if (!item) return;

    const id = obtenerIdMaterial(item);
    let favs = cargarFavoritos();
    const pos = favs.findIndex(f => f.id === id);

    if (pos >= 0) {
        favs.splice(pos, 1);
    } else {
        favs.unshift({
            id: id,
            titulo: item.titulo || '',
            autor: item.autor || '',
            tipo_de_material: item.tipo_de_material || 'Libro',
            url_link: item.url_link || '',
            url_imagen: item.url_imagen || '',
            descripcion: item.descripcion || '',
            fecha: Date.now()
        });
    }

    guardarFavoritos(favs);

    // Si la solapa de favoritos está visible, refrescarla
    const pestanaFav = document.getElementById('seccionFavoritos');
    if (pestanaFav && pestanaFav.classList.contains('active')) {
        renderizarSeccionFavoritos();
    }
}

function eliminarFavoritoPorId(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    let favs = cargarFavoritos();
    favs = favs.filter(f => f.id !== id);
    guardarFavoritos(favs);
    renderizarSeccionFavoritos();
}

function actualizarBadgesFavoritos() {
    const favs = cargarFavoritos();
    const count = favs.length;

    const badgeHeader = document.getElementById('favoritosBadgeHeader');
    if (badgeHeader) {
        badgeHeader.textContent = count;
    }

    const countBadge = document.getElementById('favoritosCountBadge');
    if (countBadge) {
        countBadge.textContent = count;
        countBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Actualizar conteos de pastillas
    const countTodos = document.getElementById('favCountTodos');
    const countLibros = document.getElementById('favCountLibros');
    const countAudios = document.getElementById('favCountAudios');
    const countVideos = document.getElementById('favCountVideos');

    if (countTodos) countTodos.textContent = count;
    if (countLibros) countLibros.textContent = favs.filter(f => (f.tipo_de_material || '').toLowerCase() === 'libro').length;
    if (countAudios) countAudios.textContent = favs.filter(f => (f.tipo_de_material || '').toLowerCase() === 'audio').length;
    if (countVideos) countVideos.textContent = favs.filter(f => (f.tipo_de_material || '').toLowerCase() === 'video').length;
}

function actualizarIconosFavoritosEnPantalla() {
    const favs = cargarFavoritos();
    const idSet = new Set(favs.map(f => f.id));

    document.querySelectorAll('[data-fav-id]').forEach(btn => {
        const id = btn.getAttribute('data-fav-id');
        const activo = idSet.has(id);
        btn.classList.toggle('active', activo);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = activo ? 'bi bi-star-fill text-warning' : 'bi bi-star';
        }
        btn.setAttribute('title', activo ? 'Quitar de favoritos' : 'Guardar en favoritos');
    });
}

function abrirPestanaFavoritos() {
    renderizarSeccionFavoritos();
}

function filtrarPillFavoritos(tipo) {
    window._filtroTipoFavoritos = tipo;
    const pills = document.querySelectorAll('#favoritosFilterPills .filter-pill');
    pills.forEach(p => p.classList.remove('active'));

    const pillActiva = document.getElementById(`fav-pill-${tipo}`);
    if (pillActiva) pillActiva.classList.add('active');

    renderizarSeccionFavoritos();
}

function filtrarFavoritos() {
    const input = document.getElementById('filtro-favoritos-input');
    const query = (input ? input.value : '').trim();
    window._busquedaTextoFavoritos = query;

    const clearBtn = document.getElementById('clearFiltroFavBtn');
    if (clearBtn) {
        clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }

    renderizarSeccionFavoritos();
}

function limpiarFiltroFavoritos() {
    const input = document.getElementById('filtro-favoritos-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const clearBtn = document.getElementById('clearFiltroFavBtn');
    if (clearBtn) clearBtn.style.display = 'none';

    window._busquedaTextoFavoritos = '';
    renderizarSeccionFavoritos();
}

function renderizarSeccionFavoritos() {
    const resultsDiv = document.getElementById('resultsFavoritos');
    if (!resultsDiv) return;

    actualizarBadgesFavoritos();

    const favs = cargarFavoritos();
    const tipoFiltro = window._filtroTipoFavoritos || 'todos';
    const query = (window._busquedaTextoFavoritos || '').trim();

    function norm(str) {
        return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    const queryNorm = norm(query);

    let filtrados = favs;

    // Filtro por tipo de material
    if (tipoFiltro !== 'todos') {
        filtrados = filtrados.filter(item => (item.tipo_de_material || '').toLowerCase() === tipoFiltro);
    }

    // Filtro por búsqueda de texto
    if (queryNorm) {
        filtrados = filtrados.filter(item => {
            return norm(item.titulo).includes(queryNorm) ||
                   norm(item.autor).includes(queryNorm) ||
                   norm(item.descripcion).includes(queryNorm);
        });
    }

    // Guardar referencia en memoria para que los clics abran el visor
    window._resultadosFavoritos = filtrados;

    if (favs.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-star text-warning" style="font-size: 3rem;"></i>
                <h5 class="mt-3">Aún no tienes materiales favoritos</h5>
                <p class="text-muted">Explora las <strong>Categorías</strong> o el <strong>Buscador</strong> y haz clic en la estrella (⭐) de cualquier libro, audio o video para guardarlo aquí y tenerlo siempre a mano.</p>
            </div>
        `;
        return;
    }

    if (filtrados.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-funnel"></i>
                <p>No se encontraron favoritos que coincidan con el filtro actual.</p>
            </div>
        `;
        return;
    }

    resultsDiv.innerHTML = filtrados.map((item, index) => {
        const tipo = (item.tipo_de_material || '').toLowerCase();
        const badge = obtenerBadgeMaterial(item.tipo_de_material);
        const esLibro = (tipo === 'libro');
        const esAudio = (tipo === 'audio');
        const esVideo = (tipo === 'video');

        const tituloMostrado = query ? resaltarTexto(item.titulo, query) : escapeHtml(item.titulo);

        let accionClick = '';
        let botonPrincipal = '';

        if (esLibro) {
            accionClick = `abrirLectorPdf(${index}, 'favoritos')`;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-primary btn-open-material" onclick="abrirLectorPdf(${index}, 'favoritos'); event.stopPropagation();">
                    <i class="bi bi-book"></i> Leer Libro
                </button>
            `;
        } else if (esAudio) {
            accionClick = `abrirCarpetaAudios(${index}, 'favoritos')`;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-success btn-open-material" onclick="abrirCarpetaAudios(${index}, 'favoritos'); event.stopPropagation();">
                    <i class="bi bi-soundwave"></i> Escuchar Audios
                </button>
            `;
        } else if (esVideo) {
            accionClick = `abrirReproductorVideo(${index}, 'favoritos')`;
            botonPrincipal = `
                <button type="button" class="btn btn-sm btn-outline-purple btn-open-material" style="color: #7e22ce; border-color: #d8b4fe;" onclick="abrirReproductorVideo(${index}, 'favoritos'); event.stopPropagation();">
                    <i class="bi bi-camera-reels"></i> Ver Video
                </button>
            `;
        } else {
            const enlaceDestino = resolverEnlace(item);
            accionClick = item.descripcion ? `mostrarDetalle(${index}, 'favoritos')` : '';
            botonPrincipal = `
                <a href="${enlaceDestino}" target="_blank" class="btn btn-sm btn-outline-secondary btn-open-material" onclick="event.stopPropagation();">
                    <i class="bi bi-box-arrow-up-right"></i> Abrir Enlace
                </a>
            `;
        }

        const imgUrl = sanitizarUrlImagen(item.url_imagen);
        const coverHtml = imgUrl ? `
            <div class="result-card-cover">
                <img src="${imgUrl}" alt="${escapeHtml(item.titulo || 'Material')}" loading="lazy" onerror="this.closest('.result-card-cover').style.display='none';">
            </div>
        ` : '';

        const descLimpia = limpiarDescripcion(item.descripcion);
        let descHtml = '';
        if (descLimpia) {
            const descCorta = descLimpia.length > 180 ? descLimpia.substring(0, 180) + '...' : descLimpia;
            const descTexto = query ? resaltarTexto(descCorta, query) : escapeHtml(descCorta);
            descHtml = `<p class="card-text card-text-preview mb-0 mt-1">${descTexto}</p>`;
        }

        return `
        <div class="result-item fav-card mb-3" onclick="${accionClick}">
            <div class="result-card-inner">
                ${coverHtml}
                <div class="result-card-body">
                    <div class="d-flex align-items-center justify-content-between gap-2">
                        <div class="card-title mb-0">
                            ${tituloMostrado}
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${badge}
                            <button type="button" class="btn-fav active" data-fav-id="${item.id}" onclick="eliminarFavoritoPorId('${item.id}', event)" title="Quitar de favoritos">
                                <i class="bi bi-star-fill text-warning"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-muted small mt-1 mb-2">
                        <i class="bi bi-person"></i> ${escapeHtml(item.autor) || 'Biblioteca'}
                    </div>
                    ${descHtml}
                    <div class="fav-actions mt-3">
                        ${botonPrincipal}
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarFavoritoPorId('${item.id}', event)" title="Quitar de favoritos">
                            <i class="bi bi-trash3 me-1"></i> Quitar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}
