// -----------------------------------------------------------------------
// Iconos (SVG en linea, minimalistas, heredan el color via currentColor)
// -----------------------------------------------------------------------
const ICONOS_TIPO = {
  picnic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16l-2 9H6L4 10Z"/><path d="M8 10a4 4 0 0 1 8 0"/></svg>',
  cena: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3Z"/><path d="M12 13v6M9 21h6"/></svg>',
  cafe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1a3 3 0 0 1 0 6h-1"/><path d="M7 3c.5 1 .5 2 0 3M11 3c.5 1 .5 2 0 3"/></svg>',
  caminata: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8" cy="7" rx="2" ry="3"/><ellipse cx="15.5" cy="15" rx="2" ry="3"/></svg>',
  playa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>',
  mirador: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M3 18l5-6 4 4 3-3 6 5"/></svg>',
  cine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z"/><path d="M3 9l2-5h4l-2 5M11 9l2-5h4l-2 5"/></svg>',
  otro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.35-9.5-8.5C.7 8 2 4 6 4c2 0 3.5 1 4 2 .5-1 2-2 4-2 4 0 5.3 4 3.5 7.5C19 15.65 12 20 12 20Z"/></svg>'
};

const ICONOS_CLIMA = {
  buena: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
  precaucion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 2A3.5 3.5 0 0 1 15.5 15H6Z"/><path d="M8 18v2M12 18v2M16 18v2"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 2A3.5 3.5 0 0 1 15.5 13H6Z"/><path d="M11 15l-2 4h3l-2 4"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>'
};

// -----------------------------------------------------------------------
// Mapa de codigos de clima WMO a texto legible y categoria de severidad
// -----------------------------------------------------------------------
const CODIGOS_CLIMA = {
  0: 'Cielo despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
  61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
  71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada fuerte',
  80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos violentos',
  95: 'Tormenta eléctrica', 96: 'Tormenta con granizo ligero', 99: 'Tormenta con granizo fuerte'
};
const CODIGOS_ALERTA = [65, 82, 95, 96, 99];
const CODIGOS_PRECAUCION = [45, 48, 51, 53, 55, 61, 63, 71, 73, 75, 80, 81];

function describirClima(codigo) { return CODIGOS_CLIMA[codigo] || 'Condición desconocida'; }
function categoriaClima(codigo) {
  if (CODIGOS_ALERTA.includes(codigo)) return 'alerta';
  if (CODIGOS_PRECAUCION.includes(codigo)) return 'precaucion';
  return 'buena';
}

/**
 * Genera un consejo practico y breve segun la categoria del clima y la
 * temperatura maxima esperada. Solo tiene sentido para el pronostico
 * (una cita futura); para el clima historico no se muestra.
 */
function generarConsejo(datos, categoria) {
  if (categoria === 'alerta') {
    return 'Se esperan tormentas o lluvia fuerte: considera reprogramar o elegir un lugar techado.';
  }
  if (categoria === 'precaucion') {
    return 'Podría llover: lleva un paraguas o ten un plan B bajo techo.';
  }
  if (datos.temperaturaMax >= 32) {
    return 'Hará bastante calor: usa protector solar, gorra y lleva agua.';
  }
  if (datos.temperaturaMax >= 26) {
    return 'Día perfecto para tu plan: no olvides el protector solar.';
  }
  if (datos.temperaturaMax >= 18) {
    return 'Clima agradable para tu plan.';
  }
  return 'Hará fresco: lleva algo abrigador.';
}

// -----------------------------------------------------------------------
// Fechas: helpers en hora local (todas las fechas se manejan como
// "AAAA-MM-DD", igual que en el servidor).
// -----------------------------------------------------------------------
// Para cumpleaños y fechas importantes sin año conocido se guarda este
// año como marcador (1904 es bisiesto, asi el 29 de febrero es valido).
const ANIO_DESCONOCIDO = 1904;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function conCero(n) { return String(n).padStart(2, '0'); }
function aISO(d) { return `${d.getFullYear()}-${conCero(d.getMonth() + 1)}-${conCero(d.getDate())}`; }
function deISO(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }
function hoy() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function hoyISO() { return aISO(hoy()); }
function sumarDias(fecha, n) { const d = new Date(fecha); d.setDate(d.getDate() + n); return d; }
function diasHasta(iso) { return Math.round((deISO(iso) - hoy()) / 86400000); }

function textoDiasHasta(dias) {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  if (dias > 1) return `En ${dias} días`;
  return `Hace ${-dias} días`;
}

function formatearDiaMes(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** Proxima vez (hoy incluido) que cae un dia/mes que se repite cada año. */
function siguienteOcurrencia(iso) {
  const [, m, d] = iso.split('-').map(Number);
  const base = hoy();
  for (let suma = 0; suma <= 1; suma += 1) {
    const anio = base.getFullYear() + suma;
    const candidata = new Date(anio, m - 1, d);
    // 29 de febrero en año no bisiesto: se celebra el 28.
    if (candidata.getMonth() !== m - 1) candidata.setDate(0);
    if (candidata >= base) return aISO(candidata);
  }
  return null;
}

function formatearHora12h(horas, minutos) {
  const periodo = horas < 12 ? 'a.m.' : 'p.m.';
  let horas12 = horas % 12;
  if (horas12 === 0) horas12 = 12;
  return `${horas12}:${conCero(minutos)} ${periodo}`;
}

function capitalizar(texto) { return texto.charAt(0).toUpperCase() + texto.slice(1); }

function formatearFechaLarga(iso) {
  return deISO(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatearFechaHora(cita) {
  const fechaTexto = formatearFechaLarga(cita.fecha);
  if (!cita.hora) return fechaTexto;
  const [h, m] = cita.hora.split(':').map(Number);
  return `${fechaTexto}, ${formatearHora12h(h, m)}`;
}

// -----------------------------------------------------------------------
// Estado
// -----------------------------------------------------------------------
let usuarioActual = null;
let tiposCita = [];
let personas = [];
let relacionesSugeridas = [];
let citas = [];
let lugaresGuardados = [];
let filtroCitas = 'proximas';

// -----------------------------------------------------------------------
// Helpers generales
// -----------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function mostrarMensaje(el, texto, tipo = 'error') {
  el.textContent = texto;
  el.classList.remove('oculto', 'mensaje-info');
  if (tipo === 'info') el.classList.add('mensaje-info');
}
function ocultarMensaje(el) {
  el.classList.add('oculto');
  el.textContent = '';
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

let temporizadorAviso = null;
function avisar(texto) {
  let el = document.querySelector('.aviso');
  if (!el) {
    el = document.createElement('div');
    el.className = 'aviso';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove('visible'), 3200);
}

async function llamarApi(url, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
  }
  let datos;
  try {
    datos = await respuesta.json();
  } catch (err) {
    throw new Error('El servidor devolvió una respuesta inesperada.');
  }
  if (respuesta.status === 401) {
    mostrarPuertaLogin('Tu sesión terminó. Inicia sesión de nuevo para continuar.');
    throw new Error(datos.mensaje || 'Debes iniciar sesión para continuar.');
  }
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'Ocurrió un error al consultar el servicio.');
  }
  return datos;
}

function enviarJson(url, metodo, cuerpo) {
  return llamarApi(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
}

function etiquetaTipo(id) {
  const tipo = tiposCita.find((t) => t.id === id);
  return tipo ? tipo.etiqueta : 'Plan';
}

function buscarPersonaPorId(id) {
  return personas.find((p) => p.id === id) || null;
}

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Color estable por persona, dentro de la paleta de la app.
const TONOS_AVATAR = ['#4C56A6', '#C9A15A', '#5F8A6E', '#8A5A8C', '#3F7A99', '#B26B4A'];
function tonoPersona(id) {
  let suma = 0;
  for (const c of id) suma = (suma + c.charCodeAt(0)) % 997;
  return TONOS_AVATAR[suma % TONOS_AVATAR.length];
}
function avatarPersona(persona, clase = 'avatar-persona') {
  return `<span class="${clase}" style="--tono:${tonoPersona(persona.id)}" aria-hidden="true">${escaparHtml(iniciales(persona.nombre))}</span>`;
}

function ordenarCitas(lista) {
  return [...lista].sort((a, b) => `${a.fecha} ${a.hora || '99:99'}`.localeCompare(`${b.fecha} ${b.hora || '99:99'}`));
}
function citasProximas() { return ordenarCitas(citas.filter((c) => c.fecha >= hoyISO())); }
function citasPasadas() { return ordenarCitas(citas.filter((c) => c.fecha < hoyISO())).reverse(); }

// -----------------------------------------------------------------------
// Pestañas del dashboard
// -----------------------------------------------------------------------
function irAPestana(nombre) {
  document.querySelectorAll('.pestana').forEach((p) => {
    const activa = p.dataset.pestana === nombre;
    p.classList.toggle('activa', activa);
    p.setAttribute('aria-selected', String(activa));
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('oculto', panel.id !== `panel-${nombre}`);
  });
  if (nombre === 'ideas' && !$('tabs-tops').children.length) cargarCategoriasTops();
}

document.querySelectorAll('.pestana').forEach((p) => {
  p.addEventListener('click', () => irAPestana(p.dataset.pestana));
});

// Botones con data-accion (pueden aparecer en varios lugares)
document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const accion = boton.dataset.accion;
  if (accion === 'nueva-cita') abrirAsistente();
  if (accion === 'nueva-persona') abrirFormPersona();
  if (accion === 'cerrar-asistente') cerrarAsistente();
  if (accion === 'cerrar-lateral') cerrarLateral();
});

document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Escape') return;
  if (!$('panel-lateral').classList.contains('oculto')) cerrarLateral();
  else if (!$('asistente').classList.contains('oculto')) cerrarAsistente();
});

// -----------------------------------------------------------------------
// Carga de datos
// -----------------------------------------------------------------------
async function cargarTiposCita() {
  try {
    tiposCita = (await llamarApi('/api/tipos-cita')).tipos;
  } catch (err) {
    tiposCita = [{ id: 'otro', etiqueta: 'Otro plan' }];
  }
}

async function cargarRelaciones() {
  try {
    relacionesSugeridas = (await llamarApi('/api/relaciones')).relaciones;
  } catch (err) {
    relacionesSugeridas = [];
  }
}

async function cargarPersonas() {
  try {
    personas = (await llamarApi('/api/personas')).personas;
    ocultarMensaje($('mensaje-personas'));
  } catch (err) {
    mostrarMensaje($('mensaje-personas'), err.message);
  }
}

async function cargarCitas() {
  ocultarMensaje($('mensaje-lista'));
  $('cargando-lista').classList.remove('oculto');
  try {
    citas = (await llamarApi('/api/citas')).citas || [];
  } catch (err) {
    mostrarMensaje($('mensaje-lista'), err.message);
  } finally {
    $('cargando-lista').classList.add('oculto');
  }
}

