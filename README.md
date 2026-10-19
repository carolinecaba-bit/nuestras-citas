# Nuestras citas

Planificador de citas románticas con cuentas privadas. Cada quien inicia
sesión con su cuenta de Google y solo ve sus propias citas y perfiles.
Eliges el tipo de plan, la fecha y la hora, opcionalmente con quién (de
tus perfiles guardados), la app te sugiere lugares reales cercanos según
la actividad, y te muestra el clima esperado (o el que hizo, si la cita
ya pasó) — usando [Open-Meteo](https://open-meteo.com/) y
[OpenStreetMap](https://www.openstreetmap.org/) (Overpass API), ambos
gratuitos y sin necesidad de API Key.

## ¿Qué hace?

La app es un dashboard con cuatro pestañas: **Inicio** (próxima cita con su
clima, próximos cumpleaños, fechas importantes, personas con las que hace
tiempo no planeas nada y tus números), **Citas** (próximas y pasadas),
**Personas** e **Ideas**. Las citas se crean con un asistente paso a paso:
qué, cuándo (atajos de fecha, calendario propio con los cumpleaños marcados
y horas por franja), con quién, dónde (con tus lugares guardados) y detalles.

1. **Inicia sesión con Google**: tus citas y perfiles son privados: solo tú
   (con la cuenta de Google que uses) los ves. No hay contraseñas que
   manejar ni guardar.
2. **Tus personas**: guarda perfiles simples de con quién sales — nombre,
   relación (novia, madre, amigo...), cumpleaños, comida favorita, correo
   (opcional) y notas libres (alergias, gustos, tallas...). Se reutilizan
   al crear citas, sin volver a escribir lo mismo cada vez.
3. **Detalles del plan directos**: eliges tipo de plan, fecha y hora desde
   el primer momento. La hora se elige con un selector agrupado
   (Mañana/Tarde/Noche) en formato de 12 horas, en vez del reloj nativo
   del navegador. El título es opcional: si lo dejas vacío, se genera solo
   (ej. "Cena romántica con Ana").
4. **Ubicación general**: buscas una ciudad/zona por nombre o ingresas
   coordenadas.
5. **Sugerencias de lugares**: según el tipo de plan (picnic, cena, café,
   playa, mirador, cine, caminata...), la app busca lugares reales cercanos
   a esa ubicación (parques, restaurantes, playas, miradores, etc.) usando
   OpenStreetMap, y puedes elegir uno.
6. **Clima con consejo práctico**: cada cita en tu lista muestra el
   pronóstico (si es futura, hasta 16 días) o el clima histórico real (si
   ya pasó), con un color e ícono según qué tan favorable luce, y una
   sugerencia práctica ("lleva paraguas", "usa protector solar", "día
   perfecto para tu plan"...).
7. **Aviso de cumpleaños**: si la fecha de una cita coincide con el
   cumpleaños de la persona elegida, la tarjeta lo resalta con un aviso
   especial 🎂.
8. Puedes eliminar cualquier cita o perfil.
9. **Correo de bienvenida**: la primera vez que alguien inicia sesión, le
   llega automáticamente un correo de bienvenida (vía [Resend](https://resend.com)),
   sin que nadie tenga que hacer clic en "enviar" y sin que el login espere
   a que el correo termine de enviarse.
10. **Apoyar el proyecto (Stripe)**: cualquier usuario logueado puede hacer
    un pago de apoyo ($3 USD) vía Stripe Checkout. Cuando el pago se
    completa, Stripe le avisa a la app mediante un **webhook** (verificado
    con firma), que registra el evento y envía un correo de agradecimiento
    — todo sin bloquear la respuesta al usuario ni a Stripe.
11. **Ideas y qué hacer**: una sección con categorías curadas ("ideas de
    primera cita", "planes económicos", "qué hacer en días nublados"...)
    que trae resultados reales de blogs mediante una búsqueda en vivo
    (vía [SerpApi](https://serpapi.com)). Solo se muestra título, un
    resumen corto y la fuente, con un botón "Leer más" que lleva al
    artículo original — nunca se reproduce el contenido completo. Los
    resultados se cachean por 24 horas para no gastar la cuota gratuita
    de búsquedas en cada visita.
12. **Agregar a Google Calendar**: cada cita tiene un botón que abre el
    formulario de creación de evento de Google Calendar, ya lleno con el
    título, fecha, hora (o "todo el día" si no especificaste una) y
    lugar. Si la persona asociada tiene un correo guardado, aparece
    precargada como invitada. El evento nunca se crea solo: siempre hay
    que confirmarlo en Google Calendar. No requiere ningún permiso nuevo
    de Google ni backend adicional.
13. **Agente de ideas con IA**: en Inicio, el bloque **Hoy** muestra el
    clima del día en tu lugar con una frase según el clima, y el botón
    "✨ Sugiéreme planes para hoy". En el asistente de nueva cita, el paso
    "Qué" ofrece "✨ Sugiéreme ideas" usando la fecha, el lugar, el clima y
    la persona elegida. Las ideas las genera un **agente con herramientas**
    (ver la sección "El agente de ideas").
14. **Mapas y fotos de lugares**: mapas de OpenStreetMap (Leaflet) al
    elegir el lugar, en los lugares sugeridos (marcadores numerados) y en
    cada cita. Las fotos salen gratis de OpenStreetMap, Wikimedia Commons o
    Wikidata cuando el lugar las tiene; si no, se muestra el ícono del plan.
15. **Detalle especial**: en citas románticas, cumpleaños y fechas
    importantes, el paso Detalles ofrece detalles rápidos (flores, bizcocho,
    carta...), "✨ Ideas de regalo" con IA y tiendas cercanas (floristerías,
    reposterías, regalos). El detalle se guarda con la cita, aparece como
    recordatorio y se incluye en Google Calendar.
16. **Registro de actividad (logs)**: cada petición a la app queda
    registrada en `logs/AAAAMMDD.log` (un archivo por día) con fecha,
    nivel (INFO/WARNING/ERROR), quién la hizo, en qué ruta ocurrió, qué se
    envió y qué se respondió — útil para depurar sin tener que adivinar
    qué pasó.

## ¿Por qué un backend intermedio?

El frontend nunca llama a Open-Meteo, OpenStreetMap ni Google directamente;
llama a nuestro propio servidor, que:

1. Guarda usuarios, personas, citas, lugares guardados, eventos de Stripe
   y sesiones de login en una base de datos Postgres (Neon). Cada consulta
   filtra por el usuario de la sesión: nadie puede leer datos ajenos.
2. Intercambia el código de autorización de Google por un token **del
   lado del servidor** — el Client Secret de Google nunca toca el
   navegador.
3. Decide si debe pedir pronóstico o histórico según la fecha.
4. Traduce el tipo de plan a los "tags" correctos de OpenStreetMap para
   buscar lugares relevantes.
5. Filtra las citas y los perfiles por el usuario de la sesión actual,
   para que nadie vea ni pueda usar/editar/borrar los de otra persona.

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

## Configurar "Ideas y qué hacer" (SerpApi)

Es opcional: sin esto, esa sección muestra un mensaje claro pidiendo
configurarla, sin afectar el resto de la app.

1. Crea una cuenta gratuita en [serpapi.com](https://serpapi.com). El
   plan gratuito incluye **100 búsquedas al mes**, sin tarjeta de crédito.
2. Ve a tu **Dashboard** → copia tu **API Key** (aparece directamente ahí).
3. Pégala en tu `.env` (y en las Environment Variables de Render) como
   `SERPAPI_API_KEY`.
4. Opcional: `TOPS_CACHE_HORAS` controla cuántas horas se reutiliza un
   resultado antes de volver a buscar (por defecto 24). Con 5 categorías
   y una búsqueda por categoría al día, el uso normal se queda muy por
   debajo del límite gratuito mensual.

> **Nota sobre Render Free:** si el servicio se reinicia o "despierta"
> tras estar dormido, el caché en disco puede perderse (ver "Límites
> conocidos" más abajo), lo que puede generar alguna búsqueda extra de
> más. Para un uso personal esto no debería acercarse al límite mensual,
> pero si notas que se agota, revisa tu consumo en el Dashboard de SerpApi.

## El agente de ideas

Las ideas de planes las genera un agente (`ia.js`) con el [AI SDK de
Vercel](https://ai-sdk.dev), un SDK neutral: el proveedor y el modelo se
eligen **solo** con la variable `AI_MODEL` (formato `proveedor:modelo`),
sin tocar el código.

**Herramientas (tools)** que el agente decide cuándo usar:

| Herramienta | Qué hace |
| --- | --- |
| `consultarClima` | Pronóstico real del día (Open-Meteo) |
| `buscarLugaresCercanos` | Lugares reales cercanos por tipo de plan (OpenStreetMap) |
| `consultarSkill` | Lee una guía de la carpeta `skills/` |
| `entregarIdeas` | Su respuesta final, validada con un esquema Zod |

Un segundo agente, `sugerirRegalos`, propone regalos y detalles con el mismo
patrón: consulta la skill `regalos-y-detalles` y entrega con
`entregarRegalos`, que exige 3 ideas variadas (al menos dos categorías y dos
presupuestos) y le devuelve los errores si no cumple.

**Skills:** cada archivo `.md` de `skills/` es una guía con `name` y
`description` en el encabezado. El agente solo recibe la lista de nombres y
descripciones, y lee el contenido completo con `consultarSkill` cuando lo
necesita. Para agregar una skill, basta con crear un archivo nuevo con el
mismo formato.

**Errores devueltos al agente**, para que se corrija solo:

1. Si una herramienta falla (por ejemplo, OpenStreetMap no responde), el
   agente recibe `{ error, sugerencia }` y puede reintentar o seguir sin eso.
2. Si llama a una herramienta con datos inválidos (por ejemplo, un tipo de
   plan que no existe), el AI SDK le devuelve el error de validación.
3. `entregarIdeas` aplica las reglas de negocio del servidor: exactamente la
   cantidad pedida, tipos distintos, lugares que salieron de
   `buscarLugaresCercanos` (no inventados) y nada al aire libre si hay
   alerta de tormenta. Si algo falla, responde `{ aceptado: false, errores }`
   y el agente corrige y vuelve a entregar (hasta 3 entregas).
4. Si el agente termina sin entregar, el servidor le devuelve el historial
   con un recordatorio (una vez).

Cada ejecución queda en el log con el modelo, los pasos, las herramientas
usadas, las correcciones y los tokens.

**Pruebas:** `npm run test:agente` prueba el agente con el modelo simulado
del AI SDK (sin gastar tokens): que vea y corrija errores de herramientas,
de validación y de reglas de negocio.

## Configurar el proveedor de IA


Es opcional: sin esto, los botones de ideas muestran un mensaje claro
pidiendo configurarlo, sin romper el resto de la app.

La función usa el AI SDK de Vercel con un registro de proveedores. El
proveedor y el modelo se eligen solo con la variable `AI_MODEL`, en el
formato `proveedor:modelo`. Cambiar de proveedor nunca requiere tocar el
código, y si un modelo se retira, basta con cambiar esa variable.

1. Elige un proveedor y consigue su llave:
   - **Google Gemini**: en [aistudio.google.com](https://aistudio.google.com),
     **Get API key** → **Create API key**. Va en `GOOGLE_GENERATIVE_AI_API_KEY`.
   - **Groq**: en [console.groq.com](https://console.groq.com), **API Keys**
     → **Create API Key**. Va en `GROQ_API_KEY`.
2. Pon el modelo en `AI_MODEL`, por ejemplo `google:gemini-3.8-flash` o
   `groq:openai/gpt-oss-120b`. El nombre exacto sale de la lista de
   modelos de cada proveedor.
3. Agrega las mismas variables en la pestaña **Environment** de Render.

En los niveles gratuitos, revisa las condiciones de uso de datos de cada
proveedor antes de abrir la app a otras personas.

**Nota de seguridad**: los datos de la persona elegida (nombre, notas,
comida favorita) se le envían a la IA siempre como *información*, nunca
como *instrucciones* — el prompt del sistema le ordena explícitamente
ignorar cualquier texto dentro de esos datos que intente darle una orden
distinta. Además, la forma de la respuesta la garantiza un esquema Zod que
viaja en la petición (salida estructurada): solo se aceptan un título y
una descripción dentro de un límite de caracteres.

## Configurar la base de datos (Neon)

La app guarda todo en Postgres. Se usa [Neon](https://neon.com) porque su
plan gratuito no vence y la base se suspende sola cuando nadie la usa.

1. Crea una cuenta en neon.com y un proyecto nuevo (por ejemplo,
   `nuestras-citas`), en la región más cercana a tu servicio de Render.
2. El proyecto trae una rama `main`: esa es la de **producción**.
3. Crea una segunda rama llamada `dev` (pestaña **Branches** → **New
   branch**): esa es para probar en local sin tocar los datos reales.
4. En **Connect** (o **Connection string**) de cada rama, copia la URL de
   conexión. Se ve así:
   `postgresql://usuario:clave@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
5. Pon la de `dev` en tu `.env` y la de `main` en la pestaña
   **Environment** de Render, en ambos casos como `DATABASE_URL`.

Las tablas se crean solas la primera vez que arranca el servidor. Si
tenías datos en los archivos JSON de `data/`, cópialos a la base con
`node migrar-json.js` (no duplica si lo corres más de una vez).

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```
PORT=3000
DATABASE_URL=postgresql://usuario:clave@host/neondb?sslmode=require
OPEN_METEO_API_KEY=
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
SESSION_SECRET=una_cadena_larga_y_aleatoria
RESEND_API_KEY=
CORREO_REMITENTE=Nuestras citas <onboarding@resend.dev>
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SERPAPI_API_KEY=
TOPS_CACHE_HORAS=24
```

`SESSION_SECRET` puede generarse con `openssl rand -hex 32`. Configúrala
siempre, también en Render: si la dejas vacía, el servidor genera una
temporal al arrancar y todas las sesiones dejan de valer en cada reinicio,
aunque estén guardadas en la base de datos.

## Ejecutar

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
nuestras-citas/
├── server.js            # Backend Express: rutas, sesiones, validaciones, orquesta clima y lugares
├── basedatos.js          # Conexion a Postgres (DATABASE_URL) y creacion automatica de las tablas
├── migrar-json.js        # Copia una sola vez los datos de data/*.json a la base
├── db.js                 # Citas en Postgres (filtrado por usuario)
├── usuarios.js            # Usuarios en Postgres
├── personas.js             # Personas en Postgres (filtrado por usuario)
├── lugaresGuardados.js     # Lugares favoritos y recientes en Postgres
├── auth.js                # Flujo OAuth con Google (intercambio en el backend) + middleware de sesion
├── correo.js               # Correo de bienvenida via Resend (no bloquea el login)
├── pagos.js                # Stripe: crea la sesion de Checkout y maneja el webhook
├── eventosStripe.js         # Registro persistente de cada evento de webhook recibido
├── tops.js                  # Pestaña Ideas: busqueda en Google RD via SerpApi + cache en disco
├── ia.js                    # Agente de ideas: AI SDK, herramientas, skills y correccion de errores
├── skills/                  # Guias en Markdown que el agente consulta cuando las necesita
├── pruebas/                 # Prueba del agente con modelo simulado (npm run test:agente)
├── logger.js                # Logging estructurado: fecha, nivel, actor, funcion, input, output
├── analizador.js           # Catalogo de tipos de plan (picnic, cena, etc.) y sus tags de OpenStreetMap
├── lugares.js              # Busca lugares reales cercanos via Overpass API (OpenStreetMap)
├── package.json
├── .env.example
├── data/                   # Se crea automaticamente; solo guarda el cache de Ideas (tops-cache.json)
├── logs/                   # Se crea automaticamente; un archivo AAAAMMDD.log por dia
├── public/
│   ├── index.html          # Puerta de login + dashboard con pestañas + asistente de nueva cita + panel de personas
│   ├── style.css             # Identidad visual (Fraunces + Karla, paleta índigo/dorado)
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

Todas las rutas de `/api/citas*` y `/api/personas*` abajo requieren sesión
activa; sin ella
responden `401 { error: "no_autenticado" }`.

### `GET /api/tipos-cita`
Catálogo de tipos de plan disponibles (picnic, cena, café, playa, etc.).

### `GET /api/relaciones`
Lista de relaciones sugeridas para el campo "relación" de un perfil (el
usuario puede escribir cualquier otra si ninguna calza).

### `GET /api/personas`
Lista **tus** perfiles guardados.

### `POST /api/personas`
Crea un perfil. Cuerpo esperado:

```json
{
  "nombre": "Ana",
  "relacion": "Novia",
  "cumpleanos": "1998-09-20",
  "comidaFavorita": "Pizza",
  "correo": "ana@correo.com",
  "notas": "Alérgica al maní"
}
```

`cumpleanos`, `comidaFavorita`, `correo` y `notas` son opcionales. Si se
indica `correo`, se usa para invitarla automáticamente al agregar la
cita a Google Calendar.

### `PUT /api/personas/:id`
Edita un perfil (mismo cuerpo que crearlo), solo si es tuyo.

### `DELETE /api/personas/:id`
Elimina un perfil, solo si es tuyo.

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
  "titulo": null,
  "tipo": "cena",
  "personaId": "id-de-un-perfil-existente",
  "fecha": "2026-09-10",
  "hora": "19:30",
  "ubicacion": { "nombre": "Santo Domingo", "lat": 18.4861, "lon": -69.9312 },
  "lugarSugerido": { "nombre": "Parque Mirador Sur", "lat": 18.45, "lon": -69.95, "enlaceMapa": "..." }
}
```

`titulo`, `personaId`, `hora` y `lugarSugerido` son opcionales. Si
`titulo` se deja vacío, se genera automáticamente a partir del tipo de
plan y el nombre del perfil (si se eligió uno). Si `personaId` no
corresponde a un perfil tuyo, la petición se rechaza.

### `DELETE /api/citas/:id`
Elimina una cita, solo si pertenece al usuario de la sesión actual (si no,
responde `404`, igual que si no existiera).

### `GET /api/citas/:id/clima`
Devuelve el clima para la fecha de la cita (solo si es tuya). `estado`
puede ser `"pronostico"`, `"historico"` o `"no_disponible"`.

### `POST /api/crear-pago`
Requiere sesión. Crea una sesión de Stripe Checkout ($3 USD, "apoyo" al
proyecto) y devuelve `{ url }` — el frontend redirige el navegador ahí.

### `POST /api/ideas`
Requiere sesión. Cuerpo: `{ fecha, ubicacion, personaId?, cantidad?, tipoPreferido? }`.
Devuelve `{ ideas: [{ tipo, titulo, descripcion, momento, lugar }] }`,
generadas por el agente. `lugar` es un lugar real de OpenStreetMap o `null`.
Si la IA no está configurada o falla, devuelve `503` con un mensaje claro.

### `POST /api/ideas-regalo`
Requiere sesión. Cuerpo: `{ fecha, tipo, personaId?, ocasion? }`. Devuelve
`{ ideas: [{ categoria, titulo, descripcion, presupuesto }] }`. `503` si la
IA no está disponible.

### `GET /api/tiendas-detalles?lat=&lon=`
Requiere sesión. Floristerías, chocolaterías, reposterías y tiendas de
regalos cercanas (OpenStreetMap, sin IA).

### Medición del uso de la IA

Cada llamada a un agente (ideas o regalos) se guarda en la tabla `uso_ia`
con el modelo, los tokens de entrada y salida, los pasos, la duración, si
funcionó y el **costo estimado**:

    costo = tokens_entrada × precio_entrada + tokens_salida × precio_salida

(precios en dólares por millón de tokens). Los precios de Groq vienen
incluidos en `usoIA.js`; para agregar o corregir otros sin tocar el código:

    AI_PRECIOS={"google:gemini-3.8-flash":[0.30,2.50]}

La pestaña **Uso de IA** es solo para administradores: muestra lo de hoy y
del mes, el desglose por modelo y por usuario, y las últimas llamadas de
todos. Los administradores se definen con la variable `ADMIN_EMAILS`
(correos separados por comas); para el resto de las cuentas la pestaña no
aparece y `GET /api/uso-ia` responde `403`.

### Clima y respaldo

El clima viene de **Open-Meteo**, con caché de 1 hora y un reintento si
responde 429. Si aun así falla (en Render pasa seguido, porque la IP de
salida es compartida y Open-Meteo limita por IP), el pronóstico se pide a
**MET Norway** (`clima-met.js`): gratuito, sin llave, hasta ~8 días. En ese
caso la app muestra "Datos de MET Norway", como pide su licencia (CC BY 4.0).

### Búsqueda de lugares y respaldo

- `GET /api/geocode` combina dos fuentes: **Nominatim** (buscador de
  OpenStreetMap) para lugares específicos en RD, como universidades o
  restaurantes, y **Open-Meteo** para ciudades, primero de RD y luego del
  mundo. Si una falla, se usa la otra.
- Las sugerencias de lugares usan **Overpass**; si ningún servidor responde,
  se buscan con **Nominatim** como respaldo.
- Nominatim se usa según su política: máximo 1 petición por segundo (las
  demás esperan su turno), identificación de la app y caché de 24 horas.

### `GET /api/clima?lat=&lon=&fecha=`
Requiere sesión. Pronóstico de un día (lo usa el bloque Hoy).

### `POST /webhooks/stripe`
Recibido directamente por Stripe (no por el frontend). Verifica la firma
del evento, registra **todos** los eventos recibidos en la tabla
`eventos_stripe` (los últimos 500), y si el tipo es `checkout.session.completed`,
envía un correo de agradecimiento al correo de quien pagó — sin esperar
a que ese correo termine de enviarse antes de responderle a Stripe.

### `GET /api/tops-categorias`
Catálogo de categorías de "Ideas y qué hacer" disponibles.

### `GET /api/tops/:categoriaId`
Requiere sesión. Devuelve `{ resultados, actualizadoEn, deCache }` con
hasta 5 ideas para esa categoría (título, resumen corto, fuente y
enlace). Usa el caché en disco si tiene menos de `TOPS_CACHE_HORAS`; si
no, busca en vivo con SerpApi y actualiza el caché.

### `PUT /api/citas/:id`
Requiere sesión. Edita una cita propia, con los mismos campos y validaciones
que al crearla. `404` si la cita no existe o es de otra cuenta.

### Lugares guardados

- **`GET /api/lugares-guardados`** — favoritos primero, luego los 5 recientes.
  Los recientes se guardan solos cada vez que se crea una cita.
- **`POST /api/lugares-guardados`** — `{ nombre, lat, lon, alias? }`: guarda un
  lugar como favorito (con un nombre corto opcional, como "Casa").
- **`PATCH /api/lugares-guardados/:id`** — `{ favorito?, alias? }`.
- **`DELETE /api/lugares-guardados/:id`** — lo quita de la lista.

Las personas aceptan además `fechasImportantes`: hasta 10 `{ nombre, fecha }`
que se repiten cada año (aniversarios, etc.). En cumpleaños y fechas
importantes sin año conocido se guarda el año 1904 como marcador.

## Manejo de errores

- **Backend:** try/catch en cada llamada externa, `AbortController` para
  timeouts, validación de entradas, respuestas JSON consistentes
  (`{ error, mensaje }`), manejo de archivos de datos corruptos o
  ausentes, protección CSRF en el login (parámetro `state`), y
  aislamiento estricto entre usuarios (una cita o un perfil ajeno
  responde `404`, no `403`, para no confirmar que existe). El correo de bienvenida se
  envía sin bloquear el login: si Resend falla o no está configurado, el
  login sigue funcionando igual, solo queda una nota en los logs. El
  webhook de Stripe verifica la firma de cada evento antes de confiar en
  su contenido (rechaza con `400` cualquier payload sin firma válida, sin
  importar qué diga adentro), y responde `2xx` a Stripe de inmediato,
  enviando el correo de agradecimiento por separado. La sugerencia de IA
  distingue entre clave inválida (`401`), límite de peticiones alcanzado
  (`429`), error del proveedor (`500`), tiempo agotado, y una respuesta
  que no cumple el formato exigido — cada caso con su propio mensaje, y
  nunca se muestra una sugerencia a medias o mal formada.
- **Frontend:** cada fetch distingue error de red, respuesta no-JSON y
  error HTTP. Si la sesión expira a mitad de uso, la app vuelve a mostrar
  la puerta de login con un aviso, en vez de fallar en silencio. El clima
  de cada cita se carga de forma independiente, así que si uno falla las
  demás tarjetas no se ven afectadas.
- **Registro (logs):** cada petición a `/api`, `/auth` y `/webhooks`
  queda registrada automáticamente en `logs/AAAAMMDD.log` con fecha,
  nivel, actor, función/ruta, input y output. Además, eventos que ocurren
  *después* de responder (envío de correos, eventos de webhook, llamadas
  a la IA) se registran aparte, con sus propios detalles (tokens y
  duración en el caso de la IA).

## Variables de entorno

| Variable                | Obligatoria | Descripción                                                        |
|--------------------------|-------------|----------------------------------------------------------------------|
| `PORT`                   | No          | Puerto del servidor (por defecto 3000)                               |
| `OPEN_METEO_API_KEY`     | No          | API Key opcional de Open-Meteo (plan comercial)                      |
| `APP_BASE_URL`           | Sí, para el login | URL pública de la app (sin slash final), usada en el redirect de Google |
| `GOOGLE_CLIENT_ID`       | Sí, para el login | Client ID de Google Cloud Console                                |
| `GOOGLE_CLIENT_SECRET`   | Sí, para el login | Client Secret de Google Cloud Console                             |
| `DATABASE_URL`           | Sí          | Conexión a Postgres (Neon), con `?sslmode=require`                    |
| `SESSION_SECRET`         | Sí          | Clave para firmar la cookie de sesión                                |
| `RESEND_API_KEY`         | No          | API Key de Resend; sin ella, el correo de bienvenida se omite        |
| `CORREO_REMITENTE`       | No          | Remitente del correo (por defecto, el de pruebas de Resend)          |
| `STRIPE_SECRET_KEY`      | No          | Clave secreta de Stripe (modo prueba); sin ella, "Apoyar" da un aviso claro |
| `STRIPE_WEBHOOK_SECRET`  | No          | Signing secret del endpoint de webhook en el Dashboard de Stripe     |
| `SERPAPI_API_KEY`        | No          | API Key de SerpApi; sin ella, "Ideas y qué hacer" da un aviso claro  |
| `TOPS_CACHE_HORAS`       | No          | Horas que se reutiliza un resultado antes de rebuscar (por defecto 24) |
| `ADMIN_EMAILS`           | No          | Correos (separados por comas) que ven la pestaña Uso de IA            |
| `OVERPASS_URLS`          | No          | Servidores de OpenStreetMap (Overpass) separados por comas; si no se define, usa private.coffee, VK Maps y overpass-api.de |
| `AI_MODEL`               | No          | Proveedor y modelo del agente de ideas (`proveedor:modelo`)           |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No    | Llave de Google Gemini (si `AI_MODEL` empieza con `google:`)          |
| `GROQ_API_KEY`           | No          | Llave de Groq (si `AI_MODEL` empieza con `groq:`)                     |

El archivo `.env` **no** debe subirse a control de versiones.

## Límites conocidos

- El plan gratuito de Neon incluye 100 horas de cómputo y 0.5 GB por
  proyecto, y no hace backups automáticos: solo permite restaurar hasta
  6 horas atrás. La primera consulta después de unos minutos sin uso
  tarda un poco más mientras la base "despierta".

- El pronóstico de Open-Meteo solo llega hasta ~16 días hacia adelante.
- El archivo histórico de Open-Meteo suele tener unos días de retraso; para
  el pasado muy reciente la app usa el endpoint de pronóstico como respaldo.
- Overpass API es un servicio público compartido: en momentos de mucho uso
  puede responder lento, con error, o incluso bloquear temporalmente
  tráfico desde ciertos proveedores de hosting (una práctica común
  anti-abuso). Para mitigarlo, la app prueba automáticamente tres
  servidores espejo distintos en orden antes de darse por vencida; si
  los tres fallan, el error queda registrado con el detalle exacto de
  cada uno en los logs del servidor, y el usuario ve un mensaje claro
  para reintentar.
- En Render Free el disco es efímero: `data/tops-cache.json` se reinicia
  a vacío cuando el servicio se reinicia o "despierta" tras estar
  inactivo (para "Ideas y qué hacer", esto puede provocar
  alguna búsqueda de más de lo esperado contra la cuota gratuita de
  SerpApi). Por el mismo motivo, los archivos de `logs/` se pierden en
  cada reinicio en Render Free — para un historial que sobreviva eso,
  revisa la pestaña "Logs" del dashboard de Render en vez del archivo.
- Los planes gratuitos de Google y Groq tienen límites de peticiones; de
  sobra para uso personal, pero si varias personas piden ideas a la IA
  muy seguido podría alcanzarse el límite (se avisa con un mensaje claro,
  no se rompe la app).
- La comparación de fechas (pasado/futuro) usa la fecha del servidor, no
  la zona horaria del lugar de la cita.
