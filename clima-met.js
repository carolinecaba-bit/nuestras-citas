// -----------------------------------------------------------------------
// Respaldo de clima: MET Norway (Instituto Meteorologico de Noruega).
// Gratis, sin llave, pronostico mundial de ~9 dias. Se usa cuando
// Open-Meteo no responde (en Render su IP compartida recibe 429 seguido).
//
// Condiciones de uso (api.met.no/doc/TermsOfService):
//   - identificar la app con User-Agent
//   - coordenadas con maximo 4 decimales
//   - dar credito: "Datos de MET Norway" (licencia CC BY 4.0)
// -----------------------------------------------------------------------
const URL_MET = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'NuestrasCitas/1.0 https://nuestras-citas-x9qr.onrender.com';
const TIMEOUT_MS = 10000;
const DIAS_MAXIMOS = 8;

const cache = new Map(); // "lat,lon" -> { en, serie }

// Simbolos de MET Norway -> codigos WMO (los mismos que usa Open-Meteo),
// para que el resto de la app no cambie.
function codigoWMO(simbolo) {
  const s = (simbolo || '').replace(/_(day|night|polartwilight)$/, '');
  if (s.includes('thunder')) return 95;
  if (s.includes('snow') || s.includes('sleet')) return 71;
  if (s.startsWith('heavyrain')) return s.includes('showers') ? 82 : 65;
  if (s.startsWith('lightrain')) return s.includes('showers') ? 80 : 61;
  if (s.startsWith('rain')) return s.includes('showers') ? 81 : 63;
  if (s === 'fog') return 45;
  if (s === 'cloudy') return 3;
  if (s === 'partlycloudy') return 2;
  if (s === 'fair') return 1;
  return 0; // clearsky
}

// Desfase horario aproximado para agrupar las horas por dia local.
// Republica Dominicana: UTC-4 todo el año.
function desfaseHoras(lat, lon) {
  if (lat > 17.3 && lat < 20.1 && lon > -72.1 && lon < -68.2) return -4;
  return Math.round(lon / 15);
}

async function pedirSerie(lat, lon) {
  const clave = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.en < 3600000) return guardado.serie;

  const url = `${URL_MET}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!respuesta.ok) throw new Error(`MET Norway respondió estado ${respuesta.status}`);
    const serie = (await respuesta.json()).properties?.timeseries || [];
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    cache.set(clave, { en: Date.now(), serie });
    return serie;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resumen diario con la misma forma que el de Open-Meteo, o null si la
 * fecha esta fuera del pronostico de MET Norway.
 */
async function resumenDiario(lat, lon, fechaISO) {
  const serie = await pedirSerie(Number(lat), Number(lon));
  const desfase = desfaseHoras(Number(lat), Number(lon));
  const delDia = serie.filter((p) => {
    const local = new Date(new Date(p.time).getTime() + desfase * 3600000);
    return local.toISOString().slice(0, 10) === fechaISO;
  });
  if (!delDia.length) return null;

  const temps = delDia.map((p) => p.data?.instant?.details?.air_temperature).filter((t) => typeof t === 'number');
  // Lluvia: se suma la de cada hora cuando existe; mas adelante el
  // pronostico viene en bloques de 6 horas (sin contar dos veces).
  let precipitacion = 0;
  let cubiertoHasta = 0;
  let peorCodigo = 0;
  delDia.forEach((p) => {
    const inicio = new Date(p.time).getTime();
    const bloque = p.data?.next_1_hours || (inicio >= cubiertoHasta ? p.data?.next_6_hours : null);
    if (bloque) {
      precipitacion += bloque.details?.precipitation_amount || 0;
      cubiertoHasta = inicio + (p.data?.next_1_hours ? 1 : 6) * 3600000;
      peorCodigo = Math.max(peorCodigo, codigoWMO(bloque.summary?.symbol_code));
    }
  });
  if (!temps.length) return null;
  return {
    fecha: fechaISO,
    codigoClima: peorCodigo,
    temperaturaMax: Math.max(...temps),
    temperaturaMin: Math.min(...temps),
    precipitacion: Math.round(precipitacion * 10) / 10,
    fuente: 'MET Norway'
  };
}

module.exports = { resumenDiario, DIAS_MAXIMOS };