async function cargarLugaresGuardados() {
  try {
    lugaresGuardados = (await llamarApi('/api/lugares-guardados')).lugares;
  } catch (err) {
    lugaresGuardados = [];
  }
}

function renderizarTodo() {
  renderizarInicio();
  renderizarCitas();
  renderizarPersonas();
}

// -----------------------------------------------------------------------
// Inicio
// -----------------------------------------------------------------------
function renderizarInicio() {
  renderizarHoy();
  renderizarProximaCita();
  renderizarFechasRecurrentes();
  renderizarHaceTiempo();
  renderizarNumeros();
}

function renderizarProximaCita() {
  const el = $('proxima-cita');
  const cita = citasProximas()[0];

  if (!cita) {
    el.innerHTML = `
      <div class="postal postal-vacia">
        <div>
          <h2>No tienes citas por delante</h2>
          <p class="texto-suave">Cuando planees una, aquí verás cuánto falta, a dónde van y qué clima esperar.</p>
        </div>
        <button type="button" class="btn btn-principal" data-accion="nueva-cita">+ Planear una cita</button>
      </div>`;
    return;
  }

  const fecha = deISO(cita.fecha);
  const persona = cita.personaId ? buscarPersonaPorId(cita.personaId) : null;
  const lugar = cita.lugarSugerido || cita.ubicacion;
  const dias = diasHasta(cita.fecha);
  const hora = cita.hora ? (() => { const [h, m] = cita.hora.split(':').map(Number); return formatearHora12h(h, m); })() : null;

  el.innerHTML = `
    <article class="postal" data-cita-id="${cita.id}">
      <div class="postal-sello" aria-hidden="true">
        <span class="sello-dia">${fecha.getDate()}</span>
        <span class="sello-mes">${MESES[fecha.getMonth()]}</span>
      </div>
      <div class="postal-cuerpo">
        <p class="postal-cuenta">${textoDiasHasta(dias)}${hora ? `, ${hora}` : ''}</p>
        <h2 class="postal-titulo">${escaparHtml(cita.titulo)}</h2>
        <p class="postal-detalle">
          ${persona ? `Con ${escaparHtml(persona.nombre)} en ` : 'En '}${escaparHtml(lugar.nombre)}
        </p>
        <a class="cita-calendario" href="${generarUrlGoogleCalendar(cita, persona)}" target="_blank" rel="noopener">📅 Agregar a Google Calendar</a>
        <div class="cita-clima" data-clima-id="${cita.id}">Cargando clima...</div>
      </div>
    </article>`;
  cargarClimaDeCita(cita.id, el.querySelector('.postal'));
}

// --- Bloque "Hoy": clima, frase y planes del agente ---
let lugarHoy = null;
let ideasHoy = [];
let climaHoyCargadoPara = null;

/** Lugares para el clima de hoy: tus favoritos y recientes, o Santo Domingo. */
function opcionesLugarHoy() {
  const propios = lugaresGuardados.slice(0, 4).map((l) => ({ nombre: l.nombre, etiqueta: l.alias || l.nombre, lat: l.lat, lon: l.lon }));
  return propios.length ? propios : [{ nombre: 'Santo Domingo', etiqueta: 'Santo Domingo', lat: 18.4861, lon: -69.9312 }];
}

// Un paseo emblematico por ciudad, para que la frase del dia suene local.
const PASEOS_POR_CIUDAD = [
  ['santo domingo', 'el Jardín Botánico'],
  ['santiago', 'el Monumento'],
  ['puerto plata', 'el Malecón de Puerto Plata'],
  ['jarabacoa', 'el Salto de Baiguate'],
  ['romana', 'Altos de Chavón'],
  ['terrenas', 'la playa'],
  ['punta cana', 'la playa']
];

function fraseDelDia(datos, categoria, lugar) {
  // Nombre completo (no el alias corto del chip, como "STI").
  const nombre = lugar.nombre;
  const paseo = (PASEOS_POR_CIUDAD.find(([clave]) => lugar.nombre.toLowerCase().includes(clave)) || [])[1];
  if (categoria === 'alerta') return `Se esperan tormentas en ${nombre}: hoy pinta para cine o una cena bajo techo.`;
  if (categoria === 'precaucion') return `Puede llover en ${nombre}: buen día para un café o una película.`;
  if (datos.temperaturaMax >= 32) return `Calor fuerte en ${nombre}: playa temprano o un atardecer frente al mar.`;
  if (datos.temperaturaMax >= 26) return paseo ? `Hoy es un buen día para caminar por ${paseo} o hacer un picnic.` : `Buen día en ${nombre} para un picnic o una caminata.`;
  return `Día fresco en ${nombre}: ideal para caminar, subir a un mirador o un café.`;
}

function renderizarHoy() {
  const opciones = opcionesLugarHoy();
  if (!lugarHoy || !opciones.some((o) => mismaUbicacion(o, lugarHoy))) lugarHoy = opciones[0];
  $('hoy-fecha').textContent = capitalizar(formatearFechaLarga(hoyISO()));
  $('hoy-lugares').innerHTML = opciones.length > 1
    ? opciones.map((o, i) => `<button type="button" class="chip ${mismaUbicacion(o, lugarHoy) ? 'activo' : ''}" data-lugar-hoy="${i}" aria-pressed="${mismaUbicacion(o, lugarHoy)}">${escaparHtml(o.etiqueta)}</button>`).join('')
    : `<span class="texto-suave">📍 ${escaparHtml(lugarHoy.etiqueta)}</span>`;
  const clave = `${hoyISO()}|${lugarHoy.lat},${lugarHoy.lon}`;
  if (climaHoyCargadoPara !== clave) cargarClimaHoy(clave);
}

async function cargarClimaHoy(clave) {
  climaHoyCargadoPara = clave;
  const lugar = lugarHoy;
  $('hoy-frase').textContent = `Revisando el clima en ${lugar.etiqueta}…`;
  $('hoy-clima').innerHTML = '';
  try {
    const resultado = await llamarApi(`/api/clima?lat=${lugar.lat}&lon=${lugar.lon}&fecha=${hoyISO()}`);
    if (lugar !== lugarHoy || resultado.estado === 'no_disponible') return;
    const { datos } = resultado;
    const categoria = categoriaClima(datos.codigoClima);
    $('hoy-frase').textContent = fraseDelDia(datos, categoria, lugar);
    $('hoy-clima').className = `hoy-clima clima-${categoria}`;
    $('hoy-clima').innerHTML = `
      ${ICONOS_CLIMA[categoria]}
      <span class="hoy-temp">${Math.round(datos.temperaturaMax)}°</span>
      <span class="hoy-detalle">${describirClima(datos.codigoClima)}<br>mín ${Math.round(datos.temperaturaMin)}°${datos.precipitacion > 0 ? `, ${datos.precipitacion} mm` : ''}</span>`;
  } catch (err) {
    climaHoyCargadoPara = null;
    $('hoy-frase').textContent = `No pude revisar el clima en ${lugar.etiqueta}, pero igual puedes pedir ideas.`;
  }
}

$('hoy-lugares').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-lugar-hoy]');
  if (!chip) return;
  lugarHoy = opcionesLugarHoy()[Number(chip.dataset.lugarHoy)];
  ideasHoy = [];
  $('ideas-hoy-lista').innerHTML = '';
  renderizarHoy();
});

$('btn-ideas-hoy').addEventListener('click', async () => {
  const ideas = await pedirIdeas(
    { fecha: hoyISO(), ubicacion: { nombre: lugarHoy.nombre, lat: lugarHoy.lat, lon: lugarHoy.lon } },
    { boton: $('btn-ideas-hoy'), cargando: $('ideas-hoy-cargando'), mensaje: $('ideas-hoy-mensaje'), lista: $('ideas-hoy-lista') }
  );
  if (!ideas) return;
  ideasHoy = ideas;
  $('ideas-hoy-lista').innerHTML = ideas.map((idea, i) => tarjetaIdea(idea, i, 'Planear esto')).join('');
});

$('ideas-hoy-lista').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-idea]');
  if (!boton) return;
  const idea = ideasHoy[Number(boton.dataset.idea)];
  // Ya estan cuando, donde y que: el asistente arranca en "Con quien".
  abrirAsistente({
    tipo: idea.tipo,
    fecha: hoyISO(),
    hora: HORA_POR_MOMENTO[idea.momento] || null,
    ubicacion: { nombre: lugarHoy.nombre, lat: lugarHoy.lat, lon: lugarHoy.lon },
    lugarElegido: idea.lugar,
    titulo: idea.titulo
  }, 3);
});

/** Cumpleaños y fechas importantes de los proximos 30 dias. */
function fechasRecurrentesProximas() {
  const cumpleanos = [];
  const importantes = [];
  personas.forEach((persona) => {
    if (persona.cumpleanos) {
      const fecha = siguienteOcurrencia(persona.cumpleanos);
      const dias = diasHasta(fecha);
      if (dias <= 30) cumpleanos.push({ persona, fecha, dias, nombre: 'Cumpleaños' });
    }
    (persona.fechasImportantes || []).forEach((f) => {
      const fecha = siguienteOcurrencia(f.fecha);
      const dias = diasHasta(fecha);
      if (dias <= 30) importantes.push({ persona, fecha, dias, nombre: f.nombre });
    });
  });
  const porDias = (a, b) => a.dias - b.dias;
  return { cumpleanos: cumpleanos.sort(porDias), importantes: importantes.sort(porDias) };
}

function filaFechaRecurrente(item, conNombreEvento) {
  return `
    <div class="fila-item">
      ${avatarPersona(item.persona)}
      <div class="fila-texto">
        <strong>${conNombreEvento ? `${escaparHtml(item.nombre)} con ${escaparHtml(item.persona.nombre)}` : escaparHtml(item.persona.nombre)}</strong>
        <span>${formatearDiaMes(item.fecha)}, ${textoDiasHasta(item.dias).toLowerCase()}</span>
      </div>
      <button type="button" class="btn btn-terciario" data-planear-persona="${item.persona.id}" data-planear-fecha="${item.fecha}">Planear algo</button>
    </div>`;
}

function renderizarFechasRecurrentes() {
  const { cumpleanos, importantes } = fechasRecurrentesProximas();
  $('lista-cumpleanos').innerHTML = cumpleanos.length
    ? cumpleanos.map((i) => filaFechaRecurrente(i, false)).join('')
    : `<p class="vacio-chico">Ningún cumpleaños en los próximos 30 días.${personas.length ? '' : ' Agrega personas con su cumpleaños para verlos aquí.'}</p>`;
  $('lista-fechas-importantes').innerHTML = importantes.length
    ? importantes.map((i) => filaFechaRecurrente(i, true)).join('')
    : '<p class="vacio-chico">Nada en los próximos 30 días. Agrega aniversarios u otras fechas en el perfil de cada persona.</p>';
}

