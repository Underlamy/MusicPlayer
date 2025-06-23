const audio = document.getElementById('song');
const tracker = document.getElementById('track');
const volume = document.getElementById('vol');

const playBtn = document.getElementById('play');
const playIcon = document.querySelector('#play i');

const backBtn = document.getElementById('back');
const nextBtn = document.getElementById('next');

// Variable para almacenar las canciones
let canciones = [];
let indiceActual = 0;
let shuffleMode = false;
let shuffledOrder = [];
let repeatMode = 0;

async function inicializarVolumen() {
    try {
        // 1. Espera la Promise
        const volumenStr = await window.electronStore.get('vol');

        // 2. Parsear a número
        let volumenStore = parseFloat(volumenStr);

        // 3. Validar
        if (isNaN(volumenStore) || volumenStore < 0 || volumenStore > 1) {
            volumenStore = 1.0;
        }

        // 4. Asignar
        audio.volume = volumenStore;
        volume.value = volumenStore;
    } catch (err) {
        audio.volume = 1.0;
    }
}

async function inicializarCancion() {
    try {
        const songIndex = await window.electronStore.get('song');
        indiceActual = songIndex;
    } catch (err) {
        console.error('Error al cargar cancion:', err);
        cargarCancion(0);
    }
}

inicializarVolumen();
inicializarCancion();

let playlists = []; // Todas las playlists
let playlistActual = 0;

async function cargarPlaylists() {
    playlists = await window.electronAPI.cargarPlaylists();
    const playlistIndex = await window.electronStore.get('playlist');
    playlistActual = (playlistIndex !== undefined) ? playlistIndex : 0;
}
cargarPlaylists();

playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playIcon.classList.remove('fa-circle-play');
        playIcon.classList.add('fa-circle-pause');

    } else {
        audio.pause();
        playIcon.classList.remove('fa-circle-pause');
        playIcon.classList.add('fa-circle-play');
    }
});

let dontChange = false;

tracker.addEventListener('input', () => {
    document.querySelector('.current').textContent = formatTime(tracker.value);
    dontChange = true;
});

tracker.addEventListener('change', () => {
    dontChange = false;
    audio.currentTime = tracker.value;
});

vol.addEventListener('input', () => {
    audio.volume = vol.value;
    window.electronStore.set('vol', vol.value);
});

