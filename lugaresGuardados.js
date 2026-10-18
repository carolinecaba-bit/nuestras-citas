// -----------------------------------------------------------------------
// Lugares guardados por usuario: "Recientes" (los ultimos usados, se
// guardan solos al crear una cita) y "Favoritos" (marcados con estrella,
// con un nombre corto opcional como "Casa" o "Santiago").
// Persistencia en Postgres; cada consulta filtra por usuario_id.
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

const MAX_RECIENTES = 5;
const MAX_FAVORITOS = 20;
const ALIAS_MAX = 30;

function aLugar(fila) {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    alias: fila.alias,
    lat: fila.lat,
    lon: fila.lon,
    favorito: fila.favorito,
    usadoEn: fila.usado_en.toISOString()
  };
}

/** Deja solo los MAX_RECIENTES no favoritos mas recientes del usuario. */
async function recortarRecientes(usuarioId) {
  await consulta(
    `DELETE FROM lugares_guardados WHERE id IN (
       SELECT id FROM lugares_guardados WHERE usuario_id = $1 AND NOT favorito
       ORDER BY usado_en DESC OFFSET $2
     )`,
    [usuarioId, MAX_RECIENTES]
  );
}

async function obtenerLugares(usuarioId) {
  const { rows } = await consulta(
    'SELECT * FROM lugares_guardados WHERE usuario_id = $1 ORDER BY favorito DESC, usado_en DESC',
    [usuarioId]
  );
  return rows.map(aLugar);
}

/**
 * Registra que el usuario uso un lugar: si ya existe (misma posicion,
 * redondeada a ~100 m), actualiza la fecha de uso; si no, lo crea como
 * reciente. Con `favorito: true` ademas lo marca como favorito.
 */
async function registrarUso(usuarioId, { nombre, lat, lon }, { favorito = false, alias = null } = {}) {
  const { rows: existentes } = await consulta(
    `SELECT * FROM lugares_guardados
     WHERE usuario_id = $1 AND round(lat * 1000) = round($2::numeric * 1000) AND round(lon * 1000) = round($3::numeric * 1000)
     LIMIT 1`,
    [usuarioId, lat, lon]
  );

  let fila;
  if (existentes[0]) {
    const { rows } = await consulta(
      `UPDATE lugares_guardados SET usado_en = now(),
         favorito = favorito OR $2,
         alias = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE alias END
       WHERE id = $1 RETURNING *`,
      [existentes[0].id, favorito, alias]
    );
    fila = rows[0];
  } else {
    if (favorito) {
      const { rows } = await consulta('SELECT count(*)::int AS n FROM lugares_guardados WHERE usuario_id = $1 AND favorito', [usuarioId]);
      if (rows[0].n >= MAX_FAVORITOS) {
        const err = new Error(`Puedes tener hasta ${MAX_FAVORITOS} lugares favoritos.`);
        err.esLimite = true;
        throw err;
      }
    }
    const { rows } = await consulta(
      `INSERT INTO lugares_guardados (usuario_id, nombre, alias, lat, lon, favorito)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [usuarioId, nombre, alias, lat, lon, favorito]
    );
    fila = rows[0];
  }

  await recortarRecientes(usuarioId);
  return aLugar(fila);
}

async function actualizarLugar(id, usuarioId, { favorito, alias }) {
  const cambios = [];
  const valores = [id, usuarioId];
  if (typeof favorito === 'boolean') { valores.push(favorito); cambios.push(`favorito = $${valores.length}`); }
  if (alias !== undefined) { valores.push(alias); cambios.push(`alias = $${valores.length}`); }
  if (cambios.length === 0) {
    const { rows } = await consulta('SELECT * FROM lugares_guardados WHERE id = $1 AND usuario_id = $2', valores);
    return rows[0] ? aLugar(rows[0]) : null;
  }
  const { rows } = await consulta(
    `UPDATE lugares_guardados SET ${cambios.join(', ')} WHERE id = $1 AND usuario_id = $2 RETURNING *`,
    valores
  );
  if (!rows[0]) return null;
  // Si se quito de favoritos, pasa a recientes y puede sobrar.
  await recortarRecientes(usuarioId);
  const { rows: final } = await consulta('SELECT * FROM lugares_guardados WHERE id = $1', [id]);
  return final[0] ? aLugar(final[0]) : null;
}

async function eliminarLugar(id, usuarioId) {
  const { rowCount } = await consulta('DELETE FROM lugares_guardados WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rowCount > 0;
}

module.exports = { ALIAS_MAX, obtenerLugares, registrarUso, actualizarLugar, eliminarLugar };