function renderizarHaceTiempo() {
  const el = $('lista-hace-tiempo');
  if (!personas.length) {
    el.innerHTML = '<p class="vacio-chico">Agrega a las personas con quienes sales y aquí te recordaremos cuando haga tiempo que no planean nada.</p>';
    return;
  }
  const hoyTexto = hoyISO();
  const filas = personas
    .map((persona) => {
      const suyas = citas.filter((c) => c.personaId === persona.id);
      if (suyas.some((c) => c.fecha >= hoyTexto)) return null; // ya tiene algo planeado
      const pasadas = suyas.map((c) => c.fecha).sort();
      const ultima = pasadas[pasadas.length - 1] || null;
      const dias = ultima ? -diasHasta(ultima) : null;
      if (dias !== null && dias < 30) return null;
      return { persona, dias };
    })
    .filter(Boolean)
    .sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity))
    .slice(0, 4);

  el.innerHTML = filas.length
    ? filas.map(({ persona, dias }) => `
        <div class="fila-item">
          ${avatarPersona(persona)}
          <div class="fila-texto">
            <strong>${escaparHtml(persona.nombre)}</strong>
            <span>${dias === null ? 'Aún no han planeado nada juntos' : `Hace ${dias} días de su última cita`}</span>
          </div>
          <button type="button" class="btn btn-terciario" data-planear-persona="${persona.id}">Planear algo</button>
        </div>`).join('')
    : '<p class="vacio-chico">Vas al día: tienes algo reciente o planeado con todas tus personas.</p>';
}

function renderizarNumeros() {
  const mesActual = hoyISO().slice(0, 7);
  const delMes = citas.filter((c) => c.fecha.startsWith(mesActual)).length;
  const conteo = {};
  citas.forEach((c) => { conteo[c.tipo] = (conteo[c.tipo] || 0) + 1; });
  const favorito = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];

  const datos = [
    ['Citas este mes', delMes],
    ['Citas en total', citas.length],
    ['Personas', personas.length],
    ['Plan favorito', favorito ? etiquetaTipo(favorito[0]) : 'Todavía ninguno']
  ];
  $('tus-numeros').innerHTML = datos.map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${escaparHtml(valor)}</dd></div>`).join('');
}

// "Planear algo" desde Inicio o desde el perfil de una persona
document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-planear-persona]');
  if (!boton) return;
  cerrarLateral();
  abrirAsistente({ personaId: boton.dataset.planearPersona, fecha: boton.dataset.planearFecha || null });
});

// -----------------------------------------------------------------------
// Citas (linea de tiempo)
// -----------------------------------------------------------------------
document.querySelectorAll('.segmento').forEach((s) => {
  s.addEventListener('click', () => {
    filtroCitas = s.dataset.filtro;
    document.querySelectorAll('.segmento').forEach((x) => x.classList.toggle('activo', x === s));
    renderizarCitas();
  });
});

function renderizarCitas() {
  const lista = filtroCitas === 'proximas' ? citasProximas() : citasPasadas();
  const contenedor = $('linea-tiempo');
  contenedor.innerHTML = '';
  const vacio = $('sin-citas');
  vacio.classList.toggle('oculto', lista.length > 0);
  if (!lista.length) {
    vacio.innerHTML = filtroCitas === 'proximas'
      ? '<p>No tienes citas por delante.</p><button type="button" class="btn btn-secundario" data-accion="nueva-cita">+ Planear una cita</button>'
      : '<p>Todavía no tienes citas pasadas. Aquí quedará el historial de lo que han vivido.</p>';
    return;
  }
  lista.forEach((cita) => contenedor.appendChild(crearTarjetaCita(cita)));
}

/** Compara solo mes y dia (ignora el año) entre el cumpleanos y la fecha de la cita. */
function esCumpleanos(persona, fecha) {
  if (!persona || !persona.cumpleanos) return false;
  return persona.cumpleanos.slice(5) === fecha.slice(5);
}

function crearTarjetaCita(cita) {
  const card = document.createElement('article');
  card.className = 'cita-card';
  card.dataset.id = cita.id;

  const lugar = cita.lugarSugerido || cita.ubicacion;
  const enlaceLugar = cita.lugarSugerido && cita.lugarSugerido.enlaceMapa
    ? `<a href="${cita.lugarSugerido.enlaceMapa}" target="_blank" rel="noopener">${escaparHtml(lugar.nombre)}</a>`
    : escaparHtml(lugar.nombre);

  const persona = cita.personaId ? buscarPersonaPorId(cita.personaId) : null;
  const conQuienTexto = cita.personaId
    ? `, con ${persona ? escaparHtml(persona.nombre) : 'alguien (perfil eliminado)'}`
    : '';
  const esSuCumpleanos = esCumpleanos(persona, cita.fecha);

  card.innerHTML = `
    <div class="cita-header">
      <div class="cita-titulo-linea">
        <span class="icono-tipo">${ICONOS_TIPO[cita.tipo] || ICONOS_TIPO.otro}</span>
        <h3>${escaparHtml(cita.titulo)}</h3>
      </div>
      <button type="button" class="btn-eliminar">Eliminar</button>
    </div>
    <div class="cita-meta">${formatearFechaHora(cita)}${conQuienTexto}</div>
    ${esSuCumpleanos ? `<div class="cita-cumpleanos">🎂 ¡Es el cumpleaños de ${escaparHtml(persona.nombre)}!</div>` : ''}
    <div class="cita-lugar">${enlaceLugar}</div>
    <a class="cita-calendario" href="${generarUrlGoogleCalendar(cita, persona)}" target="_blank" rel="noopener">📅 Agregar a Google Calendar</a>
    <div class="cita-clima" data-clima-id="${cita.id}">Cargando clima...</div>
  `;

  const botonEliminar = card.querySelector('.btn-eliminar');
  botonEliminar.addEventListener('click', () => {
    if (botonEliminar.dataset.confirmar) {
      eliminarCita(cita.id);
    } else {
      botonEliminar.dataset.confirmar = '1';
      botonEliminar.textContent = '¿Eliminar? Toca de nuevo';
      setTimeout(() => {
        delete botonEliminar.dataset.confirmar;
        botonEliminar.textContent = 'Eliminar';
      }, 4000);
    }
  });
  cargarClimaDeCita(cita.id, card);
  return card;
}

async function cargarClimaDeCita(id, card) {
  const el = card.querySelector(`.cita-clima[data-clima-id="${id}"]`);
  if (!el) return;

  el.className = 'cita-clima';
  card.classList.remove('punto-buena', 'punto-precaucion', 'punto-alerta');
  el.textContent = 'Cargando clima...';

  try {
    const resultado = await llamarApi(`/api/citas/${id}/clima`);
    renderizarClimaEnTarjeta(el, card, resultado);
  } catch (err) {
    el.classList.add('clima-error');
    el.innerHTML = `
      ${ICONOS_CLIMA.error}
      <span class="texto-clima">${escaparHtml(err.message)}<br><button type="button" class="reintentar">Reintentar</button></span>
    `;
    el.querySelector('.reintentar').addEventListener('click', () => cargarClimaDeCita(id, card));
  }
}

function renderizarClimaEnTarjeta(el, card, resultado) {
  if (resultado.estado === 'no_disponible') {
    el.innerHTML = `<span class="texto-clima">${escaparHtml(resultado.mensaje)}</span>`;
    return;
  }

  const { datos, estado } = resultado;
  const categoria = categoriaClima(datos.codigoClima);
  el.classList.add(`clima-${categoria}`);
  card.classList.add(`punto-${categoria}`);

  const etiqueta = estado === 'historico' ? 'Clima registrado' : 'Pronóstico';
  const precipitacion = datos.precipitacion > 0 ? `, ${datos.precipitacion} mm de lluvia` : '';
  const consejo = estado === 'pronostico' ? generarConsejo(datos, categoria) : '';

  el.innerHTML = `
    ${ICONOS_CLIMA[categoria]}
    <span class="texto-clima">
      <span class="etiqueta">${etiqueta}</span>
      ${describirClima(datos.codigoClima)}, máx ${Math.round(datos.temperaturaMax)}° / mín ${Math.round(datos.temperaturaMin)}°${precipitacion}
      ${consejo ? `<span class="consejo">${escaparHtml(consejo)}</span>` : ''}
    </span>
  `;
}

async function eliminarCita(id) {
  ocultarMensaje($('mensaje-lista'));
  try {
    await llamarApi(`/api/citas/${id}`, { method: 'DELETE' });
    citas = citas.filter((c) => c.id !== id);
    renderizarTodo();
    avisar('Cita eliminada');
  } catch (err) {
    mostrarMensaje($('mensaje-lista'), err.message);
  }
}

// -----------------------------------------------------------------------
// Personas: tarjetas en la pestaña Personas
// -----------------------------------------------------------------------
function renderizarPersonas() {
  const contenedor = $('lista-personas');
  $('sin-personas').classList.toggle('oculto', personas.length > 0);
  contenedor.innerHTML = personas.map((persona) => {
    const cantidad = citas.filter((c) => c.personaId === persona.id).length;
    const proximoCumple = persona.cumpleanos ? siguienteOcurrencia(persona.cumpleanos) : null;
    return `
      <button type="button" class="persona-card" data-ver-persona="${persona.id}">
        ${avatarPersona(persona, 'avatar-persona avatar-grande')}
        <span class="persona-card-texto">
          <strong>${escaparHtml(persona.nombre)}</strong>
          <span class="persona-relacion">${escaparHtml(persona.relacion)}</span>
          <span class="persona-dato">${cantidad === 1 ? '1 cita' : `${cantidad} citas`}${proximoCumple ? `, cumple el ${formatearDiaMes(proximoCumple)}` : ''}</span>
        </span>
      </button>`;
  }).join('');
}

document.addEventListener('click', (evento) => {
  const card = evento.target.closest('[data-ver-persona]');
  if (card) verPersona(card.dataset.verPersona);
});

// -----------------------------------------------------------------------
// Panel lateral: ver, crear y editar una persona
// -----------------------------------------------------------------------
let editandoPersonaId = null;
let alGuardarPersona = null; // callback opcional (ej: desde el asistente)
let fechasEnFormulario = [];
let elementoConFocoPrevio = null;

function abrirLateral(titulo) {
  elementoConFocoPrevio = document.activeElement;
  $('lateral-titulo').textContent = titulo;
  $('panel-lateral').classList.remove('oculto');
  document.body.classList.add('sin-scroll');
}

function cerrarLateral() {
  if ($('panel-lateral').classList.contains('oculto')) return;
  $('panel-lateral').classList.add('oculto');
  alGuardarPersona = null;
  if ($('asistente').classList.contains('oculto')) document.body.classList.remove('sin-scroll');
  if (elementoConFocoPrevio && elementoConFocoPrevio.focus) elementoConFocoPrevio.focus();
}

function verPersona(id) {
  const persona = buscarPersonaPorId(id);
  if (!persona) return;
  const suyas = ordenarCitas(citas.filter((c) => c.personaId === id)).reverse();
  const datos = [
    persona.cumpleanos ? ['Cumpleaños', formatearDiaMes(persona.cumpleanos)] : null,
    persona.comidaFavorita ? ['Comida favorita', escaparHtml(persona.comidaFavorita)] : null,
    persona.correo ? ['Correo', escaparHtml(persona.correo)] : null
  ].filter(Boolean);
  const fechas = persona.fechasImportantes || [];

  $('vista-persona').innerHTML = `
    <div class="vista-encabezado">
      ${avatarPersona(persona, 'avatar-persona avatar-grande')}
      <div>
        <p class="vista-nombre">${escaparHtml(persona.nombre)}</p>
        <span class="persona-relacion">${escaparHtml(persona.relacion)}</span>
      </div>
    </div>
    <button type="button" class="btn btn-principal" data-planear-persona="${persona.id}">Planear una cita con ${escaparHtml(persona.nombre)}</button>

    ${datos.length ? `<dl class="vista-datos">${datos.map(([e, v]) => `<div><dt>${e}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${persona.notas ? `<p class="vista-notas">${escaparHtml(persona.notas)}</p>` : ''}

    <h3>Fechas importantes</h3>
    ${fechas.length
      ? `<ul class="vista-lista">${fechas.map((f) => `<li><strong>${escaparHtml(f.nombre)}</strong><span>${formatearDiaMes(f.fecha)}</span></li>`).join('')}</ul>`
      : '<p class="vacio-chico">Sin fechas guardadas. Agrégalas al editar.</p>'}

    <h3>Sus citas</h3>
    ${suyas.length
      ? `<ul class="vista-lista">${suyas.map((c) => `<li><strong>${escaparHtml(c.titulo)}</strong><span>${formatearFechaLarga(c.fecha)}</span></li>`).join('')}</ul>`
      : '<p class="vacio-chico">Todavía no han planeado nada juntos.</p>'}

    <div class="lateral-acciones">
      <button type="button" class="btn-eliminar" id="btn-eliminar-persona">Eliminar</button>
      <button type="button" class="btn btn-secundario" id="btn-editar-persona">Editar</button>
    </div>
    <div id="mensaje-vista-persona" class="mensaje oculto" role="alert"></div>
  `;
  $('form-persona').classList.add('oculto');
  $('vista-persona').classList.remove('oculto');
  abrirLateral('Persona');

  $('btn-editar-persona').addEventListener('click', () => abrirFormPersona(persona));
  const botonEliminar = $('btn-eliminar-persona');
  botonEliminar.addEventListener('click', async () => {
    if (!botonEliminar.dataset.confirmar) {
      botonEliminar.dataset.confirmar = '1';
      botonEliminar.textContent = '¿Eliminar? Toca de nuevo';
      return;
    }
    try {
      await llamarApi(`/api/personas/${persona.id}`, { method: 'DELETE' });
      personas = personas.filter((p) => p.id !== persona.id);
      cerrarLateral();
      renderizarTodo();
      avisar(`${persona.nombre} se eliminó`);
    } catch (err) {
      mostrarMensaje($('mensaje-vista-persona'), err.message);
    }
  });
  $('lateral-titulo').focus?.();
}

// --- Selector de dia + mes (+ año opcional), reutilizable ---
function htmlSelectorDiaMes(prefijo, iso) {
  let dia = '';
  let mes = '';
  let anio = '';
  if (iso) {
    const [a, m, d] = iso.split('-').map(Number);
    dia = d; mes = m; anio = a === ANIO_DESCONOCIDO ? '' : a;
  }
  const opcionesDia = ['<option value="">Día</option>']
    .concat(Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${dia === i + 1 ? 'selected' : ''}>${i + 1}</option>`)).join('');
  const opcionesMes = ['<option value="">Mes</option>']
    .concat(MESES.map((nombre, i) => `<option value="${i + 1}" ${mes === i + 1 ? 'selected' : ''}>${nombre}</option>`)).join('');
  return `
    <select data-parte="dia" aria-label="Día" id="${prefijo}-dia">${opcionesDia}</select>
    <select data-parte="mes" aria-label="Mes" id="${prefijo}-mes">${opcionesMes}</select>
    <input data-parte="anio" type="number" inputmode="numeric" min="1900" max="2100" placeholder="Año (opcional)" aria-label="Año (opcional)" value="${anio}" />`;
}

