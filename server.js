require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { TIPOS_CITA, obtenerTipoPorId } = require('./analizador');
const { buscarLugares, ErrorServicioLugares } = require('./lugares');
const usuarios = require('./usuarios');
const personas = require('./personas');
const lugaresGuardados = require('./lugaresGuardados');
const tops = require('./tops');
const auth = require('./auth');
const pagos = require('./pagos');
const logger = require('./logger');
const ia = require('./ia');

const app = express();

const PORT = process.env.PORT || 3000;
const OPEN_METEO_API_KEY = process.env.OPEN_METEO_API_KEY || '';

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const CAMPOS_DIARIOS = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';

const TIMEOUT_MS = 8000;

// Si no se configuro un SESSION_SECRET propio, generamos uno aleatorio al
// arrancar. La app sigue funcionando, pero todas las sesiones se cierran
// cada vez que el servidor se reinicia (avisamos por consola).
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  logger.warning({
    actor: 'sistema',
    funcion: 'arranque',
    mensaje: 'No se configuro SESSION_SECRET: se genero uno temporal. Las sesiones se perderan al reiniciar el servidor.'
  });
}

// Necesario para que las cookies "secure" funcionen detras del proxy de
// Render (que termina el HTTPS y reenvia por HTTP internamente).
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Middleware de logging: registra cada peticion a /api, /auth y /webhooks
// con quien la hizo (actor), en que ruta ocurrio (funcion), que se envio
// (input) y que se respondio (output), con su nivel (INFO/WARNING/ERROR
// segun el codigo de estado). Se registra AL PRINCIPIO de todo, antes de
// cualquier otro middleware, para poder "envolver" res.json/send/redirect
// y capturar la respuesta de cualquier ruta, sin importar como responda.
// ---------------------------------------------------------------------------
function actorDePeticion(req) {
  return req.session && req.session.usuarioId ? `usuario:${req.session.usuarioId}` : 'anonimo';
}

function cuerpoParaLog(body) {
  if (body === undefined) return undefined;
  if (Buffer.isBuffer(body)) return `[cuerpo crudo, ${body.length} bytes]`;
  if (body && typeof body === 'object') {
    const { password, clientSecret, ...resto } = body;
    return resto;
  }
  return body;
}

app.use((req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  const sendOriginal = res.send.bind(res);
  const redirectOriginal = res.redirect.bind(res);
  let cuerpoRespuesta;

  res.json = (payload) => {
    cuerpoRespuesta = payload;
    return jsonOriginal(payload);
  };
  res.send = (payload) => {
    if (cuerpoRespuesta === undefined) cuerpoRespuesta = payload;
    return sendOriginal(payload);
  };
  res.redirect = (...args) => {
    cuerpoRespuesta = { redirigidoA: args[args.length - 1] };
    return redirectOriginal(...args);
  };

  res.on('finish', () => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/') && !req.path.startsWith('/webhooks/')) {
      return;
    }
    const nivel = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARNING' : 'INFO';
    logger.registrar({
      nivel,
      actor: actorDePeticion(req),
      funcion: `${req.method} ${req.path}`,
      input: { params: req.params, query: req.query, body: cuerpoParaLog(req.body) },
      output: { status: res.statusCode, cuerpo: cuerpoRespuesta }
    });
  });

  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// El webhook de Stripe necesita el cuerpo CRUDO (sin parsear) para poder
// verificar la firma, asi que se monta con su propio parser ANTES del
// express.json() global (que de otro modo consumiria el cuerpo primero).
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  pagos.manejarWebhook(req, res);
});

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 dias
  }
}));

// ---------------------------------------------------------------------------
// Utilidades compartidas (clima)
// ---------------------------------------------------------------------------

async function fetchConTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function conApiKey(url) {
  if (OPEN_METEO_API_KEY) {
    url.searchParams.set('apikey', OPEN_METEO_API_KEY);
  }
  return url;
}

