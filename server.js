require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { TIPOS_CITA, obtenerTipoPorId, analizarTexto } = require('./analizador');
const { buscarLugares, ErrorServicioLugares } = require('./lugares');
const usuarios = require('./usuarios');
const auth = require('./auth');
const pagos = require('./pagos');

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
  console.warn('[sesion] No se configuro SESSION_SECRET: se genero uno temporal. Las sesiones se perderan al reiniciar el servidor.');
}

// Necesario para que las cookies "secure" funcionen detras del proxy de
// Render (que termina el HTTPS y reenvia por HTTP internamente).
app.set('trust proxy', 1);

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

function manejarError(err, res, contexto) {
  if (err.name === 'AbortError') {
    return res.status(504).json({
      error: 'tiempo_agotado',
      mensaje: `La solicitud de ${contexto} tardo demasiado en responder. Intenta de nuevo.`
    });
  }
  console.error(`[error:${contexto}]`, err);
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
// POST /api/analizar-texto  — interpreta una frase libre
// ---------------------------------------------------------------------------
app.post('/api/analizar-texto', (req, res) => {
  const { texto } = req.body || {};

  if (!texto || typeof texto !== 'string' || texto.trim().length < 4) {
    return res.status(400).json({
      error: 'parametro_invalido',
      mensaje: 'Escribe una frase un poco mas larga para poder analizarla.'
    });
  }

  try {
    const resultado = analizarTexto(texto.trim());
    res.json(resultado);
  } catch (err) {
    manejarError(err, res, 'analisis de texto');
  }
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
    manejarError(err, res, 'geocodificacion');
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
      return res.status(502).json({
        error: 'error_servicio_externo',
        mensaje: `No se pudieron obtener sugerencias de lugares (${err.message}). Intenta de nuevo en un momento.`
      });
    }
    manejarError(err, res, 'busqueda de lugares');
  }
});

// ---------------------------------------------------------------------------
// Validacion de una cita entrante
// ---------------------------------------------------------------------------
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
  const { titulo, tipo, conQuien, fecha, hora, ubicacion, lugarSugerido } = body || {};

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 2) {
    errores.push('El titulo debe tener al menos 2 caracteres.');
  }

  if (!tipo || !obtenerTipoPorId(tipo)) {
    errores.push('Debes indicar un tipo de plan valido.');
  }

  if (conQuien !== undefined && conQuien !== null && typeof conQuien !== 'string') {
    errores.push('El campo "con quien" no es valido.');
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
    manejarError(err, res, 'lectura de citas');
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

  const { titulo, tipo, conQuien, fecha, hora, ubicacion, lugarSugerido } = req.body;

  try {
    const nuevaCita = await db.crearCita({
      usuarioId: req.session.usuarioId,
      titulo: titulo.trim(),
      tipo,
      conQuien: conQuien ? conQuien.trim() : null,
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
    res.status(201).json({ cita: nuevaCita });
  } catch (err) {
    manejarError(err, res, 'creacion de cita');
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
    manejarError(err, res, 'eliminacion de cita');
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
    manejarError(err, res, 'clima de la cita');
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
    manejarError(err, res, 'creacion de pago');
  }
});

app.get('/api/health', (_req, res) => res.json({ estado: 'ok' }));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  if (!OPEN_METEO_API_KEY) {
    console.log('Nota: no se configuro OPEN_METEO_API_KEY. Se usara el servicio gratuito de Open-Meteo.');
  }
});
