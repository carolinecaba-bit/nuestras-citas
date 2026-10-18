// -----------------------------------------------------------------------
// Copia (una sola vez) los datos de los archivos JSON de data/ a la base
// de datos de DATABASE_URL. Se puede correr mas de una vez sin duplicar:
// lo que ya existe (mismo id) se salta.
//
// Uso:  node migrar-json.js
// -----------------------------------------------------------------------
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const basedatos = require('./basedatos');

function leer(nombre) {
  const ruta = path.join(__dirname, 'data', nombre);
  if (!fs.existsSync(ruta)) return [];
  try {
    const datos = JSON.parse(fs.readFileSync(ruta, 'utf-8'));
    return Array.isArray(datos) ? datos : [];
  } catch (err) {
    console.warn(`  ${nombre}: no se pudo leer (${err.message}), se salta.`);
    return [];
  }
}

async function insertar(nombre, filas, sql, valores) {
  let nuevas = 0;
  for (const fila of filas) {
    try {
      const { rowCount } = await basedatos.consulta(sql, valores(fila));
      nuevas += rowCount;
    } catch (err) {
      console.warn(`  ${nombre}: se salto un registro (${err.message}).`);
    }
  }
  console.log(`  ${nombre}: ${nuevas} nuevos de ${filas.length}`);
}

async function migrar() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en tu .env.');
    process.exit(1);
  }
  await basedatos.inicializarEsquema();
  console.log('Copiando datos de data/ a la base de datos...');

  // El orden importa: primero usuarios, porque lo demas les pertenece.
  await insertar('usuarios', leer('usuarios.json'),
    `INSERT INTO usuarios (id, google_id, nombre, email, avatar_url, creado_en)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now())) ON CONFLICT DO NOTHING`,
    (u) => [u.id, u.googleId, u.nombre, u.email, u.avatarUrl, u.creadoEn]);

  await insertar('personas', leer('personas.json'),
    `INSERT INTO personas (id, usuario_id, nombre, relacion, cumpleanos, comida_favorita, correo, notas, fechas_importantes, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now())) ON CONFLICT DO NOTHING`,
    (p) => [p.id, p.usuarioId, p.nombre, p.relacion, p.cumpleanos || null, p.comidaFavorita || null,
      p.correo || null, p.notas || null, JSON.stringify(p.fechasImportantes || []), p.creadoEn]);

  await insertar('citas', leer('citas.json'),
    `INSERT INTO citas (id, usuario_id, titulo, tipo, persona_id, fecha, hora, ubicacion, lugar_sugerido, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now())) ON CONFLICT DO NOTHING`,
    (c) => [c.id, c.usuarioId, c.titulo, c.tipo, c.personaId || null, c.fecha, c.hora || null,
      JSON.stringify(c.ubicacion), c.lugarSugerido ? JSON.stringify(c.lugarSugerido) : null, c.creadoEn]);

  await insertar('lugares guardados', leer('lugares-guardados.json'),
    `INSERT INTO lugares_guardados (id, usuario_id, nombre, alias, lat, lon, favorito, usado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now())) ON CONFLICT DO NOTHING`,
    (l) => [l.id, l.usuarioId, l.nombre, l.alias || null, l.lat, l.lon, Boolean(l.favorito), l.usadoEn]);

  await insertar('eventos de Stripe', leer('eventos-stripe.json'),
    `INSERT INTO eventos_stripe (id, tipo, recibido_en, resumen_pago)
     VALUES ($1, $2, COALESCE($3::timestamptz, now()), $4) ON CONFLICT DO NOTHING`,
    (e) => [e.id, e.tipo, e.recibidoEn, e.resumenPago ? JSON.stringify(e.resumenPago) : null]);

  console.log('Listo. Los archivos JSON no se borran: puedes guardarlos como respaldo.');
  await basedatos.cerrar();
}

migrar().catch(async (err) => {
  console.error('Error al migrar:', err.message);
  await basedatos.cerrar();
  process.exit(1);
});
