// -----------------------------------------------------------------------
// Registro persistente de cada evento de webhook de Stripe recibido.
// Complementa los logs de consola con un archivo que se puede revisar
// despues (criterio: "la app registra cada evento del webhook").
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const RUTA_ARCHIVO = path.join(__dirname, 'data', 'eventos-stripe.json');
const MAX_EVENTOS_GUARDADOS = 500;

let colaEscritura = Promise.resolve();

async function asegurarArchivo() {
  await fsPromises.mkdir(path.dirname(RUTA_ARCHIVO), { recursive: true });
  try {
    await fsPromises.access(RUTA_ARCHIVO);
  } catch (err) {
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
  }
}

async function leerEventos() {
  await asegurarArchivo();
  try {
    const contenido = await fsPromises.readFile(RUTA_ARCHIVO, 'utf-8');
    const datos = JSON.parse(contenido);
    if (!Array.isArray(datos)) throw new Error('El contenido no es un arreglo');
    return datos;
  } catch (err) {
    console.error('[eventosStripe] El archivo estaba vacio o corrupto, se reinicia:', err.message);
    await fsPromises.writeFile(RUTA_ARCHIVO, '[]', 'utf-8');
    return [];
  }
}

function encolarEscritura(tarea) {
  const resultado = colaEscritura.then(tarea, tarea);
  colaEscritura = resultado.catch(() => {});
  return resultado;
}

async function guardarEventos(eventos) {
  return encolarEscritura(async () => {
    const contenido = JSON.stringify(eventos, null, 2);
    const rutaTemporal = `${RUTA_ARCHIVO}.tmp`;
    await fsPromises.writeFile(rutaTemporal, contenido, 'utf-8');
    await fsPromises.rename(rutaTemporal, RUTA_ARCHIVO);
  });
}

/**
 * Agrega un evento al registro. Se guarda un resumen, no el objeto
 * completo de Stripe (que puede ser grande e incluir datos sensibles
 * de mas). Se recorta a los ultimos MAX_EVENTOS_GUARDADOS para que el
 * archivo no crezca sin limite.
 */
async function registrarEvento(evento) {
  const eventos = await leerEventos();

  const esPagoCompletado = evento.type === 'checkout.session.completed';
  const objeto = evento.data?.object || {};

  eventos.push({
    id: evento.id,
    tipo: evento.type,
    recibidoEn: new Date().toISOString(),
    resumenPago: esPagoCompletado
      ? {
          email: objeto.customer_details?.email || objeto.customer_email || null,
          monto: objeto.amount_total ?? null,
          moneda: objeto.currency ?? null
        }
      : null
  });

  const recortados = eventos.slice(-MAX_EVENTOS_GUARDADOS);
  await guardarEventos(recortados);
}

async function obtenerEventos() {
  return leerEventos();
}

module.exports = { registrarEvento, obtenerEventos };
