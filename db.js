const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

const RUTA_ARCHIVO = path.join(__dirname, 'data', 'citas.json');

// Cola simple para serializar escrituras y evitar que dos peticiones
// concurrentes se pisen entre si al escribir el archivo.
let colaEscritura = Promise.resolve();

async function asegurarArchivo() {
  await fsPromises.mkdir(path.dirname(RUTA_ARCHIVO), { recursive: true });
  try {
    await fsPromises.access(RUTA_ARCHIVO);
  } catch (err) {
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
  }
}

async function leerCitas() {
  await asegurarArchivo();
  try {
    const contenido = await fsPromises.readFile(RUTA_ARCHIVO, 'utf-8');
    const datos = JSON.parse(contenido);
    if (!Array.isArray(datos)) {
      throw new Error('El contenido no es un arreglo');
    }
    return datos;
  } catch (err) {
    console.error('[db] El archivo de citas estaba vacio o corrupto, se reinicia a una lista vacia:', err.message);
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
    return [];
  }
}

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  // Si la tarea falla, no queremos que la cola quede "envenenada" para siempre.
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function guardarCitas(citas) {
  return encolarEscritura(async () => {
    const contenido = JSON.stringify(citas, null, 2);
    const rutaTemporal = `${RUTA_ARCHIVO}.tmp`;
    // Escritura atomica: primero a un archivo temporal, luego renombrar.
    // Asi, si el proceso se interrumpe a mitad de camino, el archivo
    // original nunca queda a medio escribir / corrupto.
    await fsPromises.writeFile(rutaTemporal, contenido, 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_ARCHIVO);
  });
}

async function obtenerCitas(usuarioId) {
  const citas = await leerCitas();
  return citas
    .filter((c) => c.usuarioId === usuarioId)
    .sort((a, b) => {
      const claveA = `${a.fecha}T${a.hora || '00:00'}`;
      const claveB = `${b.fecha}T${b.hora || '00:00'}`;
      return claveA.localeCompare(claveB);
    });
}

async function obtenerCitaPorId(id, usuarioId) {
  const citas = await leerCitas();
  const cita = citas.find((c) => c.id === id) || null;
  // Si la cita existe pero pertenece a otro usuario, la tratamos como
  // inexistente: no revelamos que existe una cita ajena.
  if (cita && cita.usuarioId !== usuarioId) return null;
  return cita;
}

async function crearCita(datosCita) {
  const citas = await leerCitas();
  const nuevaCita = {
    id: crypto.randomUUID(),
    ...datosCita,
    creadoEn: new Date().toISOString()
  };
  citas.push(nuevaCita);
  await guardarCitas(citas);
  return nuevaCita;
}

async function eliminarCita(id, usuarioId) {
  const citas = await leerCitas();
  const indice = citas.findIndex((c) => c.id === id && c.usuarioId === usuarioId);
  if (indice === -1) return false;
  citas.splice(indice, 1);
  await guardarCitas(citas);
  return true;
}

module.exports = {
  obtenerCitas,
  obtenerCitaPorId,
  crearCita,
  eliminarCita
};
