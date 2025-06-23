let indiceActual;

async function getPlaylist() {
    try {
        const playlistIndex = await window.electronStore.get('playlist');
        indiceActual = playlistIndex;
        if (playlistIndex == undefined) indiceActual = 0
    } catch (err) {
        console.error('Error al cargar cancion:', err);
        cargarCancion(0);
    }
}

getPlaylist();

async function mostrarPlaylists() {
    const canciones = await window.electronAPI.cargarCanciones();
    const playlists = await window.electronAPI.cargarPlaylists();
    const lista = document.getElementById('list');

    playlists.forEach((playlist, i) => {
        const container = document.createElement('span');
        container.classList.add('item-list');

        const item = document.createElement('img');
        item.src = playlist.cover;

        container.addEventListener('click', () => {
            window.electronStore.set('playlist', i);
            document.querySelectorAll('.item-list').forEach(item => {
                item.classList.remove('active');
            });
            container.classList.add('active');
            renderizarCancionesDePlaylist(playlist, canciones);
        });

        if (i == indiceActual) container.classList.add('active');

        container.appendChild(item);
        lista.appendChild(container);
    });

    // Mostrar la primera playlist por defecto
    renderizarCancionesDePlaylist(playlists[indiceActual], canciones);
}

function renderizarCancionesDePlaylist(playlist, canciones) {
    document.getElementById("title").innerHTML = playlist.title;
    const songList = document.querySelector('.song-list');
    songList.innerHTML = '';

    playlist.members.forEach((index, equis) => {
        const cancion = canciones[index];

        const song = document.createElement('div');
        song.classList.add('song');
        song.dataset.active = "false";

        const indexItem = document.createElement('div');
        indexItem.classList.add('index');
        indexItem.dataset.index = equis + 1;
        indexItem.innerHTML = indexItem.dataset.index;

        const playIcon = document.createElement("i");
        playIcon.classList.add('fa-solid', 'fa-play');

        const info = document.createElement('div');
        info.classList.add('info');
        info.innerHTML = `
            <div class="titulo">${cancion.title}</div>
            <div class="autor">${cancion.author}</div>
        `;

        song.appendChild(indexItem);
        song.appendChild(info);

        // Click en cualquier parte de la canción para cargarla
        song.addEventListener('click', (event) => {
            // Evitar que el clic en indexItem también dispare esto
            if (event.target.closest('.index')) return;
            window.electronAPI.send('reproducir-cancion', index);
        });

        songList.appendChild(song);
    });
}

mostrarPlaylists();

const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

activityEvents.forEach(evt => {
    window.addEventListener(evt, () => {
        window.electronAPI.sendUserActivity2();
    });
});