// -----------------------------------------------------------------------
// Perfiles de personas ("con quien" es la cita): nombre, relacion,
// cumpleanos y otros datos utiles (comida favorita, notas). Cada perfil
// pertenece a un usuario y solo el es quien puede verlo/editarlo.
// Mismo patron de archivo JSON con escritura atomica que usuarios.js/db.js.
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

const RUTA_ARCHIVO = path.join(__dirname, 'data', 'personas.json');

// Sugerencias comunes para el campo "relacion". El campo en si es texto
// libre: esta lista solo alimenta el <select> del frontend: el usuario
// puede escribir cualquier otra cosa si ninguna calza.
const RELACIONES_SUGERIDAS = [
  'Novia', 'Novio', 'Esposa', 'Esposo',
  'Madre', 'Padre', 'Hermana', 'Hermano',
  'Hija', 'Hijo', 'Amiga', 'Amigo'
];

let colaEscritura = Promise.resolve();

async function asegurarArchivo() {
  await fsPromises.mkdir(path.dirname(RUTA_ARCHIVO), { recursive: true });
  try {
    await fsPromises.access(RUTA_ARCHIVO);
  } catch (err) {
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
  }
}

async function leerPersonas() {
  await asegurarArchivo();
  try {
    const contenido = await fsPromises.readFile(RUTA_ARCHIVO, 'utf-8');
    const datos = JSON.parse(contenido);
    if (!Array.isArray(datos)) throw new Error('El contenido no es un arreglo');
    return datos;
  } catch (err) {
    console.error('[personas] El archivo estaba vacio o corrupto, se reinicia:', err.message);
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
    return [];
  }
}

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function guardarPersonas(personas) {
  return encolarEscritura(async () => {
    const contenido = JSON.stringify(personas, null, 2);
    const rutaTemporal = `${RUTA_ARCHIVO}.tmp`;
    await fsPromises.writeFile(rutaTemporal, contenido, 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_ARCHIVO);
  });
}

async function obtenerPersonas(usuarioId) {
  const personas = await leerPersonas();
  return personas
    .filter((p) => p.usuarioId === usuarioId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function obtenerPersonaPorId(id, usuarioId) {
  const personas = await leerPersonas();
  const persona = personas.find((p) => p.id === id) || null;
  if (persona && persona.usuarioId !== usuarioId) return null;
  return persona;
}

async function crearPersona(datos) {
  const personas = await leerPersonas();
  const nuevaPersona = {
    id: crypto.randomUUID(),
    ...datos,
    creadoEn: new Date().toISOString()
  };
  personas.push(nuevaPersona);
  await guardarPersonas(personas);
  return nuevaPersona;
}

async function actualizarPersona(id, usuarioId, datos) {
  const personas = await leerPersonas();
  const indice = personas.findIndex((p) => p.id === id && p.usuarioId === usuarioId);
  if (indice === -1) return null;
  personas[indice] = { ...personas[indice], ...datos };
  await guardarPersonas(personas);
  return personas[indice];
}

async function eliminarPersona(id, usuarioId) {
  const personas = await leerPersonas();
  const indice = personas.findIndex((p) => p.id === id && p.usuarioId === usuarioId);
  if (indice === -1) return false;
  personas.splice(indice, 1);
  await guardarPersonas(personas);
  return true;
}

module.exports = {
  RELACIONES_SUGERIDAS,
  obtenerPersonas,
  obtenerPersonaPorId,
  crearPersona,
  actualizarPersona,
  eliminarPersona
};