function manejarError(err, res, contexto, req) {
  if (err.name === 'AbortError') {
    logger.warning({
      actor: req ? actorDePeticion(req) : 'sistema',
      funcion: contexto,
      output: { error: 'tiempo_agotado' },
      mensaje: `Tiempo agotado en ${contexto}`
    });
    return res.status(504).json({
      error: 'tiempo_agotado',
      mensaje: `La solicitud de ${contexto} tardo demasiado en responder. Intenta de nuevo.`
    });
  }
  console.error(`[error:${contexto}]`, err);
  logger.error({
    actor: req ? actorDePeticion(req) : 'sistema',
    funcion: contexto,
    output: { error: err.message },
    mensaje: `Error inesperado en ${contexto}`
  });
  return res.status(500).json({
    error: 'error_interno',
    mensaje: 'Ocurrio un error inesperado en el servidor. Intenta de nuevo mas tarde.'
  });
}

class ErrorServicioExterno extends Error {}

function diferenciaEnDias(fechaISO) {
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fechaUTC = Date.UTC(anio, mes - 1, dia);
  return Math.round((fechaUTC - hoyUTC) / 86400000);
}

async function pedirResumenDiario(baseUrl, lat, lon, fechaISO) {
  const url = conApiKey(new URL(baseUrl));
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('start_date', fechaISO);
  url.searchParams.set('end_date', fechaISO);
  url.searchParams.set('daily', CAMPOS_DIARIOS);
  url.searchParams.set('timezone', 'auto');

  const respuesta = await fetchConTimeout(url.toString());
  if (!respuesta.ok) {
    throw new ErrorServicioExterno(`estado ${respuesta.status}`);
  }

  const data = await respuesta.json();
  if (!data.daily || !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
    throw new ErrorServicioExterno('el servicio no devolvio datos para esa fecha');
  }

  return {
    fecha: data.daily.time[0],
    codigoClima: data.daily.weather_code[0],
    temperaturaMax: data.daily.temperature_2m_max[0],
    temperaturaMin: data.daily.temperature_2m_min[0],
    precipitacion: data.daily.precipitation_sum[0]
  };
}

async function obtenerClimaParaFecha(lat, lon, fechaISO) {
  const dias = diferenciaEnDias(fechaISO);

  if (dias > 16) {
    return {
      estado: 'no_disponible',
      mensaje: 'El pronostico aun no esta disponible para esta fecha. Vuelve a consultar cuando falten 16 dias o menos.'
    };
  }

  if (dias >= 0) {
    const datos = await pedirResumenDiario(FORECAST_BASE_URL, lat, lon, fechaISO);
    return { estado: 'pronostico', datos };
  }

  try {
    const datos = await pedirResumenDiario(ARCHIVE_BASE_URL, lat, lon, fechaISO);
    return { estado: 'historico', datos };
  } catch (errorArchivo) {
    if (dias >= -92) {
      try {
        const datos = await pedirResumenDiario(FORECAST_BASE_URL, lat, lon, fechaISO);
        return { estado: 'historico', datos };
      } catch (errorRespaldo) {
        throw errorArchivo;
      }
    }
    throw errorArchivo;
  }
}

// ---------------------------------------------------------------------------
// GET /api/tipos-cita  — catalogo de tipos de plan (para el <select>)
// ---------------------------------------------------------------------------
app.get('/api/tipos-cita', (_req, res) => {
  res.json({
    tipos: TIPOS_CITA.map((t) => ({ id: t.id, etiqueta: t.etiqueta }))
  });
});

