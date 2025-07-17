document.getElementById('searchContainer').style.display = 'none';
document.addEventListener('DOMContentLoaded', mostrarHistorial);
function toggleMenu() {
    const menu = document.querySelector('.menu');
    menu.classList.toggle('active');
}
document.getElementById('search-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        buscar();
    }
});
document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const documento = document.getElementById('documento').value;

    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETMIEMBRO/gapp/${documento}`);
        if (!response.ok) {
            throw new Error('El dni cargado no se encuentra en la base de datos.');
        }

        const data = await response.json();

        if (data && data[0].registration && data[0].registration.toString() === usuario) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('searchContainer').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'inline';  // Mostrar cerrar sesión
            document.querySelectorAll('.menu-link').forEach(link => {
                link.style.display = 'block';
            });
            await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Login/${documento}`);
        } else {
            alert('Id de la federacion o documento incorrecto');
        }
    } catch (error) {
        console.error('Error al conectar con la API:', error);
        alert(`Error al ingresar el usuario ${documento}`);
    }
});

//Material 1 LIBRO 2 VIDEO 3 AUDIO
//Autor   1 VMSAW 2 VMLD
async function buscarPorCategoria(material, autor) {
    const resultsDiv = document.getElementById('resultsEspecial');
    const tituloResultsDiv = document.getElementById('tituloResultsEspecial');
    resultsDiv.innerHTML = 'Buscando...';
    tituloResultsDiv.innerHTML = '';
    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETALLMATERIAL/1/gapp/${material}/100/${autor}/0`);
        const results = await response.json();
        await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Busqueda-Categoria/${material}--${autor}`);
        if (results.length > 0) {
            tituloResultsDiv.innerHTML = ' <h3> ' + results[0].autor + ' - ' + results[0].tipo_de_material  + ' </h3> ' ; 
            resultsDiv.innerHTML = results.map((r, i) => {
                let tipo = (r.tipo_de_material || '').toLowerCase();
                let enlaceDestino = '';

                if (tipo === 'libro') {
                    enlaceDestino = `material/libro.php?source=${('https://' + r.url_link)}`;
                } else if (tipo === 'video') {
                    enlaceDestino = `material/video.php?source=${r.url_link}&name=${r.titulo}&url_imagen=${r.url_imagen}`;
                } else {
                    // Para libros u otro tipo, se usa el link original (se asume que es un enlace completo)
                    enlaceDestino = `${r.url_link}`;
                }
                let icono = '';

                switch ((r.tipo_de_material || '').toLowerCase()) {
                    case 'libro':
                        icono = '<i class="bi bi-book"></i>';
                        break;
                    case 'audio':
                        icono = '<i class="bi bi-mic"></i>';
                        break;
                    case 'video':
                        icono = '<i class="bi bi-camera-reels"></i>';
                        break;
                    default:
                        icono = '<i class="bi bi-file-earmark"></i>'; // ícono genérico
                } 
                return `
                <div class="result-item" >
                   <a href="${enlaceDestino}" target="_blank"> 
                                ${r.titulo}
                            </a>  
                </div>`;
            }).join('');

            // Guardar resultados en memoria para usar en el modal
            window._resultadosBusqueda = results;
        } else {
            resultsDiv.innerHTML = 'No se encontraron resultados.';
        }
    } catch (err) {
        resultsDiv.innerHTML = 'Error al buscar.';
    }
}

