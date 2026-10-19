// -----------------------------------------------------------------------
// Busca lugares reales cercanos (parques, restaurantes, playas, etc.)
// usando Overpass API, la interfaz de consultas de OpenStreetMap.
// Es un servicio publico y gratuito que no requiere API Key.
//
// Overpass tiene varios servidores espejo publicos independientes. Si el
// principal esta caido, sobrecargado, o bloquea trafico de ciertos
// proveedores de hosting, probamos los siguientes en orden antes de
// darnos por vencidos.
// -----------------------------------------------------------------------
// Servidores publicos con datos de todo el mundo, segun la lista oficial
// (wiki.openstreetmap.org/wiki/Overpass_API, revisada en octubre 2026).
// Primero los que no tienen limite de peticiones; el principal
// (overpass-api.de) va al final porque suele estar sobrecargado.
// Se puede cambiar sin tocar el codigo con la variable OVERPASS_URLS
// (varias URLs separadas por comas).
const OVERPASS_URLS = (process.env.OVERPASS_URLS || [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter'
].join(',')).split(',').map((u) => u.trim()).filter(Boolean);

// Cache de busquedas (por tags y zona de ~1 km): menos carga para los
// servidores publicos y respuestas instantaneas al repetir una busqueda.
const cacheBusquedas = new Map();
const HORAS_CACHE = 6;
const MAX_ENTRADAS_CACHE = 500;
const TIMEOUT_MS = 12000;

class ErrorServicioLugares extends Error {}

const nominatim = require('./nominatim');

// Palabras para buscar en Nominatim (respaldo) segun el tag de OpenStreetMap.
const PALABRA_POR_TAG = {
  'leisure=park': 'parque',
  'leisure=garden': 'jardín',
  'tourism=picnic_site': 'parque',
  'amenity=restaurant': 'restaurante',
  'amenity=cafe': 'cafetería',
  'natural=beach': 'playa',
  'tourism=viewpoint': 'mirador',
  'amenity=cinema': 'cine',
  'tourism=attraction': 'monumento',
  'tourism=hotel': 'hotel',
  'tourism=guest_house': 'hotel',
  'shop=florist': 'floristería',
  'shop=gift': 'tienda de regalos',
  'shop=chocolate': 'chocolatería',
  'shop=confectionery': 'dulcería',
  'shop=pastry': 'repostería',
  'shop=bakery': 'repostería',
  'amenity=ice_cream': 'heladería'
};

const ETIQUETAS_GENERICAS = {
  park: 'Parque cercano',
  garden: 'Jardín cercano',
  picnic_site: 'Zona de picnic',
  restaurant: 'Restaurante cercano',
  cafe: 'Café cercano',
  beach: 'Playa cercana',
  viewpoint: 'Mirador cercano',
  cinema: 'Cine cercano',
  attraction: 'Lugar de interés',
  florist: 'Floristería cercana',
  gift: 'Tienda de regalos cercana',
  chocolate: 'Chocolatería cercana',
  confectionery: 'Dulcería cercana',
  pastry: 'Repostería cercana',
  bakery: 'Panadería y repostería cercana',
  ice_cream: 'Heladería cercana'
};

// -----------------------------------------------------------------------
// Fotos de los lugares (gratis): solo cuando OpenStreetMap las enlaza.
//   - image=https://...            -> foto directa
//   - wikimedia_commons=File:X.jpg -> foto en Wikimedia Commons
//   - wikidata=Q123                -> foto principal (P18) de Wikidata
// La mayoria de los lugares no tiene ninguna; entonces foto = null.
// -----------------------------------------------------------------------
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const cacheWikidata = new Map(); // Qid -> nombre de archivo | null

function fotoDeCommons(nombreArchivo) {
  const archivo = nombreArchivo.replace(/^File:/i, '').trim();
  if (!archivo) return null;
  return {
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(archivo)}?width=480`,
    credito: 'Wikimedia Commons',
    enlaceCredito: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(archivo)}`
  };
}

