// -----------------------------------------------------------------------
// Conexion a Postgres (Neon en produccion) y creacion del esquema.
//
// La conexion se configura SOLO con la variable DATABASE_URL. Las tablas
// se crean solas al arrancar si no existen (CREATE TABLE IF NOT EXISTS),
// asi que no hay que correr nada a mano en una base nueva.
//
// Los ids son texto (UUID generados por Postgres): asi un id mal formado
// en una URL simplemente "no existe" (404) en vez de provocar un error.
// -----------------------------------------------------------------------
const { Pool, types } = require('pg');

// Postgres devuelve las columnas DATE como objetos Date de JS, que se
// corren de dia segun la zona horaria. La app trabaja con "AAAA-MM-DD"
// como texto, asi que se leen tal cual.
types.setTypeParser(1082, (valor) => valor);

let pool = null;

function obtenerPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Falta DATABASE_URL: configura la conexion a la base de datos en .env (local) o en Render (produccion).');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Neon suspende la base tras unos minutos sin uso; la primera
      // conexion despues de eso tarda un poco mas en "despertar".
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000
    });
    pool.on('error', (err) => console.error('[basedatos] Error en una conexion inactiva:', err.message));
  }
  return pool;
}

function consulta(texto, parametros) {
  return obtenerPool().query(texto, parametros);
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  google_id   TEXT NOT NULL UNIQUE,
  nombre      TEXT,
  email       TEXT,
  avatar_url  TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personas (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id          TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  relacion            TEXT NOT NULL,
  cumpleanos          DATE,
  comida_favorita     TEXT,
  correo              TEXT,
  notas               TEXT,
  fechas_importantes  JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS personas_usuario_idx ON personas (usuario_id);

-- persona_id no es clave foranea a proposito: si se elimina una persona,
-- sus citas se conservan y la app muestra "perfil eliminado".
CREATE TABLE IF NOT EXISTS citas (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  persona_id      TEXT,
  fecha           DATE NOT NULL,
  hora            TEXT,
  ubicacion       JSONB NOT NULL,
  lugar_sugerido  JSONB,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS citas_usuario_fecha_idx ON citas (usuario_id, fecha);

CREATE TABLE IF NOT EXISTS lugares_guardados (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  alias       TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  favorito    BOOLEAN NOT NULL DEFAULT false,
  usado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lugares_usuario_idx ON lugares_guardados (usuario_id);

CREATE TABLE IF NOT EXISTS eventos_stripe (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL,
  recibido_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumen_pago  JSONB
);

-- Sesiones de login (la usa connect-pg-simple). Asi un reinicio o un
-- deploy de Render ya no cierra la sesion de todos los usuarios.
CREATE TABLE IF NOT EXISTS sesiones (
  sid     VARCHAR NOT NULL PRIMARY KEY,
  sess    JSON NOT NULL,
  expire  TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_expire_idx ON sesiones (expire);
`;

async function inicializarEsquema() {
  await consulta(ESQUEMA);
}

async function cerrar() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { consulta, obtenerPool, inicializarEsquema, cerrar };
