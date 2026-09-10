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
// Selector de hora amigable: opciones cada 30 minutos, agrupadas y en
// formato de 12 horas, pero el valor guardado sigue siendo "HH:MM" (24h)
// para no cambiar nada del backend.
// -----------------------------------------------------------------------
const GRUPOS_HORA = [
  { etiqueta: 'Mañana', desdeMin: 6 * 60, hastaMin: 11 * 60 + 30 },
  { etiqueta: 'Tarde', desdeMin: 12 * 60, hastaMin: 17 * 60 + 30 },
  { etiqueta: 'Noche', desdeMin: 18 * 60, hastaMin: 23 * 60 + 30 },
  { etiqueta: 'Madrugada', desdeMin: 0, hastaMin: 5 * 60 + 30 }
];

function formatearHora12h(horas, minutos) {
  const periodo = horas < 12 ? 'a.m.' : 'p.m.';
  let horas12 = horas % 12;
  if (horas12 === 0) horas12 = 12;
  return `${horas12}:${String(minutos).padStart(2, '0')} ${periodo}`;
}

function poblarSelectHora(select) {
  const partes = ['<option value="">Sin hora específica</option>'];
  GRUPOS_HORA.forEach((grupo) => {
    let opciones = '';
    for (let min = grupo.desdeMin; min <= grupo.hastaMin; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const valor = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      opciones += `<option value="${valor}">${formatearHora12h(h, m)}</option>`;
    }
    partes.push(`<optgroup label="${grupo.etiqueta}">${opciones}</optgroup>`);
  });
  select.innerHTML = partes.join('');
}

// -----------------------------------------------------------------------
// Estado
// -----------------------------------------------------------------------
let tiposCita = [];
let personas = [];
let relacionesSugeridas = [];
let editandoPersonaId = null;
let modoUbicacionActivo = 'buscar';
let ubicacionSeleccionada = null; // { nombre, lat, lon }
let lugaresSugeridos = [];
let lugarElegido = null; // { nombre, lat, lon, enlaceMapa }

// -----------------------------------------------------------------------
// Referencias del DOM
// -----------------------------------------------------------------------
const elCuenta = document.getElementById('cuenta');
const elPuertaLogin = document.getElementById('puerta-login');
const elPuertaMensaje = document.getElementById('puerta-mensaje');
const elContenidoApp = document.getElementById('contenido-app');
const elMensajePago = document.getElementById('mensaje-pago');

// Formulario de personas
const formPersona = document.getElementById('form-persona');
const inputPersonaNombre = document.getElementById('persona-nombre');
const selectPersonaRelacion = document.getElementById('persona-relacion');
const inputPersonaRelacionOtra = document.getElementById('persona-relacion-otra');
const inputPersonaCumpleanos = document.getElementById('persona-cumpleanos');
const inputPersonaComida = document.getElementById('persona-comida');
const textareaPersonaNotas = document.getElementById('persona-notas');
const mensajePersona = document.getElementById('mensaje-persona');
const btnGuardarPersona = document.getElementById('btn-guardar-persona');
const btnCancelarEdicionPersona = document.getElementById('btn-cancelar-edicion-persona');
const cargandoPersonas = document.getElementById('cargando-personas');
const listaPersonasEl = document.getElementById('lista-personas');
const sinPersonas = document.getElementById('sin-personas');

// Formulario de citas
const formCita = document.getElementById('form-cita');
const inputTitulo = document.getElementById('cita-titulo');
const selectTipo = document.getElementById('cita-tipo');
const selectPersona = document.getElementById('cita-persona');
const btnIrAPersonas = document.getElementById('btn-ir-a-personas');
const inputFecha = document.getElementById('cita-fecha');
const selectHora = document.getElementById('cita-hora');

const tabsUbicacion = document.querySelectorAll('.tab-ubicacion');
const modoBuscar = document.getElementById('modo-buscar');
const modoCoordenadas = document.getElementById('modo-coordenadas');
const inputBuscarLugar = document.getElementById('buscar-lugar');
const btnBuscarLugar = document.getElementById('btn-buscar-lugar');
const listaResultadosUbicacion = document.getElementById('lista-resultados-ubicacion');
const inputCoordLat = document.getElementById('coord-lat');
const inputCoordLon = document.getElementById('coord-lon');
const inputCoordNombre = document.getElementById('coord-nombre');
const btnUsarCoordenadas = document.getElementById('btn-usar-coordenadas');
const elUbicacionSeleccionada = document.getElementById('ubicacion-seleccionada');