/** Devuelve { iso } si es valida, { vacio: true } si no se lleno, o { error }. */
function leerSelectorDiaMes(contenedor) {
  const dia = Number(contenedor.querySelector('[data-parte="dia"]').value);
  const mes = Number(contenedor.querySelector('[data-parte="mes"]').value);
  const anioTexto = contenedor.querySelector('[data-parte="anio"]').value.trim();
  if (!dia && !mes && !anioTexto) return { vacio: true };
  if (!dia || !mes) return { error: 'elige el día y el mes' };
  const anio = anioTexto ? Number(anioTexto) : ANIO_DESCONOCIDO;
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) return { error: 'el año no es válido' };
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getMonth() !== mes - 1) return { error: `el ${dia} de ${MESES[mes - 1]} no existe` };
  return { iso: `${anio}-${conCero(mes)}-${conCero(dia)}` };
}

function renderizarOpcionesRelacion(relacionActual) {
  const esSugerida = !relacionActual || relacionesSugeridas.includes(relacionActual);
  $('opciones-relacion').innerHTML = relacionesSugeridas
    .map((r) => `<button type="button" class="chip ${r === relacionActual ? 'activo' : ''}" data-relacion="${escaparHtml(r)}" aria-pressed="${r === relacionActual}">${escaparHtml(r)}</button>`)
    .join('') +
    `<button type="button" class="chip ${!esSugerida ? 'activo' : ''}" data-relacion="__otra__" aria-pressed="${!esSugerida}">Otra…</button>`;
  const inputOtra = $('persona-relacion-otra');
  inputOtra.classList.toggle('oculto', esSugerida);
  inputOtra.value = esSugerida ? '' : relacionActual;
}

$('opciones-relacion').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-relacion]');
  if (!chip) return;
  $('opciones-relacion').querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('activo', c === chip);
    c.setAttribute('aria-pressed', String(c === chip));
  });
  const esOtra = chip.dataset.relacion === '__otra__';
  $('persona-relacion-otra').classList.toggle('oculto', !esOtra);
  if (esOtra) $('persona-relacion-otra').focus();
});

function relacionElegida() {
  const chip = $('opciones-relacion').querySelector('.chip.activo');
  if (!chip) return '';
  return chip.dataset.relacion === '__otra__' ? $('persona-relacion-otra').value.trim() : chip.dataset.relacion;
}

function renderizarFechasFormulario() {
  $('lista-fechas-form').innerHTML = fechasEnFormulario.map((f, i) => `
    <div class="fecha-form" data-indice="${i}">
      <input type="text" data-parte="nombre" placeholder="Ej: Aniversario" maxlength="40" value="${escaparHtml(f.nombre)}" aria-label="Nombre de la fecha" />
      <div class="selector-dia-mes">${htmlSelectorDiaMes(`fecha-${i}`, f.fecha)}</div>
      <button type="button" class="btn-icono" data-quitar-fecha="${i}" aria-label="Quitar esta fecha">✕</button>
    </div>`).join('');
}

/** Guarda lo escrito en las filas antes de volver a pintarlas. */
function sincronizarFechasFormulario() {
  $('lista-fechas-form').querySelectorAll('.fecha-form').forEach((fila) => {
    const i = Number(fila.dataset.indice);
    const lectura = leerSelectorDiaMes(fila.querySelector('.selector-dia-mes'));
    fechasEnFormulario[i] = {
      nombre: fila.querySelector('[data-parte="nombre"]').value,
      fecha: lectura.iso || null
    };
  });
}

$('btn-agregar-fecha').addEventListener('click', () => {
  sincronizarFechasFormulario();
  if (fechasEnFormulario.length >= 10) return;
  fechasEnFormulario.push({ nombre: '', fecha: null });
  renderizarFechasFormulario();
  const filas = $('lista-fechas-form').querySelectorAll('[data-parte="nombre"]');
  filas[filas.length - 1].focus();
});

$('lista-fechas-form').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-quitar-fecha]');
  if (!boton) return;
  sincronizarFechasFormulario();
  fechasEnFormulario.splice(Number(boton.dataset.quitarFecha), 1);
  renderizarFechasFormulario();
});

/**
 * Abre el formulario de persona. Sin argumento: persona nueva.
 * `opciones.alGuardar(persona)` se llama al guardar (lo usa el asistente).
 */
function abrirFormPersona(persona = null, opciones = {}) {
  editandoPersonaId = persona ? persona.id : null;
  alGuardarPersona = opciones.alGuardar || null;

  $('persona-nombre').value = persona ? persona.nombre : '';
  renderizarOpcionesRelacion(persona ? persona.relacion : null);
  $('persona-cumpleanos').innerHTML = htmlSelectorDiaMes('cumple', persona ? persona.cumpleanos : null);
  fechasEnFormulario = persona ? (persona.fechasImportantes || []).map((f) => ({ ...f })) : [];
  renderizarFechasFormulario();
  $('persona-comida').value = persona ? persona.comidaFavorita || '' : '';
  $('persona-correo').value = persona ? persona.correo || '' : '';
  $('persona-notas').value = persona ? persona.notas || '' : '';
  $('btn-guardar-persona').textContent = persona ? 'Guardar cambios' : 'Guardar persona';
  ocultarMensaje($('mensaje-persona'));

  $('vista-persona').classList.add('oculto');
  $('form-persona').classList.remove('oculto');
  const callback = alGuardarPersona;
  abrirLateral(persona ? `Editar a ${persona.nombre}` : 'Nueva persona');
  alGuardarPersona = callback;
  setTimeout(() => $('persona-nombre').focus(), 50);
}

