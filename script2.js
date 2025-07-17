document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const searchForm = document.getElementById('search-form');
    const searchBox = document.getElementById('search-box');
    const loginBox = document.getElementById('login-container');
    const resultsDiv = document.getElementById('results');
    const loginError = document.getElementById('login-error');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const downloadLink = document.getElementById('download-link');
    const closeModal = document.querySelector('.close-modal');
    const logoutButton = document.getElementById('logout');
    const menuIcon = document.querySelector('.menu-icon');
    const menuItems = document.getElementById('menu-items');
    const imagenModal = document.getElementById('imagen-modal');
    let allResults = []; // Almacena todos los resultados obtenidos de la API
    let currentPage = 1;
    const resultsPerPage = 10;
    const paginationDiv = document.getElementById('pagination');
    const material = document.getElementById('material');
    // Función para mostrar/ocultar el menú responsive
    function toggleMenu() {
        menuItems.classList.toggle('hidden');
    }

    //menuIcon.addEventListener('click', toggleMenu);

    // Cerrar sesión
    //logoutButton.addEventListener('click', function () {
    //    searchBox.style.display = 'none';
    //    loginBox.style.display = 'block';
    //    menuItems.classList.add('hidden');
    //});

    // Login API
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginBox.style.display = 'none';
        searchBox.style.display = 'block';
        // Llamada a la API para validar el login
        /* 
        fetch('https://tuapi.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginBox.style.display = 'none';
                searchBox.style.display = 'block';
            } else {
                loginError.textContent = 'Usuario o contraseña incorrectos';
                loginError.style.display = 'block';
            }
        })
        .catch(error => console.error('Error:', error));
        */
    });

    // Función para mostrar los resultados de la página actual
    function displayResults(page) {
        const query = document.getElementById('query').value.trim().toLowerCase().replace(' detalle', ""); // Normalizamos el input del usuario

        resultsDiv.innerHTML = ''; // Limpiar los resultados anteriores
        const start = (page - 1) * resultsPerPage;
        const end = start + resultsPerPage;
        const paginatedResults = allResults.slice(start, end); // Obtener los resultados de la página actual

        // Limpiar resultados anteriores
        resultsDiv.innerHTML = '';
        console.log(paginatedResults);
        // Renderizar los resultados de la página actual
        paginatedResults.forEach(result => {
            const normalizedQuery = normalizeText(query); // Normalizamos el término de búsqueda
            const normalizedDescription = normalizeText(result.description); // Normalizamos el texto del resultado

            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');

            const img = document.createElement('img');
            img.src = 'https://' + result.url_imagen || 'https://via.placeholder.com/50'; // URL de la imagen o una imagen por defecto
            img.alt = result.titulo;
            img.style.width = '50px'; // Ajusta el tamaño de la imagen
            img.style.height = '50px'; // Ajusta el tamaño de la imagen
            img.style.marginRight = '10px';

            const title = document.createElement('a');
            //title.href =  result.url_link;
            title.href = '#';
            //title.setAttribute('target', '_blank');
            title.textContent = result.titulo;

            title.addEventListener('click', function () {
                const tipoPagina = result.tipo_de_material === 'Libro' ? "material/libro.php?source=https://" + encodeURIComponent(result.url_link) + "&name=" + result.titulo :
                result.tipo_de_material === 'Video' ?  
                "material/video.php?source=" + encodeURIComponent(result.url_link) + "&name=" + result.titulo + "&url_imagen=" + result.url_imagen : 
                "material/audio.php?source=" + encodeURIComponent(result.url_link) + "&name=" + result.titulo + "&url_imagen=" + result.url_imagen ;
               //
               const ver = result.tipo_de_material === 'Libro' ? true : result.tipo_de_material === 'Video' ? true : false ; 
               const tipo_de_material = result.tipo_de_material === 'Libro' ? 'Leer Libro' : result.tipo_de_material === 'Video' ? 'Ver video' : 'Escuchar audio' ; 
               //
               openModal(result.titulo, result.descripcion, tipoPagina, query, 'https://' + result.url_imagen,ver, tipo_de_material);
            });

            resultItem.appendChild(img); // Añadir la imagen antes del título
            resultItem.appendChild(title);

            const description = document.createElement('p');
            description.classList.add('result-description');
            description.textContent = result.descripcion.substring(0, 100) || result.autor + '...';
            resultItem.appendChild(description);

           
            resultsDiv.appendChild(resultItem);
        });

        updatePagination(); // Actualizar los botones de paginación
    }

    function displayResultsDetalle(page) {
        const query = document.getElementById('query').value.trim().toLowerCase().replace(' detalle', ""); // Normalizamos el input del usuario

        resultsDiv.innerHTML = ''; // Limpiar los resultados anteriores
        const start = (page - 1) * resultsPerPage;
        const end = start + resultsPerPage;
        const paginatedResults = allResults.slice(start, end); // Obtener los resultados de la página actual

        // Limpiar resultados anteriores
        resultsDiv.innerHTML = '';
        console.log(paginatedResults);
        // Renderizar los resultados de la página actual
        paginatedResults.forEach(result => {
            const normalizedQuery = normalizeText(query); // Normalizamos el término de búsqueda
            const normalizedDescription = normalizeText(result.description); // Normalizamos el texto del resultado

            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');

            const img = document.createElement('img');
            img.src = 'https://' + result.url_imagen || 'https://via.placeholder.com/50'; // URL de la imagen o una imagen por defecto
            img.alt = result.titulo;
            img.style.width = '50px'; // Ajusta el tamaño de la imagen
            img.style.height = '50px'; // Ajusta el tamaño de la imagen
            img.style.marginRight = '10px';

            const title = document.createElement('a');
            //title.href =  result.url_link;
            title.href = '#';
            //title.setAttribute('target', '_blank');
            title.textContent = result.titulo;

            title.addEventListener('click', function () {
                const tipoPagina = result.tipo_de_material === 'Libro' ? "material/libro.php?source=https://" + encodeURIComponent(result.url_link) + "&name=" + result.titulo :
                result.tipo_de_material === 'Video' ?  
                "material/video.php?source=" + encodeURIComponent(result.url_link) + "&name=" + result.titulo + "&url_imagen=" + result.url_imagen : 
                "material/audio.php?source=" + encodeURIComponent(result.url_link) + "&name=" + result.titulo + "&url_imagen=" + result.url_imagen ;
                //
                const ver = result.tipo_de_material === 'Libro' ? true : result.tipo_de_material === 'Video' ? true : false ; 
                const tipo_de_material = result.tipo_de_material === 'Libro' ? 'Leer Libro' : result.tipo_de_material === 'Video' ? 'Ver video' : 'Escuchar audio' ; 
                //
                openModal(result.titulo, result.descripcion, tipoPagina, query, 'https://' + result.url_imagen,false, tipo_de_material);
            });

            resultItem.appendChild(img); // Añadir la imagen antes del título
            resultItem.appendChild(title);

            const description = document.createElement('p');
            description.classList.add('result-description');
            description.textContent = result.descripcion.substring(0, 100) + '...';
            resultItem.appendChild(description);

            resultsDiv.appendChild(resultItem);
        });

        updatePagination(); // Actualizar los botones de paginación
    }

    // Función para crear los botones de paginación
    function updatePagination() {
      
        paginationDiv.innerHTML = ''; // Limpiar la paginación anterior
        const totalPages = Math.ceil(allResults.length / resultsPerPage); // Calcular el total de páginas

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('page-button');
            if (i === currentPage) {
                pageButton.classList.add('active'); // Resalta la página actual
            }
            pageButton.addEventListener('click', function () {
                currentPage = i;
                displayResults(currentPage); // Cambiar a la página seleccionada
            });
            paginationDiv.appendChild(pageButton);
        }
    }

    // Búsqueda API
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const query = document.getElementById('query').value.trim().toLowerCase(); // Normalizamos el input del usuario

        if (query.includes('detalle')) {
            // Llamada a la primera API si la búsqueda contiene 'api1'
            fetchFromAPIDetalle(query.replace(' detalle', ""));
        } else {
            // Llamada a la segunda API si la búsqueda contiene 'api2'
            fetchFromAPI(query);
        }
    });

    // Función para buscar en la API 1
    function fetchFromAPI(query) {
        // Llamada a la API de búsqueda
        fetch(`https://ac.gnosis.is/api/GAPP/GETMATERIALSEARCH/1/gapp/${encodeURIComponent(query)}/0`)
            .then(response => response.json())
            .then(data => {
                allResults = data; // Almacena los resultados obtenidos de la API 1
                currentPage = 1; // Reiniciar a la primera página
                displayResults(currentPage); // Mostrar los resultados de la primera página

            })
            .catch(error => console.error('Error:', error));
    }

    // Función para buscar en la API 1
    function fetchFromAPIDetalle(query) {
        // Llamada a la API de búsqueda
        fetch(`https://ac.gnosis.is/api/GAPP/GETMATERIALSEARCH/1/biblioteca/${encodeURIComponent(query)}/0`)
            .then(response => response.json())
            .then(data => {
                allResults = data; // Almacena los resultados obtenidos de la API 1
                currentPage = 1; // Reiniciar a la primera página
                displayResultsDetalle(currentPage); // Mostrar los resultados de la primera página

            })
            .catch(error => console.error('Error:', error));
    }

    // Abrir Modal con detalles del resultado
    function openModal(title, descripcion, url_link, query, url_imagen, ver,tipo_de_material) {
        const keywords = [query];  // Palabras clave a resaltar
        const highlightedDescription = highlightKeywords(descripcion, keywords);  // Aplicar resaltado

        modalTitle.textContent = title;
        //modalDescription.textContent = descripcion;
        modalDescription.innerHTML = highlightedDescription;  // Usamos innerHTML en lugar de textContent para que se apliquen los spans
        downloadLink.href = url_link;
        downloadLink.text = tipo_de_material;
        modal.style.display = 'block';
        if (ver == false){
            material.src = '';
            material.width="0"; 
            material.height="0";
        }else{
            material.src = url_link;
            material.width="500"; 
            material.height="500"; 
        }        
    }

    // Cerrar Modal
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Cerrar Modal cuando se hace clic fuera de la ventana modal
    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Función para resaltar palabras clave
    function highlightKeywords(text, keywords) {
        let highlightedText = normalizeText(text);

        // Para cada palabra clave, rodearla con un span de la clase highlight
        keywords.forEach(keyword => {
            const normalizedKeyword = normalizeText(keyword);
            const regex = new RegExp(`(${normalizedKeyword})`, 'gi');  // Buscar palabra clave sin importar mayúsculas/minúsculas
            highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
        });

        return highlightedText;
    }

    // Función para normalizar texto: eliminar acentos y convertir a minúsculas
    function normalizeText(text) {
        if (!text) {
            return ''; // Si text es undefined o null, retorna una cadena vacía
        }
        return text
            .toString()  // Asegura que el valor sea una cadena
            .normalize('NFD') // Descompone caracteres latinos con acentos en su forma base
            .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
            .toLowerCase(); // Convierte todo el texto a minúsculas
    }
});
