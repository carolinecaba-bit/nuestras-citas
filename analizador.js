// -----------------------------------------------------------------------
// Catalogo de tipos de plan (picnic, cena, cafe, etc.) y sus tags de
// OpenStreetMap correspondientes, usados para buscar sugerencias de
// lugares en lugares.js.
// -----------------------------------------------------------------------
const TIPOS_CITA = [
  {
    id: 'picnic',
    etiqueta: 'Picnic',
    tagsOverpass: ['leisure=park', 'leisure=garden', 'tourism=picnic_site']
  },
  {
    id: 'cena',
    etiqueta: 'Cena romántica',
    tagsOverpass: ['amenity=restaurant']
  },
  {
    id: 'cafe',
    etiqueta: 'Café o desayuno',
    tagsOverpass: ['amenity=cafe']
  },
  {
    id: 'caminata',
    etiqueta: 'Caminata o paseo',
    tagsOverpass: ['leisure=park', 'natural=beach', 'tourism=viewpoint']
  },
  {
    id: 'playa',
    etiqueta: 'Playa',
    tagsOverpass: ['natural=beach']
  },
  {
    id: 'mirador',
    etiqueta: 'Mirador o atardecer',
    tagsOverpass: ['tourism=viewpoint']
  },
  {
    id: 'cine',
    etiqueta: 'Cine',
    tagsOverpass: ['amenity=cinema']
  },
  {
    id: 'otro',
    etiqueta: 'Otro plan',
    tagsOverpass: ['tourism=attraction', 'leisure=park']
  }
];

function obtenerTipoPorId(id) {
  return TIPOS_CITA.find((t) => t.id === id) || null;
}

module.exports = { TIPOS_CITA, obtenerTipoPorId };
