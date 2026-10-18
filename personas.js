// -----------------------------------------------------------------------
// Perfiles de personas ("con quien" es la cita): nombre, relacion,
// cumpleanos y otros datos utiles (comida favorita, notas). Cada perfil
// pertenece a un usuario y solo el es quien puede verlo/editarlo.
// Persistencia en Postgres; cada consulta filtra por usuario_id.
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

// Sugerencias comunes para el campo "relacion". El campo en si es texto
// libre: esta lista solo alimenta el <select> del frontend: el usuario
// puede escribir cualquier otra cosa si ninguna calza.
const RELACIONES_SUGERIDAS = [
  'Novia', 'Novio', 'Esposa', 'Esposo',
  'Madre', 'Padre', 'Hermana', 'Hermano',
  'Hija', 'Hijo', 'Amiga', 'Amigo'
];

const CAMPOS = ['nombre', 'relacion', 'cumpleanos', 'comidaFavorita', 'correo', 'notas', 'fechasImportantes'];
const COLUMNAS = {
  nombre: 'nombre', relacion: 'relacion', cumpleanos: 'cumpleanos', comidaFavorita: 'comida_favorita',
  correo: 'correo', notas: 'notas', fechasImportantes: 'fechas_importantes'
};

function aPersona(fila) {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    relacion: fila.relacion,
    cumpleanos: fila.cumpleanos,
    comidaFavorita: fila.comida_favorita,
    correo: fila.correo,
    notas: fila.notas,
    fechasImportantes: fila.fechas_importantes || [],
    creadoEn: fila.creado_en.toISOString()
  };
}

function valorColumna(campo, valor) {
  if (campo === 'fechasImportantes') return JSON.stringify(valor || []);
  return valor === undefined ? null : valor;
}

async function obtenerPersonas(usuarioId) {
  const { rows } = await consulta('SELECT * FROM personas WHERE usuario_id = $1 ORDER BY lower(nombre)', [usuarioId]);
  return rows.map(aPersona);
}

async function obtenerPersonaPorId(id, usuarioId) {
  const { rows } = await consulta('SELECT * FROM personas WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rows[0] ? aPersona(rows[0]) : null;
}

async function crearPersona(datos) {
  const { rows } = await consulta(
    `INSERT INTO personas (usuario_id, ${CAMPOS.map((c) => COLUMNAS[c]).join(', ')})
     VALUES ($1, ${CAMPOS.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
    [datos.usuarioId, ...CAMPOS.map((c) => valorColumna(c, datos[c]))]
  );
  return aPersona(rows[0]);
}

/** Actualiza solo los campos presentes en `datos`. */
async function actualizarPersona(id, usuarioId, datos) {
  const campos = CAMPOS.filter((c) => datos[c] !== undefined);
  if (campos.length === 0) return obtenerPersonaPorId(id, usuarioId);
  const { rows } = await consulta(
    `UPDATE personas SET ${campos.map((c, i) => `${COLUMNAS[c]} = $${i + 3}`).join(', ')}
     WHERE id = $1 AND usuario_id = $2 RETURNING *`,
    [id, usuarioId, ...campos.map((c) => valorColumna(c, datos[c]))]
  );
  return rows[0] ? aPersona(rows[0]) : null;
}

async function eliminarPersona(id, usuarioId) {
  const { rowCount } = await consulta('DELETE FROM personas WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rowCount > 0;
}

module.exports = {
  RELACIONES_SUGERIDAS,
  obtenerPersonas,
  obtenerPersonaPorId,
  crearPersona,
  actualizarPersona,
  eliminarPersona
};
