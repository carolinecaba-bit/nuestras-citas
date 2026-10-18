// -----------------------------------------------------------------------
// Usuarios (cuentas de Google): persistencia en Postgres.
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

function aUsuario(fila) {
  return {
    id: fila.id,
    googleId: fila.google_id,
    nombre: fila.nombre,
    email: fila.email,
    avatarUrl: fila.avatar_url,
    creadoEn: fila.creado_en.toISOString()
  };
}

async function obtenerUsuarioPorId(id) {
  const { rows } = await consulta('SELECT * FROM usuarios WHERE id = $1', [id]);
  return rows[0] ? aUsuario(rows[0]) : null;
}

async function obtenerUsuarioPorGoogleId(googleId) {
  const { rows } = await consulta('SELECT * FROM usuarios WHERE google_id = $1', [googleId]);
  return rows[0] ? aUsuario(rows[0]) : null;
}

/**
 * Busca un usuario por su googleId; si no existe, lo crea. Si ya existe,
 * actualiza nombre/correo/avatar por si cambiaron en su cuenta de Google.
 */
async function buscarOCrearUsuario({ googleId, nombre, email, avatarUrl }) {
  const { rows } = await consulta(
    `INSERT INTO usuarios (google_id, nombre, email, avatar_url) VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET nombre = EXCLUDED.nombre, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url
     RETURNING *`,
    [googleId, nombre, email, avatarUrl]
  );
  return aUsuario(rows[0]);
}

module.exports = { obtenerUsuarioPorId, obtenerUsuarioPorGoogleId, buscarOCrearUsuario };
