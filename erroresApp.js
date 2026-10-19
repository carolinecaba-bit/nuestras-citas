// -----------------------------------------------------------------------
// Errores que vieron los usuarios: cada respuesta de error del servidor
// (estado 500 o mas: fallas de la IA, del clima, de los lugares, internas)
// se guarda con su causa, para la vista de administracion.
//
// No se registran los errores de validacion (400): son el usuario
// corrigiendo un formulario, no una falla de la app. Tampoco se guarda
// nada de lo que el usuario escribio: solo el mensaje de error de la app.
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

const ZONA = 'America/Santo_Domingo';
const DESDE = (unidad) => `date_trunc('${unidad}', now() AT TIME ZONE '${ZONA}') AT TIME ZONE '${ZONA}'`;

/** Clasifica un error segun la ruta y el mensaje. */
function clasificar(ruta, status, mensaje = '') {
  const m = mensaje.toLowerCase();
  if (ruta.startsWith('/api/ideas')) {
    if (m.includes('límite')) return 'ia_limite';
    if (m.includes('sobrecargado')) return 'ia_saturada';
    if (m.includes('tardó')) return 'ia_tiempo';
    if (m.includes('no está configurada') || m.includes('clave') || m.includes('ai_model')) return 'ia_configuracion';
    return 'ia_otro';
  }
  if (/^\/api\/(clima|citas\/[^/]+\/clima)/.test(ruta)) return 'clima';
  if (/^\/api\/(sugerencias|tiendas-detalles|antes-despues|geocode)/.test(ruta)) return 'lugares';
  if (ruta.startsWith('/api/tops')) return 'ideas_blogs';
  return 'interno';
}

async function registrar({ usuarioId, metodo, ruta, status, mensaje }) {
  await consulta(
    `INSERT INTO errores_app (usuario_id, metodo, ruta, status, causa, mensaje)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId || null, metodo, ruta.slice(0, 200), status, clasificar(ruta, status, mensaje), (mensaje || '').slice(0, 300)]
  );
}

/**
 * Middleware: envuelve res.json en las rutas /api y registra las
 * respuestas con estado >= 500. Nunca cambia ni demora la respuesta.
 */
function middlewareRegistro(alFallarRegistro) {
  return (req, res, next) => {
    const jsonOriginal = res.json.bind(res);
    res.json = (cuerpo) => {
      if (res.statusCode >= 500) {
        // Sin ids en la ruta (ej: /api/citas/:id/clima), para agrupar bien.
        const ruta = req.originalUrl.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
        registrar({
          usuarioId: req.session && req.session.usuarioId,
          metodo: req.method,
          ruta,
          status: res.statusCode,
          mensaje: cuerpo && typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje : ''
        }).catch((err) => alFallarRegistro && alFallarRegistro(err));
      }
      return jsonOriginal(cuerpo);
    };
    next();
  };
}

async function resumen() {
  const porCausa = (unidad) => consulta(
    `SELECT causa, count(*)::int AS cantidad, count(DISTINCT usuario_id)::int AS usuarios
     FROM errores_app WHERE creado_en >= ${DESDE(unidad)}
     GROUP BY causa ORDER BY cantidad DESC`
  ).then((r) => r.rows);

  const [hoy, mes, ultimos, tasaIA] = await Promise.all([
    porCausa('day'),
    porCausa('month'),
    consulta(
      `SELECT e.creado_en, e.metodo, e.ruta, e.status, e.causa, e.mensaje, u.email
       FROM errores_app e LEFT JOIN usuarios u ON u.id = e.usuario_id
       ORDER BY e.creado_en DESC LIMIT 25`
    ).then((r) => r.rows.map((f) => ({ ...f, creado_en: f.creado_en.toISOString() }))),
    consulta(
      `SELECT count(*)::int AS llamadas, count(*) FILTER (WHERE NOT exito)::int AS fallidas
       FROM uso_ia WHERE creado_en >= ${DESDE('month')}`
    ).then((r) => r.rows[0])
  ]);
  return { hoy, mes, ultimos, tasaIA };
}

module.exports = { middlewareRegistro, resumen, clasificar };
