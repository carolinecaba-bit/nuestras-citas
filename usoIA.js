// -----------------------------------------------------------------------
// Medicion del uso de la IA: cada llamada a un agente se guarda con sus
// tokens, pasos, duracion y costo estimado.
//
// COSTO = tokens_entrada x precio_entrada + tokens_salida x precio_salida
// (precios en dolares por millon de tokens).
//
// Los precios conocidos estan abajo. Para agregar o corregir uno sin tocar
// el codigo, usa la variable AI_PRECIOS (JSON), por ejemplo:
//   AI_PRECIOS={"google:gemini-3.8-flash":[0.30,2.50]}
// Si un modelo no tiene precio, el costo queda en null ("sin precio").
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

// Precios publicados por Groq (USD por millon de tokens: [entrada, salida]).
const PRECIOS_BASE = {
  'groq:openai/gpt-oss-120b': [0.15, 0.6],
  'groq:openai/gpt-oss-20b': [0.075, 0.3]
};

function preciosConfigurados() {
  let extra = {};
  if (process.env.AI_PRECIOS) {
    try {
      extra = JSON.parse(process.env.AI_PRECIOS);
    } catch (err) {
      console.warn('[usoIA] AI_PRECIOS no es un JSON valido; se ignora.');
    }
  }
  return { ...PRECIOS_BASE, ...extra };
}

function precioDe(modelo) {
  const precio = preciosConfigurados()[modelo];
  if (!Array.isArray(precio) || precio.length !== 2 || !precio.every((n) => typeof n === 'number' && n >= 0)) return null;
  return precio;
}

function costoEstimado(modelo, tokensEntrada, tokensSalida) {
  const precio = precioDe(modelo);
  if (!precio) return null;
  return (tokensEntrada * precio[0] + tokensSalida * precio[1]) / 1e6;
}

async function registrar(usuarioId, m) {
  const costo = costoEstimado(m.modelo, m.tokensEntrada || 0, m.tokensSalida || 0);
  await consulta(
    `INSERT INTO uso_ia (usuario_id, funcion, modelo, tokens_entrada, tokens_salida, pasos, duracion_ms, exito, error, costo_usd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [usuarioId, m.funcion, m.modelo, m.tokensEntrada || 0, m.tokensSalida || 0, m.pasos || 0,
      m.duracionMs || 0, m.exito === true, m.error ? String(m.error).slice(0, 300) : null, costo]
  );
}

// "Hoy" y "este mes" se calculan en hora de Republica Dominicana.
const ZONA = 'America/Santo_Domingo';
const DESDE = (unidad) => `date_trunc('${unidad}', now() AT TIME ZONE '${ZONA}') AT TIME ZONE '${ZONA}'`;

/**
 * Resumen del uso de TODOS los usuarios. Solo lo pide la vista de
 * administracion (el servidor verifica que quien pregunta sea admin).
 */
async function resumenGeneral() {
  const totales = (unidad) => consulta(
    `SELECT count(*)::int AS llamadas,
            count(*) FILTER (WHERE exito)::int AS exitosas,
            count(DISTINCT usuario_id)::int AS usuarios,
            COALESCE(sum(tokens_entrada), 0)::int AS tokens_entrada,
            COALESCE(sum(tokens_salida), 0)::int AS tokens_salida,
            COALESCE(sum(costo_usd), 0)::float AS costo,
            count(*) FILTER (WHERE costo_usd IS NULL)::int AS sin_precio,
            COALESCE(avg(duracion_ms), 0)::int AS duracion_promedio
     FROM uso_ia WHERE creado_en >= ${DESDE(unidad)}`
  ).then((r) => r.rows[0]);

  const [hoy, mes, porModelo, porUsuario, ultimas] = await Promise.all([
    totales('day'),
    totales('month'),
    consulta(
      `SELECT modelo, count(*)::int AS llamadas,
              COALESCE(sum(tokens_entrada), 0)::int AS tokens_entrada,
              COALESCE(sum(tokens_salida), 0)::int AS tokens_salida,
              sum(costo_usd)::float AS costo
       FROM uso_ia WHERE creado_en >= ${DESDE('month')}
       GROUP BY modelo ORDER BY llamadas DESC`
    ).then((r) => r.rows),
    consulta(
      `SELECT u.nombre, u.email, count(*)::int AS llamadas,
              count(*) FILTER (WHERE x.exito)::int AS exitosas,
              COALESCE(sum(x.tokens_entrada), 0)::int AS tokens_entrada,
              COALESCE(sum(x.tokens_salida), 0)::int AS tokens_salida,
              sum(x.costo_usd)::float AS costo,
              max(x.creado_en) AS ultima
       FROM uso_ia x JOIN usuarios u ON u.id = x.usuario_id
       WHERE x.creado_en >= ${DESDE('month')}
       GROUP BY u.nombre, u.email ORDER BY llamadas DESC`
    ).then((r) => r.rows.map((f) => ({ ...f, ultima: f.ultima.toISOString() }))),
    consulta(
      `SELECT x.funcion, x.modelo, x.tokens_entrada, x.tokens_salida, x.pasos, x.duracion_ms,
              x.exito, x.error, x.costo_usd::float AS costo, x.creado_en, u.email
       FROM uso_ia x JOIN usuarios u ON u.id = x.usuario_id
       ORDER BY x.creado_en DESC LIMIT 20`
    ).then((r) => r.rows.map((f) => ({ ...f, creado_en: f.creado_en.toISOString() })))
  ]);

  return {
    hoy,
    mes,
    porModelo: porModelo.map((m) => ({ ...m, precio: precioDe(m.modelo) })),
    porUsuario,
    ultimas,
    modeloActual: process.env.AI_MODEL || null,
    precioModeloActual: precioDe(process.env.AI_MODEL || '')
  };
}

module.exports = { registrar, resumenGeneral, costoEstimado, precioDe };