// ---------------------------------------------------------------------------
// GET /api/geocode?q=nombreDeLugar
// ---------------------------------------------------------------------------
app.get('/api/geocode', async (req, res) => {
  const q = req.query.q;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(400).json({
      error: 'parametro_invalido',
      mensaje: 'Debes indicar un nombre de ubicacion de al menos 2 caracteres (parametro "q").'
    });
  }

  try {
    const url = conApiKey(new URL(GEOCODING_BASE_URL));
    url.searchParams.set('name', q.trim());
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'es');
    url.searchParams.set('format', 'json');

    const respuesta = await fetchConTimeout(url.toString());

    if (!respuesta.ok) {
      return res.status(502).json({
        error: 'error_servicio_externo',
        mensaje: `El servicio de geocodificacion respondio con estado ${respuesta.status}.`
      });
    }

    const data = await respuesta.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        error: 'sin_resultados',
        mensaje: `No se encontraron ubicaciones para "${q}". Intenta con otro nombre.`
      });
    }

    res.json({
      resultados: data.results.map((r) => ({
        nombre: r.name,
        pais: r.country || null,
        region: r.admin1 || null,
        latitud: r.latitude,
        longitud: r.longitude
      }))
    });
  } catch (err) {
    manejarError(err, res, 'geocodificacion', req);
  }
});

// ---------------------------------------------------------------------------
// GET /api/sugerencias?lat=&lon=&tipo=  — lugares reales cercanos
// ---------------------------------------------------------------------------
app.get('/api/sugerencias', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const tipoId = req.query.tipo;

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'La latitud no es valida.' });
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'La longitud no es valida.' });
  }

  const tipo = obtenerTipoPorId(tipoId);
  if (!tipo) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'El tipo de plan no es valido.' });
  }

  try {
    const lugares = await buscarLugares(tipo.tagsOverpass, lat, lon);
    res.json({ lugares });
  } catch (err) {
    if (err instanceof ErrorServicioLugares) {
      console.error(
        `[lugares] Fallo al consultar Overpass (tipo=${tipoId}, lat=${lat}, lon=${lon}):`,
        err.detalleTecnico || err.message
      );
      logger.warning({
        actor: actorDePeticion(req),
        funcion: 'GET /api/sugerencias',
        input: { tipo: tipoId, lat, lon },
        output: { error: err.detalleTecnico || err.message },
        mensaje: 'Fallo al consultar Overpass'
      });
      return res.status(502).json({
        error: 'error_servicio_externo',
        mensaje: `No se pudieron obtener sugerencias de lugares (${err.message}). Intenta de nuevo en un momento.`
      });
    }
    manejarError(err, res, 'busqueda de lugares', req);
  }
});

// ---------------------------------------------------------------------------
// GET /api/relaciones  — sugerencias para el campo "relacion" de un perfil
// ---------------------------------------------------------------------------
app.get('/api/relaciones', (_req, res) => {
  res.json({ relaciones: personas.RELACIONES_SUGERIDAS });
});

function validarPersona(body) {
  const errores = [];
  const { nombre, relacion, cumpleanos, comidaFavorita, correo, notas, fechasImportantes } = body || {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    errores.push('El nombre debe tener al menos 2 caracteres.');
  }
  if (!relacion || typeof relacion !== 'string' || relacion.trim().length < 2) {
    errores.push('Debes indicar la relación (ej: novia, madre, amigo...).');
  }
  if (cumpleanos && (typeof cumpleanos !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cumpleanos) || Number.isNaN(new Date(`${cumpleanos}T00:00:00Z`).getTime()))) {
    errores.push('El cumpleaños debe tener formato AAAA-MM-DD y ser una fecha válida.');
  }
  if (comidaFavorita !== undefined && comidaFavorita !== null && typeof comidaFavorita !== 'string') {
    errores.push('La comida favorita no es válida.');
  }
  if (correo && (typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()))) {
    errores.push('El correo no tiene un formato válido.');
  }
  if (notas !== undefined && notas !== null && typeof notas !== 'string') {
    errores.push('Las notas no son válidas.');
  }
  if (fechasImportantes !== undefined && fechasImportantes !== null) {
    if (!Array.isArray(fechasImportantes) || fechasImportantes.length > MAX_FECHAS_IMPORTANTES) {
      errores.push(`Puedes guardar hasta ${MAX_FECHAS_IMPORTANTES} fechas importantes por persona.`);
    } else {
      fechasImportantes.forEach((f) => {
        if (!f || typeof f.nombre !== 'string' || f.nombre.trim().length < 2 || f.nombre.trim().length > 40) {
          errores.push('Cada fecha importante necesita un nombre de 2 a 40 caracteres (ej: Aniversario).');
        } else if (!esFechaISOValida(f.fecha)) {
          errores.push(`La fecha de "${f.nombre.trim()}" no es válida.`);
        }
      });
    }
  }

  return errores;
}

