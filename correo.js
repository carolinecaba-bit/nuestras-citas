// -----------------------------------------------------------------------
// Correo transaccional (bienvenida) via Resend.
//
// El envio es "fire and forget": quien llama a enviarCorreoBienvenida
// NO debe esperar a que termine antes de responderle al usuario. Un
// correo lento (o caido) nunca debe hacer mas lento ni fallar el login.
// La API key vive solo en variables de entorno.
// -----------------------------------------------------------------------
const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

function configurado() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function fetchConTimeout(url, opciones, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opciones, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function plantillaBienvenida(usuario) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #3B2130;">
      <h1 style="color:#A8395A; font-size: 22px;">¡Hola, ${usuario.nombre}!</h1>
      <p>Tu cuenta en <strong>Nuestras citas</strong> ya está lista.</p>
      <p>A partir de ahora puedes escribir tus ideas de citas, ver sugerencias
      de lugares reales cercanos y revisar el clima antes de cada plan.</p>
      <p>Que disfrutes tus próximas citas 💕</p>
    </div>
  `;
}

/**
 * Envia el correo de bienvenida a un usuario recien registrado.
 *
 * Si RESEND_API_KEY no esta configurada, se omite silenciosamente (se
 * registra una nota en consola) en vez de romper el login.
 *
 * IMPORTANTE: esta funcion se debe llamar SIN "await" desde el flujo de
 * login, encadenando .catch() para registrar errores. Awaitarla ahi
 * haria que el usuario espere al proveedor de correo para poder entrar,
 * que es justo lo que no queremos.
 */
async function enviarCorreoBienvenida(usuario) {
  if (!configurado()) {
    console.log('[correo] RESEND_API_KEY no configurada: se omite el correo de bienvenida.');
    return;
  }

  const remitente = process.env.CORREO_REMITENTE || 'Nuestras citas <onboarding@resend.dev>';

  const respuesta = await fetchConTimeout(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: remitente,
      to: usuario.email,
      subject: 'Bienvenido a Nuestras citas 💌',
      html: plantillaBienvenida(usuario)
    })
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Resend respondio con estado ${respuesta.status}: ${detalle}`);
  }

  console.log(`[correo] Correo de bienvenida enviado a ${usuario.email}`);
}

module.exports = { enviarCorreoBienvenida, configurado };
