# Planificador de citas con clima

Aplicación web (Node.js + Express + JS puro en el frontend) para programar
citas y ver, para cada una, el clima esperado (si es futura) o el clima
que realmente hizo (si ya pasó), usando la API de
[Open-Meteo](https://open-meteo.com/).

## ¿Qué hace?

- Creas una cita con: título, fecha, hora (opcional) y una ubicación
  (buscada por nombre o ingresada como coordenadas).
- Las citas se listan ordenadas por fecha, cada una con su propia
  tarjeta de clima:
  - **Cita futura (hasta 16 días)** → pronóstico de Open-Meteo.
  - **Cita futura a más de 16 días** → aviso de "aún no disponible, vuelve
    más cerca de la fecha" (Open-Meteo no da pronóstico más allá de eso).
  - **Cita pasada** → clima histórico real de ese día (archivo histórico
    de Open-Meteo, con respaldo automático al endpoint de pronóstico para
    el pasado muy reciente, por si el archivo aún no tiene esos días).
- Las tarjetas se colorean según severidad: verde (buen clima), amarillo
  (lluvia/niebla ligera) o rojo (tormenta, lluvia fuerte).
- Puedes eliminar cualquier cita.

## ¿Por qué un backend intermedio?

El frontend nunca llama a Open-Meteo directamente; llama a nuestro propio
servidor (`/api/geocode`, `/api/citas/...`), que es quien:

1. Guarda las citas en un archivo local (`data/citas.json`), con
   escritura atómica para no corromper el archivo si el proceso se
   interrumpe a mitad de una escritura.
2. Decide si debe pedir pronóstico o histórico según la fecha.
3. Agrega la API Key de Open-Meteo (si configuraste una) sin exponerla
   nunca en el navegador.

> **Nota:** Open-Meteo es gratuito y no requiere API Key para uso normal.
> Este proyecto soporta una API Key opcional (por ejemplo, si tienes un
> plan comercial), leída desde una variable de entorno.

## Requisitos

- Node.js 18 o superior (usa `fetch` nativo y `AbortController`).

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` si tienes una API Key de Open-Meteo (opcional):

```
PORT=3000
OPEN_METEO_API_KEY=tu_api_key_aqui
```

## Ejecutar

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del proyecto

```
planificador-citas-clima/
├── server.js            # Backend Express: valida, decide pronostico/historico, maneja errores
├── db.js                 # Persistencia en archivo JSON (lectura, escritura atomica)
├── package.json
├── .env.example
├── data/                 # Se crea automaticamente; guarda citas.json
├── public/
│   ├── index.html        # Formulario de nueva cita + lista de citas
│   ├── style.css
│   └── app.js             # Logica del frontend: crear, listar, eliminar citas y cargar su clima
└── README.md
```

## Endpoints propios

### `GET /api/geocode?q=<nombre>`
Busca hasta 5 ubicaciones que coincidan con el texto dado.

### `GET /api/citas`
Lista todas las citas guardadas, ordenadas por fecha y hora.

### `POST /api/citas`
Crea una cita. Cuerpo esperado:

```json
{
  "titulo": "Reunión con el equipo",
  "fecha": "2026-09-10",
  "hora": "14:30",
  "ubicacion": { "nombre": "Santo Domingo", "lat": 18.4861, "lon": -69.9312 }
}
```

Validaciones: título (mínimo 2 caracteres), fecha en formato `AAAA-MM-DD`,
hora opcional en formato `HH:MM`, latitud/longitud dentro de rango.

### `DELETE /api/citas/:id`
Elimina una cita por id. Responde `404` si no existe.

### `GET /api/citas/:id/clima`
Devuelve el clima correspondiente a la fecha de esa cita:

```json
{ "estado": "pronostico", "datos": { "fecha": "...", "codigoClima": 3, "temperaturaMax": 30.1, "temperaturaMin": 24.5, "precipitacion": 0 } }
```

`estado` puede ser `"pronostico"`, `"historico"` o `"no_disponible"` (este
último incluye un campo `mensaje` en vez de `datos`).

## Manejo de errores

- **Backend:** try/catch en cada llamada externa, `AbortController` para
  timeouts (8s), validación de entradas antes de llamar a Open-Meteo o de
  guardar en disco, respuestas JSON consistentes (`{ error, mensaje }`),
  y manejo de archivo de datos corrupto o ausente (se reinicia solo).
- **Frontend:** cada fetch distingue error de red, respuesta no-JSON y
  error HTTP, mostrando siempre un mensaje amigable. El clima de cada
  cita se carga de forma independiente, así que si uno falla (por
  ejemplo, por timeout), las demás tarjetas no se ven afectadas y esa
  tarjeta ofrece un botón "Reintentar".

## Variables de entorno

| Variable              | Obligatoria | Descripción                                      |
|-----------------------|-------------|---------------------------------------------------|
| `PORT`                | No          | Puerto del servidor (por defecto 3000)             |
| `OPEN_METEO_API_KEY`  | No          | API Key opcional de Open-Meteo (plan comercial)    |

El archivo `.env` **no** debe subirse a control de versiones.

## Límites conocidos

- El pronóstico de Open-Meteo solo llega hasta ~16 días hacia adelante.
- El archivo histórico suele tener un retraso de varios días respecto a
  hoy; para el pasado muy reciente la app usa el endpoint de pronóstico
  como respaldo automático.
- La comparación de fechas (pasado/futuro) usa la fecha del servidor, no
  la zona horaria del lugar de la cita.
