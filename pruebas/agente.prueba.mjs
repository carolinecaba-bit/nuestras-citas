// Prueba del agente con un modelo simulado (sin llamar a ningun proveedor).
// Uso: node pruebas/agente.prueba.mjs
import { createRequire } from 'module';
import assert from 'assert';
import { MockLanguageModelV4 } from 'ai/test';
const require = createRequire(import.meta.url);
const ia = require('../ia.js');

const uso = { inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 20, text: 20, reasoning: 0 } };
const llamada = (id, toolName, input) => ({ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) });
const paso = (...contenido) => ({ content: contenido, finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: uso, warnings: [] });

function crearModelo(guion) {
  const vistos = [];
  let i = 0;
  const modelo = new MockLanguageModelV4({
    doGenerate: async (opciones) => { vistos.push(opciones.prompt); return guion[i++] || { content: [{ type: 'text', text: 'listo' }], finishReason: { unified: 'stop', raw: 'stop' }, usage: uso, warnings: [] }; }
  });
  return { modelo, vistos, pasosUsados: () => i };
}

const herramientas = {
  obtenerClima: async () => ({ texto: 'máxima 30°C, mínima 23°C, sin lluvia esperada', categoria: 'buena' }),
  buscarLugares: async (tipo) => tipo === 'picnic'
    ? [{ nombre: 'Jardín Botánico Nacional', lat: 18.4934, lon: -69.9555, distanciaKm: 2.1, enlaceMapa: 'https://osm/jb' }]
    : tipo === 'cafe' ? (() => { throw new Error('Overpass no respondió'); })() : []
};
const base = { actor: 'prueba', fecha: '2026-10-24', ubicacion: { nombre: 'Santo Domingo', lat: 18.48, lon: -69.93 }, cantidad: 2, herramientas };

// --- Prueba 1: el agente se equivoca, recibe los errores y corrige ---
{
  const { modelo, vistos, pasosUsados } = crearModelo([
    paso(llamada('1', 'consultarClima', { lat: 18.48, lon: -69.93, fecha: '2026-10-24' }), llamada('2', 'consultarSkill', { nombre: 'skill-que-no-existe' })),
    paso(llamada('3', 'buscarLugaresCercanos', { tipos: ['picnic', 'cafe'], lat: 18.48, lon: -69.93 })),
    // Primera entrega MAL: lugar inventado y tipos repetidos
    paso(llamada('5', 'entregarIdeas', { ideas: [
      { tipo: 'picnic', titulo: 'Picnic', descripcion: 'Día perfecto.', momento: 'manana', lugar: { nombre: 'Parque Inventado', lat: 1, lon: 1 } },
      { tipo: 'picnic', titulo: 'Otro picnic', descripcion: 'Igual.', momento: 'tarde', lugar: null }
    ] })),
    // Segunda entrega BIEN
    paso(llamada('6', 'entregarIdeas', { ideas: [
      { tipo: 'picnic', titulo: 'Picnic en el Botánico', descripcion: 'Soleado y fresco en la mañana.', momento: 'manana', lugar: { nombre: 'Jardín Botánico Nacional', lat: 18.4934, lon: -69.9555 } },
      { tipo: 'cine', titulo: 'Cine y helado', descripcion: 'Para cerrar el día.', momento: 'noche', lugar: null }
    ] }))
  ]);
  const ideas = await ia.sugerirIdeas({ ...base, modeloDePrueba: modelo });
  assert.equal(ideas.length, 2);
  assert.equal(ideas[0].lugar.enlaceMapa, 'https://osm/jb', 'el lugar viene de la herramienta, con su enlace');
  assert.equal(pasosUsados(), 4, 'se detiene apenas entregarIdeas acepta');
  const textoVisto = JSON.stringify(vistos);
  assert.ok(textoVisto.includes('No existe la skill'), 'el agente vio el error de la skill');
  assert.ok(textoVisto.includes('Overpass no respondió'), 'el agente vio el error de la herramienta de lugares');
  assert.ok(textoVisto.includes('Parque Inventado') && textoVisto.includes('no salió de buscarLugaresCercanos'), 'el agente vio el error de negocio');
  assert.ok(textoVisto.includes('tipos de plan repetidos'));
  console.log('OK 1: errores devueltos al agente y corregidos en la segunda entrega');
}

// --- Prueba 2: datos con forma invalida (tipo inexistente) -> el SDK devuelve el error al agente ---
{
  const { modelo, vistos } = crearModelo([
    paso(llamada('1', 'buscarLugaresCercanos', { tipos: ['karaoke'], lat: 18.48, lon: -69.93 })),
    paso(llamada('2', 'entregarIdeas', { ideas: [
      { tipo: 'cena', titulo: 'Cena', descripcion: 'Rica.', momento: 'noche', lugar: null },
      { tipo: 'cine', titulo: 'Cine', descripcion: 'Película.', momento: 'noche', lugar: null }
    ] }))
  ]);
  const ideas = await ia.sugerirIdeas({ ...base, modeloDePrueba: modelo });
  assert.equal(ideas.length, 2);
  assert.ok(JSON.stringify(vistos).includes('karaoke'), 'el agente recibió el error de validación del tipo');
  console.log('OK 2: entrada inválida de una herramienta devuelta al agente');
}

