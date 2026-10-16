// -----------------------------------------------------------------------
// Logging estructurado de la aplicacion.
//
// Cada entrada incluye: fecha, nivel (INFO/WARNING/ERROR), actor (quien
// disparo la accion), funcion (donde ocurrio), input y output. Se
// escribe como una linea JSON en logs/AAAAMMDD.log (un archivo por dia,
// segun la fecha local del servidor) y ademas se refleja en consola
// (asi tambien queda visible en el panel de logs de Render).
//
// La escritura en archivo es "best effort": si falla (por permisos,
// disco lleno, etc.) se reporta en consola pero nunca tumba la app.
// -----------------------------------------------------------------------
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const CARPETA_LOGS = path.join(__dirname, 'logs');
const LIMITE_CARACTERES = 2000; // evita que un input/output enorme infle el log sin control

function nombreArchivoDeHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}${mes}${dia}.log`;
}

function limitarTamano(valor) {
  if (valor === undefined) return undefined;
  try {
    const texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
    if (!texto || texto.length <= LIMITE_CARACTERES) {
      return valor;
    }
    return `${texto.slice(0, LIMITE_CARACTERES)}… (truncado, ${texto.length} caracteres en total)`;
  } catch (err) {
    return '[valor no serializable]';
  }
}

async function asegurarCarpeta() {
  await fsPromises.mkdir(CARPETA_LOGS, { recursive: true });
}

/**
 * Registra una entrada de log. `funcion` deberia identificar donde
 * ocurrio (ej: "POST /api/citas" o "manejarCallback"). `actor` quien lo
 * disparo (ej: "usuario:<id>", "stripe-webhook", "anonimo", "sistema").
 */
function registrar({ nivel = 'INFO', actor = 'sistema', funcion, input, output, mensaje }) {
  const entrada = {
    fecha: new Date().toISOString(),
    nivel,
    actor,
    funcion,
    input: limitarTamano(input),
    output: limitarTamano(output),
    mensaje
  };

  const resumen = `[${entrada.fecha}] [${nivel}] ${funcion || '(sin funcion)'} — actor=${actor}${mensaje ? ` — ${mensaje}` : ''}`;
  if (nivel === 'ERROR') {
    console.error(resumen);
  } else if (nivel === 'WARNING') {
    console.warn(resumen);
  } else {
    console.log(resumen);
  }

  asegurarCarpeta()
    .then(() => fsPromises.appendFile(path.join(CARPETA_LOGS, nombreArchivoDeHoy()), `${JSON.stringify(entrada)}\n`, 'utf-8'))
    .catch((err) => {
      console.error('[logger] No se pudo escribir en el archivo de log:', err.message);
    });
}

function info(datos) { registrar({ ...datos, nivel: 'INFO' }); }
function warning(datos) { registrar({ ...datos, nivel: 'WARNING' }); }
function error(datos) { registrar({ ...datos, nivel: 'ERROR' }); }

module.exports = { registrar, info, warning, error };
