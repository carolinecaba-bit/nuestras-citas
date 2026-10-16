// -----------------------------------------------------------------------
// "Iniciar sesion con Google" (OAuth 2.0, flujo de servidor).
//
// El Client Secret NUNCA sale del backend: el navegador solo ve la
// redireccion a Google y de vuelta a nuestra app. El intercambio del
// "code" por un token ocurre en una llamada servidor-a-servidor.
// -----------------------------------------------------------------------
const crypto = require('crypto');
const usuarios = require('./usuarios');
const correo = require('./correo');
const logger = require('./logger');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const TIMEOUT_MS = 10000;

function credencialesConfiguradas() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.APP_BASE_URL
  );
}

function urlRedireccion() {
  return `${process.env.APP_BASE_URL}/auth/google/callback`;
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

/**
 * GET /auth/google — redirige a la pantalla de consentimiento de Google.
 */
function iniciarLogin(req, res) {
  if (!credencialesConfiguradas()) {
    logger.warning({
      actor: 'anonimo',
      funcion: 'iniciarLogin',
      mensaje: 'Intento de login con Google no configurado en el servidor'
    });
    return res.status(500).send(
      'El inicio de sesión con Google no está configurado en este servidor. ' +
      'Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o APP_BASE_URL en las variables de entorno.'
    );
  }

  // "state" evita que alguien mas dispare un login en nombre del usuario
  // (proteccion CSRF estandar para flujos OAuth).
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', urlRedireccion());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');

  res.redirect(url.toString());
}

/**
 * GET /auth/google/callback — recibe el "code", lo intercambia por un
 * token (en el backend), obtiene los datos del usuario y crea la sesion.
 */
