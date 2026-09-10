# Nuestras citas

Planificador de citas románticas con cuentas privadas. Cada quien inicia
sesión con su cuenta de Google y solo ve sus propias citas. Escribes una
idea en lenguaje natural (o llenas el formulario a mano), la app interpreta
tipo de plan, con quién y fecha/hora, te sugiere lugares reales cercanos
según la actividad, y te muestra el clima esperado (o el que hizo, si la
cita ya pasó) — usando [Open-Meteo](https://open-meteo.com/) y
[OpenStreetMap](https://www.openstreetmap.org/) (Overpass API), ambos
gratuitos y sin necesidad de API Key.

## ¿Qué hace?

1. **Inicia sesión con Google**: tus citas son privadas: solo tú (con la
   cuenta de Google que uses) las ves. No hay contraseñas que manejar ni
   guardar.
2. **Cuéntame tu idea**: escribes algo como *"picnic con mi novia el jueves
   a las 3:00 pm"* y la app interpreta automáticamente (usando
   `chrono-node`, sin llamadas externas) el tipo de plan, con quién es, la
   fecha y la hora. Todo queda editable antes de guardar.
3. **Ubicación general**: buscas una ciudad/zona por nombre o ingresas
   coordenadas.
4. **Sugerencias de lugares**: según el tipo de plan (picnic, cena, café,
   playa, mirador, cine, caminata...), la app busca lugares reales cercanos
   a esa ubicación (parques, restaurantes, playas, miradores, etc.) usando
   OpenStreetMap, y puedes elegir uno.
5. **Clima con consejo práctico**: cada cita en tu lista muestra el
   pronóstico (si es futura, hasta 16 días) o el clima histórico real (si
   ya pasó), con un color e ícono según qué tan favorable luce, y una
   sugerencia práctica ("lleva paraguas", "usa protector solar", "día
   perfecto para tu plan"...).
6. Puedes eliminar cualquier cita.
7. **Correo de bienvenida**: la primera vez que alguien inicia sesión, le
   llega automáticamente un correo de bienvenida (vía [Resend](https://resend.com)),
   sin que nadie tenga que hacer clic en "enviar" y sin que el login espere
   a que el correo termine de enviarse.
8. **Apoyar el proyecto (Stripe)**: cualquier usuario logueado puede hacer
   un pago de apoyo ($3 USD) vía Stripe Checkout. Cuando el pago se
   completa, Stripe le avisa a la app mediante un **webhook** (verificado
   con firma), que registra el evento y envía un correo de agradecimiento
   — todo sin bloquear la respuesta al usuario ni a Stripe.

## ¿Por qué un backend intermedio?

El frontend nunca llama a Open-Meteo, OpenStreetMap ni Google directamente;
llama a nuestro propio servidor, que:

1. Guarda las citas y los usuarios en archivos locales (`data/citas.json`,
   `data/usuarios.json`), con escritura atómica para no corromper el
   archivo si el proceso se interrumpe.
2. Intercambia el código de autorización de Google por un token **del
   lado del servidor** — el Client Secret de Google nunca toca el
   navegador.
3. Decide si debe pedir pronóstico o histórico según la fecha.
4. Traduce el tipo de plan a los "tags" correctos de OpenStreetMap para
   buscar lugares relevantes.
5. Filtra las citas por el usuario de la sesión actual, para que nadie
   vea ni pueda borrar las citas de otra persona.

> **Nota:** Open-Meteo y la Overpass API de OpenStreetMap son gratuitos y
> no requieren API Key para uso normal. Este proyecto soporta una API Key
> opcional de Open-Meteo (por ejemplo, si tienes un plan comercial), leída
> desde una variable de entorno.

## Requisitos

- Node.js 18 o superior.
- Una cuenta de Google Cloud (gratuita) para crear las credenciales de
  "Iniciar sesión con Google".

## Configurar "Iniciar sesión con Google"

Sin este paso, el botón de login muestra un mensaje claro pidiendo
configurarlo (no falla silenciosamente), pero la app no deja crear citas
hasta hacerlo.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) y crea
   un proyecto nuevo (o usa uno existente).
2. Ve a **APIs & Services** → **OAuth consent screen**:
   - **User type**: External.
   - Completa nombre de la app y tu correo de soporte.
   - En **Scopes**, deja los básicos (`openid`, `email`, `profile`).
   - Mientras la app esté en modo "Testing", agrega en **Test users** los
     correos de Google que vayan a usarla (el tuyo, el de tu pareja, etc.).
3. Ve a **Credentials** → **Create Credentials** → **OAuth client ID**:
   - **Application type**: Web application.
   - En **Authorized redirect URIs**, agrega **las dos** URLs exactas
     donde correrá la app (local y producción), por ejemplo:
     - `http://localhost:3000/auth/google/callback`
     - `https://tu-servicio.onrender.com/auth/google/callback`
   - Crea las credenciales y copia el **Client ID** y el **Client Secret**.
4. Pega esos valores en tu `.env` (ver siguiente sección). En producción
   (Render u otro), agrega las mismas variables en su panel de
   Environment Variables — **nunca** subas el Client Secret al repositorio.

## Configurar el correo de bienvenida (Resend)

Es opcional: sin esto, el login funciona igual y el correo simplemente
no se envía (queda una nota en los logs del servidor).

1. Crea una cuenta gratuita en [resend.com](https://resend.com).
2. Ve a **API Keys** → **Create API Key**, y copia la clave generada.
3. Pégala en tu `.env` como `RESEND_API_KEY`.
4. Para probar rápido, no necesitas verificar un dominio propio: Resend
   permite enviar desde `onboarding@resend.dev` en modo de pruebas (ya
   configurado por defecto en `CORREO_REMITENTE`). Cuando quieras enviar
   desde tu propio dominio, verifica ese dominio en Resend y cambia
   `CORREO_REMITENTE` por una dirección de ese dominio.
5. Prueba iniciando sesión con una cuenta de Google que **nunca** haya
   entrado antes a la app (el correo solo se envía en el primer login de
   cada persona) y revisa esa bandeja de entrada — y la carpeta de spam,
   por si acaso.

## Configurar pagos (Stripe)

Es opcional para que la app arranque, pero necesario para que el botón
"☕ Apoyar" funcione. Usamos **modo de prueba** de Stripe (no se cobra
dinero real, se paga con tarjetas de prueba).

1. Crea una cuenta gratuita en [stripe.com](https://stripe.com) (o usa
   una existente).
2. Asegúrate de estar en **modo de prueba** (el interruptor "Test mode"
   arriba a la derecha del Dashboard).
3. Ve a **Developers** → **API keys**, copia la **Secret key** (empieza
   con `sk_test_...`) y pégala en tu `.env` como `STRIPE_SECRET_KEY`.
4. Despliega la app primero (siguiente sección) para tener una URL
   pública — Stripe necesita poder llamar a esa URL.
5. En el Dashboard de Stripe, ve a **Developers** → **Webhooks** →
   **Add endpoint**:
   - **Endpoint URL**: `https://tu-servicio.onrender.com/webhooks/stripe`
   - **Events to send**: selecciona `checkout.session.completed`
   - Crea el endpoint.
6. Haz clic en el endpoint recién creado y copia el **Signing secret**
   (empieza con `whsec_...`). Ese es tu `STRIPE_WEBHOOK_SECRET`.
7. Agrega `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en las
   Environment Variables de Render (y en tu `.env` local si quieres
   probar el botón de pago en local también — aunque el webhook en sí
   solo lo puede llamar Stripe si tu app tiene una URL pública real, o
   usando el [Stripe CLI](https://docs.stripe.com/stripe-cli) con
   `stripe listen --forward-to localhost:3000/webhooks/stripe`, que te
   da un webhook secret temporal para pruebas locales).

**Probar de punta a punta**: inicia sesión, haz clic en "☕ Apoyar" arriba
a la derecha, y en la pantalla de Stripe usa la tarjeta de prueba
`4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Al
completar el pago, Stripe te regresa a la app con un aviso de éxito, y
en unos segundos debería llegarte un correo de agradecimiento.

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```
PORT=3000
OPEN_METEO_API_KEY=
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
SESSION_SECRET=una_cadena_larga_y_aleatoria
RESEND_API_KEY=
CORREO_REMITENTE=Nuestras citas <onboarding@resend.dev>
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

`SESSION_SECRET` puede generarse con `openssl rand -hex 32`. Si la dejas
vacía, el servidor genera una temporal al arrancar (funciona, pero las
sesiones se cierran cada vez que el servidor se reinicia).

## Ejecutar

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
nuestras-citas/
├── server.js            # Backend Express: rutas, sesiones, validaciones, orquesta clima y lugares
├── db.js                 # Persistencia de citas (JSON, escritura atomica, filtrado por usuario)
├── usuarios.js            # Persistencia de usuarios (JSON, escritura atomica)
├── auth.js                # Flujo OAuth con Google (intercambio en el backend) + middleware de sesion
├── correo.js               # Correo de bienvenida via Resend (no bloquea el login)
├── pagos.js                # Stripe: crea la sesion de Checkout y maneja el webhook
├── eventosStripe.js         # Registro persistente de cada evento de webhook recibido
├── analizador.js           # Interpreta texto libre: tipo de plan, con quien, fecha/hora
├── lugares.js              # Busca lugares reales cercanos via Overpass API (OpenStreetMap)
├── package.json
├── .env.example
├── data/                   # Se crea automaticamente; guarda citas.json y usuarios.json
├── public/
│   ├── index.html          # Puerta de login + formulario + lista de citas
│   ├── style.css             # Identidad visual (Fraunces + Karla, paleta rosa/dorado)
│   └── app.js                # Logica del frontend
└── README.md
```

## Endpoints propios

### Autenticación
- **`GET /auth/google`** — redirige a la pantalla de consentimiento de Google.
- **`GET /auth/google/callback`** — recibe el código, lo intercambia por un
  token (en el backend), crea/actualiza el usuario local y abre la sesión.
- **`POST /auth/logout`** — cierra la sesión.
- **`GET /api/usuario-actual`** — devuelve `{ usuario, loginConfigurado }`.
  `usuario` es `null` si no hay sesión activa.

Todas las rutas de `/api/citas*` abajo requieren sesión activa; sin ella
responden `401 { error: "no_autenticado" }`.

### `GET /api/tipos-cita`
Catálogo de tipos de plan disponibles (picnic, cena, café, playa, etc.).

### `POST /api/analizar-texto`
Interpreta una frase libre. Cuerpo: `{ "texto": "..." }`. Devuelve
`{ titulo, tipo, conQuien, fecha, hora, advertencia }`.

### `GET /api/geocode?q=<nombre>`
Busca hasta 5 ubicaciones que coincidan con el texto dado.

### `GET /api/sugerencias?lat=<num>&lon=<num>&tipo=<id>`
Devuelve hasta 6 lugares reales cercanos que coincidan con el tipo de plan.

### `GET /api/citas`
Lista **tus** citas (las del usuario de la sesión actual), ordenadas por
fecha y hora.

### `POST /api/citas`
Crea una cita para el usuario de la sesión actual. Cuerpo esperado:

```json
{
  "titulo": "Picnic con mi novia",
  "tipo": "picnic",
  "conQuien": "mi novia",
  "fecha": "2026-09-10",
  "hora": "15:00",
  "ubicacion": { "nombre": "Santo Domingo", "lat": 18.4861, "lon": -69.9312 },
  "lugarSugerido": { "nombre": "Parque Mirador Sur", "lat": 18.45, "lon": -69.95, "enlaceMapa": "..." }
}
```

`lugarSugerido` es opcional; si no se elige uno, el clima se calcula con
las coordenadas de `ubicacion`.

### `DELETE /api/citas/:id`
Elimina una cita, solo si pertenece al usuario de la sesión actual (si no,
responde `404`, igual que si no existiera).

### `GET /api/citas/:id/clima`
Devuelve el clima para la fecha de la cita (solo si es tuya). `estado`
puede ser `"pronostico"`, `"historico"` o `"no_disponible"`.

### `POST /api/crear-pago`
Requiere sesión. Crea una sesión de Stripe Checkout ($3 USD, "apoyo" al
proyecto) y devuelve `{ url }` — el frontend redirige el navegador ahí.

### `POST /webhooks/stripe`
Recibido directamente por Stripe (no por el frontend). Verifica la firma
del evento, registra **todos** los eventos recibidos en
`data/eventos-stripe.json`, y si el tipo es `checkout.session.completed`,
envía un correo de agradecimiento al correo de quien pagó — sin esperar
a que ese correo termine de enviarse antes de responderle a Stripe.

## Manejo de errores

- **Backend:** try/catch en cada llamada externa, `AbortController` para
  timeouts, validación de entradas, respuestas JSON consistentes
  (`{ error, mensaje }`), manejo de archivos de datos corruptos o
  ausentes, protección CSRF en el login (parámetro `state`), y
  aislamiento estricto entre usuarios (una cita ajena responde `404`, no
  `403`, para no confirmar que existe), el correo de bienvenida se
  envía sin bloquear el login: si Resend falla o no está configurado, el
  login sigue funcionando igual, solo queda una nota en los logs. El
  webhook de Stripe verifica la firma de cada evento antes de confiar en
  su contenido (rechaza con `400` cualquier payload sin firma válida, sin
  importar qué diga adentro), y responde `2xx` a Stripe de inmediato,
  enviando el correo de agradecimiento por separado.
- **Frontend:** cada fetch distingue error de red, respuesta no-JSON y
  error HTTP. Si la sesión expira a mitad de uso, la app vuelve a mostrar
  la puerta de login con un aviso, en vez de fallar en silencio. El clima
  de cada cita se carga de forma independiente, así que si uno falla las
  demás tarjetas no se ven afectadas.

## Variables de entorno

| Variable                | Obligatoria | Descripción                                                        |
|--------------------------|-------------|----------------------------------------------------------------------|
| `PORT`                   | No          | Puerto del servidor (por defecto 3000)                               |
| `OPEN_METEO_API_KEY`     | No          | API Key opcional de Open-Meteo (plan comercial)                      |
| `APP_BASE_URL`           | Sí, para el login | URL pública de la app (sin slash final), usada en el redirect de Google |
| `GOOGLE_CLIENT_ID`       | Sí, para el login | Client ID de Google Cloud Console                                |
| `GOOGLE_CLIENT_SECRET`   | Sí, para el login | Client Secret de Google Cloud Console                             |
| `SESSION_SECRET`         | Recomendada | Clave para firmar la cookie de sesión                                |
| `RESEND_API_KEY`         | No          | API Key de Resend; sin ella, el correo de bienvenida se omite        |
| `CORREO_REMITENTE`       | No          | Remitente del correo (por defecto, el de pruebas de Resend)          |
| `STRIPE_SECRET_KEY`      | No          | Clave secreta de Stripe (modo prueba); sin ella, "Apoyar" da un aviso claro |
| `STRIPE_WEBHOOK_SECRET`  | No          | Signing secret del endpoint de webhook en el Dashboard de Stripe     |

El archivo `.env` **no** debe subirse a control de versiones.

## Límites conocidos

- El pronóstico de Open-Meteo solo llega hasta ~16 días hacia adelante.
- El archivo histórico de Open-Meteo suele tener unos días de retraso; para
  el pasado muy reciente la app usa el endpoint de pronóstico como respaldo.
- Overpass API es un servicio público compartido: en momentos de mucho uso
  puede responder lento o con error; la app lo maneja con un timeout y un
  mensaje claro para reintentar.
- El análisis de texto libre es heurístico (palabras clave + `chrono-node`
  para fechas en español): siempre revisa y ajusta los campos antes de
  guardar.
- Las sesiones se guardan en memoria del proceso: se cierran todas si el
  servidor se reinicia. En hosts de plan gratuito (como Render Free) el
  disco también es efímero, así que `data/citas.json`, `data/usuarios.json`
  y `data/eventos-stripe.json` pueden reiniciarse a vacío cuando el
  servicio se reinicia o "despierta" tras estar inactivo.
- La comparación de fechas (pasado/futuro) usa la fecha del servidor, no
  la zona horaria del lugar de la cita.