function fotoDesdeTags(tags = {}) {
  const imagen = typeof tags.image === 'string' ? tags.image.trim() : '';
  const enCommons = imagen.match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i);
  if (enCommons) return fotoDeCommons(decodeURIComponent(enCommons[1]));
  if (/^https:\/\/\S+\.(jpe?g|png|webp)(\?.*)?$/i.test(imagen)) {
    let dominio = 'la fuente';
    try { dominio = new URL(imagen).hostname.replace(/^www\./, ''); } catch (e) { /* se queda generico */ }
    return { url: imagen, credito: dominio, enlaceCredito: imagen };
  }
  if (typeof tags.wikimedia_commons === 'string' && /^File:/i.test(tags.wikimedia_commons)) {
    return fotoDeCommons(tags.wikimedia_commons);
  }
  return null;
}

/** Busca en Wikidata (una sola peticion) la foto de los lugares que solo tienen wikidata=Q... */
async function completarFotosDeWikidata(lugares) {
  const pendientes = [...new Set(lugares.filter((l) => !l.foto && l.wikidata && !cacheWikidata.has(l.wikidata)).map((l) => l.wikidata))];
  if (pendientes.length) {
    try {
      const url = new URL(WIKIDATA_API);
      url.searchParams.set('action', 'wbgetentities');
      url.searchParams.set('ids', pendientes.slice(0, 50).join('|'));
      url.searchParams.set('props', 'claims');
      url.searchParams.set('format', 'json');
      const respuesta = await fetchConTimeout(url.toString(), { headers: { 'User-Agent': 'NuestrasCitas/1.0 (app de citas)' } }, 5000);
      const data = await respuesta.json();
      pendientes.forEach((id) => {
        const archivo = data.entities?.[id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value || null;
        cacheWikidata.set(id, archivo);
      });
    } catch (err) {
      // Las fotos son un extra: si Wikidata no responde, se sigue sin ellas.
    }
  }
  lugares.forEach((l) => {
    if (!l.foto && l.wikidata && cacheWikidata.get(l.wikidata)) l.foto = fotoDeCommons(cacheWikidata.get(l.wikidata));
  });
}

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
 * Intenta la consulta contra cada servidor espejo en orden. Devuelve la
 * primera respuesta EXITOSA (HTTP ok). Si un espejo falla al conectar,
 * se agota el tiempo, o responde con un error HTTP, se intenta el
 * siguiente antes de darse por vencido.
 */
async function pedirAAlgunEspejo(consulta) {
  const errores = [];

  for (const url of OVERPASS_URLS) {
    try {
      const respuesta = await fetchConTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NuestrasCitas/1.0 (app personal de planes de citas, sin fines comerciales)'
        },
        body: `data=${encodeURIComponent(consulta)}`
      });

      if (respuesta.ok) {
        return respuesta;
      }
      errores.push(`${url} -> estado ${respuesta.status}`);
    } catch (err) {
      const motivo = err.name === 'AbortError' ? 'tiempo agotado' : err.message;
      errores.push(`${url} -> ${motivo}`);
    }
  }

  const errorEnvuelto = new ErrorServicioLugares('no se pudo conectar con el servicio de lugares');
  errorEnvuelto.detalleTecnico = errores.join(' | ');
  throw errorEnvuelto;
}

/**
 * Busca hasta `maximo` lugares reales cerca de (lat, lon) que coincidan
 * con alguno de los tags de OpenStreetMap dados (ej: "leisure=park").
 */
async function buscarLugares(tagsOverpass, lat, lon, opciones = {}) {
  const { radioMetros = 4000, maximo = 6 } = opciones;
  const clave = `${[...tagsOverpass].sort().join(',')}|${lat.toFixed(2)}|${lon.toFixed(2)}|${radioMetros}|${maximo}`;
  const guardado = cacheBusquedas.get(clave);
  if (guardado && Date.now() - guardado.en < HORAS_CACHE * 3600000) return guardado.lugares;
  let lugares;
  try {
    lugares = await buscarLugaresSinCache(tagsOverpass, lat, lon, { radioMetros, maximo });
  } catch (errOverpass) {
    // Respaldo: si ningun servidor de Overpass responde, se busca con
    // Nominatim (otro servicio de OpenStreetMap, independiente).
    try {
      lugares = await buscarConNominatim(tagsOverpass, lat, lon, { radioMetros, maximo });
      console.warn(`[lugares] Overpass falló (${errOverpass.detalleTecnico || errOverpass.message}); se usó Nominatim: ${lugares.length} resultados`);
    } catch (errNominatim) {
      errOverpass.detalleTecnico = `${errOverpass.detalleTecnico || errOverpass.message} | respaldo Nominatim -> ${errNominatim.message}`;
      throw errOverpass;
    }
  }
  if (cacheBusquedas.size >= MAX_ENTRADAS_CACHE) cacheBusquedas.delete(cacheBusquedas.keys().next().value);
  cacheBusquedas.set(clave, { en: Date.now(), lugares });
  return lugares;
}