const seccionSugerencias = document.getElementById('seccion-sugerencias');
const tituloSugerencias = document.getElementById('titulo-sugerencias');
const btnVerSugerencias = document.getElementById('btn-ver-sugerencias');
const lugaresCargando = document.getElementById('lugares-cargando');
const lugaresMensaje = document.getElementById('lugares-mensaje');
const listaLugares = document.getElementById('lista-lugares');

const elMensajeForm = document.getElementById('mensaje-form');

const elMensajeLista = document.getElementById('mensaje-lista');
const elCargandoLista = document.getElementById('cargando-lista');
const elLineaTiempo = document.getElementById('linea-tiempo');
const elSinCitas = document.getElementById('sin-citas');

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
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
  div.textContent = texto;
  return div.innerHTML;
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

// -----------------------------------------------------------------------
// Cargar catalogo de tipos de plan
// -----------------------------------------------------------------------
async function cargarTiposCita() {
  try {
    const data = await llamarApi('/api/tipos-cita');
    tiposCita = data.tipos;
    selectTipo.innerHTML = tiposCita.map((t) => `<option value="${t.id}">${escaparHtml(t.etiqueta)}</option>`).join('');
  } catch (err) {
    selectTipo.innerHTML = '<option value="otro">Otro plan</option>';
  }
}

// -----------------------------------------------------------------------
// Personas (perfiles): catalogo de relaciones + CRUD
// -----------------------------------------------------------------------
async function cargarRelaciones() {
  try {
    const data = await llamarApi('/api/relaciones');
    relacionesSugeridas = data.relaciones;
  } catch (err) {
    relacionesSugeridas = [];
  }
  selectPersonaRelacion.innerHTML =
    relacionesSugeridas.map((r) => `<option value="${escaparHtml(r)}">${escaparHtml(r)}</option>`).join('') +
    '<option value="__otra__">Otra…</option>';
}

selectPersonaRelacion.addEventListener('change', () => {
  const esOtra = selectPersonaRelacion.value === '__otra__';
  inputPersonaRelacionOtra.classList.toggle('oculto', !esOtra);
  if (esOtra) inputPersonaRelacionOtra.focus();
});

function poblarSelectPersonaCita() {
  const valorPrevio = selectPersona.value;
  selectPersona.innerHTML =
    '<option value="">Nadie en particular</option>' +
    personas.map((p) => `<option value="${p.id}">${escaparHtml(p.nombre)} (${escaparHtml(p.relacion)})</option>`).join('');
  if (personas.some((p) => p.id === valorPrevio)) {
    selectPersona.value = valorPrevio;
  }
}

function formatearCumpleanos(cumpleanos) {
  if (!cumpleanos) return null;
  const fecha = new Date(`${cumpleanos}T00:00:00`);
  return fecha.toLocaleDateString('es', { day: 'numeric', month: 'long' });
}

function renderizarListaPersonas() {
  listaPersonasEl.innerHTML = '';
  sinPersonas.classList.toggle('oculto', personas.length > 0);

  personas.forEach((persona) => {
    const card = document.createElement('div');
    card.className = 'persona-card';
    const cumpleanosTexto = formatearCumpleanos(persona.cumpleanos);
    card.innerHTML = `
      <div class="persona-header">
        <h4>${escaparHtml(persona.nombre)}</h4>
        <span class="persona-relacion">${escaparHtml(persona.relacion)}</span>
      </div>
      ${cumpleanosTexto ? `<div class="persona-dato">🎂 ${cumpleanosTexto}</div>` : ''}
      ${persona.comidaFavorita ? `<div class="persona-dato">🍽️ ${escaparHtml(persona.comidaFavorita)}</div>` : ''}
      ${persona.notas ? `<div class="persona-dato persona-notas">${escaparHtml(persona.notas)}</div>` : ''}
      <div class="persona-acciones">
        <button type="button" class="btn-terciario boton-editar">Editar</button>
        <button type="button" class="btn-eliminar boton-eliminar">Eliminar</button>
      </div>
    `;
    card.querySelector('.boton-editar').addEventListener('click', () => iniciarEdicionPersona(persona));
    card.querySelector('.boton-eliminar').addEventListener('click', () => eliminarPersona(persona.id));
    listaPersonasEl.appendChild(card);
  });
}