async function buscar() {
    const query = document.getElementById('search-input').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = 'Buscando...';
    guardarBusqueda(query);
    try {
        const response = await fetch(`https://ac.gnosis.is/api/GAPP/GETMATERIALSEARCH/1/biblioteca/${encodeURIComponent(query)}/0`);
        const results = await response.json();
        await fetch(`https://ac.gnosis.is/api/LOG/Biblioteca-Busqueda/${query}`);
        if (results.length > 0) {
            resultsDiv.innerHTML = results.map((r, i) => {
                let tipo = (r.tipo_de_material || '').toLowerCase();
                let enlaceDestino = '';

                if (tipo === 'libro') {
                    enlaceDestino = `material/libro.php?source=${('https://' + r.url_link)}`;
                } else if (tipo === 'video') {
                    enlaceDestino = `material/video.php?source=${r.url_link}&name=${r.titulo}&url_imagen=${r.url_imagen}`;
                } else {
                    // Para libros u otro tipo, se usa el link original (se asume que es un enlace completo)
                    enlaceDestino = `${r.url_link}`;
                }
                let icono = '';

                switch ((r.tipo_de_material || '').toLowerCase()) {
                    case 'libro':
                        icono = '<i class="bi bi-book"></i>';
                        break;
                    case 'audio':
                        icono = '<i class="bi bi-mic"></i>';
                        break;
                    case 'video':
                        icono = '<i class="bi bi-camera-reels"></i>';
                        break;
                    default:
                        icono = '<i class="bi bi-file-earmark"></i>'; // ícono genérico
                }

                return `
                <div class="card mb-3 shadow-sm result-item" >
                    <div class="card-body">
                        <p class="card-title">${icono}
                            <a href="${enlaceDestino}" target="_blank"> 
                                ${r.titulo}
                            </a>
                        </p>
                        <p class="card-text text-muted small" onclick="mostrarDetalle(${i})">${r.descripcion?.substring(0, 200) ?? ''}</p>
                    </div>
                </div>`;
            }).join('');

            // Guardar resultados en memoria para usar en el modal
            window._resultadosBusqueda = results;
        } else {
            resultsDiv.innerHTML = 'No se encontraron resultados.';
        }
    } catch (err) {
        resultsDiv.innerHTML = 'Error al buscar.';
    }
}

function mostrarDetalle(index) {
    const data = window._resultadosBusqueda[index];
    const modal = document.getElementById('modalDetalle');
    const contenido = document.getElementById('modalContenido');

    const busqueda = document.getElementById('search-input').value.trim();
    const detalleResaltado = resaltarTexto(data.descripcion ?? '', busqueda);

    // Construcción dinámica del enlace según tipo_de_material
    let tipo = (data.tipo_de_material || '').toLowerCase();
    let enlaceDestino = '';

    if (tipo === 'libro') {
        enlaceDestino = `material/libro.php?source=${('https://' + data.url_link)}`;
    } else if (tipo === 'video') {
        enlaceDestino = `material/video.php?source=${data.url_link}&name=${data.titulo}&url_imagen=${data.url_imagen}`;
    } else {
        // Para libros u otro tipo, se usa el link original (se asume que es un enlace completo)
        enlaceDestino = `${data.url_link}`;
    }

    contenido.innerHTML = `
        <p><a href="${enlaceDestino}" target="_blank">Ir al enlace</a></p>
        <div class="titulo">${data.titulo}</div>
        <div class="detalle-preview">${detalleResaltado}</div>
    `;

    modal.style.display = 'block';
}


function cerrarModal() {
    document.getElementById('modalDetalle').style.display = 'none';
}

function resaltarTexto(textoOriginal, busqueda) {
    function quitarAcentos(texto) {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    const textoSinAcentos = quitarAcentos(textoOriginal);
    const busquedaSinAcentos = quitarAcentos(busqueda);

    const regex = new RegExp(`(${busquedaSinAcentos})`, 'gi');

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
function deslogear() {
    document.getElementById('searchContainer').style.display = 'none';
    document.getElementById('logoutLink').style.display = 'none';
    document.querySelectorAll('.menu-link', '.menu-group').forEach(link => {
        link.style.display = 'none';

    });
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('loginForm').reset();
    document.getElementById('results').innerHTML = '';

    // Cerrar menú responsive si está abierto
    const menu = document.querySelector('.menu');
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
    }
}

// Guardar búsqueda en localStorage
function guardarBusqueda(query) {
   if (!query.trim()) return; // No guardar si está vacío

    let historial = JSON.parse(localStorage.getItem('historialBusquedas')) || [];

    // Eliminar si ya existe
    historial = historial.filter(item => item !== query);

    // Agregar al inicio
    historial.unshift(query);

    // Limitar a 10 elementos
    historial = historial.slice(0, 10);

    localStorage.setItem('historialBusquedas', JSON.stringify(historial));
    mostrarHistorial();
}

// Mostrar historial en la página
function mostrarHistorial() {
    const historial = JSON.parse(localStorage.getItem('historialBusquedas')) || [];
    const lista = document.getElementById('history-list');
    lista.innerHTML = '';

    historial.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        li.className = 'list-group-item list-group-item-action';
        li.style.cursor = 'pointer';
        li.onclick = () => {
            document.getElementById('search-input').value = item;
            buscar();
        };
        lista.appendChild(li);
    });
}
 