const MAX_FECHAS_IMPORTANTES = 10;

function esFechaISOValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function limpiarFechasImportantes(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((f) => ({ nombre: f.nombre.trim(), fecha: f.fecha }));
}

// ---------------------------------------------------------------------------
// GET /api/personas  — listar MIS perfiles
// ---------------------------------------------------------------------------
app.get('/api/personas', auth.requiereSesion, async (req, res) => {
  try {
    const lista = await personas.obtenerPersonas(req.session.usuarioId);
    res.json({ personas: lista });
  } catch (err) {
    manejarError(err, res, 'lectura de personas', req);
  }
});

// ---------------------------------------------------------------------------
// POST /api/personas  — crear un perfil
// ---------------------------------------------------------------------------
app.post('/api/personas', auth.requiereSesion, async (req, res) => {
  const errores = validarPersona(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'datos_invalidos', mensaje: errores.join(' ') });
  }

  const { nombre, relacion, cumpleanos, comidaFavorita, correo, notas, fechasImportantes } = req.body;

  try {
    const nuevaPersona = await personas.crearPersona({
      usuarioId: req.session.usuarioId,
      nombre: nombre.trim(),
      relacion: relacion.trim(),
      cumpleanos: cumpleanos || null,
      comidaFavorita: comidaFavorita ? comidaFavorita.trim() : null,
      correo: correo ? correo.trim() : null,
      notas: notas ? notas.trim() : null,
      fechasImportantes: limpiarFechasImportantes(fechasImportantes)
    });
    res.status(201).json({ persona: nuevaPersona });
  } catch (err) {
    manejarError(err, res, 'creacion de persona', req);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/personas/:id  — editar un perfil (solo si es mio)
// ---------------------------------------------------------------------------
app.put('/api/personas/:id', auth.requiereSesion, async (req, res) => {
  const errores = validarPersona(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'datos_invalidos', mensaje: errores.join(' ') });
  }

  const { nombre, relacion, cumpleanos, comidaFavorita, correo, notas, fechasImportantes } = req.body;

  try {
    const actualizada = await personas.actualizarPersona(req.params.id, req.session.usuarioId, {
      nombre: nombre.trim(),
      relacion: relacion.trim(),
      cumpleanos: cumpleanos || null,
      comidaFavorita: comidaFavorita ? comidaFavorita.trim() : null,
      correo: correo ? correo.trim() : null,
      notas: notas ? notas.trim() : null,
      fechasImportantes: limpiarFechasImportantes(fechasImportantes)
    });
    if (!actualizada) {
      return res.status(404).json({ error: 'no_encontrada', mensaje: 'No existe ese perfil.' });
    }
    res.json({ persona: actualizada });
  } catch (err) {
    manejarError(err, res, 'edicion de persona', req);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/personas/:id  — eliminar un perfil (solo si es mio)
// ---------------------------------------------------------------------------
app.delete('/api/personas/:id', auth.requiereSesion, async (req, res) => {
  try {
    const eliminada = await personas.eliminarPersona(req.params.id, req.session.usuarioId);
    if (!eliminada) {
      return res.status(404).json({ error: 'no_encontrada', mensaje: 'No existe ese perfil.' });
    }
    res.json({ ok: true });
  } catch (err) {
    manejarError(err, res, 'eliminacion de persona', req);
  }
});

// ---------------------------------------------------------------------------
// Validacion de una cita entrante
// ---------------------------------------------------------------------------
/**
 * Genera un titulo por defecto cuando el usuario no escribio uno, a
 * partir del tipo de plan y (si se eligio) el nombre de la persona.
 */
function generarTituloPorDefecto(tipoId, persona) {
  const tipo = obtenerTipoPorId(tipoId);
  const etiquetaTipo = tipo ? tipo.etiqueta : 'Plan';
  return persona ? `${etiquetaTipo} con ${persona.nombre}` : etiquetaTipo;
}

function validarUbicacion(ubicacion, campo) {
  const errores = [];
  if (!ubicacion || typeof ubicacion !== 'object') {
    errores.push(`Debes indicar ${campo}.`);
    return errores;
  }
  const lat = Number(ubicacion.lat);
  const lon = Number(ubicacion.lon);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    errores.push(`La latitud de ${campo} no es valida (-90 a 90).`);
  }
  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    errores.push(`La longitud de ${campo} no es valida (-180 a 180).`);
  }
  if (!ubicacion.nombre || typeof ubicacion.nombre !== 'string' || ubicacion.nombre.trim().length === 0) {
    errores.push(`Falta el nombre de ${campo}.`);
  }
  return errores;
}