$('form-persona').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const mensaje = $('mensaje-persona');
  ocultarMensaje(mensaje);
  sincronizarFechasFormulario();

  const nombre = $('persona-nombre').value.trim();
  const relacion = relacionElegida();
  const correo = $('persona-correo').value.trim() || null;
  const cumple = leerSelectorDiaMes($('persona-cumpleanos'));

  if (nombre.length < 2) { mostrarMensaje(mensaje, 'Escribe un nombre de al menos 2 letras.'); return; }
  if (!relacion || relacion.length < 2) { mostrarMensaje(mensaje, 'Elige la relación o escribe la tuya.'); return; }
  if (cumple.error) { mostrarMensaje(mensaje, `Cumpleaños: ${cumple.error}.`); return; }
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { mostrarMensaje(mensaje, 'El correo no tiene un formato válido.'); return; }

  const fechasImportantes = [];
  for (const [i, f] of fechasEnFormulario.entries()) {
    const fila = $('lista-fechas-form').querySelector(`[data-indice="${i}"] .selector-dia-mes`);
    const lectura = leerSelectorDiaMes(fila);
    const nombreFecha = (f.nombre || '').trim();
    if (!nombreFecha && lectura.vacio) continue; // fila vacia: se ignora
    if (nombreFecha.length < 2) { mostrarMensaje(mensaje, 'Cada fecha importante necesita un nombre, por ejemplo "Aniversario".'); return; }
    if (lectura.vacio || lectura.error) { mostrarMensaje(mensaje, `${nombreFecha}: ${lectura.error || 'elige el día y el mes'}.`); return; }
    fechasImportantes.push({ nombre: nombreFecha, fecha: lectura.iso });
  }

  const payload = {
    nombre,
    relacion,
    cumpleanos: cumple.iso || null,
    comidaFavorita: $('persona-comida').value.trim() || null,
    correo,
    notas: $('persona-notas').value.trim() || null,
    fechasImportantes
  };

  const boton = $('btn-guardar-persona');
  boton.disabled = true;
  try {
    const data = editandoPersonaId
      ? await enviarJson(`/api/personas/${editandoPersonaId}`, 'PUT', payload)
      : await enviarJson('/api/personas', 'POST', payload);
    await cargarPersonas();
    renderizarTodo();
    const callback = alGuardarPersona;
    const eraEdicion = Boolean(editandoPersonaId);
    cerrarLateral();
    avisar(eraEdicion ? 'Cambios guardados' : `${data.persona.nombre} se agregó a tus personas`);
    if (callback) callback(data.persona);
    else if (eraEdicion) verPersona(data.persona.id);
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  } finally {
    boton.disabled = false;
  }
});

// -----------------------------------------------------------------------
// Asistente de nueva cita (paso a paso)
// -----------------------------------------------------------------------
// Orden pensado para la IA: para sugerir que hacer, el agente necesita
// saber cuando, donde y con quien.
const PASOS = [
  { nombre: 'Cuándo', valido: () => Boolean(borrador.fecha), pista: 'Elige una fecha para seguir' },
  { nombre: 'Dónde', valido: () => Boolean(borrador.ubicacion), pista: 'Elige un lugar para seguir' },
  { nombre: 'Con quién', valido: () => true, pista: '' },
  { nombre: 'Qué', valido: () => Boolean(borrador.tipo), pista: 'Elige un tipo de plan o una idea' },
  { nombre: 'Detalles', valido: () => true, pista: '' }
];

// Ciudades populares de RD, para elegir el lugar con un toque.
const CIUDADES_RD = [
  { nombre: 'Santo Domingo', lat: 18.4861, lon: -69.9312 },
  { nombre: 'Santiago de los Caballeros', alias: 'Santiago', lat: 19.4517, lon: -70.697 },
  { nombre: 'Punta Cana', lat: 18.5601, lon: -68.3725 },
  { nombre: 'Puerto Plata', lat: 19.7934, lon: -70.6884 },
  { nombre: 'La Romana', lat: 18.4273, lon: -68.9728 },
  { nombre: 'Las Terrenas', lat: 19.311, lon: -69.5428 },
  { nombre: 'Jarabacoa', lat: 19.1167, lon: -70.6333 }
];

// Hora sugerida segun el momento que propone el agente.
const HORA_POR_MOMENTO = { manana: '10:00', tarde: '16:00', noche: '19:30' };

const FRANJAS = [
  { id: 'manana', etiqueta: 'Mañana', desde: 6 * 60, hasta: 11 * 60 + 30 },
  { id: 'tarde', etiqueta: 'Tarde', desde: 12 * 60, hasta: 17 * 60 + 30 },
  { id: 'noche', etiqueta: 'Noche', desde: 18 * 60, hasta: 23 * 60 + 30 }
];

let borrador = null;
let pasoActual = 1;
let mesCalendario = null; // Date del primer dia del mes visible
let franjaActiva = null;
let lugaresSugeridos = [];
let claveIdeasAsistente = null;

function borradorVacio() {
  return { tipo: null, fecha: null, hora: null, personaId: null, ubicacion: null, lugarElegido: null };
}

/**
 * Abre el asistente. `prefill` puede traer tipo, fecha, hora, personaId,
 * ubicacion, lugarElegido y titulo (por ejemplo, desde una idea de "Hoy").
 * `pasoInicial` permite saltar los pasos que ya estan resueltos.
 */
function abrirAsistente(prefill = {}, pasoInicial = 1) {
  const { titulo = '', ...resto } = prefill;
  borrador = { ...borradorVacio(), ...resto };
  if (borrador.personaId && !buscarPersonaPorId(borrador.personaId)) borrador.personaId = null;
  pasoActual = 1;
  const base = borrador.fecha ? deISO(borrador.fecha) : hoy();
  mesCalendario = new Date(base.getFullYear(), base.getMonth(), 1);
  franjaActiva = null;
  lugaresSugeridos = borrador.lugarElegido ? [borrador.lugarElegido] : [];
  claveIdeasAsistente = null;
  $('cita-titulo').value = titulo;
  $('ideas-asistente-lista').innerHTML = '';
  ocultarMensaje($('ideas-asistente-mensaje'));
  $('buscar-lugar').value = '';
  $('lista-resultados-ubicacion').innerHTML = '';
  $('modo-coordenadas').classList.add('oculto');
  $('lista-lugares').innerHTML = '';
  ['mensaje-form', 'mensaje-donde', 'lugares-mensaje'].forEach((id) => ocultarMensaje($(id)));

  elementoConFocoPrevioAsistente = document.activeElement;
  $('asistente').classList.remove('oculto');
  document.body.classList.add('sin-scroll');
  irAPaso(pasoInicial);
}

let elementoConFocoPrevioAsistente = null;
function cerrarAsistente() {
  $('asistente').classList.add('oculto');
  document.body.classList.remove('sin-scroll');
  if (elementoConFocoPrevioAsistente && elementoConFocoPrevioAsistente.focus) elementoConFocoPrevioAsistente.focus();
}

function irAPaso(numero) {
  pasoActual = numero;
  document.querySelectorAll('.paso').forEach((p) => p.classList.toggle('activo', Number(p.dataset.paso) === numero));
  $('asistente-progreso-texto').textContent = `Paso ${numero} de ${PASOS.length}`;
  $('asistente-titulo').textContent = PASOS[numero - 1].nombre;
  $('asistente-barra').style.width = `${(numero / PASOS.length) * 100}%`;
  $('btn-atras').classList.toggle('invisible', numero === 1);
  $('btn-siguiente').textContent = numero === PASOS.length ? 'Guardar cita' : 'Siguiente';
  $('btn-siguiente').disabled = false;
  $('btn-siguiente').classList.replace('btn-secundario', 'btn-principal');

  if (numero === 1) renderizarPasoCuando();
  if (numero === 2) renderizarPasoDonde();
  if (numero === 3) renderizarPasoConQuien();
  if (numero === 4) renderizarPasoQue();
  if (numero === 5) renderizarPasoDetalles();
  actualizarPie();
  document.querySelector('.asistente-cuerpo').scrollTop = 0;
}

function actualizarPie() {
  const paso = PASOS[pasoActual - 1];
  const valido = paso.valido();
  $('btn-siguiente').disabled = !valido;
  $('asistente-pista').textContent = valido ? '' : paso.pista;
}

$('btn-atras').addEventListener('click', () => { if (typeof pasoActual === 'number' && pasoActual > 1) irAPaso(pasoActual - 1); });
$('btn-siguiente').addEventListener('click', () => {
  if (pasoActual === 'listo') { cerrarAsistente(); return; }
  if (!PASOS[pasoActual - 1].valido()) return;
  if (pasoActual < PASOS.length) irAPaso(pasoActual + 1);
  else guardarCita();
});

// --- Paso 4: Que (con ideas del agente) ---
function contextoDelBorrador() {
  const persona = borrador.personaId ? buscarPersonaPorId(borrador.personaId) : null;
  return `${capitalizar(formatearFechaLarga(borrador.fecha))} en ${borrador.ubicacion.nombre}${persona ? `, con ${persona.nombre}` : ''}. El agente revisa el clima y busca lugares reales.`;
}

function renderizarPasoQue() {
  $('ideas-asistente-contexto').textContent = contextoDelBorrador();
  // Si cambio la fecha, el lugar o la persona, las ideas anteriores ya no aplican.
  const clave = JSON.stringify([borrador.fecha, borrador.ubicacion, borrador.personaId]);
  if (claveIdeasAsistente && clave !== claveIdeasAsistente) {
    $('ideas-asistente-lista').innerHTML = '';
    claveIdeasAsistente = null;
  }
  $('opciones-tipo').innerHTML = tiposCita.map((t) => `
    <button type="button" role="radio" class="opcion-tipo ${borrador.tipo === t.id ? 'activo' : ''}" aria-checked="${borrador.tipo === t.id}" data-tipo="${t.id}">
      <span class="opcion-icono">${ICONOS_TIPO[t.id] || ICONOS_TIPO.otro}</span>
      <span>${escaparHtml(t.etiqueta)}</span>
    </button>`).join('');
}

$('opciones-tipo').addEventListener('click', (evento) => {
  const opcion = evento.target.closest('[data-tipo]');
  if (!opcion) return;
  borrador.tipo = opcion.dataset.tipo;
  renderizarPasoQue();
  actualizarPie();
});

// --- Paso 2: Cuando (atajos + calendario + hora) ---
function proximoSabado(desde) {
  const d = new Date(desde);
  const diasHastaSabado = (6 - d.getDay() + 7) % 7;
  return sumarDias(d, diasHastaSabado);
}

function atajosFecha() {
  const h = hoy();
  const esteSabado = proximoSabado(h);
  const atajos = [
    { etiqueta: 'Hoy', iso: aISO(h) },
    { etiqueta: 'Mañana', iso: aISO(sumarDias(h, 1)) },
    { etiqueta: 'Este sábado', iso: aISO(esteSabado) },
    { etiqueta: 'Próximo sábado', iso: aISO(sumarDias(esteSabado, 7)) }
  ];
  // Si hoy o mañana ya es sabado, ese atajo sobra.
  return atajos.filter((a, i) => atajos.findIndex((b) => b.iso === a.iso) === i);
}

