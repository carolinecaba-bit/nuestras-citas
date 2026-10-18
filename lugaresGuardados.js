// -----------------------------------------------------------------------
// Lugares guardados por usuario: "Recientes" (los ultimos usados, se
// guardan solos al crear una cita) y "Favoritos" (marcados con estrella,
// con un nombre corto opcional como "Casa" o "Santiago").
// Mismo patron de archivo JSON con escritura atomica que personas.js.
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

const RUTA_ARCHIVO = path.join(__dirname, 'data', 'lugares-guardados.json');
const MAX_RECIENTES = 5;
const MAX_FAVORITOS = 20;
const ALIAS_MAX = 30;

let colaEscritura = Promise.resolve();

async function asegurarArchivo() {
  await fsPromises.mkdir(path.dirname(RUTA_ARCHIVO), { recursive: true });
  try {
    await fsPromises.access(RUTA_ARCHIVO);
  } catch (err) {
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
  }
}

async function leerTodos() {
  await asegurarArchivo();
  try {
    const datos = JSON.parse(await fsPromises.readFile(RUTA_ARCHIVO, 'utf-8'));
    if (!Array.isArray(datos)) throw new Error('El contenido no es un arreglo');
    return datos;
  } catch (err) {
    console.error('[lugares-guardados] El archivo estaba vacio o corrupto, se reinicia:', err.message);
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
    return [];
  }
}

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function guardarTodos(lugares) {
  return encolarEscritura(async () => {
    const rutaTemporal = `${RUTA_ARCHIVO}.tmp`;
    await fsPromises.writeFile(rutaTemporal, JSON.stringify(lugares, null, 2), 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_ARCHIVO);
  });
}

// Dos busquedas del mismo sitio pueden diferir en decimales minimos:
// redondeando a 3 decimales (~100 m) se tratan como el mismo lugar.
function mismaPosicion(a, b) {
  return Math.round(a.lat * 1000) === Math.round(b.lat * 1000) &&
    Math.round(a.lon * 1000) === Math.round(b.lon * 1000);
}

function ordenar(lista) {
  return lista.sort((a, b) => {
    if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
    return (b.usadoEn || '').localeCompare(a.usadoEn || '');
  });
}

/** Deja solo los MAX_RECIENTES no favoritos mas recientes del usuario. */
function recortarRecientes(todos, usuarioId) {
  const recientes = todos
    .filter((l) => l.usuarioId === usuarioId && !l.favorito)
    .sort((a, b) => (b.usadoEn || '').localeCompare(a.usadoEn || ''));
  const sobrantes = new Set(recientes.slice(MAX_RECIENTES).map((l) => l.id));
  return todos.filter((l) => !sobrantes.has(l.id));
}

async function obtenerLugares(usuarioId) {
  const todos = await leerTodos();
  return ordenar(todos.filter((l) => l.usuarioId === usuarioId));
}

/**
 * Registra que el usuario uso un lugar: si ya existe (misma posicion),
 * actualiza la fecha de uso; si no, lo crea como reciente. Con
 * `favorito: true` ademas lo marca como favorito.
 */
async function registrarUso(usuarioId, { nombre, lat, lon }, { favorito = false, alias = null } = {}) {
  let todos = await leerTodos();
  const ahora = new Date().toISOString();
  let lugar = todos.find((l) => l.usuarioId === usuarioId && mismaPosicion(l, { lat, lon }));

  if (lugar) {
    lugar.usadoEn = ahora;
    if (favorito) lugar.favorito = true;
    if (alias !== null) lugar.alias = alias;
  } else {
    if (favorito && todos.filter((l) => l.usuarioId === usuarioId && l.favorito).length >= MAX_FAVORITOS) {
      const err = new Error(`Puedes tener hasta ${MAX_FAVORITOS} lugares favoritos.`);
      err.esLimite = true;
      throw err;
    }
    lugar = { id: crypto.randomUUID(), usuarioId, nombre, alias, lat, lon, favorito, usadoEn: ahora };
    todos.push(lugar);
  }

  todos = recortarRecientes(todos, usuarioId);
  await guardarTodos(todos);
  return lugar;
}

async function actualizarLugar(id, usuarioId, { favorito, alias }) {
  let todos = await leerTodos();
  const lugar = todos.find((l) => l.id === id && l.usuarioId === usuarioId);
  if (!lugar) return null;
  if (typeof favorito === 'boolean') lugar.favorito = favorito;
  if (alias !== undefined) lugar.alias = alias;
  todos = recortarRecientes(todos, usuarioId);
  await guardarTodos(todos);
  return todos.find((l) => l.id === id) || null;
}

async function eliminarLugar(id, usuarioId) {
  const todos = await leerTodos();
  const indice = todos.findIndex((l) => l.id === id && l.usuarioId === usuarioId);
  if (indice === -1) return false;
  todos.splice(indice, 1);
  await guardarTodos(todos);
  return true;
}

module.exports = { ALIAS_MAX, obtenerLugares, registrarUso, actualizarLugar, eliminarLugar };