async function manejarCallback(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    // El usuario cancelo el login desde la pantalla de Google.
    logger.info({ actor: 'anonimo', funcion: 'manejarCallback', input: { error }, mensaje: 'Usuario cancelo el login con Google' });
    return res.redirect('/?login=cancelado');
  }

  if (!state || state !== req.session.oauthState) {
    logger.warning({
      actor: 'anonimo',
      funcion: 'manejarCallback',
      mensaje: 'State invalido o ausente (posible CSRF o solicitud expirada)'
    });
    return res.status(400).send('La solicitud de inicio de sesión no es válida o expiró. Intenta de nuevo.');
  }
  delete req.session.oauthState;

  if (!code) {
    return res.status(400).send('Google no envió un código de autorización. Intenta iniciar sesión de nuevo.');
  }

  try {
    // 1) Intercambiar el "code" por tokens. Esta llamada va del backend
    //    a Google directamente; el Client Secret nunca toca el navegador.
    const respuestaToken = await fetchConTimeout(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: urlRedireccion(),
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!respuestaToken.ok) {
      const detalle = await respuestaToken.text();
      console.error('[auth] Error al intercambiar el code:', detalle);
      logger.error({
        actor: 'anonimo',
        funcion: 'manejarCallback',
        output: { status: respuestaToken.status, detalle },
        mensaje: 'Fallo el intercambio de code por token con Google'
      });
      return res.status(502).send('No se pudo completar el inicio de sesión con Google. Intenta de nuevo.');
    }

    const { access_token: accessToken } = await respuestaToken.json();

    // 2) Con el access_token, pedirle a Google los datos basicos del perfil.
    const respuestaPerfil = await fetchConTimeout(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!respuestaPerfil.ok) {
      const detalle = await respuestaPerfil.text();
      console.error('[auth] Error al obtener el perfil:', detalle);
      logger.error({
        actor: 'anonimo',
        funcion: 'manejarCallback',
        output: { status: respuestaPerfil.status, detalle },
        mensaje: 'Fallo al obtener el perfil de Google'
      });
      return res.status(502).send('No se pudo obtener tu perfil de Google. Intenta de nuevo.');
    }

    const perfil = await respuestaPerfil.json();

    // 3) Crear o actualizar el usuario local, y guardar la sesion.
    //    Verificamos ANTES si ya existia, para saber si este es un
    //    registro nuevo de verdad (y por lo tanto, si corresponde
    //    enviar el correo de bienvenida).
    const existiaAntes = Boolean(await usuarios.obtenerUsuarioPorGoogleId(perfil.sub));

    const usuario = await usuarios.buscarOCrearUsuario({
      googleId: perfil.sub,
      nombre: perfil.name || perfil.email,
      email: perfil.email,
      avatarUrl: perfil.picture || null
    });

    // Regenerar el id de sesion al iniciar sesion evita "session fixation".
    req.session.regenerate((err) => {
      if (err) {
        console.error('[auth] Error al regenerar la sesion:', err);
        logger.error({
          actor: `usuario:${usuario.id}`,
          funcion: 'manejarCallback',
          output: { error: err.message },
          mensaje: 'Fallo al regenerar la sesion tras el login'
        });
        return res.status(500).send('Ocurrió un error al iniciar tu sesión. Intenta de nuevo.');
      }
      req.session.usuarioId = usuario.id;

      logger.info({
        actor: `usuario:${usuario.id}`,
        funcion: 'manejarCallback',
        input: { email: usuario.email },
        output: { usuarioId: usuario.id, esRegistroNuevo: !existiaAntes },
        mensaje: existiaAntes ? 'Login exitoso' : 'Login exitoso (usuario nuevo)'
      });

      if (!existiaAntes) {
        // Disparamos el correo SIN esperar su resultado: el registro
        // (este login) responde de inmediato, sin importar cuanto
        // tarde el proveedor de correo o si falla.
        correo.enviarCorreoBienvenida(usuario).catch((errCorreo) => {
          console.error('[correo] No se pudo enviar el correo de bienvenida:', errCorreo.message);
          logger.error({
            actor: `usuario:${usuario.id}`,
            funcion: 'enviarCorreoBienvenida',
            input: { email: usuario.email },
            output: { error: errCorreo.message },
            mensaje: 'No se pudo enviar el correo de bienvenida'
          });
        });
      }

      res.redirect('/');
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warning({ actor: 'anonimo', funcion: 'manejarCallback', mensaje: 'Tiempo agotado hablando con Google' });
      return res.status(504).send('Google tardó demasiado en responder. Intenta iniciar sesión de nuevo.');
    }
    console.error('[auth] Error inesperado en el login:', err);
    logger.error({
      actor: 'anonimo',
      funcion: 'manejarCallback',
      output: { error: err.message },
      mensaje: 'Error inesperado en el login'
    });
    res.status(500).send('Ocurrió un error inesperado al iniciar sesión. Intenta de nuevo.');
  }
}

/**
 * POST /auth/logout — cierra la sesion.
 */
function cerrarSesion(req, res) {
  const actor = req.session && req.session.usuarioId ? `usuario:${req.session.usuarioId}` : 'anonimo';
  req.session.destroy((err) => {
    if (err) {
      console.error('[auth] Error al cerrar sesion:', err);
      logger.error({ actor, funcion: 'cerrarSesion', output: { error: err.message }, mensaje: 'No se pudo cerrar la sesion' });
      return res.status(500).json({ error: 'error_interno', mensaje: 'No se pudo cerrar la sesión.' });
    }
    logger.info({ actor, funcion: 'cerrarSesion', mensaje: 'Sesion cerrada' });
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}

/**
 * Middleware: exige una sesion activa para continuar. Se usa en las
 * rutas que tocan datos personales (citas).
 */
function requiereSesion(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({
      error: 'no_autenticado',
      mensaje: 'Debes iniciar sesión con Google para continuar.'
    });
  }
  next();
}

module.exports = { iniciarLogin, manejarCallback, cerrarSesion, requiereSesion, credencialesConfiguradas };