/** Dias marcados en el calendario: cumpleaños y fechas importantes. */
function marcasDelCalendario() {
  const marcas = {};
  const agregar = (iso, texto) => {
    const clave = iso.slice(5);
    (marcas[clave] = marcas[clave] || []).push(texto);
  };
  personas.forEach((p) => {
    if (p.cumpleanos) agregar(p.cumpleanos, `Cumpleaños de ${p.nombre}`);
    (p.fechasImportantes || []).forEach((f) => agregar(f.fecha, `${f.nombre} con ${p.nombre}`));
  });
  return marcas;
}

function renderizarPasoCuando() {
  $('atajos-fecha').innerHTML = atajosFecha().map((a) => `
    <button type="button" class="chip ${borrador.fecha === a.iso ? 'activo' : ''}" data-fecha="${a.iso}" aria-pressed="${borrador.fecha === a.iso}">${a.etiqueta}</button>`).join('');
  renderizarCalendario();
  renderizarHoras();
}

function renderizarCalendario() {
  const marcas = marcasDelCalendario();
  const anio = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const hoyTexto = hoyISO();
  const primerMesPermitido = new Date(hoy().getFullYear(), hoy().getMonth(), 1);
  const puedeRetroceder = mesCalendario > primerMesPermitido;

  // Lunes = 0 ... domingo = 6
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  let celdas = '';
  for (let i = 0; i < desfase; i += 1) celdas += '<span class="dia-vacio"></span>';
  for (let d = 1; d <= diasEnMes; d += 1) {
    const iso = `${anio}-${conCero(mes + 1)}-${conCero(d)}`;
    const pasado = iso < hoyTexto;
    const marca = marcas[iso.slice(5)];
    const clases = ['dia', iso === hoyTexto ? 'hoy' : '', iso === borrador.fecha ? 'elegido' : '', marca ? 'marcado' : ''].filter(Boolean).join(' ');
    const etiqueta = `${d} de ${MESES[mes]}${marca ? `: ${marca.join(', ')}` : ''}`;
    celdas += `<button type="button" class="${clases}" data-fecha="${iso}" ${pasado ? 'disabled' : ''} aria-label="${escaparHtml(etiqueta)}" aria-pressed="${iso === borrador.fecha}" ${marca ? `title="${escaparHtml(marca.join(', '))}"` : ''}>${d}${marca ? '<span class="marca" aria-hidden="true">🎂</span>' : ''}</button>`;
  }

  $('calendario').innerHTML = `
    <div class="cal-cabecera">
      <button type="button" class="btn-icono" data-mes="-1" ${puedeRetroceder ? '' : 'disabled'} aria-label="Mes anterior">‹</button>
      <span class="cal-mes">${MESES[mes]} ${anio}</span>
      <button type="button" class="btn-icono" data-mes="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal-semana" aria-hidden="true">${DIAS_CORTOS.map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="cal-dias">${celdas}</div>
    ${borrador.fecha ? `<p class="cal-elegida">${capitalizar(formatearFechaLarga(borrador.fecha))}</p>` : ''}`;
}

function elegirFecha(iso) {
  borrador.fecha = iso;
  const d = deISO(iso);
  mesCalendario = new Date(d.getFullYear(), d.getMonth(), 1);
  renderizarPasoCuando();
  actualizarPie();
}

$('atajos-fecha').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-fecha]');
  if (chip) elegirFecha(chip.dataset.fecha);
});

$('calendario').addEventListener('click', (evento) => {
  const flecha = evento.target.closest('[data-mes]');
  if (flecha && !flecha.disabled) {
    mesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + Number(flecha.dataset.mes), 1);
    renderizarCalendario();
    return;
  }
  const dia = evento.target.closest('.dia[data-fecha]');
  if (dia && !dia.disabled) elegirFecha(dia.dataset.fecha);
});

function franjaDeHora(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  const min = h * 60 + m;
  const franja = FRANJAS.find((f) => min >= f.desde && min <= f.hasta);
  return franja ? franja.id : null;
}

function renderizarHoras() {
  const activa = franjaActiva || franjaDeHora(borrador.hora);
  $('franjas-hora').innerHTML =
    `<button type="button" class="chip ${!borrador.hora && !franjaActiva ? 'activo' : ''}" data-franja="" aria-pressed="${!borrador.hora && !franjaActiva}">Sin hora</button>` +
    FRANJAS.map((f) => `<button type="button" class="chip ${activa === f.id ? 'activo' : ''}" data-franja="${f.id}" aria-pressed="${activa === f.id}">${f.etiqueta}</button>`).join('');

  const franja = FRANJAS.find((f) => f.id === activa);
  if (!franja) { $('horas').innerHTML = ''; return; }
  let html = '';
  for (let min = franja.desde; min <= franja.hasta; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const valor = `${conCero(h)}:${conCero(m)}`;
    html += `<button type="button" class="hora ${borrador.hora === valor ? 'activo' : ''}" data-hora="${valor}" aria-pressed="${borrador.hora === valor}">${formatearHora12h(h, m)}</button>`;
  }
  $('horas').innerHTML = html;
}

$('franjas-hora').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-franja]');
  if (!chip) return;
  franjaActiva = chip.dataset.franja || null;
  if (!franjaActiva || franjaDeHora(borrador.hora) !== franjaActiva) borrador.hora = null;
  renderizarHoras();
});

$('horas').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-hora]');
  if (!boton) return;
  borrador.hora = borrador.hora === boton.dataset.hora ? null : boton.dataset.hora;
  renderizarHoras();
});

// --- Paso 3: Con quien ---
function renderizarPasoConQuien() {
  const opcion = (id, contenido, etiqueta) => `
    <button type="button" role="radio" class="opcion-persona ${borrador.personaId === id ? 'activo' : ''}" aria-checked="${borrador.personaId === id}" data-persona="${id || ''}">
      ${contenido}<span class="opcion-persona-texto">${etiqueta}</span>
    </button>`;
  $('opciones-persona').innerHTML =
    opcion(null, '<span class="avatar-persona avatar-nadie" aria-hidden="true">—</span>', '<strong>Nadie en particular</strong>') +
    personas.map((p) => opcion(p.id, avatarPersona(p), `<strong>${escaparHtml(p.nombre)}</strong><span>${escaparHtml(p.relacion)}</span>`)).join('') +
    '<button type="button" class="opcion-persona opcion-nueva" id="btn-persona-desde-asistente"><span class="avatar-persona avatar-nadie" aria-hidden="true">+</span><span class="opcion-persona-texto"><strong>Nueva persona</strong></span></button>';
}

$('opciones-persona').addEventListener('click', (evento) => {
  if (evento.target.closest('#btn-persona-desde-asistente')) {
    abrirFormPersona(null, {
      alGuardar: (persona) => {
        borrador.personaId = persona.id;
        renderizarPasoConQuien();
        actualizarPie();
      }
    });
    return;
  }
  const opcion = evento.target.closest('[data-persona]');
  if (!opcion) return;
  borrador.personaId = opcion.dataset.persona || null;
  renderizarPasoConQuien();
});

// --- Paso 4: Donde ---
function mismaUbicacion(a, b) {
  return a && b && Math.round(a.lat * 1000) === Math.round(b.lat * 1000) && Math.round(a.lon * 1000) === Math.round(b.lon * 1000);
}

function renderizarPasoDonde() {
  const populares = CIUDADES_RD.filter((c) => !lugaresGuardados.some((l) => mismaUbicacion(l, c)));
  $('bloque-populares').classList.toggle('oculto', populares.length === 0);
  $('lugares-populares').innerHTML = populares.map((c) => {
    const activo = mismaUbicacion(c, borrador.ubicacion);
    return `<button type="button" class="chip ${activo ? 'activo' : ''}" data-ciudad="${escaparHtml(c.nombre)}" aria-pressed="${activo}">${escaparHtml(c.alias || c.nombre)}</button>`;
  }).join('');
  $('bloque-guardados').classList.toggle('oculto', lugaresGuardados.length === 0);
  $('lugares-guardados').innerHTML = lugaresGuardados.map((l) => {
    const activo = mismaUbicacion(l, borrador.ubicacion);
    return `
      <span class="chip-lugar ${activo ? 'activo' : ''}">
        <button type="button" class="chip-lugar-elegir" data-lugar-guardado="${l.id}" aria-pressed="${activo}">
          ${l.favorito ? '<span aria-label="Favorito">⭐</span> ' : ''}${escaparHtml(l.alias || l.nombre)}
        </button>
        <button type="button" class="chip-lugar-quitar" data-quitar-lugar="${l.id}" aria-label="Quitar ${escaparHtml(l.alias || l.nombre)} de tus lugares">✕</button>
      </span>`;
  }).join('');
  renderizarUbicacionElegida();
}

function renderizarUbicacionElegida() {
  const el = $('ubicacion-seleccionada');
  const u = borrador.ubicacion;
  if (!u) { el.classList.add('oculto'); el.innerHTML = ''; return; }
  const guardado = lugaresGuardados.find((l) => mismaUbicacion(l, u));
  const esFavorito = guardado && guardado.favorito;
  el.classList.remove('oculto');
  el.innerHTML = `
    <div class="ubicacion-linea">
      <span>📍 <strong>${escaparHtml(u.nombre)}</strong></span>
      ${esFavorito
        ? '<span class="texto-suave">⭐ En tus favoritos</span>'
        : '<button type="button" class="enlace" id="btn-favorito">☆ Guardar en favoritos</button>'}
    </div>
    <div id="form-favorito" class="form-favorito oculto">
      <input type="text" id="alias-favorito" maxlength="30" placeholder="Nombre corto (opcional), ej: Casa" aria-label="Nombre corto para este lugar" />
      <button type="button" class="btn btn-secundario" id="btn-confirmar-favorito">Guardar</button>
    </div>`;
}

function fijarUbicacion(ubicacion) {
  borrador.ubicacion = ubicacion;
  borrador.lugarElegido = null;
  lugaresSugeridos = [];
  $('lista-resultados-ubicacion').innerHTML = '';
  ocultarMensaje($('mensaje-donde'));
  renderizarPasoDonde();
  actualizarPie();
}

$('lugares-populares').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-ciudad]');
  if (!chip) return;
  const ciudad = CIUDADES_RD.find((c) => c.nombre === chip.dataset.ciudad);
  if (ciudad) fijarUbicacion({ nombre: ciudad.nombre, lat: ciudad.lat, lon: ciudad.lon });
});

