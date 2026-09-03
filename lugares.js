// -----------------------------------------------------------------------
// Busca lugares reales cercanos (parques, restaurantes, playas, etc.)
// usando Overpass API, la interfaz de consultas de OpenStreetMap.
// Es un servicio publico y gratuito que no requiere API Key.
// -----------------------------------------------------------------------
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 12000;

class ErrorServicioLugares extends Error {}

const ETIQUETAS_GENERICAS = {
  park: 'Parque cercano',
  garden: 'Jardín cercano',
  picnic_site: 'Zona de picnic',
  restaurant: 'Restaurante cercano',
  cafe: 'Café cercano',
  beach: 'Playa cercana',
  viewpoint: 'Mirador cercano',
  cinema: 'Cine cercano',
  attraction: 'Lugar de interés'
};

async function fetchConTimeout(url, opciones, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opciones, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function construirConsulta(tagsOverpass, lat, lon, radioMetros) {
  const bloques = tagsOverpass
    .map((tag) => {
      const [clave, valor] = tag.split('=');
      return `node["${clave}"="${valor}"](around:${radioMetros},${lat},${lon});
              way["${clave}"="${valor}"](around:${radioMetros},${lat},${lon});`;
    })
    .join('\n');

  return `[out:json][timeout:20];(${bloques});out center 25;`;
}

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const radianes = Math.PI / 180;
  const dLat = (lat2 - lat1) * radianes;
  const dLon = (lon2 - lon1) * radianes;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * radianes) * Math.cos(lat2 * radianes) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etiquetaGenerica(categoria) {
  return ETIQUETAS_GENERICAS[categoria] || 'Lugar cercano';
}

/**
 * Busca hasta `maximo` lugares reales cerca de (lat, lon) que coincidan
 * con alguno de los tags de OpenStreetMap dados (ej: "leisure=park").
 */
async function buscarLugares(tagsOverpass, lat, lon, { radioMetros = 4000, maximo = 6 } = {}) {
  const consulta = construirConsulta(tagsOverpass, lat, lon, radioMetros);

  let respuesta;
  try {
    respuesta = await fetchConTimeout(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'planificador-citas-clima (uso personal, sin fines comerciales)'
      },
      body: `data=${encodeURIComponent(consulta)}`
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ErrorServicioLugares('tiempo agotado');
    }
    throw new ErrorServicioLugares('no se pudo conectar con el servicio de lugares');
  }

  if (!respuesta.ok) {
    throw new ErrorServicioLugares(`estado ${respuesta.status}`);
  }

  let data;
  try {
    data = await respuesta.json();
  } catch (err) {
    throw new ErrorServicioLugares('respuesta invalida del servicio de lugares');
  }

  const elementos = Array.isArray(data.elements) ? data.elements : [];

  const lugares = elementos
    .map((el) => {
      const latLugar = el.lat ?? el.center?.lat;
      const lonLugar = el.lon ?? el.center?.lon;
      if (latLugar == null || lonLugar == null) return null;

      const categoria =
        el.tags?.leisure || el.tags?.amenity || el.tags?.tourism || el.tags?.natural || null;

      return {
        nombre: el.tags?.name || null,
        categoria,
        lat: latLugar,
        lon: lonLugar,
        distanciaKm: Math.round(distanciaKm(lat, lon, latLugar, lonLugar) * 10) / 10
      };
    })
    .filter(Boolean);

  // Preferimos lugares con nombre real; si hay muy pocos, completamos
  // con lugares sin nombre usando una etiqueta generica por categoria.
  const conNombre = lugares.filter((l) => l.nombre);
  const base = conNombre.length >= 3 ? conNombre : lugares;

  return base
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, maximo)
    .map((l) => ({
      nombre: l.nombre || etiquetaGenerica(l.categoria),
      lat: l.lat,
      lon: l.lon,
      distanciaKm: l.distanciaKm,
      enlaceMapa: `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=17/${l.lat}/${l.lon}`
    }));
}

module.exports = { buscarLugares, ErrorServicioLugares };