function validarCita(body) {
  const errores = [];
  const { titulo, tipo, personaId, fecha, hora, ubicacion, lugarSugerido } = body || {};

  // El titulo ahora es opcional: si se deja vacio, se genera uno
  // automaticamente a partir del tipo de plan y la persona elegida.
  if (titulo !== undefined && titulo !== null && typeof titulo !== 'string') {
    errores.push('El título no es válido.');
  }

  if (!tipo || !obtenerTipoPorId(tipo)) {
    errores.push('Debes indicar un tipo de plan valido.');
  }

  if (personaId !== undefined && personaId !== null && typeof personaId !== 'string') {
    errores.push('El perfil seleccionado no es válido.');
  }

  if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime())) {
    errores.push('La fecha debe tener formato AAAA-MM-DD y ser una fecha valida.');
  }

  if (hora && (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))) {
    errores.push('La hora debe tener formato HH:MM (24 horas).');
  }

  errores.push(...validarUbicacion(ubicacion, 'una ubicacion'));

  if (lugarSugerido) {
    errores.push(...validarUbicacion(lugarSugerido, 'el lugar elegido'));
  }

  return errores;
}

// ---------------------------------------------------------------------------
// GET /api/citas  — listar MIS citas (ordenadas por fecha/hora)
// ---------------------------------------------------------------------------
app.get('/api/citas', auth.requiereSesion, async (req, res) => {
  try {
    const citas = await db.obtenerCitas(req.session.usuarioId);
    res.json({ citas });
  } catch (err) {
    manejarError(err, res, 'lectura de citas', req);
  }
});

