// -----------------------------------------------------------------------
// Citas: persistencia en Postgres. Cada consulta filtra por usuario_id,
// asi que nadie puede leer ni borrar citas de otra cuenta.
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

function aCita(fila) {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    personaId: fila.persona_id,
    fecha: fila.fecha,
    hora: fila.hora,
    ubicacion: fila.ubicacion,
    lugarSugerido: fila.lugar_sugerido,
    creadoEn: fila.creado_en.toISOString()
  };
}

async function obtenerCitas(usuarioId) {
  const { rows } = await consulta(
    `SELECT * FROM citas WHERE usuario_id = $1 ORDER BY fecha, COALESCE(hora, '00:00')`,
    [usuarioId]
  );
  return rows.map(aCita);
}

// Si la cita existe pero es de otro usuario, se trata como inexistente:
// no revelamos que existe una cita ajena.
async function obtenerCitaPorId(id, usuarioId) {
  const { rows } = await consulta('SELECT * FROM citas WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rows[0] ? aCita(rows[0]) : null;
}

async function crearCita(datos) {
  const { rows } = await consulta(
    `INSERT INTO citas (usuario_id, titulo, tipo, persona_id, fecha, hora, ubicacion, lugar_sugerido)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [datos.usuarioId, datos.titulo, datos.tipo, datos.personaId, datos.fecha, datos.hora,
      JSON.stringify(datos.ubicacion), datos.lugarSugerido ? JSON.stringify(datos.lugarSugerido) : null]
  );
  return aCita(rows[0]);
}

async function eliminarCita(id, usuarioId) {
  const { rowCount } = await consulta('DELETE FROM citas WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rowCount > 0;
}

module.exports = { obtenerCitas, obtenerCitaPorId, crearCita, eliminarCita };