$('lugares-guardados').addEventListener('click', async (evento) => {
  const quitar = evento.target.closest('[data-quitar-lugar]');
  if (quitar) {
    try {
      await llamarApi(`/api/lugares-guardados/${quitar.dataset.quitarLugar}`, { method: 'DELETE' });
      lugaresGuardados = lugaresGuardados.filter((l) => l.id !== quitar.dataset.quitarLugar);
      renderizarPasoDonde();
    } catch (err) {
      mostrarMensaje($('mensaje-donde'), err.message);
    }
    return;
  }
  const elegir = evento.target.closest('[data-lugar-guardado]');
  if (!elegir) return;
  const lugar = lugaresGuardados.find((l) => l.id === elegir.dataset.lugarGuardado);
  if (lugar) fijarUbicacion({ nombre: lugar.nombre, lat: lugar.lat, lon: lugar.lon });
});

$('ubicacion-seleccionada').addEventListener('click', async (evento) => {
  if (evento.target.closest('#btn-favorito')) {
    $('form-favorito').classList.remove('oculto');
    $('alias-favorito').focus();
    return;
  }
  if (evento.target.closest('#btn-confirmar-favorito')) {
    try {
      const u = borrador.ubicacion;
      await enviarJson('/api/lugares-guardados', 'POST', { ...u, alias: $('alias-favorito').value.trim() || null });
      await cargarLugaresGuardados();
      renderizarPasoDonde();
      avisar('Lugar guardado en tus favoritos');
    } catch (err) {
      mostrarMensaje($('mensaje-donde'), err.message);
    }
  }
});

async function buscarUbicacion() {
  const mensaje = $('mensaje-donde');
  ocultarMensaje(mensaje);
  const lista = $('lista-resultados-ubicacion');
  lista.innerHTML = '';
  const consulta = $('buscar-lugar').value.trim();
  if (consulta.length < 2) {
    mostrarMensaje(mensaje, 'Escribe al menos 2 letras para buscar un lugar.');
    return;
  }
  try {
    const data = await llamarApi(`/api/geocode?q=${encodeURIComponent(consulta)}`);
    if (!data.resultados.length) {
      mostrarMensaje(mensaje, `No encontré "${consulta}". Prueba con el nombre de la ciudad o del barrio.`, 'info');
      return;
    }
    lista.innerHTML = data.resultados.map((lugar, i) => {
      const detalle = [lugar.region, lugar.pais].filter(Boolean).join(', ');
      return `<li><button type="button" data-resultado="${i}"><strong>${escaparHtml(lugar.nombre)}</strong>${detalle ? `<span>${escaparHtml(detalle)}</span>` : ''}</button></li>`;
    }).join('');
    lista.onclick = (e) => {
      const boton = e.target.closest('[data-resultado]');
      if (!boton) return;
      const lugar = data.resultados[Number(boton.dataset.resultado)];
      fijarUbicacion({ nombre: lugar.nombre, lat: lugar.latitud, lon: lugar.longitud });
    };
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  }
}

$('btn-buscar-lugar').addEventListener('click', buscarUbicacion);
$('buscar-lugar').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarUbicacion(); } });

$('btn-mostrar-coordenadas').addEventListener('click', () => {
  $('modo-coordenadas').classList.toggle('oculto');
});

$('btn-usar-coordenadas').addEventListener('click', () => {
  const mensaje = $('mensaje-donde');
  ocultarMensaje(mensaje);
  const latTexto = $('coord-lat').value;
  const lonTexto = $('coord-lon').value;
  const lat = Number(latTexto);
  const lon = Number(lonTexto);
  if (latTexto === '' || lonTexto === '' || Number.isNaN(lat) || Number.isNaN(lon)) {
    mostrarMensaje(mensaje, 'Escribe una latitud y una longitud.');
    return;
  }
  if (lat < -90 || lat > 90) { mostrarMensaje(mensaje, 'La latitud debe estar entre -90 y 90.'); return; }
  if (lon < -180 || lon > 180) { mostrarMensaje(mensaje, 'La longitud debe estar entre -180 y 180.'); return; }
  const nombre = $('coord-nombre').value.trim() || `Lat ${lat}, Lon ${lon}`;
  fijarUbicacion({ nombre, lat, lon });
  $('modo-coordenadas').classList.add('oculto');
});

// --- Paso 5: Detalles (resumen, titulo, IA, lugares cercanos) ---
function renderizarPasoDetalles() {
  const persona = borrador.personaId ? buscarPersonaPorId(borrador.personaId) : null;
  const hora = borrador.hora ? (() => { const [h, m] = borrador.hora.split(':').map(Number); return formatearHora12h(h, m); })() : null;
  $('resumen-cita').innerHTML = `
    <span class="icono-tipo">${ICONOS_TIPO[borrador.tipo] || ICONOS_TIPO.otro}</span>
    <p>
      <strong>${escaparHtml(etiquetaTipo(borrador.tipo))}</strong>${persona ? ` con ${escaparHtml(persona.nombre)}` : ''}<br>
      ${capitalizar(formatearFechaLarga(borrador.fecha))}${hora ? `, ${hora}` : ''}<br>
      ${escaparHtml(borrador.ubicacion.nombre)}
    </p>`;
  $('titulo-sugerencias').innerHTML = `Lugares para tu plan en ${escaparHtml(borrador.ubicacion.nombre)} <span class="texto-suave">(opcional)</span>`;

  renderizarLugares();
}

// -----------------------------------------------------------------------
// Ideas del agente (bloque "Hoy" y paso "Que" del asistente)
// -----------------------------------------------------------------------
const MOMENTOS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

function tarjetaIdea(idea, indice, textoBoton) {
  const lugar = idea.lugar
    ? `<p class="idea-lugar">📍 ${idea.lugar.enlaceMapa ? `<a href="${idea.lugar.enlaceMapa}" target="_blank" rel="noopener">${escaparHtml(idea.lugar.nombre)}</a>` : escaparHtml(idea.lugar.nombre)}</p>`
    : '';
  return `
    <article class="idea">
      <div class="idea-cabecera">
        <span class="icono-tipo">${ICONOS_TIPO[idea.tipo] || ICONOS_TIPO.otro}</span>
        <span class="idea-etiqueta">${escaparHtml(etiquetaTipo(idea.tipo))}, ${MOMENTOS[idea.momento] ? MOMENTOS[idea.momento].toLowerCase() : ''}</span>
      </div>
      <h3>${escaparHtml(idea.titulo)}</h3>
      <p>${escaparHtml(idea.descripcion)}</p>
      ${lugar}
      <button type="button" class="btn btn-terciario" data-idea="${indice}">${textoBoton}</button>
    </article>`;
}

async function pedirIdeas({ fecha, ubicacion, personaId = null }, elementos) {
  const { boton, cargando, mensaje, lista } = elementos;
  ocultarMensaje(mensaje);
  lista.innerHTML = '';
  cargando.classList.remove('oculto');
  boton.disabled = true;
  try {
    const data = await enviarJson('/api/ideas', 'POST', { fecha, ubicacion, personaId, cantidad: 3 });
    return data.ideas;
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
    return null;
  } finally {
    cargando.classList.add('oculto');
    boton.disabled = false;
  }
}

let ideasAsistente = [];
$('btn-ideas-asistente').addEventListener('click', async () => {
  const ideas = await pedirIdeas(
    { fecha: borrador.fecha, ubicacion: borrador.ubicacion, personaId: borrador.personaId },
    { boton: $('btn-ideas-asistente'), cargando: $('ideas-asistente-cargando'), mensaje: $('ideas-asistente-mensaje'), lista: $('ideas-asistente-lista') }
  );
  if (!ideas) return;
  ideasAsistente = ideas;
  claveIdeasAsistente = JSON.stringify([borrador.fecha, borrador.ubicacion, borrador.personaId]);
  $('ideas-asistente-lista').innerHTML = ideas.map((idea, i) => tarjetaIdea(idea, i, 'Elegir esta idea')).join('');
});

$('ideas-asistente-lista').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-idea]');
  if (!boton) return;
  const idea = ideasAsistente[Number(boton.dataset.idea)];
  borrador.tipo = idea.tipo;
  borrador.lugarElegido = idea.lugar;
  lugaresSugeridos = idea.lugar ? [idea.lugar] : [];
  if (!borrador.hora) borrador.hora = HORA_POR_MOMENTO[idea.momento] || null;
  $('cita-titulo').value = idea.titulo;
  irAPaso(5);
});

$('btn-ver-sugerencias').addEventListener('click', async () => {
  const mensaje = $('lugares-mensaje');
  ocultarMensaje(mensaje);
  $('lista-lugares').innerHTML = '';
  $('lugares-cargando').classList.remove('oculto');
  try {
    const { lat, lon } = borrador.ubicacion;
    const data = await llamarApi(`/api/sugerencias?lat=${lat}&lon=${lon}&tipo=${encodeURIComponent(borrador.tipo)}`);
    lugaresSugeridos = data.lugares;
    if (!lugaresSugeridos.length) {
      mostrarMensaje(mensaje, 'No encontré lugares cercanos para este tipo de plan. Puedes guardar la cita solo con la ubicación general.', 'info');
    }
    renderizarLugares();
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  } finally {
    $('lugares-cargando').classList.add('oculto');
  }
});

function renderizarLugares() {
  const elegido = borrador.lugarElegido;
  $('lista-lugares').innerHTML = lugaresSugeridos.map((lugar, i) => {
    const esElegido = elegido && elegido.lat === lugar.lat && elegido.lon === lugar.lon;
    return `
      <div class="lugar-card ${esElegido ? 'elegido' : ''}">
        <h4>${escaparHtml(lugar.nombre)}</h4>
        ${lugar.distanciaKm != null ? `<div class="distancia">${lugar.distanciaKm} km de distancia</div>` : '<div class="distancia">Sugerido por el agente</div>'}
        <div class="acciones">
          <button type="button" class="elegir" data-lugar="${i}" aria-pressed="${Boolean(esElegido)}">${esElegido ? 'Elegido' : 'Elegir'}</button>
          <a class="enlace-mapa" href="${lugar.enlaceMapa}" target="_blank" rel="noopener">Ver mapa</a>
        </div>
      </div>`;
  }).join('');
}

$('lista-lugares').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-lugar]');
  if (!boton) return;
  const lugar = lugaresSugeridos[Number(boton.dataset.lugar)];
  const yaElegido = borrador.lugarElegido && borrador.lugarElegido.lat === lugar.lat && borrador.lugarElegido.lon === lugar.lon;
  borrador.lugarElegido = yaElegido ? null : lugar;
  renderizarLugares();
});