async function cargarPersonas() {
  cargandoPersonas.classList.remove('oculto');
  try {
    const data = await llamarApi('/api/personas');
    personas = data.personas;
    cargandoPersonas.classList.add('oculto');
    renderizarListaPersonas();
    poblarSelectPersonaCita();
  } catch (err) {
    cargandoPersonas.classList.add('oculto');
  }
}

function iniciarEdicionPersona(persona) {
  editandoPersonaId = persona.id;
  inputPersonaNombre.value = persona.nombre;

  if (relacionesSugeridas.includes(persona.relacion)) {
    selectPersonaRelacion.value = persona.relacion;
    inputPersonaRelacionOtra.classList.add('oculto');
    inputPersonaRelacionOtra.value = '';
  } else {
    selectPersonaRelacion.value = '__otra__';
    inputPersonaRelacionOtra.classList.remove('oculto');
    inputPersonaRelacionOtra.value = persona.relacion;
  }

  inputPersonaCumpleanos.value = persona.cumpleanos || '';
  inputPersonaComida.value = persona.comidaFavorita || '';
  textareaPersonaNotas.value = persona.notas || '';

  btnGuardarPersona.textContent = 'Guardar cambios';
  btnCancelarEdicionPersona.classList.remove('oculto');
  formPersona.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

btnCancelarEdicionPersona.addEventListener('click', () => {
  editandoPersonaId = null;
  formPersona.reset();
  inputPersonaRelacionOtra.classList.add('oculto');
  btnGuardarPersona.textContent = 'Guardar persona';
  btnCancelarEdicionPersona.classList.add('oculto');
  ocultarMensaje(mensajePersona);
});

formPersona.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarMensaje(mensajePersona);

  const nombre = inputPersonaNombre.value.trim();
  const relacion = selectPersonaRelacion.value === '__otra__'
    ? inputPersonaRelacionOtra.value.trim()
    : selectPersonaRelacion.value;
  const cumpleanos = inputPersonaCumpleanos.value || null;
  const comidaFavorita = inputPersonaComida.value.trim() || null;
  const notas = textareaPersonaNotas.value.trim() || null;

  if (nombre.length < 2) { mostrarMensaje(mensajePersona, 'El nombre debe tener al menos 2 caracteres.'); return; }
  if (!relacion || relacion.length < 2) { mostrarMensaje(mensajePersona, 'Indica la relación (o escribe la tuya).'); return; }

  const payload = { nombre, relacion, cumpleanos, comidaFavorita, notas };

  try {
    if (editandoPersonaId) {
      await llamarApi(`/api/personas/${editandoPersonaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await llamarApi('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    editandoPersonaId = null;
    formPersona.reset();
    inputPersonaRelacionOtra.classList.add('oculto');
    btnGuardarPersona.textContent = 'Guardar persona';
    btnCancelarEdicionPersona.classList.add('oculto');

    await cargarPersonas();
    cargarCitas(); // por si el cambio afecta como se ven citas ya listadas
  } catch (err) {
    mostrarMensaje(mensajePersona, err.message);
  }
});

async function eliminarPersona(id) {
  ocultarMensaje(mensajePersona);
  try {
    await llamarApi(`/api/personas/${id}`, { method: 'DELETE' });
    await cargarPersonas();
    cargarCitas();
  } catch (err) {
    mostrarMensaje(mensajePersona, err.message);
  }
}

btnIrAPersonas.addEventListener('click', () => {
  formPersona.scrollIntoView({ behavior: 'smooth', block: 'start' });
  inputPersonaNombre.focus();
});

// -----------------------------------------------------------------------
// Tabs de ubicacion
// -----------------------------------------------------------------------
tabsUbicacion.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabsUbicacion.forEach((t) => t.classList.remove('activo'));
    tab.classList.add('activo');
    modoUbicacionActivo = tab.dataset.modo;
    modoBuscar.classList.toggle('activo', modoUbicacionActivo === 'buscar');
    modoCoordenadas.classList.toggle('activo', modoUbicacionActivo === 'coordenadas');
  });
});

function fijarUbicacion(ubicacion) {
  ubicacionSeleccionada = ubicacion;
  elUbicacionSeleccionada.textContent = `Ubicación: ${ubicacion.nombre}`;
  elUbicacionSeleccionada.classList.remove('oculto');
  lugaresSugeridos = [];
  lugarElegido = null;
  listaLugares.innerHTML = '';
  ocultarMensaje(lugaresMensaje);
  seccionSugerencias.classList.remove('oculto');
  tituloSugerencias.textContent = `Lugares para tu plan en ${ubicacion.nombre}`;
}

btnBuscarLugar.addEventListener('click', async () => {
  ocultarMensaje(elMensajeForm);
  listaResultadosUbicacion.innerHTML = '';
  const consulta = inputBuscarLugar.value.trim();
  if (consulta.length < 2) {
    mostrarMensaje(elMensajeForm, 'Escribe al menos 2 caracteres para buscar una ubicación.');
    return;
  }
  try {
    const data = await llamarApi(`/api/geocode?q=${encodeURIComponent(consulta)}`);
    data.resultados.forEach((lugar) => {
      const item = document.createElement('li');
      const region = lugar.region ? `${lugar.region}, ` : '';
      item.textContent = `${lugar.nombre} — ${region}${lugar.pais || ''}`;
      item.addEventListener('click', () => {
        fijarUbicacion({ nombre: lugar.nombre, lat: lugar.latitud, lon: lugar.longitud });
        listaResultadosUbicacion.innerHTML = '';
      });
      listaResultadosUbicacion.appendChild(item);
    });
  } catch (err) {
    mostrarMensaje(elMensajeForm, err.message);
  }
});

btnUsarCoordenadas.addEventListener('click', () => {
  ocultarMensaje(elMensajeForm);
  const lat = Number(inputCoordLat.value);
  const lon = Number(inputCoordLon.value);
  const nombre = inputCoordNombre.value.trim() || `Lat ${lat}, Lon ${lon}`;

  if (inputCoordLat.value === '' || inputCoordLon.value === '' || Number.isNaN(lat) || Number.isNaN(lon)) {
    mostrarMensaje(elMensajeForm, 'Ingresa latitud y longitud válidas.');
    return;
  }
  if (lat < -90 || lat > 90) { mostrarMensaje(elMensajeForm, 'La latitud debe estar entre -90 y 90.'); return; }
  if (lon < -180 || lon > 180) { mostrarMensaje(elMensajeForm, 'La longitud debe estar entre -180 y 180.'); return; }

  fijarUbicacion({ nombre, lat, lon });
});

// -----------------------------------------------------------------------
// Sugerencias de lugares
// -----------------------------------------------------------------------
btnVerSugerencias.addEventListener('click', async () => {
  ocultarMensaje(lugaresMensaje);
  if (!ubicacionSeleccionada) {
    mostrarMensaje(lugaresMensaje, 'Primero elige una ubicación general arriba.');
    return;
  }

  listaLugares.innerHTML = '';
  lugaresCargando.classList.remove('oculto');

  try {
    const { lat, lon } = ubicacionSeleccionada;
    const tipo = selectTipo.value;
    const data = await llamarApi(`/api/sugerencias?lat=${lat}&lon=${lon}&tipo=${encodeURIComponent(tipo)}`);
    lugaresCargando.classList.add('oculto');

    lugaresSugeridos = data.lugares;
    if (lugaresSugeridos.length === 0) {
      mostrarMensaje(lugaresMensaje, 'No encontré lugares cercanos para este tipo de plan. Puedes usar solo la ubicación general.', 'info');
      return;
    }
    renderizarLugares();
  } catch (err) {
    lugaresCargando.classList.add('oculto');
    mostrarMensaje(lugaresMensaje, err.message);
  }
});

function renderizarLugares() {
  listaLugares.innerHTML = '';
  lugaresSugeridos.forEach((lugar) => {
    const card = document.createElement('div');
    card.className = 'lugar-card';
    if (lugarElegido && lugarElegido.lat === lugar.lat && lugarElegido.lon === lugar.lon) {
      card.classList.add('elegido');
    }
    card.innerHTML = `
      <h4>${escaparHtml(lugar.nombre)}</h4>
      <div class="distancia">${lugar.distanciaKm} km de distancia</div>
      <div class="acciones">
        <button type="button" class="elegir">${lugarElegido && lugarElegido.lat === lugar.lat && lugarElegido.lon === lugar.lon ? 'Elegido' : 'Elegir'}</button>
        <a class="enlace-mapa" href="${lugar.enlaceMapa}" target="_blank" rel="noopener">Ver mapa</a>
      </div>
    `;
    card.querySelector('.elegir').addEventListener('click', () => {
      lugarElegido = (lugarElegido && lugarElegido.lat === lugar.lat && lugarElegido.lon === lugar.lon) ? null : lugar;
      renderizarLugares();
    });
    listaLugares.appendChild(card);
  });
}

// -----------------------------------------------------------------------
// Guardar cita
// -----------------------------------------------------------------------
formCita.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarMensaje(elMensajeForm);

  const titulo = inputTitulo.value.trim();
  const tipo = selectTipo.value;
  const personaId = selectPersona.value || null;
  const fecha = inputFecha.value;
  const hora = selectHora.value || null;

  if (!fecha) { mostrarMensaje(elMensajeForm, 'Debes elegir una fecha para el plan.'); return; }
  if (!ubicacionSeleccionada) { mostrarMensaje(elMensajeForm, 'Elige una ubicación general para el plan.'); return; }

  try {
    await llamarApi('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: titulo || null, tipo, personaId, fecha, hora,
        ubicacion: ubicacionSeleccionada,
        lugarSugerido: lugarElegido
      })
    });

    formCita.reset();
    poblarSelectHora(selectHora);
    poblarSelectPersonaCita();
    ubicacionSeleccionada = null;
    lugaresSugeridos = [];
    lugarElegido = null;
    elUbicacionSeleccionada.classList.add('oculto');
    seccionSugerencias.classList.add('oculto');
    listaResultadosUbicacion.innerHTML = '';
    listaLugares.innerHTML = '';

    cargarCitas();
  } catch (err) {
    mostrarMensaje(elMensajeForm, err.message);
  }
});

// -----------------------------------------------------------------------
// Listar y renderizar citas (linea de tiempo)
// -----------------------------------------------------------------------
async function cargarCitas() {
  ocultarMensaje(elMensajeLista);
  elCargandoLista.classList.remove('oculto');
  elLineaTiempo.innerHTML = '';
  elSinCitas.classList.add('oculto');

  try {
    const data = await llamarApi('/api/citas');
    elCargandoLista.classList.add('oculto');

    if (!data.citas || data.citas.length === 0) {
      elSinCitas.classList.remove('oculto');
      return;
    }
    data.citas.forEach((cita) => renderizarCita(cita));
  } catch (err) {
    elCargandoLista.classList.add('oculto');
    mostrarMensaje(elMensajeLista, err.message);
  }
}

function formatearFechaHora(cita) {
  const fecha = new Date(`${cita.fecha}T00:00:00`);
  const fechaTexto = fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!cita.hora) return fechaTexto;
  const [h, m] = cita.hora.split(':').map(Number);
  return `${fechaTexto} · ${formatearHora12h(h, m)}`;
}

function buscarPersonaPorId(id) {
  return personas.find((p) => p.id === id) || null;
}

/** Compara solo mes y dia (ignora el año) entre el cumpleanos y la fecha de la cita. */
function esCumpleanos(persona, fecha) {
  if (!persona || !persona.cumpleanos) return false;
  return persona.cumpleanos.slice(5) === fecha.slice(5);
}

function renderizarCita(cita) {
  const card = document.createElement('article');
  card.className = 'cita-card';
  card.dataset.id = cita.id;

  const lugar = cita.lugarSugerido || cita.ubicacion;
  const enlaceLugar = cita.lugarSugerido && cita.lugarSugerido.enlaceMapa
    ? `<a href="${cita.lugarSugerido.enlaceMapa}" target="_blank" rel="noopener">${escaparHtml(lugar.nombre)}</a>`
    : escaparHtml(lugar.nombre);

  const persona = cita.personaId ? buscarPersonaPorId(cita.personaId) : null;
  const conQuienTexto = cita.personaId
    ? ` · con ${persona ? escaparHtml(persona.nombre) : 'alguien (perfil eliminado)'}`
    : '';
  const esSuCumpleanos = esCumpleanos(persona, cita.fecha);

  card.innerHTML = `
    <div class="cita-header">
      <div class="cita-titulo-linea">
        <span class="icono-tipo">${ICONOS_TIPO[cita.tipo] || ICONOS_TIPO.otro}</span>
        <h3>${escaparHtml(cita.titulo)}</h3>
      </div>
      <button class="btn-eliminar" data-id="${cita.id}">Eliminar</button>
    </div>
    <div class="cita-meta">${formatearFechaHora(cita)}${conQuienTexto}</div>
    ${esSuCumpleanos ? `<div class="cita-cumpleanos">🎂 ¡Es el cumpleaños de ${escaparHtml(persona.nombre)}!</div>` : ''}
    <div class="cita-lugar">${enlaceLugar}</div>
    <div class="cita-clima" data-clima-id="${cita.id}">Cargando clima...</div>
  `;

  elLineaTiempo.appendChild(card);
  card.querySelector('.btn-eliminar').addEventListener('click', () => eliminarCita(cita.id));
  cargarClimaDeCita(cita.id, card);
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
      <span class="texto-clima">${escaparHtml(err.message)}<br><button class="reintentar">Reintentar</button></span>
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
  const precipitacion = datos.precipitacion > 0 ? ` · ${datos.precipitacion} mm de lluvia` : '';
  const consejo = estado === 'pronostico' ? generarConsejo(datos, categoria) : '';

  el.innerHTML = `
    ${ICONOS_CLIMA[categoria]}
    <span class="texto-clima">
      <span class="etiqueta">${etiqueta}</span>
      ${describirClima(datos.codigoClima)} · Máx ${Math.round(datos.temperaturaMax)}° / Mín ${Math.round(datos.temperaturaMin)}°${precipitacion}
      ${consejo ? `<span class="consejo">${escaparHtml(consejo)}</span>` : ''}
    </span>
  `;
}

async function eliminarCita(id) {
  ocultarMensaje(elMensajeLista);
  try {
    await llamarApi(`/api/citas/${id}`, { method: 'DELETE' });
    cargarCitas();
  } catch (err) {
    mostrarMensaje(elMensajeLista, err.message);
  }
}

// -----------------------------------------------------------------------
// Sesion (login / logout con Google)
// -----------------------------------------------------------------------
function mostrarPuertaLogin(mensaje) {
  elContenidoApp.classList.add('oculto');
  elPuertaLogin.classList.remove('oculto');
  if (mensaje) {
    mostrarMensaje(elPuertaMensaje, mensaje, 'info');
  } else {
    ocultarMensaje(elPuertaMensaje);
  }
}

function mostrarApp(usuario) {
  elPuertaLogin.classList.add('oculto');
  elContenidoApp.classList.remove('oculto');

  elCuenta.innerHTML = `
    ${usuario.avatarUrl ? `<img class="avatar" src="${usuario.avatarUrl}" alt="" referrerpolicy="no-referrer">` : ''}
    <span>${escaparHtml(usuario.nombre)}</span>
    <button type="button" class="btn-apoyar" id="btn-apoyar">☕ Apoyar</button>
    <button type="button" class="btn-cerrar-sesion" id="btn-cerrar-sesion">Cerrar sesión</button>
  `;
  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
  document.getElementById('btn-apoyar').addEventListener('click', iniciarPago);
}

async function iniciarPago() {
  const boton = document.getElementById('btn-apoyar');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Un momento...';

  try {
    const data = await llamarApi('/api/crear-pago', { method: 'POST' });
    window.location.href = data.url;
  } catch (err) {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    mostrarMensaje(elMensajePago, err.message);
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
    mostrarMensaje(elMensajePago, '¡Gracias por tu apoyo! Te enviamos un correo de confirmación.', 'info');
  } else if (resultado === 'cancelado') {
    mostrarMensaje(elMensajePago, 'Cancelaste el pago. No se realizó ningún cargo.', 'info');
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
  elCuenta.innerHTML = '';
  mostrarPuertaLogin();
}

async function iniciar() {
  revisarResultadoDePago();
  poblarSelectHora(selectHora);

  try {
    const data = await fetch('/api/usuario-actual').then((r) => r.json());
    if (data.usuario) {
      mostrarApp(data.usuario);
      await Promise.all([cargarTiposCita(), cargarRelaciones(), cargarPersonas()]);
      cargarCitas();
    } else if (!data.loginConfigurado) {
      mostrarPuertaLogin('El inicio de sesión con Google todavía no está configurado en este servidor.');
      document.getElementById('btn-login-puerta').style.pointerEvents = 'none';
      document.getElementById('btn-login-puerta').style.opacity = '0.5';
    } else {
      mostrarPuertaLogin();
    }
  } catch (err) {
    mostrarPuertaLogin('No se pudo verificar tu sesión. Recarga la página.');
  }
}

// -----------------------------------------------------------------------
// Inicio
// -----------------------------------------------------------------------
iniciar();
