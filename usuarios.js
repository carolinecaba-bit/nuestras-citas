// -----------------------------------------------------------------------
// Persistencia de usuarios (creados via "Iniciar sesion con Google").
// Mismo patron que db.js: archivo JSON local con escritura atomica.
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

const RUTA_ARCHIVO = path.join(__dirname, 'data', 'usuarios.json');

let colaEscritura = Promise.resolve();

async function asegurarArchivo() {
  await fsPromises.mkdir(path.dirname(RUTA_ARCHIVO), { recursive: true });
  try {
    await fsPromises.access(RUTA_ARCHIVO);
  } catch (err) {
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
  }
}

async function leerUsuarios() {
  await asegurarArchivo();
  try {
    const contenido = await fsPromises.readFile(RUTA_ARCHIVO, 'utf-8');
    const datos = JSON.parse(contenido);
    if (!Array.isArray(datos)) throw new Error('El contenido no es un arreglo');
    return datos;
  } catch (err) {
    console.error('[usuarios] El archivo estaba vacio o corrupto, se reinicia a una lista vacia:', err.message);
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
    return [];
  }
}

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function guardarUsuarios(usuarios) {
  return encolarEscritura(async () => {
    const contenido = JSON.stringify(usuarios, null, 2);
    const rutaTemporal = `${RUTA_ARCHIVO}.tmp`;
    await fsPromises.writeFile(rutaTemporal, contenido, 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_ARCHIVO);
  });
}

async function obtenerUsuarioPorId(id) {
  const usuarios = await leerUsuarios();
  return usuarios.find((u) => u.id === id) || null;
}

async function obtenerUsuarioPorGoogleId(googleId) {
  const usuarios = await leerUsuarios();
  return usuarios.find((u) => u.googleId === googleId) || null;
}

/**
 * Busca un usuario por su googleId; si no existe, lo crea. Si ya existe,
 * actualiza nombre/avatar por si cambiaron en su cuenta de Google.
 */
async function buscarOCrearUsuario({ googleId, nombre, email, avatarUrl }) {
  const usuarios = await leerUsuarios();
  const existente = usuarios.find((u) => u.googleId === googleId);

  if (existente) {
    existente.nombre = nombre;
    existente.email = email;
    existente.avatarUrl = avatarUrl;
    await guardarUsuarios(usuarios);
    return existente;
  }

  const nuevoUsuario = {
    id: crypto.randomUUID(),
    googleId,
    nombre,
    email,
    avatarUrl,
    creadoEn: new Date().toISOString()
  };
  usuarios.push(nuevoUsuario);
  await guardarUsuarios(usuarios);
  return nuevoUsuario;
}

module.exports = { obtenerUsuarioPorId, obtenerUsuarioPorGoogleId, buscarOCrearUsuario };