// ---------------------------------------------------------------------------
// POST /api/citas  — crear una cita para el usuario de la sesion actual
// ---------------------------------------------------------------------------
app.post('/api/citas', auth.requiereSesion, async (req, res) => {
  const errores = validarCita(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'datos_invalidos', mensaje: errores.join(' ') });
  }

  const { titulo, tipo, personaId, fecha, hora, ubicacion, lugarSugerido } = req.body;

  try {
    // Si se indico un personaId, confirmamos que sea un perfil del
    // usuario actual (nunca de otra persona) y lo usamos para generar
    // un titulo por defecto si no se escribio uno.
    let persona = null;
    if (personaId) {
      persona = await personas.obtenerPersonaPorId(personaId, req.session.usuarioId);
      if (!persona) {
        return res.status(400).json({ error: 'datos_invalidos', mensaje: 'El perfil seleccionado no existe.' });
      }
    }

    const tituloFinal = titulo && titulo.trim()
      ? titulo.trim()
      : generarTituloPorDefecto(tipo, persona);

    const nuevaCita = await db.crearCita({
      usuarioId: req.session.usuarioId,
      titulo: tituloFinal,
      tipo,
      personaId: persona ? persona.id : null,
      fecha,
      hora: hora || null,
      ubicacion: {
        nombre: ubicacion.nombre.trim(),
        lat: Number(ubicacion.lat),
        lon: Number(ubicacion.lon)
      },
      lugarSugerido: lugarSugerido
        ? {
            nombre: lugarSugerido.nombre.trim(),
            lat: Number(lugarSugerido.lat),
            lon: Number(lugarSugerido.lon),
            enlaceMapa: lugarSugerido.enlaceMapa || null
          }
        : null
    });
    // El lugar usado se guarda solo en "Recientes". Es un extra: si
    // falla, la cita ya quedo guardada y no se interrumpe nada.
    lugaresGuardados.registrarUso(req.session.usuarioId, nuevaCita.ubicacion).catch((errLugar) => {
      logger.warning({ actor: actorDePeticion(req), funcion: 'registrarLugarReciente', output: { error: errLugar.message }, mensaje: 'No se pudo guardar el lugar reciente' });
    });

    res.status(201).json({ cita: nuevaCita });
  } catch (err) {
    manejarError(err, res, 'creacion de cita', req);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/citas/:id  — solo si la cita es del usuario de la sesion
// ---------------------------------------------------------------------------
app.delete('/api/citas/:id', auth.requiereSesion, async (req, res) => {
  try {
    const eliminada = await db.eliminarCita(req.params.id, req.session.usuarioId);
    if (!eliminada) {
      return res.status(404).json({ error: 'no_encontrada', mensaje: 'No existe una cita con ese id.' });
    }
    res.json({ ok: true });
  } catch (err) {
    manejarError(err, res, 'eliminacion de cita', req);
  }
});

// ---------------------------------------------------------------------------
// GET /api/citas/:id/clima
// ---------------------------------------------------------------------------
app.get('/api/citas/:id/clima', auth.requiereSesion, async (req, res) => {
  try {
    const cita = await db.obtenerCitaPorId(req.params.id, req.session.usuarioId);
    if (!cita) {
      return res.status(404).json({ error: 'no_encontrada', mensaje: 'No existe una cita con ese id.' });
    }

    const lugar = cita.lugarSugerido || cita.ubicacion;
    const resultado = await obtenerClimaParaFecha(lugar.lat, lugar.lon, cita.fecha);
    res.json(resultado);
  } catch (err) {
    if (err instanceof ErrorServicioExterno) {
      return res.status(502).json({
        error: 'error_servicio_externo',
        mensaje: `No se pudo obtener el clima para esta cita (${err.message}).`
      });
    }
    manejarError(err, res, 'clima de la cita', req);
  }
});

// ---------------------------------------------------------------------------
// Autenticacion con Google
// ---------------------------------------------------------------------------
app.get('/auth/google', auth.iniciarLogin);
app.get('/auth/google/callback', auth.manejarCallback);
app.post('/auth/logout', auth.cerrarSesion);

app.get('/api/usuario-actual', async (req, res) => {
  if (!req.session.usuarioId) {
    return res.json({ usuario: null, loginConfigurado: auth.credencialesConfiguradas() });
  }
  const usuario = await usuarios.obtenerUsuarioPorId(req.session.usuarioId);
  if (!usuario) {
    // La sesion apunta a un usuario que ya no existe (raro, pero posible
    // si se borro data/usuarios.json a mano). La limpiamos.
    req.session.usuarioId = null;
    return res.json({ usuario: null, loginConfigurado: auth.credencialesConfiguradas() });
  }
  res.json({
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, avatarUrl: usuario.avatarUrl },
    loginConfigurado: true
  });
});

// ---------------------------------------------------------------------------
// POST /api/crear-pago  — crea una sesion de Stripe Checkout para "apoyar"
// el proyecto. Requiere sesion, para saber a que correo confirmar despues.
// ---------------------------------------------------------------------------
app.post('/api/crear-pago', auth.requiereSesion, async (req, res) => {
  if (!pagos.credencialesConfiguradas()) {
    return res.status(500).json({
      error: 'pago_no_configurado',
      mensaje: 'Los pagos no están configurados en este servidor (falta STRIPE_SECRET_KEY).'
    });
  }

  try {
    const usuario = await usuarios.obtenerUsuarioPorId(req.session.usuarioId);
    const urlCheckout = await pagos.crearSesionCheckout({
      usuarioId: req.session.usuarioId,
      email: usuario ? usuario.email : undefined
    });
    res.json({ url: urlCheckout });
  } catch (err) {
    manejarError(err, res, 'creacion de pago', req);
  }
});

