// -----------------------------------------------------------------------
// "Ideas y que hacer": trae resultados de busqueda reales (via SerpApi)
// para categorias curadas (ideas de citas, planes economicos, etc.).
//
// Se muestra SOLO titulo + resumen corto (el snippet que ya genera el
// buscador) + fuente + enlace al articulo original. Nunca se reproduce
// el contenido completo de ningun blog: la idea es invitar a leer la
// fuente, no reemplazarla.
//
// Los resultados se cachean en disco por categoria para no gastar la
// cuota gratuita de SerpApi en cada visita.
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const RUTA_CACHE = path.join(__dirname, 'data', 'tops-cache.json');
const SERPAPI_URL = 'https://serpapi.com/search.json';
const TIMEOUT_MS = 10000;
const HORAS_CACHE_DEFECTO = 24;

const CATEGORIAS = [
  {
    id: 'primera-cita',
    etiqueta: '5 ideas de primera cita',
    consulta: 'ideas originales y consejos para una primera cita'
  },
  {
    id: 'dias-nublados',
    etiqueta: 'Qué hacer en días nublados o lluviosos',
    consulta: 'planes en pareja para un dia lluvioso o nublado'
  },
  {
    id: 'planes-economicos',
    etiqueta: 'Planes económicos',
    consulta: 'planes economicos y gratis para una cita en pareja'
  },
  {
    id: 'regalos-cumpleanos',
    etiqueta: 'Ideas de regalos de cumpleaños',
    consulta: 'ideas originales de regalos de cumpleaños para pareja'
  },
  {
    id: 'cozy-finde',
    etiqueta: 'Planes acogedores para el fin de semana',
    consulta: 'planes cozy y relajados para el fin de semana en pareja'
  }
];

function obtenerCategoriaPorId(id) {
  return CATEGORIAS.find((c) => c.id === id) || null;
}

function credencialesConfiguradas() {
  return Boolean(process.env.SERPAPI_API_KEY);
}

function horasDeCache() {
  const horas = Number(process.env.TOPS_CACHE_HORAS);
  return Number.isFinite(horas) && horas > 0 ? horas : HORAS_CACHE_DEFECTO;
}

class ErrorServicioTops extends Error {}

async function fetchConTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- cache en disco (mismo patron de escritura atomica) ----------

let colaEscritura = Promise.resolve();

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function leerCache() {
  try {
    const contenido = await fsPromises.readFile(RUTA_CACHE, 'utf-8');
    const datos = JSON.parse(contenido);
    return typeof datos === 'object' && datos !== null ? datos : {};
  } catch (err) {
    return {};
  }
}

async function guardarCache(cache) {
  return encolarEscritura(async () => {
    await fsPromises.mkdir(path.dirname(RUTA_CACHE), { recursive: true });
    const rutaTemporal = `${RUTA_CACHE}.tmp`;
    await fsPromises.writeFile(rutaTemporal, JSON.stringify(cache, null, 2), 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_CACHE);
  });
}

function estaFresca(entrada) {
  if (!entrada || !entrada.actualizadoEn) return false;
  const horasTranscurridas = (Date.now() - new Date(entrada.actualizadoEn).getTime()) / 3600000;
  return horasTranscurridas < horasDeCache();
}

// ---------- busqueda en vivo ----------

async function buscarEnVivo(consulta) {
  const url = new URL(SERPAPI_URL);
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', consulta);
  url.searchParams.set('hl', 'es');
  url.searchParams.set('num', '6');
  url.searchParams.set('api_key', process.env.SERPAPI_API_KEY);

  let respuesta;
  try {
    respuesta = await fetchConTimeout(url.toString());
  } catch (err) {
    if (err.name === 'AbortError') throw new ErrorServicioTops('tiempo agotado');
    throw new ErrorServicioTops('no se pudo conectar con el servicio de busqueda');
  }

  if (!respuesta.ok) {
    throw new ErrorServicioTops(`estado ${respuesta.status}`);
  }

  let data;
  try {
    data = await respuesta.json();
  } catch (err) {
    throw new ErrorServicioTops('respuesta invalida del servicio de busqueda');
  }

  const resultados = (data.organic_results || [])
    .filter((r) => r.title && r.link)
    .slice(0, 5)
    .map((r) => {
      let fuente = r.source || null;
      if (!fuente) {
        try {
          fuente = new URL(r.link).hostname.replace(/^www\./, '');
        } catch (err) {
          fuente = 'Fuente externa';
        }
      }
      return {
        titulo: r.title,
        resumen: r.snippet || '',
        fuente,
        enlace: r.link
      };
    });

  return resultados;
}

/**
 * Devuelve los resultados de una categoria: de cache si esta fresca, o
 * buscando en vivo (y actualizando el cache) si no. Si el servicio no
 * esta configurado pero hay un cache viejo, se muestra ese en vez de
 * nada.
 */
async function obtenerTops(categoriaId) {
  const categoria = obtenerCategoriaPorId(categoriaId);
  if (!categoria) {
    throw new ErrorServicioTops('categoria invalida');
  }

  const cache = await leerCache();
  const entrada = cache[categoriaId];

  if (estaFresca(entrada)) {
    return { resultados: entrada.resultados, actualizadoEn: entrada.actualizadoEn, deCache: true };
  }

  if (!credencialesConfiguradas()) {
    if (entrada) {
      return { resultados: entrada.resultados, actualizadoEn: entrada.actualizadoEn, deCache: true };
    }
    throw new ErrorServicioTops('el servicio de busqueda no esta configurado');
  }

  const resultados = await buscarEnVivo(categoria.consulta);
  const actualizadoEn = new Date().toISOString();
  cache[categoriaId] = { actualizadoEn, resultados };
  await guardarCache(cache);

  return { resultados, actualizadoEn, deCache: false };
}

module.exports = { CATEGORIAS, obtenerCategoriaPorId, obtenerTops, credencialesConfiguradas, ErrorServicioTops };
