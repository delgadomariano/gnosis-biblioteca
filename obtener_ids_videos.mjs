async function fetchPlaylistVideos(playlistId) {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-419,es;q=0.9,en;q=0.8'
        }
    });
    const html = await res.text();
    const match = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return { error: 'No se pudo leer la página de YouTube' };

    const data = JSON.parse(match[1]);
    if (data.alerts) {
        const errorAlert = data.alerts.find(a => a.alertRenderer && a.alertRenderer.type === 'ERROR');
        if (errorAlert) {
            const msg = errorAlert.alertRenderer.text.runs.map(r => r.text).join('');
            return { error: msg };
        }
    }

    const str = JSON.stringify(data);
    const videoMatches = [...str.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const uniqueIds = [];
    const seen = new Set();
    for (const m of videoMatches) {
        const id = m[1];
        if (!seen.has(id)) {
            seen.add(id);
            uniqueIds.push(id);
        }
    }

    return { ids: uniqueIds };
}

const playlists = [
  { nombre: '2001 Diálogos Pamplona', id: 'PLhl1rDfqeCSFy-WWiscwxZeGs8ll9nFEv' },
  { nombre: '2001 Semana Santa', id: 'PLhl1rDfqeCScfd0qeEgjFv7rSueqPWd8w' },
  { nombre: '2001 Navidad', id: 'PLhl1rDfqeCSfl7bfxJk6cSpRFFZn4wpDP' },
  { nombre: '1989 Diciembre', id: 'PLhl1rDfqeCSd94NfCGCdWC73F4hsvdA8k' },
  { nombre: '2005 Semana Santa', id: 'PLhl1rDfqeCSfnQ2iVzzYY4I05esx_1jci' },
  { nombre: '2002 Agosto', id: 'PLhl1rDfqeCSffFSuANQol0Y1gJAYcOH8b' },
  { nombre: '2004 Febrero', id: 'PLhl1rDfqeCSef944uM1pDmiaurrYm2vOD' },
  { nombre: '2002 Concilio Sacerdotal', id: 'PLhl1rDfqeCSc0Y-JoIeZEPBg-zZfbn-Yl' },
  { nombre: '2001 Actualizacion Misional', id: 'PLhl1rDfqeCSEn6k6xG3KRrnS_NKLnC-Cv' },
  { nombre: '2004 Junio Bogota', id: 'PLhl1rDfqeCSfGCZWueJ9vGd6B3KomMD_m' }
];

async function obtenerIds() {
  for (const pl of playlists) {
    const res = await fetchPlaylistVideos(pl.id);
    if (res.error) {
      console.error(`Error procesando "${pl.nombre}": ${res.error} (Verificar si está Privada)`);
    } else {
      console.log(`=== ${pl.nombre} ===`);
      console.log(res.ids.join(','));
      console.log();
    }
  }
}

obtenerIds();