async function buscarConNominatim(tagsOverpass, lat, lon, { radioMetros, maximo }) {
  // Hasta 2 palabras distintas (Nominatim permite 1 peticion por segundo).
  const palabras = [...new Set(tagsOverpass.map((t) => PALABRA_POR_TAG[t]).filter(Boolean))].slice(0, 2);
  if (!palabras.length) return [];
  const encontrados = [];
  for (const palabra of palabras) {
    encontrados.push(...await nominatim.buscarCerca(palabra, lat, lon, { radioKm: radioMetros / 1000 }));
  }
  const vistos = new Set();
  const lugares = encontrados
    .filter((l) => {
      const clave = `${l.lat.toFixed(4)},${l.lon.toFixed(4)}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .map((l) => ({
      nombre: l.nombre,
      categoria: l.categoria,
      lat: l.lat,
      lon: l.lon,
      distanciaKm: Math.round(distanciaKm(lat, lon, l.lat, l.lon) * 10) / 10,
      foto: fotoDesdeTags(l.extratags),
      wikidata: typeof l.extratags.wikidata === 'string' && /^Q\d+$/.test(l.extratags.wikidata) ? l.extratags.wikidata : null
    }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, maximo);
  await completarFotosDeWikidata(lugares);
  return lugares.map((l) => ({
    nombre: l.nombre,
    categoria: l.categoria,
    lat: l.lat,
    lon: l.lon,
    distanciaKm: l.distanciaKm,
    foto: l.foto || null,
    enlaceMapa: `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=17/${l.lat}/${l.lon}`
  }));
}

async function buscarLugaresSinCache(tagsOverpass, lat, lon, { radioMetros, maximo }) {
  const consulta = construirConsulta(tagsOverpass, lat, lon, radioMetros);
  const respuesta = await pedirAAlgunEspejo(consulta);

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
        el.tags?.leisure || el.tags?.amenity || el.tags?.tourism || el.tags?.natural || el.tags?.shop || null;

      return {
        nombre: el.tags?.name || null,
        categoria,
        lat: latLugar,
        lon: lonLugar,
        distanciaKm: Math.round(distanciaKm(lat, lon, latLugar, lonLugar) * 10) / 10,
        foto: fotoDesdeTags(el.tags),
        wikidata: typeof el.tags?.wikidata === 'string' && /^Q\d+$/.test(el.tags.wikidata) ? el.tags.wikidata : null
      };
    })
    .filter(Boolean);

  // Preferimos lugares con nombre real; si hay muy pocos, completamos
  // con lugares sin nombre usando una etiqueta generica por categoria.
  const conNombre = lugares.filter((l) => l.nombre);
  const base = conNombre.length >= 3 ? conNombre : lugares;

  const elegidos = base.sort((a, b) => a.distanciaKm - b.distanciaKm).slice(0, maximo);
  await completarFotosDeWikidata(elegidos);

  return elegidos.map((l) => ({
    nombre: l.nombre || etiquetaGenerica(l.categoria),
    categoria: l.categoria,
    lat: l.lat,
    lon: l.lon,
    distanciaKm: l.distanciaKm,
    foto: l.foto || null,
    enlaceMapa: `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=17/${l.lat}/${l.lon}`
  }));
}

module.exports = { buscarLugares, ErrorServicioLugares, fotoDesdeTags, completarFotosDeWikidata };