async function guardarCita() {
  const mensaje = $('mensaje-form');
  ocultarMensaje(mensaje);
  const boton = $('btn-siguiente');
  boton.disabled = true;
  boton.textContent = 'Guardando...';
  try {
    const { cita } = await enviarJson('/api/citas', 'POST', {
      titulo: $('cita-titulo').value.trim() || null,
      tipo: borrador.tipo,
      personaId: borrador.personaId,
      fecha: borrador.fecha,
      hora: borrador.hora,
      ubicacion: borrador.ubicacion,
      lugarSugerido: borrador.lugarElegido
    });
    mostrarConfirmacion(cita);
    await Promise.all([cargarCitas(), cargarLugaresGuardados()]);
    renderizarTodo();
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
    boton.disabled = false;
    boton.textContent = 'Guardar cita';
  }
}

/** Pantalla final del asistente: la cita quedo guardada; ofrece el calendario. */
function mostrarConfirmacion(cita) {
  const persona = cita.personaId ? buscarPersonaPorId(cita.personaId) : null;
  const lugar = cita.lugarSugerido || cita.ubicacion;
  document.querySelectorAll('.paso').forEach((p) => p.classList.toggle('activo', p.dataset.paso === 'listo'));
  $('asistente-progreso-texto').textContent = 'Todo listo';
  $('asistente-titulo').textContent = 'Cita guardada';
  $('asistente-barra').style.width = '100%';
  $('btn-atras').classList.add('invisible');
  $('asistente-pista').textContent = '';
  $('btn-siguiente').disabled = false;
  $('btn-siguiente').textContent = 'Listo';
  $('btn-siguiente').classList.replace('btn-principal', 'btn-secundario');
  pasoActual = 'listo';

  $('cita-confirmada').innerHTML = `
    <div class="confirmacion">
      <span class="confirmacion-icono" aria-hidden="true">✓</span>
      <h3>${escaparHtml(cita.titulo)}</h3>
      <p>${capitalizar(formatearFechaHora(cita))}<br>${persona ? `Con ${escaparHtml(persona.nombre)} en ` : 'En '}${escaparHtml(lugar.nombre)}</p>
      <a class="btn btn-principal" href="${generarUrlGoogleCalendar(cita, persona)}" target="_blank" rel="noopener">📅 Agregar a Google Calendar</a>
      ${persona && persona.correo ? `<p class="texto-suave confirmacion-nota">Google Calendar incluirá a ${escaparHtml(persona.nombre)} como invitada.</p>` : ''}
    </div>`;
  document.querySelector('.asistente-cuerpo').scrollTop = 0;
}

// -----------------------------------------------------------------------
// Ideas (tops curados de blogs, via SerpApi en el backend)
// -----------------------------------------------------------------------
async function cargarCategoriasTops() {
  try {
    const data = await llamarApi('/api/tops-categorias');
    $('tabs-tops').innerHTML = data.categorias
      .map((c) => `<button type="button" class="chip" data-top="${c.id}" aria-pressed="false">${escaparHtml(c.etiqueta)}</button>`)
      .join('');
    if (data.categorias.length > 0) seleccionarTabTops(data.categorias[0].id);
  } catch (err) {
    mostrarMensaje($('tops-mensaje'), err.message);
  }
}

$('tabs-tops').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-top]');
  if (chip) seleccionarTabTops(chip.dataset.top);
});

function seleccionarTabTops(categoriaId) {
  $('tabs-tops').querySelectorAll('.chip').forEach((c) => {
    const activo = c.dataset.top === categoriaId;
    c.classList.toggle('activo', activo);
    c.setAttribute('aria-pressed', String(activo));
  });
  cargarTops(categoriaId);
}

async function cargarTops(categoriaId) {
  ocultarMensaje($('tops-mensaje'));
  $('tops-actualizado').classList.add('oculto');
  $('lista-tops').innerHTML = '';
  $('tops-cargando').classList.remove('oculto');

  try {
    const data = await llamarApi(`/api/tops/${categoriaId}`);
    if (!data.resultados || data.resultados.length === 0) {
      mostrarMensaje($('tops-mensaje'), 'No encontré ideas para esta categoría en este momento.', 'info');
      return;
    }
    if (data.actualizadoEn) {
      const fechaTexto = new Date(data.actualizadoEn).toLocaleDateString('es', { day: 'numeric', month: 'long' });
      $('tops-actualizado').textContent = `Actualizado el ${fechaTexto}`;
      $('tops-actualizado').classList.remove('oculto');
    }
    $('lista-tops').innerHTML = data.resultados.map((r) => `
      <article class="top-card">
        <h4>${escaparHtml(r.titulo)}</h4>
        ${r.resumen ? `<p class="top-resumen">${escaparHtml(r.resumen)}</p>` : ''}
        <div class="top-pie">
          <span class="top-fuente">${escaparHtml(r.fuente)}</span>
          <a href="${r.enlace}" target="_blank" rel="noopener">Leer más</a>
        </div>
        <button type="button" class="btn btn-terciario" data-accion="nueva-cita">Planear una cita</button>
      </article>`).join('');
  } catch (err) {
    mostrarMensaje($('tops-mensaje'), err.message);
  } finally {
    $('tops-cargando').classList.add('oculto');
  }
}

// -----------------------------------------------------------------------
// Google Calendar
// -----------------------------------------------------------------------
/**
 * Genera el rango de fechas en el formato que espera Google Calendar.
 * Sin hora: evento de "todo el dia" (fin = dia siguiente, como pide Google).
 * Con hora: bloque de 1 hora de duracion por defecto.
 */
function formatearRangoGoogleCalendar(fecha, hora) {
  const [anio, mes, dia] = fecha.split('-').map(Number);

  if (!hora) {
    const inicio = new Date(anio, mes - 1, dia);
    const fin = new Date(anio, mes - 1, dia + 1);
    const formatoDia = (d) => `${d.getFullYear()}${conCero(d.getMonth() + 1)}${conCero(d.getDate())}`;
    return `${formatoDia(inicio)}/${formatoDia(fin)}`;
  }

  const [h, m] = hora.split(':').map(Number);
  const inicio = new Date(anio, mes - 1, dia, h, m);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const formatoHora = (d) =>
    `${d.getFullYear()}${conCero(d.getMonth() + 1)}${conCero(d.getDate())}T${conCero(d.getHours())}${conCero(d.getMinutes())}00`;
  return `${formatoHora(inicio)}/${formatoHora(fin)}`;
}

/**
 * Arma la URL de "crear evento" de Google Calendar, prellenada con los
 * datos de la cita. Nunca crea el evento por si sola: solo abre el
 * formulario de Google para que la persona confirme y guarde.
 */
function generarUrlGoogleCalendar(cita, persona) {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', cita.titulo);
  url.searchParams.set('dates', formatearRangoGoogleCalendar(cita.fecha, cita.hora));
  const lugar = cita.lugarSugerido || cita.ubicacion;
  if (lugar && lugar.nombre) url.searchParams.set('location', lugar.nombre);
  if (persona && persona.correo) url.searchParams.set('add', persona.correo);
  return url.toString();
}

// -----------------------------------------------------------------------
// Sesion (login / logout con Google) y pagos
// -----------------------------------------------------------------------
/** La postal de ejemplo de la portada siempre muestra el proximo sabado. */
function prepararPostalDeMuestra() {
  const sabado = proximoSabado(hoy());
  const dias = diasHasta(aISO(sabado));
  $('muestra-dia').textContent = sabado.getDate();
  $('muestra-mes').textContent = MESES[sabado.getMonth()];
  $('muestra-cuenta').textContent = `${dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : 'Este sábado'}, 4:00 p.m.`;
}

function mostrarPuertaLogin(mensaje) {
  prepararPostalDeMuestra();
  $('contenido-app').classList.add('oculto');
  $('puerta-login').classList.remove('oculto');
  if (mensaje) mostrarMensaje($('puerta-mensaje'), mensaje, 'info');
  else ocultarMensaje($('puerta-mensaje'));
}

function mostrarApp(usuario) {
  usuarioActual = usuario;
  $('puerta-login').classList.add('oculto');
  $('contenido-app').classList.remove('oculto');
  const primerNombre = (usuario.nombre || '').split(' ')[0];
  $('saludo-titulo').textContent = primerNombre ? `Hola, ${primerNombre}` : 'Hola';

  $('cuenta').innerHTML = `
    ${usuario.avatarUrl ? `<img class="avatar" src="${usuario.avatarUrl}" alt="" referrerpolicy="no-referrer">` : ''}
    <button type="button" class="btn-apoyar" id="btn-apoyar">☕ Apoyar</button>
    <button type="button" class="btn-cerrar-sesion" id="btn-cerrar-sesion">Cerrar sesión</button>
  `;
  $('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
  $('btn-apoyar').addEventListener('click', iniciarPago);
}

async function iniciarPago() {
  const boton = $('btn-apoyar');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Un momento...';
  try {
    const data = await llamarApi('/api/crear-pago', { method: 'POST' });
    window.location.href = data.url;
  } catch (err) {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    mostrarMensaje($('mensaje-pago'), err.message);
  }
}

/**
 * Revisa si volvimos de Stripe (Checkout redirige con ?pago=exitoso o
 * ?pago=cancelado) y muestra un aviso, luego limpia la URL para que un
 * refresh no vuelva a mostrar el mismo mensaje.
 */
function revisarResultadoDePago() {
  const parametros = new URLSearchParams(window.location.search);
  const resultado = parametros.get('pago');
  if (!resultado) return;
  if (resultado === 'exitoso') {
    mostrarMensaje($('mensaje-pago'), '¡Gracias por tu apoyo! Te enviamos un correo de confirmación.', 'info');
  } else if (resultado === 'cancelado') {
    mostrarMensaje($('mensaje-pago'), 'Cancelaste el pago. No se realizó ningún cargo.', 'info');
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('pago');
  window.history.replaceState({}, '', url.toString());
}

async function cerrarSesion() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Aunque falle la llamada, igual mostramos la puerta de login.
  }
  $('cuenta').innerHTML = '';
  mostrarPuertaLogin();
}

async function iniciar() {
  revisarResultadoDePago();
  try {
    const data = await fetch('/api/usuario-actual').then((r) => r.json());
    if (data.usuario) {
      mostrarApp(data.usuario);
      await Promise.all([cargarTiposCita(), cargarRelaciones(), cargarPersonas(), cargarCitas(), cargarLugaresGuardados()]);
      renderizarTodo();
    } else if (!data.loginConfigurado) {
      mostrarPuertaLogin('El inicio de sesión con Google todavía no está configurado en este servidor.');
      document.querySelectorAll('.portada .btn-google').forEach((b) => b.classList.add('desactivado'));
    } else {
      mostrarPuertaLogin();
    }
  } catch (err) {
    mostrarPuertaLogin('No se pudo verificar tu sesión. Recarga la página.');
  }
}

iniciar();
