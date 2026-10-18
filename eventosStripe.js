// -----------------------------------------------------------------------
// Registro persistente de cada evento de webhook de Stripe recibido.
// Complementa los logs de consola con una tabla que se puede revisar
// despues (criterio: "la app registra cada evento del webhook").
// -----------------------------------------------------------------------
const { consulta } = require('./basedatos');

const MAX_EVENTOS_GUARDADOS = 500;

/**
 * Guarda un resumen del evento (no el objeto completo de Stripe, que
 * puede ser grande e incluir datos sensibles de mas). Conserva solo los
 * ultimos MAX_EVENTOS_GUARDADOS para que la tabla no crezca sin limite.
 * Si Stripe reenvia un evento ya registrado, no se duplica.
 */
async function registrarEvento(evento) {
  const esPagoCompletado = evento.type === 'checkout.session.completed';
  const objeto = evento.data?.object || {};
  const resumenPago = esPagoCompletado
    ? {
        email: objeto.customer_details?.email || objeto.customer_email || null,
        monto: objeto.amount_total ?? null,
        moneda: objeto.currency ?? null
      }
    : null;

  await consulta(
    'INSERT INTO eventos_stripe (id, tipo, resumen_pago) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
    [evento.id, evento.type, resumenPago ? JSON.stringify(resumenPago) : null]
  );
  await consulta(
    `DELETE FROM eventos_stripe WHERE id IN (
       SELECT id FROM eventos_stripe ORDER BY recibido_en DESC OFFSET $1
     )`,
    [MAX_EVENTOS_GUARDADOS]
  );
}

async function obtenerEventos() {
  const { rows } = await consulta('SELECT * FROM eventos_stripe ORDER BY recibido_en');
  return rows.map((f) => ({ id: f.id, tipo: f.tipo, recibidoEn: f.recibido_en.toISOString(), resumenPago: f.resumen_pago }));
}

module.exports = { registrarEvento, obtenerEventos };
