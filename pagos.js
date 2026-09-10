// -----------------------------------------------------------------------
// Integracion con Stripe: crear una sesion de pago (Checkout) y manejar
// el webhook que Stripe llama cuando un pago se completa.
//
// La clave secreta y el secreto del webhook viven SOLO en variables de
// entorno. El webhook siempre verifica la firma de Stripe antes de
// confiar en el contenido del evento (cualquiera podria mandar un POST
// falso a esta URL si no verificaramos la firma).
// -----------------------------------------------------------------------
const eventosStripe = require('./eventosStripe');
const correo = require('./correo');

function credencialesConfiguradas() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function webhookConfigurado() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

let _stripe = null;
function obtenerCliente() {
  if (!_stripe) {
    // Se importa de forma perezosa para que la app arranque igual si
    // STRIPE_SECRET_KEY no esta configurada todavia.
    const Stripe = require('stripe');
    _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

/**
 * Crea una sesion de Stripe Checkout para un "apoyo" de monto fijo.
 * Devuelve la URL a la que hay que redirigir al usuario.
 */
async function crearSesionCheckout({ usuarioId, email }) {
  if (!credencialesConfiguradas()) {
    throw new Error('El pago no esta configurado en este servidor (falta STRIPE_SECRET_KEY).');
  }

  const stripe = obtenerCliente();
  const baseUrl = process.env.APP_BASE_URL;

  const sesion = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 300, // $3.00 — un "cafecito" para apoyar el proyecto
          product_data: {
            name: 'Apoya Nuestras Citas ☕',
            description: 'Un pequeño apoyo para seguir mejorando la app.'
          }
        }
      }
    ],
    success_url: `${baseUrl}/?pago=exitoso`,
    cancel_url: `${baseUrl}/?pago=cancelado`,
    // Guardamos el usuarioId para poder relacionar el pago con la cuenta,
    // aunque para el correo nos basta con el email de la sesion.
    metadata: { usuarioId: usuarioId || '' }
  });

  return sesion.url;
}

/**
 * Maneja el webhook de Stripe. IMPORTANTE: req.body debe ser el Buffer
 * crudo (sin parsear como JSON) para poder verificar la firma — ver
 * como se monta la ruta en server.js con express.raw().
 */
async function manejarWebhook(req, res) {
  if (!webhookConfigurado() || !credencialesConfiguradas()) {
    console.error('[stripe] Webhook recibido pero STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET no estan configurados.');
    return res.status(500).send('Webhook no configurado en este servidor.');
  }

  const firma = req.headers['stripe-signature'];
  const stripe = obtenerCliente();

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(req.body, firma, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Firma invalida: podria ser una peticion falsa, o una clave mal
    // configurada. Nunca procesamos un evento sin firma valida.
    console.error('[stripe] Firma de webhook invalida:', err.message);
    return res.status(400).send(`Firma invalida: ${err.message}`);
  }

  // Se registra CADA evento recibido, sin importar el tipo.
  console.log(`[stripe] Evento recibido: ${evento.type} (id: ${evento.id})`);
  try {
    await eventosStripe.registrarEvento(evento);
  } catch (err) {
    console.error('[stripe] No se pudo guardar el registro del evento:', err.message);
  }

  // Respondemos de inmediato: Stripe espera un 2xx rapido, y el envio
  // del correo no debe demorar ni arriesgar esta confirmacion.
  res.json({ recibido: true });

  if (evento.type === 'checkout.session.completed') {
    const session = evento.data.object;
    const email = session.customer_details?.email || session.customer_email || null;
    const nombre = session.customer_details?.name || 'quien nos apoya';

    if (email) {
      correo
        .enviarCorreoConfirmacionPago({
          nombre,
          email,
          monto: session.amount_total,
          moneda: session.currency
        })
        .catch((err) => {
          console.error('[correo] No se pudo enviar la confirmacion de pago:', err.message);
        });
    } else {
      console.warn('[stripe] El pago se completo pero no se encontro un email para notificar.');
    }
  }
}

module.exports = { crearSesionCheckout, manejarWebhook, credencialesConfiguradas, webhookConfigurado };
