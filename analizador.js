// -----------------------------------------------------------------------
// Analiza una frase libre como "picnic con mi novia el jueves a las 3pm"
// y extrae: tipo de plan, con quien, fecha y hora. No usa ninguna API
// externa: todo el analisis ocurre localmente con chrono-node.
// -----------------------------------------------------------------------
const chrono = require('chrono-node');

const TIPOS_CITA = [
  {
    id: 'picnic',
    etiqueta: 'Picnic',
    palabrasClave: ['picnic'],
    tagsOverpass: ['leisure=park', 'leisure=garden', 'tourism=picnic_site']
  },
  {
    id: 'cena',
    etiqueta: 'Cena romántica',
    palabrasClave: ['cena', 'cenar', 'restaurante', 'comida'],
    tagsOverpass: ['amenity=restaurant']
  },
  {
    id: 'cafe',
    etiqueta: 'Café o desayuno',
    palabrasClave: ['café', 'cafe', 'desayuno', 'brunch'],
    tagsOverpass: ['amenity=cafe']
  },
  {
    id: 'caminata',
    etiqueta: 'Caminata o paseo',
    palabrasClave: ['caminata', 'caminar', 'paseo', 'pasear', 'senderismo'],
    tagsOverpass: ['leisure=park', 'natural=beach', 'tourism=viewpoint']
  },
  {
    id: 'playa',
    etiqueta: 'Playa',
    palabrasClave: ['playa', 'costa'],
    tagsOverpass: ['natural=beach']
  },
  {
    id: 'mirador',
    etiqueta: 'Mirador o atardecer',
    palabrasClave: ['mirador', 'atardecer', 'vista'],
    tagsOverpass: ['tourism=viewpoint']
  },
  {
    id: 'cine',
    etiqueta: 'Cine',
    palabrasClave: ['cine', 'película', 'pelicula', 'film'],
    tagsOverpass: ['amenity=cinema']
  },
  {
    id: 'otro',
    etiqueta: 'Otro plan',
    palabrasClave: [],
    tagsOverpass: ['tourism=attraction', 'leisure=park']
  }
];

const PATRONES_ACOMPANANTE = [
  /\bcon\s+mi\s+(novia|novio|esposa|esposo|pareja|prometida|prometido)\b/i,
  /\bcon\s+(mis\s+amigos|mis\s+amigas|mi\s+familia|mis\s+hijos|mi\s+hija|mi\s+hijo)\b/i,
  /\bcon\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/
];

function obtenerTipoPorId(id) {
  return TIPOS_CITA.find((t) => t.id === id) || null;
}

function detectarTipo(texto) {
  const textoLower = texto.toLowerCase();
  for (const tipo of TIPOS_CITA) {
    if (tipo.palabrasClave.some((palabra) => textoLower.includes(palabra))) {
      return tipo.id;
    }
  }
  return 'otro';
}

function detectarAcompanante(texto) {
  for (const patron of PATRONES_ACOMPANANTE) {
    const coincidencia = texto.match(patron);
    if (coincidencia) {
      return coincidencia[0].replace(/^con\s+/i, '').trim();
    }
  }
  return null;
}

function generarTitulo(tipoId, conQuien) {
  const tipo = obtenerTipoPorId(tipoId);
  const etiquetaTipo = tipo ? tipo.etiqueta : 'Plan';
  return conQuien ? `${etiquetaTipo} con ${conQuien}` : etiquetaTipo;
}

/**
 * Analiza una frase libre y devuelve los campos estructurados de una cita.
 * La fecha/hora siempre se calcula en la zona horaria local del servidor.
 */
function analizarTexto(texto) {
  const tipo = detectarTipo(texto);
  const conQuien = detectarAcompanante(texto);

  const resultados = chrono.es.parse(texto, new Date());

  let fecha = null;
  let hora = null;
  let advertencia = null;

  if (resultados.length > 0) {
    const resultado = resultados[0];
    const fechaDetectada = resultado.start.date();

    const anio = fechaDetectada.getFullYear();
    const mes = String(fechaDetectada.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaDetectada.getDate()).padStart(2, '0');
    fecha = `${anio}-${mes}-${dia}`;

    if (resultado.start.isCertain('hour')) {
      const horas = String(fechaDetectada.getHours()).padStart(2, '0');
      const minutos = String(fechaDetectada.getMinutes()).padStart(2, '0');
      hora = `${horas}:${minutos}`;
    }
  } else {
    advertencia = 'No reconocí una fecha en el texto. Complétala manualmente abajo.';
  }

  return {
    titulo: generarTitulo(tipo, conQuien),
    tipo,
    conQuien,
    fecha,
    hora,
    advertencia
  };
}

module.exports = { TIPOS_CITA, obtenerTipoPorId, analizarTexto };