// ---------------------------------------------------------------------------
// GET /api/tops-categorias  — catalogo de categorias de "ideas y que hacer"
// ---------------------------------------------------------------------------
app.get('/api/tops-categorias', (_req, res) => {
  res.json({
    categorias: tops.CATEGORIAS.map((c) => ({ id: c.id, etiqueta: c.etiqueta }))
  });
});

// ---------------------------------------------------------------------------
// GET /api/tops/:categoriaId  — ideas curadas de blogs para una categoria
// ---------------------------------------------------------------------------
app.get('/api/tops/:categoriaId', auth.requiereSesion, async (req, res) => {
  const categoria = tops.obtenerCategoriaPorId(req.params.categoriaId);
  if (!categoria) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'La categoría no es válida.' });
  }

  try {
    const resultado = await tops.obtenerTops(categoria.id);
    res.json(resultado);
  } catch (err) {
    if (err instanceof tops.ErrorServicioTops) {
      console.error(`[tops] Fallo al obtener categoria=${categoria.id}:`, err.message);
      logger.warning({
        actor: actorDePeticion(req),
        funcion: 'GET /api/tops/:categoriaId',
        input: { categoriaId: categoria.id },
        output: { error: err.message },
        mensaje: 'Fallo al consultar SerpApi'
      });
      return res.status(502).json({
        error: 'error_servicio_externo',
        mensaje: `No se pudieron obtener ideas para esta categoría (${err.message}). Intenta de nuevo en un momento.`
      });
    }
    manejarError(err, res, 'busqueda de tops', req);
  }
});

// ---------------------------------------------------------------------------
// POST /api/sugerir-plan — pide a la IA (AI SDK, modelo en AI_MODEL) un titulo + descripcion
// ---------------------------------------------------------------------------
function climaATextoDescriptivo(resultado) {
  if (!resultado || resultado.estado === 'no_disponible') return null;
  const { datos } = resultado;
  const lluvia = datos.precipitacion > 0
    ? `, con posibilidad de lluvia (${datos.precipitacion} mm)`
    : ', sin lluvia esperada';
  return `máxima ${Math.round(datos.temperaturaMax)}°C, mínima ${Math.round(datos.temperaturaMin)}°C${lluvia}`;
}

app.post('/api/sugerir-plan', auth.requiereSesion, async (req, res) => {
  const { tipo, personaId, fecha, ubicacion } = req.body || {};

  const tipoInfo = obtenerTipoPorId(tipo);
  if (!tipoInfo) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'Debes indicar un tipo de plan válido.' });
  }
  if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: 'Debes indicar una fecha válida.' });
  }
  const erroresUbicacion = validarUbicacion(ubicacion, 'una ubicación');
  if (erroresUbicacion.length > 0) {
    return res.status(400).json({ error: 'parametro_invalido', mensaje: erroresUbicacion.join(' ') });
  }

  try {
    let persona = null;
    if (personaId) {
      persona = await personas.obtenerPersonaPorId(personaId, req.session.usuarioId);
      if (!persona) {
        return res.status(400).json({ error: 'datos_invalidos', mensaje: 'El perfil seleccionado no existe.' });
      }
    }

    // El clima es un "nice to have" para la sugerencia: si falla, seguimos
    // sin el, en vez de bloquear toda la sugerencia por eso.
    let climaTexto = null;
    try {
      const resultadoClima = await obtenerClimaParaFecha(Number(ubicacion.lat), Number(ubicacion.lon), fecha);
      climaTexto = climaATextoDescriptivo(resultadoClima);
    } catch (errClima) {
      climaTexto = null;
    }

    const resultado = await ia.sugerirPlan({
      actor: actorDePeticion(req),
      etiquetaTipo: tipoInfo.etiqueta,
      persona,
      climaTexto,
      lugarNombre: ubicacion.nombre
    });

    res.json(resultado);
  } catch (err) {
    if (err instanceof ia.ErrorServicioIA) {
      // 503: la IA no esta disponible, pero el resto de la app sigue
      // funcionando y la cita se puede llenar a mano.
      return res.status(503).json({
        error: 'error_servicio_externo',
        mensaje: `No se pudo generar una sugerencia con IA (${err.message}).`
      });
    }
    manejarError(err, res, 'sugerencia de IA', req);
  }
});

