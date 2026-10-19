// -----------------------------------------------------------------------
// Nominatim: el buscador oficial de OpenStreetMap. A diferencia del
// geocodificador de Open-Meteo (solo ciudades y pueblos), encuentra
// lugares especificos: universidades, restaurantes, plazas, hoteles.
//
// Politica de uso (operations.osmfoundation.org/policies/nominatim):
//   - como maximo 1 peticion por segundo  -> cola con espera entre turnos
//   - identificar la app con User-Agent    -> USER_AGENT
//   - guardar resultados en cache          -> 24 horas
// -----------------------------------------------------------------------
const BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'NuestrasCitas/1.0 (https://nuestras-citas-x9qr.onrender.com)';
const TIMEOUT_MS = 8000;
const ESPERA_ENTRE_PETICIONES_MS = 1100;
const HORAS_CACHE = 24;

class ErrorNominatim extends Error {}

const cache = new Map();
let cola = Promise.resolve();
let ultimaPeticion = 0;

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Ejecuta `tarea` respetando 1 peticion por segundo para toda la app. */
function enTurno(tarea) {
  const resultado = cola.then(async () => {
    const espera = ultimaPeticion + ESPERA_ENTRE_PETICIONES_MS - Date.now();
    if (espera > 0) await esperar(espera);
    ultimaPeticion = Date.now();
    return tarea();
  });
  cola = resultado.catch(() => {});
  return resultado;
}

async function pedir(parametros) {
  const url = new URL(BASE_URL);
  Object.entries({ format: 'jsonv2', 'accept-language': 'es', ...parametros })
    .forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const clave = url.toString();
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.en < HORAS_CACHE * 3600000) return guardado.datos;

  const datos = await enTurno(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(clave, { headers: { 'User-Agent': USER_AGENT, Referer: 'https://nuestras-citas-x9qr.onrender.com' }, signal: controller.signal });
      if (!respuesta.ok) throw new ErrorNominatim(`Nominatim respondió estado ${respuesta.status}`);
      return await respuesta.json();
    } catch (err) {
      if (err instanceof ErrorNominatim) throw err;
      throw new ErrorNominatim(err.name === 'AbortError' ? 'Nominatim tardó demasiado' : `Nominatim no respondió (${err.message})`);
    } finally {
      clearTimeout(timer);
    }
  });
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  cache.set(clave, { en: Date.now(), datos });
  return datos;
}

/** Nombre corto y region legible a partir de un resultado de Nominatim. */
function describir(r) {
  const partes = (r.display_name || '').split(',').map((p) => p.trim()).filter(Boolean);
  const nombre = r.name || partes[0] || 'Lugar';
  const pais = partes.length > 1 ? partes[partes.length - 1] : null;
  const region = partes.slice(1, -1).filter((p) => p !== nombre && !/^\d+$/.test(p)).slice(0, 2).join(', ') || null;
  return {
    nombre, region, pais, lat: Number(r.lat), lon: Number(r.lon),
    categoria: r.type || null,
    especifico: esLugarEspecifico(r),
    extratags: r.extratags || {}
  };
}

// Ciudades, pueblos, barrios y divisiones administrativas son "zonas";
// todo lo demas (universidad, restaurante, hotel...) es un lugar concreto.
const TIPOS_ZONA = ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'borough',
  'municipality', 'county', 'state', 'region', 'province', 'district', 'island', 'administrative', 'locality'];
function esLugarEspecifico(r) {
  if (r.category === 'place' || r.category === 'boundary') return false;
  return !TIPOS_ZONA.includes(r.type);
}

/** Busca lugares por nombre (ej: "Universidad O&M"). `pais`: codigo ISO, ej "do". */
async function buscarPorNombre(texto, { pais = null, limite = 6 } = {}) {
  const parametros = { q: texto, limit: limite, extratags: 1 };
  if (pais) parametros.countrycodes = pais;
  return (await pedir(parametros)).map(describir);
}

/**
 * Busca lugares de una categoria cerca de un punto (ej: "restaurante" a
 * menos de ~5 km). Se usa como respaldo cuando Overpass no responde.
 */
async function buscarCerca(palabra, lat, lon, { radioKm = 5, limite = 10 } = {}) {
  const d = radioKm / 111; // grados aproximados
  const viewbox = [lon - d, lat + d, lon + d, lat - d].map((n) => n.toFixed(5)).join(',');
  return (await pedir({ q: palabra, viewbox, bounded: 1, limit: limite, extratags: 1 })).map(describir);
}

module.exports = { buscarPorNombre, buscarCerca, ErrorNominatim };