// --- Prueba 3: el agente termina sin entregar -> el servidor le recuerda ---
{
  const { modelo, vistos } = crearModelo([
    { content: [{ type: 'text', text: 'Aquí tienes unas ideas: ...' }], finishReason: { unified: 'stop', raw: 'stop' }, usage: uso, warnings: [] },
    paso(llamada('1', 'entregarIdeas', { ideas: [
      { tipo: 'cafe', titulo: 'Café', descripcion: 'Tranquilo.', momento: 'manana', lugar: null },
      { tipo: 'cena', titulo: 'Cena', descripcion: 'Especial.', momento: 'noche', lugar: null }
    ] }))
  ]);
  const ideas = await ia.sugerirIdeas({ ...base, modeloDePrueba: modelo });
  assert.equal(ideas.length, 2);
  assert.ok(JSON.stringify(vistos).includes('Aún no entregaste las ideas'));
  console.log('OK 3: recordatorio cuando el agente no entrega');
}

// --- Prueba 4: tormenta -> la regla rechaza planes al aire libre ---
{
  const tormenta = { ...herramientas, obtenerClima: async () => ({ texto: 'tormenta eléctrica', categoria: 'alerta' }) };
  const { modelo, vistos } = crearModelo([
    paso(llamada('1', 'consultarClima', { lat: 18.48, lon: -69.93, fecha: '2026-10-24' })),
    paso(llamada('2', 'entregarIdeas', { ideas: [
      { tipo: 'playa', titulo: 'Playa', descripcion: 'Sol.', momento: 'tarde', lugar: null },
      { tipo: 'cine', titulo: 'Cine', descripcion: 'Película.', momento: 'noche', lugar: null }
    ] })),
    paso(llamada('3', 'entregarIdeas', { ideas: [
      { tipo: 'cafe', titulo: 'Café calientito', descripcion: 'Bajo techo mientras llueve.', momento: 'tarde', lugar: null },
      { tipo: 'cine', titulo: 'Cine', descripcion: 'Película.', momento: 'noche', lugar: null }
    ] }))
  ]);
  const ideas = await ia.sugerirIdeas({ ...base, herramientas: tormenta, modeloDePrueba: modelo });
  assert.deepEqual(ideas.map((i) => i.tipo), ['cafe', 'cine']);
  assert.ok(JSON.stringify(vistos).includes('alerta de tormenta'));
  console.log('OK 4: regla de clima obliga a corregir un plan al aire libre');
}
// --- Prueba 5: agente de regalos corrige poca variedad ---
{
  const { modelo, vistos } = crearModelo([
    paso(llamada('1', 'consultarSkill', { nombre: 'regalos-y-detalles' })),
    paso(llamada('2', 'entregarRegalos', { ideas: [
      { categoria: 'flores', titulo: 'Rosas', descripcion: 'Clásico.', presupuesto: 'medio' },
      { categoria: 'flores', titulo: 'Girasoles', descripcion: 'Alegres.', presupuesto: 'medio' },
      { categoria: 'flores', titulo: 'Tulipanes', descripcion: 'Elegantes.', presupuesto: 'medio' }
    ] })),
    paso(llamada('3', 'entregarRegalos', { ideas: [
      { categoria: 'flores', titulo: 'Ramo de girasoles', descripcion: 'Le alegran el día.', presupuesto: 'medio' },
      { categoria: 'dulce', titulo: 'Bizcocho de su sabor favorito', descripcion: 'Para celebrar su cumpleaños.', presupuesto: 'medio' },
      { categoria: 'carta', titulo: 'Carta escrita a mano', descripcion: 'Lo más personal.', presupuesto: 'bajo' }
    ] }))
  ]);
  const regalos = await ia.sugerirRegalos({ actor: 'prueba', fecha: '2026-10-24', etiquetaTipo: 'Cena romántica', ocasion: 'Cumpleaños', modeloDePrueba: modelo });
  assert.equal(regalos.length, 3);
  const visto = JSON.stringify(vistos);
  assert.ok(visto.includes('Bizcocho dominicano') || visto.includes('bizcocho dominicano'), 'el agente leyó la skill de regalos');
  assert.ok(visto.includes('Varía las categorías') && visto.includes('dos presupuestos'), 'el agente recibió los errores de variedad');
  console.log('OK 5: agente de regalos lee su skill y corrige poca variedad');
}
// --- Prueba 6: el agente de regalos recibe la edad y el sexo de la persona ---
{
  const { modelo, vistos } = crearModelo([
    paso(llamada('1', 'entregarRegalos', { ideas: [
      { categoria: 'experiencia', titulo: 'Clase de cocina juntos', descripcion: 'Le encanta cocinar.', presupuesto: 'alto' },
      { categoria: 'comida', titulo: 'Su plato favorito', descripcion: 'Hecho en casa.', presupuesto: 'bajo' },
      { categoria: 'objeto', titulo: 'Foto familiar enmarcada', descripcion: 'Un recuerdo para su escritorio.', presupuesto: 'medio' }
    ] }))
  ]);
  const papa = { nombre: 'Rafael', relacion: 'Padre', cumpleanos: '1965-05-10', sexo: 'masculino', notas: 'Le encanta cocinar' };
  await ia.sugerirRegalos({ actor: 'prueba', fecha: '2026-10-24', etiquetaTipo: 'Almuerzo', persona: papa, modeloDePrueba: modelo });
  const visto = JSON.stringify(vistos);
  assert.ok(visto.includes('edad: 61 años') && visto.includes('sexo: masculino'), 'el prompt incluye edad y sexo');
  assert.ok(visto.includes('nunca para caer en estereotipos'), 'el prompt advierte sobre estereotipos');
  console.log('OK 6: el agente de regalos recibe edad y sexo, con la regla contra estereotipos');
}
console.log('TODAS LAS PRUEBAS DEL AGENTE PASARON');