// Formatear segundos a mm:ss
function formatTime(seconds) {
    if (isNaN(seconds)) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

activityEvents.forEach(evt => {
    window.addEventListener(evt, () => {
        window.electronAPI.sendUserActivity();
    });
});

const coverImg = document.querySelector('.cover img');
const titleDiv = document.querySelector('.name');

// Función para cargar JSON con canciones
async function cargarCanciones() {
    try {
        canciones = await window.electronAPI.cargarCanciones();
        cargarCancion(indiceActual);
    } catch (error) {
        console.error('Error cargando canciones:', error);
    }
}

// Función para cargar una canción en el reproductor
function cargarCancion(indice) {
    if (canciones.length === 0) return;
    const cancion = canciones[indice];
    audio.src = cancion.audio;
    coverImg.src = cancion.cover;
    titleDiv.textContent = cancion.title;

    document.querySelector(".super-container").style.backgroundColor = cancion.mainColor;
    document.querySelector(".title").style.color = cancion.accentColor;

    const iconos = document.querySelectorAll(".buttons button i");
    iconos.forEach(icono => {
        icono.style.color = cancion.accentColor;
    });

    document.querySelector(".cover").style.backgroundColor = cancion.accentColor;
    document.querySelector(".volume-bar input[type='range']").setAttribute("style", `accent-color: ${cancion.accentColor}`);
    document.querySelector(".track-bar input[type='range']").setAttribute("style", `accent-color: ${cancion.accentColor}`);

    window.electronStore.set('song', indice);
    audio.load();
}

// Inicializar al cargar
cargarCanciones();

window.electronAPI.on('cargar-cancion', (event, indice) => {
    cargarCancion(indice);
});

window.electronAPI.on('reproducir-cancion', (event, indice) => {
    cargarCancion(indice);

    audio.addEventListener('canplaythrough', function playHandler() {
        audio.removeEventListener('canplaythrough', playHandler);
        audio.play().catch((err) => {
            console.error("Error al reproducir:", err);
        });
    });

    playIcon.classList.remove('fa-circle-play');
    playIcon.classList.add('fa-circle-pause');
});

window.electronAPI.on('pausar-cancion', (event) => {
    audio.addEventListener('canplaythrough', function playHandler() {
        audio.removeEventListener('canplaythrough', playHandler);
        audio.pause().catch((err) => {
            console.error("Error al reproducir:", err);
        });
    });

    playIcon.classList.remove('fa-circle-pause');
    playIcon.classList.add('fa-circle-play');
});

// Llamar después de cargar playlists
async function inicializarTodoConEstados() {
    try {
        playlists = await window.electronAPI.cargarPlaylists();
        canciones = await window.electronAPI.cargarCanciones();

        const storedPlaylistIndex = await window.electronStore.get('playlist');
        playlistActual = (storedPlaylistIndex !== undefined) ? storedPlaylistIndex : 0;

        const storedSongIndex = await window.electronStore.get('song');
        indiceActual = (storedSongIndex !== undefined) ? storedSongIndex : playlists[playlistActual].members[0];

        cargarCancion(indiceActual);

        // Inicializar estados de shuffle y repeat
        await inicializarEstados();

    } catch (error) {
        console.error('Error en inicialización completa:', error);
    }
}

inicializarTodoConEstados();

// === FUNCIÓN SHUFFLE ===
function toggleShuffle() {
    shuffleMode = !shuffleMode;
    const shuffleBtn = document.getElementById('shuffle');

    if (shuffleMode) {
        // Activar shuffle
        shuffleBtn.classList.add('active');

        // Crear orden aleatorio de la playlist actual
        const members = playlists[playlistActual].members;
        shuffledOrder = [...members].sort(() => Math.random() - 0.5);

        console.log('Shuffle activado. Orden:', shuffledOrder);

        // Guardar estado en storage
        window.electronStore.set('shuffle', true);

    } else {
        // Desactivar shuffle
        shuffleBtn.classList.remove('active');
        shuffledOrder = [];

        console.log('Shuffle desactivado');

        // Guardar estado en storage
        window.electronStore.set('shuffle', false);
    }
}

// === FUNCIÓN REPEAT ===
function toggleRepeat() {
    const repeatBtn = document.getElementById('repeat');
    const repeatIcon = repeatBtn.querySelector('i');

    // Cambiar modo: 0 -> 1 -> 2 -> 0
    repeatMode = (repeatMode + 1) % 3;

    // Remover todas las clases activas
    repeatBtn.classList.remove('active', 'repeat-single');
    repeatIcon.classList.remove('fa-repeat', 'fa-rotate');

    switch (repeatMode) {
        case 0:
            // No repeat
            repeatIcon.classList.add('fa-rotate');
            console.log('Repeat: OFF');
            break;

        case 1:
            // Repeat playlist
            repeatBtn.classList.add('active');
            repeatIcon.classList.add('fa-rotate');
            console.log('Repeat: PLAYLIST');
            break;

        case 2:
            // Repeat single song
            repeatBtn.classList.add('active', 'repeat-single');
            repeatIcon.classList.add('fa-repeat');
            console.log('Repeat: SINGLE');
            break;
    }

    // Guardar estado en storage
    window.electronStore.set('repeat', repeatMode);
}

// === EVENT LISTENERS ===
document.getElementById('shuffle').addEventListener('click', toggleShuffle);
document.getElementById('repeat').addEventListener('click', toggleRepeat);

// === FUNCIONES AUXILIARES PARA NAVEGACIÓN ===
function getNextSong() {
    const members = playlists[playlistActual].members;

    if (shuffleMode && shuffledOrder.length > 0) {
        // Modo shuffle
        const currentIdx = shuffledOrder.indexOf(indiceActual);
        const nextIdx = (currentIdx + 1) % shuffledOrder.length;
        return shuffledOrder[nextIdx];
    } else {
        // Modo normal
        const idxEnPlaylist = members.indexOf(indiceActual);
        const nuevoIdx = (idxEnPlaylist + 1) % members.length;
        return members[nuevoIdx];
    }
}

function getPreviousSong() {
    const members = playlists[playlistActual].members;

    if (shuffleMode && shuffledOrder.length > 0) {
        // Modo shuffle
        const currentIdx = shuffledOrder.indexOf(indiceActual);
        const prevIdx = currentIdx === 0 ? shuffledOrder.length - 1 : currentIdx - 1;
        return shuffledOrder[prevIdx];
    } else {
        // Modo normal
        const idxEnPlaylist = members.indexOf(indiceActual);
        const nuevoIdx = idxEnPlaylist === 0 ? members.length - 1 : idxEnPlaylist - 1;
        return members[nuevoIdx];
    }
}

// === BOTONES NEXT/BACK ===
document.getElementById('back').addEventListener('click', async () => {
    try {
        // Sincronizar con storage
        const playlistEnStorage = await window.electronStore.get('playlist');
        if (playlistEnStorage !== undefined) {
            playlistActual = playlistEnStorage;

            // Regenerar shuffle si está activo y cambió la playlist
            if (shuffleMode) {
                const members = playlists[playlistActual].members;
                shuffledOrder = [...members].sort(() => Math.random() - 0.5);
            }
        }

        // Obtener canción anterior
        indiceActual = getPreviousSong();
        cargarCancion(indiceActual);

        // Auto-play si estaba reproduciendo
        audio.play();
        playIcon.classList.remove('fa-circle-play');
        playIcon.classList.add('fa-circle-pause');

    } catch (error) {
        console.error('Error en botón back:', error);
    }
});

document.getElementById('next').addEventListener('click', async () => {
    try {
        // Sincronizar con storage
        const playlistEnStorage = await window.electronStore.get('playlist');
        if (playlistEnStorage !== undefined) {
            playlistActual = playlistEnStorage;

            // Regenerar shuffle si está activo y cambió la playlist
            if (shuffleMode) {
                const members = playlists[playlistActual].members;
                shuffledOrder = [...members].sort(() => Math.random() - 0.5);
            }
        }

        // Obtener canción siguiente
        indiceActual = getNextSong();
        cargarCancion(indiceActual);

        // Auto-play si estaba reproduciendo
        audio.play();
        playIcon.classList.remove('fa-circle-play');
        playIcon.classList.add('fa-circle-pause');

    } catch (error) {
        console.error('Error en botón next:', error);
    }
});

// === MANEJO DE FIN DE CANCIÓN CON REPEAT ===
function handleSongEnd() {
    console.log('Canción terminada. Repeat mode:', repeatMode);

    if (repeatMode === 2) {
        // Repeat single - repetir la misma canción
        console.log('Repitiendo canción actual');
        audio.currentTime = 0;
        audio.play().catch(err => console.error('Error al repetir:', err));
        return;
    }

    // Verificar si es la última canción
    const members = playlists[playlistActual].members;
    const isLastSong = shuffleMode ?
        shuffledOrder.indexOf(indiceActual) === shuffledOrder.length - 1 :
        members.indexOf(indiceActual) === members.length - 1;

    if (repeatMode === 0 && isLastSong) {
        // No repeat y última canción - pausar
        audio.pause();
        playIcon.classList.remove('fa-circle-pause');
        playIcon.classList.add('fa-circle-play');
        console.log('Playlist terminada - pausando');
        return;
    }

    // Continuar a siguiente canción (repeat playlist o no es la última)
    indiceActual = getNextSong();
    cargarCancion(indiceActual);

    // Esperar a que se cargue antes de reproducir
    audio.addEventListener('canplaythrough', function playHandler() {
        audio.removeEventListener('canplaythrough', playHandler);
        audio.play().then(() => {
            playIcon.classList.remove('fa-circle-play');
            playIcon.classList.add('fa-circle-pause');
            console.log('Auto-next:', canciones[indiceActual]?.title);
        }).catch(err => console.error('Error al auto-reproducir:', err));
    });

    // Efectos de fade
    window.electronAPI.invoke('fade-in');
    setTimeout(() => {
        window.electronAPI.invoke('fade-out');
    }, 5000);
}

// === EVENT LISTENER DE TIMEUPDATE (ÚNICO) ===
audio.addEventListener('timeupdate', () => {
    const tiempoActual = audio.currentTime;
    const duracion = audio.duration;

    document.querySelector('.goal').textContent = formatTime(duracion);

    tracker.min = 0;
    tracker.max = duracion;

    if (!dontChange) {
        document.querySelector('.current').textContent = formatTime(tiempoActual);
        tracker.value = tiempoActual;
    }

    // Verificar si la canción terminó (detección mejorada)
    if (duracion > 0 && (tiempoActual >= duracion - 0.1)) {
        handleSongEnd();
    }
});

// === INICIALIZACIÓN DE ESTADOS ===
async function inicializarEstados() {
    try {
        // Restaurar shuffle
        const shuffleState = await window.electronStore.get('shuffle');
        if (shuffleState === true) {
            shuffleMode = true;
            document.getElementById('shuffle').classList.add('active');

            // Generar orden shuffle
            const members = playlists[playlistActual].members;
            shuffledOrder = [...members].sort(() => Math.random() - 0.5);
        }

        // Restaurar repeat
        const repeatState = await window.electronStore.get('repeat');
        if (repeatState !== undefined) {
            repeatMode = repeatState;

            const repeatBtn = document.getElementById('repeat');
            const repeatIcon = repeatBtn.querySelector('i');

            // Aplicar estado visual
            repeatBtn.classList.remove('active', 'repeat-single');
            repeatIcon.classList.remove('fa-repeat', 'fa-rotate');

            switch (repeatMode) {
                case 0:
                    // No repeat
                    repeatIcon.classList.add('fa-rotate');
                    break;
                case 1:
                    // Repeat playlist
                    repeatBtn.classList.add('active');
                    repeatIcon.classList.add('fa-rotate');
                    break;
                case 2:
                    // Repeat single
                    repeatBtn.classList.add('active', 'repeat-single');
                    repeatIcon.classList.add('fa-repeat');
                    break;
            }
        }

    } catch (error) {
        console.error('Error inicializando estados:', error);
    }
}

// === FUNCIÓN PARA REGENERAR SHUFFLE AL CAMBIAR PLAYLIST ===
function onPlaylistChanged() {
    if (shuffleMode) {
        const members = playlists[playlistActual].members;
        shuffledOrder = [...members].sort(() => Math.random() - 0.5);
    }
}