// ---------------------------------------------------------------------------
// Lugares guardados (favoritos + recientes) del usuario
// ---------------------------------------------------------------------------
function validarAlias(alias) {
  if (alias === undefined || alias === null) return null;
  if (typeof alias !== 'string' || alias.trim().length > lugaresGuardados.ALIAS_MAX) {
    return `El nombre corto puede tener hasta ${lugaresGuardados.ALIAS_MAX} caracteres.`;
  }
  return null;
}

app.get('/api/lugares-guardados', auth.requiereSesion, async (req, res) => {
  try {
    res.json({ lugares: await lugaresGuardados.obtenerLugares(req.session.usuarioId) });
  } catch (err) {
    manejarError(err, res, 'lectura de lugares guardados', req);
  }
});

// Guarda un lugar como favorito (o lo marca, si ya estaba en recientes).
app.post('/api/lugares-guardados', auth.requiereSesion, async (req, res) => {
  const { nombre, lat, lon, alias } = req.body || {};
  const errores = validarUbicacion({ nombre, lat, lon }, 'el lugar');
  const errorAlias = validarAlias(alias);
  if (errorAlias) errores.push(errorAlias);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'datos_invalidos', mensaje: errores.join(' ') });
  }
  try {
    const lugar = await lugaresGuardados.registrarUso(
      req.session.usuarioId,
      { nombre: nombre.trim(), lat: Number(lat), lon: Number(lon) },
      { favorito: true, alias: alias && alias.trim() ? alias.trim() : null }
    );
    res.status(201).json({ lugar });
  } catch (err) {
    if (err.esLimite) return res.status(400).json({ error: 'limite', mensaje: err.message });
    manejarError(err, res, 'guardado de lugar', req);
  }
});

app.patch('/api/lugares-guardados/:id', auth.requiereSesion, async (req, res) => {
  const { favorito, alias } = req.body || {};
  if (favorito !== undefined && typeof favorito !== 'boolean') {
    return res.status(400).json({ error: 'datos_invalidos', mensaje: 'El valor de favorito no es válido.' });
  }
  const errorAlias = validarAlias(alias);
  if (errorAlias) return res.status(400).json({ error: 'datos_invalidos', mensaje: errorAlias });
  try {
    const lugar = await lugaresGuardados.actualizarLugar(req.params.id, req.session.usuarioId, {
      favorito,
      alias: alias === undefined ? undefined : (alias && alias.trim() ? alias.trim() : null)
    });
    if (!lugar) return res.status(404).json({ error: 'no_encontrado', mensaje: 'No existe ese lugar guardado.' });
    res.json({ lugar });
  } catch (err) {
    manejarError(err, res, 'edicion de lugar guardado', req);
  }
});

app.delete('/api/lugares-guardados/:id', auth.requiereSesion, async (req, res) => {
  try {
    const eliminado = await lugaresGuardados.eliminarLugar(req.params.id, req.session.usuarioId);
    if (!eliminado) return res.status(404).json({ error: 'no_encontrado', mensaje: 'No existe ese lugar guardado.' });
    res.json({ ok: true });
  } catch (err) {
    manejarError(err, res, 'eliminacion de lugar guardado', req);
  }
});

app.get('/api/health', (_req, res) => res.json({ estado: 'ok' }));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  logger.info({ actor: 'sistema', funcion: 'arranque', output: { puerto: PORT }, mensaje: 'Servidor iniciado' });
  if (!OPEN_METEO_API_KEY) {
    console.log('Nota: no se configuro OPEN_METEO_API_KEY. Se usara el servicio gratuito de Open-Meteo.');
  }
});
