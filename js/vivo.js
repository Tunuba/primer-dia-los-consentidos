// La oficina en vivo de la simulacion con agentes. Es el mismo edificio y el mismo motor de la presentacion,
// pero lo mueven los eventos de los diez agentes que trabajan en GLPI (simulacion/agentes).
//
// Dentro del panel de la simulacion (simulacion/visor) los eventos llegan por postMessage desde visor.js:
//   { tipo: 'evento', ev, animar }    un evento de eventos.jsonl
//   { tipo: 'estado', tk, gestion, hora }   la foto de tickets, problemas y cambios, cada segundo
//   { tipo: 'reinicio' }              empezo otra corrida
// Abierto solo (vivo.html?demo) repite la corrida de ejemplo de demo/corrida.js.
//
// Clic en un departamento y la camara se acerca. Otro clic o Escape vuelve a toda la oficina. M prende el sonido.
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// la gente de la simulacion, su puesto, su computadora en la red y como se ve
// ─────────────────────────────────────────────────────────────────────────────
const AGENTES = {
  comercial:    { base: 'andrea',   x: P.vendedor[0], piso: 'pb', nodo: 'ventas',   nombre: 'ANDREA',        color: '#d8443c' },
  finanzas:     { base: 'luis',     x: P.finanzas[0], piso: 'p2', nodo: 'finanzas', nombre: 'LUIS',           color: '#f07aa0' },
  operaciones:  { base: 'marta',    x: P.despacho[0], piso: 'pb', nodo: 'despacho', nombre: 'MARTA',       color: '#f08a30' },
  sucursal1:    { base: 'carlos',   x: P.suc1[0],     piso: 'pb', nodo: 'suc1',     nombre: 'CARLOS',       color: '#3aa060' },
  sucursal2:    { base: 'sofia',    x: P.suc2[0],     piso: 'pb', nodo: 'suc2',     nombre: 'SOFÍA',        color: '#8a5ad0' },
  soporte1:     { base: 'tec1',     x: P.tec1[0],     piso: 'p1', nodo: 'tec1',     nombre: 'SOPORTE 1',          color: TI },
  soporte2:     { base: 'tec2',     x: P.tec2[0],     piso: 'p1', nodo: 'tec2',     nombre: 'SOPORTE 2', color: TI },
  aplicaciones: { base: 'sistemas', x: P.sistemas[0], piso: 'p2', nodo: 'sistemas', nombre: 'APLICACIONES',             color: '#2a7ad8' },
  datos:        { base: 'datos',    x: P.coord[0],    piso: 'p3', nodo: 'coord',    nombre: 'DATOS',      color: '#8a5ad0' },
  responsable:  { base: 'guia',     x: 826,           piso: 'p3', nodo: 'kpi',      nombre: 'RESPONSABLE',        color: TI },
};
const CLIENTES = ['comercial', 'finanzas', 'operaciones', 'sucursal1', 'sucursal2'];
const TECNICOS = ['soporte1', 'soporte2', 'aplicaciones', 'datos', 'responsable'];
const SILLA_CAB = { soporte1: P.cab[0][0], soporte2: P.cab[1][0], aplicaciones: P.cab[2][0], datos: P.cab[3][0], responsable: 826 };
const GRUPO = [['Mesa', 'soporte1'], ['Infraestructura', 'soporte2'], ['Sistemas', 'aplicaciones'], ['Coordinaci', 'datos']];
const ESTADO_COLOR = { 1: '#7fb2e5', 2: '#f2c230', 3: '#f2c230', 4: '#e89a4f', 5: '#58c27a', 6: '#9aa0a8' };
const PRIORIDAD_COLOR = ['#b8c4d0', '#b8c4d0', '#8fc6e8', '#f2c230', '#f08a3c', '#e0453a', '#7a1024'];

for (const [k, a] of Object.entries(AGENTES)) new Actor(k, { base: a.base, color: a.color, x: a.x, y: PISO[a.piso] });
// lo que no es agente, la oficina sigue viva igual
new Actor('contador', { color: '#f07aa0', x: P.contador[0], y: PISO.p2, teclea: true });
new Actor('bodega1', { color: '#f08a30', x: 1104, y: PISO.pb, vista: 'lado', dir: -1 });
new Actor('bodega2', { color: '#f08a30', x: 905, y: PISO.pb });
const PERRO = new Actor('perro', { tipo: 'animal', cabeza: 18, color: '#d08a3c', ancho: 8, x: 600, y: PISO.p1, sentado: true });
PERRO.anim = a => {
  if (a.anda) return { n: 'perro_camina', f: Math.floor(a.recorrido / 4) };
  if (a.sentado) return { n: 'perro_sentado', f: Math.floor(a.fase * 4) };
  return { n: 'perro_quieto', f: Math.floor(a.fase * 5) };
};
const GALLINAS = [0, 1, 2].map(i => {
  const g = new Actor('gallina' + i, { tipo: 'animal', x: 1012 + i * 34, y: PISO.pb, cabeza: 14, ancho: 4, vista: 'lado', dir: i % 2 ? -1 : 1 });
  g.pica = 0; g.prox = 1 + Math.random() * 3;
  g.anim = a => a.anda ? { n: 'gallina_camina', f: Math.floor(a.recorrido / 3) } : { n: 'gallina_pica', f: a.pica > 0 ? Math.floor(a.fase * 6) % 2 : 0 };
  return g;
});
const IA = { despierta: false, cara: 'cerrados', parpadeo: 0, aura: 0, piensa: 0 };
const LLAMA = new Actor('llama', { tipo: 'fijo', x: P.llama[0], y: P.llama[1], cabeza: 38, color: '#58f0ff' });
LLAMA.anim = () => {
  let cara = IA.cara;
  if (IA.despierta && IA.piensa > T) cara = 'piensa';
  else if (IA.despierta && IA.parpadeo > 0) cara = 'parpadeo';
  return { n: 'llama_' + cara, f: 0, dy: IA.despierta ? Math.round(Math.sin(T * 2) * 0.6) : (Math.sin(T * 1.2) > 0 ? 0 : 1) };
};
const LAPTOP = new Actor('laptop', { tipo: 'fijo', x: P.laptop[0], y: P.laptop[1] + 1 });
LAPTOP.anim = () => ({ n: 'laptop', f: IA.despierta ? 2 : 0 });
const GPU = new Actor('gpu', { tipo: 'fijo', x: P.gpu[0], y: P.gpu[1] });
GPU.anim = () => IA.despierta ? { n: 'gpu', f: Math.floor(T * 14) } : { n: 'gpu_apagada', f: 0 };
const PALANCA = new Actor('palanca', { tipo: 'fijo', x: P.palanca[0], y: P.palanca[1] });
PALANCA.anim = () => ({ n: 'palanca', f: IA.despierta ? 2 : 0 });
// el bot de escalado vive en Docker junto a GLPI, pero no corre dentro de la simulacion; la ballena duerme
const BALLENA = new Actor('ballena', { tipo: 'fijo', capa: 0.5, x: P.ballena[0], y: D.rects.pecera[3] + 3 });
BALLENA.anim = () => ({ n: 'ballena', f: 0, dy: Math.round(Math.sin(T * 0.6) * 1) });
const CAMION = vehiculo('camion', 'camion', [-36, 26, 40], { x: 1182, y: 636, vista: 'lado' });

// ─────────────────────────────────────────────────────────────────────────────
// lo que se sabe de la corrida
// ─────────────────────────────────────────────────────────────────────────────
const TK = {};                     // ticket -> { estado, prioridad, tecnico, cliente, donde }
const GES = { problemas: {}, cambios: {} };
let cerebro = '';                  // ollama, claude o plantillas, lo dice el primer evento de la corrida
let horaSim = null;
let mayor = false;
const USUARIO = { 'usuario.comercial': 'comercial', 'usuario.finanzas': 'finanzas', 'usuario.operaciones': 'operaciones',
  'usuario.sucursal1': 'sucursal1', 'usuario.sucursal2': 'sucursal2', 'ti.soporte1': 'soporte1', 'ti.soporte2': 'soporte2',
  'ti.aplicaciones': 'aplicaciones', 'ti.datos': 'datos', 'ti.responsable': 'responsable' };

const ST = { nubes: 1, cola: 0 };
for (const s of D.salas) luzYa(s.id, 1);
luzYa('sot_der', 0.25);

// ─────────────────────────────────────────────────────────────────────────────
// el dibujo de lo que cambia con la corrida
// ─────────────────────────────────────────────────────────────────────────────
capaExtra.push({ capa: 0, fn: c => {
  P.nubes.forEach(([x, y], i) => {
    const yy = y + Math.round(Math.sin(T * 0.8 + i * 2) * 3);
    const [ax, ay] = P.antena;
    for (let k = 0; k < 26; k++) {
      const t = k / 26;
      const on = ((k - T * 12 + i * 5) % 6 + 6) % 6 < 1.2;
      c.fillStyle = on ? '#fff7a0' : 'rgba(255,255,255,0.7)';
      c.fillRect(Math.round(lerp(ax, x, t)), Math.round(lerp(ay, yy + 6, t) - Math.sin(t * Math.PI) * 16), on ? 2 : 1, on ? 2 : 1);
    }
    spr(c, 'nube', i, x, yy + 18);
    spr(c, 'servidor', 0, x, yy + 6);
    for (let k = 0; k < 4; k++) {
      c.fillStyle = Math.sin(T * (5 + k) + i * 3 + k) > 0.2 ? '#7aff8a' : '#2a6a3a';
      c.fillRect(x + 6, yy - 25 + k * 7, 2, 2);
    }
    texto(c, P.nube_nombres[i], x - Math.floor(medirTexto(P.nube_nombres[i]) / 2), yy + 22, '#2a3a5a');
  });
} });
capaExtra.push({ capa: 1.4, fn: c => {
  const [x0, y0, x1, y1] = D.rects.pecera;
  c.fillStyle = 'rgba(40,132,216,0.28)'; c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  c.fillStyle = 'rgba(200,240,255,0.55)'; c.fillRect(x0, y0, x1 - x0 + 1, 1);
} });

function tarjeta(c, x, y, txt, fondo, borde) {
  const w = medirTexto(txt) + 4;
  c.fillStyle = '#1b1522'; c.fillRect(x - 1, y - 1, w + 2, 12);
  c.fillStyle = fondo; c.fillRect(x, y, w, 10);
  c.fillStyle = borde; c.fillRect(x, y, w, 2);
  texto(c, txt, x + 2, y + 3, '#1b1522');
  return w;
}
capaExtra.push({ capa: 1, fn: c => {
  // la cola de la Mesa de Servicio, los tickets nuevos que nadie ha tomado
  const [qx0, qy0] = D.rects.cola;
  const n = ST.cola;
  for (let i = 0; i < Math.min(4, n); i++) spr(c, 'ticket_inc', 0, qx0 + 8 + i * 13, qy0 + 18);
  if (n > 4) texto(c, '+' + (n - 4), qx0 + 40, qy0 + 4, '#ffd23c');
  // el tablero de la sala del CAB, cuantos tickets hay en cada estado, como el tablero de GLPI
  const [kx0, ky0, kx1, ky1] = D.rects.kpi;
  const cuenta = [0, 0, 0, 0, 0];
  for (const t of Object.values(TK)) cuenta[{ 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4 }[t.estado] ?? 0]++;
  const max = Math.max(4, ...cuenta);
  ['NUEVO', 'CURSO', 'ESPERA', 'RESUELTO', 'CERRADO'].forEach((nom, i) => {
    const h = Math.round(cuenta[i] / max * (ky1 - ky0 - 14));
    const x = kx0 + 6 + i * 27;
    c.fillStyle = ESTADO_COLOR[[1, 2, 4, 5, 6][i]]; c.fillRect(x, ky1 - 9 - h, 20, h);
    texto(c, String(cuenta[i]), x + 1, ky1 - 18 - h, '#ffffff');
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, ky1 - 9 - h, 20, 1);
    texto(c, nom.slice(0, 4), x, ky1 - 6, '#8a90a8');
  });
  // el corcho de problemas, los tres mas nuevos con su fase
  const ps = Object.entries(GES.problemas).slice(-3);
  ps.forEach(([id, p], i) => {
    const fondo = p.fase === 'resuelto' ? '#c8f0c8' : p.kb ? '#d8ecff' : '#f0c040';
    tarjeta(c, 442, 312 + i * 11, 'P' + id + (p.kb ? ' EC' : '') + (p.fase === 'resuelto' ? ' OK' : ''), fondo, '#c0571a');
  });
} });
capaExtra.push({ capa: 3, fn: c => {
  // los cambios sobre la mesa del CAB, con su tipo y sus votos
  const cs = Object.entries(GES.cambios).slice(-3);
  let cx = 628;
  cs.forEach(([id, ch]) => {
    const color = { normal: '#2a7ad8', estandar: '#3aa060', emergencia: '#e03a30' }[ch.tipo] || '#2a7ad8';
    const fondo = /rechaz/.test(ch.fase) ? '#ffd0c8' : /cerrado|implementado/.test(ch.fase) ? '#c8f0c8' : '#fbf6ea';
    cx += tarjeta(c, cx, P.mesa_cab[1] - 12, 'C' + id + (ch.tipo === 'normal' && ch.votos ? ' ' + ch.votos + '/5' : ''), fondo, color) + 4;
  });
  // los tickets abiertos de cada tecnico, sobre su escritorio
  for (const k of TECNICOS) {
    if (k === 'responsable') continue;
    const a = ACT[k], ag = AGENTES[k];
    const suyos = Object.values(TK).filter(t => t.tecnico === k && t.estado < 5).slice(0, 4);
    suyos.forEach((t, i) => {
      c.fillStyle = '#1b1522'; c.fillRect(ag.x + 10 + i * 4, PISO[ag.piso] - 19, 5, 5);
      c.fillStyle = PRIORIDAD_COLOR[t.prioridad || 1]; c.fillRect(ag.x + 11 + i * 4, PISO[ag.piso] - 18, 3, 3);
    });
  }
} });
capaExtra.push({ capa: 8, fn: c => {
  // GLPI, sus luces, en rojo durante un incidente mayor
  const [, gy0, gx1] = D.rects.glpi;
  for (let i = 0; i < 7; i++) {
    const y = gy0 + 6 + i * 8;
    const on = Math.sin(T * (6 + i) + i * 2) > 0;
    c.fillStyle = mayor ? (Math.floor(T * 6) % 2 ? '#ff3a3a' : '#5a1010') : (on ? '#7aff8a' : '#1a4a2a');
    c.fillRect(gx1 - 8, y, 2, 2);
  }
  if (IA.aura > 0) {
    for (let k = 0; k < 3; k++) {
      const r = 14 + k * 6 + Math.sin(T * 4 + k) * 2;
      c.fillStyle = `rgba(88,240,255,${0.18 * IA.aura})`;
      for (let a = 0; a < 40; a++) {
        const t = a / 40 * Math.PI * 2 + T * (k % 2 ? 1 : -1);
        c.fillRect(Math.round(LLAMA.x + Math.cos(t) * r), Math.round(LLAMA.y - 18 + Math.sin(t) * r), 2, 2);
      }
    }
  }
  // el reloj de la Mesa marca la hora del negocio
  const [rx, ry] = P.reloj;
  const h = horaNegocio();
  for (const [ang, largo, col] of [[(h % 12) / 12, 4, '#1b1522'], [(h % 1), 6, '#c0302a']]) {
    const a = -Math.PI / 2 + ang * Math.PI * 2;
    c.fillStyle = col;
    for (let k = 0; k <= largo; k++) c.fillRect(Math.round(rx + Math.cos(a) * k), Math.round(ry + Math.sin(a) * k), 1, 1);
  }
  // alarma de incidente mayor en la Mesa
  if (mayor && Math.floor(T * 3) % 2) {
    const s = D.salas.find(s => s.id === 'p1_izq');
    c.fillStyle = 'rgba(255,40,40,0.14)'; c.fillRect(s.x0, s.y0, s.x1 - s.x0 + 1, s.y1 - s.y0 + 1);
  }
  // el departamento bajo el raton
  if (sobre && !cerca) {
    const s = sobre;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.5 + 0.3 * Math.sin(T * 6);
    c.fillRect(s.x0, s.y0, s.x1 - s.x0 + 1, 2); c.fillRect(s.x0, s.y1 - 1, s.x1 - s.x0 + 1, 2);
    c.fillRect(s.x0, s.y0, 2, s.y1 - s.y0 + 1); c.fillRect(s.x1 - 1, s.y0, 2, s.y1 - s.y0 + 1);
    c.globalAlpha = 1;
  }
} });

// el dia de la semana de la hora simulada, para la luz de abierto o cerrado de cada servicio
vida.push(() => { if (horaSim) { const d = new Date(horaSim); if (!isNaN(d)) diaSemana = d.getDay(); } });
function horaNegocio() {
  const m = /T(\d\d):(\d\d)/.exec(horaSim || '');
  return m ? +m[1] + +m[2] / 60 : 12;
}

// ─────────────────────────────────────────────────────────────────────────────
// ayudantes
// ─────────────────────────────────────────────────────────────────────────────
const LETRAS = new Set([...'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789-.,!?/%+() _:']);
function limpio(s) {
  return [...String(s || '').toUpperCase().replace(/Ü/g, 'U').replace(/[ÀÂÄ]/g, 'A').replace(/[ÈÊË]/g, 'E')]
    .map(ch => LETRAS.has(ch) ? ch : ' ').join('').replace(/\s+/g, ' ').trim();
}
// parte un texto en renglones de n letras, cortando en espacios
function renglones(s, n = 30, max = 3) {
  const out = [];
  let r = '';
  for (const p of limpio(s).split(' ')) {
    if ((r + ' ' + p).trim().length > n) { out.push(r.trim()); r = p; if (out.length >= max) break; }
    else r += ' ' + p;
  }
  if (out.length < max && r.trim()) out.push(r.trim());
  return out.slice(0, max);
}
const lo = s => (s || '').replace(/^[^:]*: /, '');      // lo que dice despues de los dos puntos del evento
function grupoDe(destino) {
  for (const [g, k] of GRUPO) if ((destino || '').includes(g)) return k;
  return null;
}
// cada persona hace sus cosas en fila, para que un viaje no le pise a otro
function encola(k, fn) {
  const a = ACT[k];
  a.cola = (a.cola || Promise.resolve()).then(fn).catch(e => console.error(e));
  return a.cola;
}
async function caminar(k, x, piso) {
  const a = ACT[k];
  const y = typeof piso === 'number' ? piso : PISO[piso];
  if (Math.abs(a.y - y) < 2 && Math.abs(a.x - x) < 1) return;
  a.fuera = true; a.teclea = false;
  await viaje([{ a, x, y, o: { vista: 'frente' } }]);
}
async function alPuesto(k) {
  const ag = AGENTES[k];
  await caminar(k, ag.x, ag.piso);
  ACT[k].fuera = false;
  ACT[k].vista = 'frente';
}
// en la vista general solo se ven los paquetes, las senales y las estrellas; los letreros con texto se ven
// cuando la camara esta en el departamento de esa persona
function aqui(k) {
  if (!cerca) return false;
  const a = ACT[k];
  return a.x >= cerca.x0 - 4 && a.x <= cerca.x1 + 4 && Math.abs(a.y - cerca.piso) < 3;
}
function marca(k, nombre, dur = 3) {
  const a = ACT[k];
  const p = popEn(nombre, a.x + 14, a.y - 30, { flota: true });
  espera(dur).then(() => tween(p, { alfa: 0 }, 0.3).then(() => quitar(p)));
}
// un letrero por persona, y si choca con otro se sube un renglon
const ROTULOS = new Map();
function rotulo(k, txt, color, dur = 3.5, siempre = false) {
  if (!siempre && !aqui(k)) return null;
  const a = ACT[k];
  const previo = ROTULOS.get(k);
  if (previo) quitar(previo);
  // el letrero va a tamano de pantalla; su alto y su ancho en el mundo dependen del zoom
  const s = escalaLetra(alto), z = cam.z;
  const w = (medirTexto(txt) + 10) * s / z, paso = (13 * s + 4) / z;
  let y = a.y - 44;
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const choca = [...ROTULOS.values()].some(o => !o.muerta && Math.abs(o.x - a.x) < (w + o.w) / 2 && Math.abs(o.y - y) < paso);
    if (!choca) break;
    y -= paso;
  }
  const e = etiqueta(txt, a.x, y, color || AGENTES[k].color, { libre: true, w });
  ROTULOS.set(k, e);
  espera(dur).then(() => tween(e, { alfa: 0 }, 0.3).then(() => { quitar(e); if (ROTULOS.get(k) === e) ROTULOS.delete(k); }));
  return e;
}
function letrero(k, titulo, lineas, color, dur = 6) {
  if (!aqui(k)) return;
  const ag = AGENTES[k];
  const n = P.red.externos[ag.nodo] ? P.red.externos[ag.nodo][0] : P.red.nodos[ag.nodo];
  const p = pantalla(n[0], n[1], lineas, { titulo, color: color || ag.color, vel: 90 });
  espera(dur).then(() => tween(p, { alfa: 0 }, 0.4).then(() => quitar(p)));
}
let ultimaIA = 0;
// la IA escribe lo que dice cada agente: un paquete sale de la laptop (Ollama) o de la nube (Claude)
function laIAescribe(k) {
  if (!cerebro || cerebro === 'plantillas' || T - ultimaIA < 0.35 || !AGENTES[k]) return;
  ultimaIA = T;
  if (cerebro === 'ollama') {
    IA.piensa = T + 0.8;
    enviar('lab', AGENTES[k].nodo, { color: '#58f0ff', vel: 320 });
  } else {
    const [ax, ay] = P.antena;
    enviar(null, null, { pts: [[ax, ay], [ax, P.red.bandejas.p3]].concat(rutaRed('kpi', AGENTES[k].nodo).slice(1)), color: '#d8a0ff', vel: 340 });
  }
}
function contarCola() {
  ST.cola = Object.values(TK).filter(t => t.estado === 1 && !t.tecnico && t.donde === 'cola').length;
}

// ─────────────────────────────────────────────────────────────────────────────
// cada evento en la oficina
// ─────────────────────────────────────────────────────────────────────────────
function aplicar(ev, animar = true) {
  const k = ev.agente, t = ev.ticket, acc = ev.accion;
  if (ev.sim) horaSim = ev.sim;
  if (k === 'simulacion') {
    const m = /cerebro (\w+)/.exec(ev.texto || '');
    if (m) { cerebro = m[1]; despertarIA(cerebro === 'ollama'); }
    return;
  }
  if (t && !TK[t]) TK[t] = { estado: 1, prioridad: null, tecnico: null, cliente: null, donde: null };
  const tk = t ? TK[t] : null;
  const ag = AGENTES[k];
  switch (acc) {
    case 'reporta': tk.cliente = k; tk.estado = 1; tk.donde = animar ? 'glpi' : 'cola'; break;
    case 'toma': tk.tecnico = k; tk.estado = 2; if (ev.prioridad) tk.prioridad = ev.prioridad; break;
    case 'pide_dato': tk.estado = 4; break;
    case 'contesta': tk.estado = 2; break;
    case 'escala': tk.tecnico = null; tk.estado = 1; break;
    case 'resuelve': tk.estado = 5; break;
    case 'aprueba': tk.estado = 6; break;
    case 'rechaza': tk.estado = 2; break;
    case 'incidente_mayor': for (const x of ev.tickets || []) { TK[x] = TK[x] || { estado: 1, cliente: null }; TK[x].prioridad = 6; } break;
    case 'abre_problema': GES.problemas[ev.problema] = { fase: 'abierto' }; break;
    case 'causa_raiz': if (GES.problemas[ev.problema]) GES.problemas[ev.problema].fase = 'causa encontrada'; break;
    case 'error_conocido': if (GES.problemas[ev.problema]) GES.problemas[ev.problema].kb = ev.articulo; break;
    case 'resuelve_problema': if (GES.problemas[ev.problema]) GES.problemas[ev.problema].fase = 'resuelto'; break;
    case 'propone_cambio': GES.cambios[ev.cambio] = { tipo: 'normal', fase: 'en el CAB', votos: 0 }; break;
    case 'cambio_estandar': GES.cambios[ev.cambio] = { tipo: 'estandar', fase: 'aceptado', votos: 0 }; break;
    case 'cambio_emergencia': GES.cambios[ev.cambio] = { tipo: 'emergencia', fase: 'esperando', votos: 0 }; break;
    case 'cab': {
      const ch = GES.cambios[ev.cambio];
      if (ch) { ch.votos++; if (ev.voto === 'rechaza') ch.fase = 'rechazado'; }
      break;
    }
    case 'cambio_rechazado': if (GES.cambios[ev.cambio]) GES.cambios[ev.cambio].fase = 'rechazado'; break;
    case 'implementa': if (GES.cambios[ev.cambio]) GES.cambios[ev.cambio].fase = 'implementado y cerrado'; break;
  }
  mayor = Object.values(TK).some(x => (x.prioridad || 0) >= 6 && x.estado < 5);
  contarCola();
  if (!animar || !ag) return;
  if (ev.texto) laIAescribe(k);
  animarEvento(ev, tk);
}

function animarEvento(ev, tk) {
  const k = ev.agente, t = ev.ticket, acc = ev.accion, ag = AGENTES[k], a = ACT[k];
  const cliente = tk && tk.cliente && AGENTES[tk.cliente] ? tk.cliente : null;
  const tecnico = tk && tk.tecnico && AGENTES[tk.tecnico] ? tk.tecnico : null;
  const nodo = x => AGENTES[x].nodo;
  switch (acc) {
    case 'reporta': {
      a.teclea = true;
      letrero(k, 'REPORTA EL TICKET ' + t, renglones(lo(ev.texto), 30, 3));
      encola(k, async () => {
        await espera(0.6);
        await enviar(nodo(k), 'glpi', { spr: 'ticket_inc', txt: String(t), color: '#ff7a6a', vel: 240 });
        ST.glpi = T;
        await enviar('glpi', 'cola', { spr: 'ticket_inc', txt: String(t), color: '#ff7a6a', vel: 260 });
        if (TK[t]) { TK[t].donde = 'cola'; contarCola(); }
      });
      break;
    }
    case 'toma': {
      const de = tk.donde === 'cola' ? 'cola' : tk.donde || 'glpi';
      tk.donde = nodo(k);
      contarCola();
      rotulo(k, 'TOMA EL ' + t + (ev.prioridad ? ', P' + ev.prioridad : ''));
      if (de !== nodo(k)) enviar(de, nodo(k), { spr: 'ticket_inc', txt: String(t), color: '#ff7a6a', vel: 260 });
      a.teclea = true;
      break;
    }
    case 'pide_dato':
      marca(k, 'signo_duda');
      if (cliente) ACT[cliente].gestoPor('sorpresa', 2);
      if (cliente) enviar(nodo(k), nodo(cliente), { txt: '?', color: '#ffd23c', vel: 280 }).then(() => ACT[cliente].saltar(4));
      letrero(k, 'PIDE UN DATO', renglones(lo(ev.texto), 30, 2), null, 5);
      break;
    case 'contesta':
      if (tecnico) enviar(nodo(k), nodo(tecnico), { txt: 'RESPUESTA', color: '#7aff8a', vel: 280 });
      break;
    case 'diagnostica': {
      a.teclea = true;
      const [ex0, ey0, ex1] = D.rects.estantes;
      const l = cosa({ spr: 'libro_vuela_b', fps: 10, x: ex0 + Math.random() * (ex1 - ex0), y: ey0 + 10, capa: 9 });
      volar(l, [l.x, l.y], [a.x + 8, a.y - 22], 1.0, -30).then(() => quitar(l));
      rotulo(k, 'DIAGNOSTICA EL ' + t, '#3aa060', 3);
      break;
    }
    case 'avance':
      if (cliente) enviar(nodo(k), nodo(cliente), { txt: 'AVANCE', color: '#58e0d8', vel: 280 });
      break;
    case 'escala': {
      const dest = grupoDe(ev.destino);
      marca(k, 'signo_alerta');
      rotulo(k, 'ESCALA A ' + limpio(ev.destino || ''), '#e0453a', 4);
      tk.donde = dest ? nodo(dest) : 'glpi';
      enviar(nodo(k), 'glpi', { spr: 'ticket_inc', txt: String(t), color: '#ff9a5a', vel: 260 }).then(() => {
        if (dest) enviar('glpi', nodo(dest), { spr: 'ticket_inc', txt: String(t), color: '#ff9a5a', vel: 260 });
      });
      break;
    }
    case 'resuelve':
      marca(k, 'signo_ok'); a.gestoPor('contento', 4);
      a.teclea = false;
      if (cliente) enviar(nodo(k), nodo(cliente), { txt: 'SOLUCIÓN', color: '#7aff8a', vel: 280 });
      break;
    case 'aprueba':
      marca(k, 'signo_ok'); fx.corazones(a.x, a.y - 36, 3); a.saltar(5); a.teclea = false; a.gestoPor('contento', 6);
      break;
    case 'rechaza':
      marca(k, 'signo_alerta'); a.saltar(6); a.gestoPor('estres', 7);
      if (tecnico) enviar(nodo(k), nodo(tecnico), { txt: 'SIGUE PASANDO', color: '#ff5a3a', vel: 280 });
      break;
    case 'encuesta': {
      const n = ev.nota || 0;
      for (let i = 0; i < 5; i++) {
        const e = popEn('estrella', a.x - 24 + i * 12, a.y - 46, { flota: true });
        if (i >= n) e.alfa = 0.3;
        espera(4).then(() => tween(e, { alfa: 0 }, 0.3).then(() => quitar(e)));
      }
      break;
    }
    case 'liga_ci':
      rotulo(k, 'CMDB ' + limpio(ev.ci || ''), '#a070ff', 3);
      break;
    case 'liga_problema':
      rotulo(k, 'LIGA AL PROBLEMA ' + ev.problema, '#c0571a', 3);
      break;
    case 'liga_cambio':
      rotulo(k, 'LIGA AL CAMBIO ' + ev.cambio, '#2a7ad8', 3);
      break;
    case 'incidente_mayor':
      flash = 0.35; flashColor = '255,60,60'; sacudir(5); SON.alarma();
      espera(6).then(() => quitar(etiqueta('INCIDENTE MAYOR', 436, 452, '#e0453a', { libre: true })));
      encola(k, async () => { await caminar(k, 520, 'p1'); rotulo(k, 'INCIDENTE MAYOR', '#e0453a', 5); await espera(6); await alPuesto(k); });
      break;
    case 'abre_problema':
      encola(k, async () => {
        await caminar(k, 470, 'p3');
        a.vista = 'espalda';
        rotulo(k, 'ABRE EL PROBLEMA ' + ev.problema, '#c0571a', 5);
        await espera(4);
        await alPuesto(k);
      });
      break;
    case 'causa_raiz':
      popEn('foco', a.x - 17, a.y - 34, { flota: true, f: 1 });
      letrero(k, 'CAUSA RAÍZ DEL PROBLEMA ' + ev.problema, renglones(lo(ev.texto), 30, 3), '#2a7ad8', 7);
      break;
    case 'error_conocido': {
      const [ex0, ey0] = D.rects.estantes;
      const l = cosa({ spr: 'libro_vuela_a', fps: 10, x: a.x, y: a.y - 20, capa: 9 });
      volar(l, [a.x, a.y - 20], [ex0 + 30, ey0 + 8], 1.2, -40).then(() => { quitar(l); fx.chispas(ex0 + 30, ey0 + 8, 12); });
      rotulo(k, 'PUBLICA EL ERROR CONOCIDO', '#2a7ad8', 4);
      break;
    }
    case 'propone_cambio':
      encola(k, async () => {
        await caminar(k, SILLA_CAB[k] || 760, 'p3');
        rotulo(k, 'PROPONE EL CAMBIO ' + ev.cambio, '#2a7ad8', 4);
        await espera(4);
        await alPuesto(k);
      });
      break;
    case 'cambio_estandar':
      rotulo(k, 'CAMBIO ESTÁNDAR ' + ev.cambio, '#3aa060', 4);
      break;
    case 'cambio_emergencia':
      marca(k, 'signo_alerta', 4);
      rotulo(k, 'CAMBIO DE EMERGENCIA ' + ev.cambio, '#e0453a', 5);
      enviar(nodo(k), 'kpi', { txt: 'EMERGENCIA', color: '#ff5a3a', vel: 300 });
      break;
    case 'cab':
    case 'revision_emergencia':
      encola(k, async () => {
        await caminar(k, SILLA_CAB[k] || 760, 'p3');
        const a2 = ACT[k];
        a2.vista = 'frente';
        const no = ev.voto === 'rechaza';
        popEn(no ? 'signo_alerta' : 'signo_ok', a2.x, a2.y - 44, { flota: true });
        rotulo(k, acc === 'cab' ? (no ? 'EN CONTRA' : 'A FAVOR') : 'REVISIÓN', no ? '#e0453a' : '#3aa060', 4);
        await espera(5);
        await alPuesto(k);
      });
      break;
    case 'cambio_rechazado': {
      const s = cosa({ spr: 'sello', x: 744, y: 318, esc: 2, alfa: 0, capa: 10 });
      tween(s, { esc: 1, alfa: 0.4 }, 0.35, E.entra);
      espera(3).then(() => quitar(s));
      rotulo(k, 'EL CAB RECHAZÓ EL ' + ev.cambio, '#e0453a', 4);
      break;
    }
    case 'implementa': {
      // el cambio sube a los servidores de la nube
      a.teclea = true;
      const [ax, ay] = P.antena;
      const pts = rutaRed(nodo(k), 'kpi').slice(0, -1).concat([[ax, P.red.bandejas.p3], [ax, ay]]);
      enviar(null, null, { pts, spr: 'release', txt: 'CAMBIO ' + ev.cambio, color: '#ffd23c', vel: 230 }).then(() => {
        P.nubes.forEach(([x, y]) => fx.anillo(x, y, '#7aff8a', 20, 0.8, 1));
      });
      rotulo(k, 'IMPLEMENTA EL ' + ev.cambio, '#f08a30', 4);
      break;
    }
    case 'resuelve_problema':
      fx.confeti(494, 300, 30, 60);
      rotulo(k, 'PROBLEMA ' + ev.problema + ' RESUELTO', '#3aa060', 5, true);
      break;
  }
}

function despertarIA(si) {
  if (si === IA.despierta) return;
  IA.despierta = si; IA.cara = si ? 'abiertos' : 'cerrados';
  luz('sot_der', si ? 1 : 0.25, 0.4);
  tween(IA, { aura: si ? 0.6 : 0 }, 0.6);
  if (si) { fx.anillo(LLAMA.x, LLAMA.y - 18, '#58f0ff', 30, 0.7, 1); fx.chispas(LLAMA.x, LLAMA.y - 20, 24, ['#58f0ff', '#ffffff']); }
}

// lo que dice GLPI manda sobre lo que se dedujo de los eventos
function sincronizar(m) {
  if (m.hora) horaSim = m.hora;
  for (const [id, t] of Object.entries(m.tk || {})) {
    const T0 = TK[id] || (TK[id] = { donde: null });
    T0.estado = t.estado; T0.prioridad = t.prioridad; T0.tecnico = t.tecnico || null; T0.cliente = t.cliente || T0.cliente;
    if (T0.estado === 1 && !T0.tecnico && !T0.donde) T0.donde = 'cola';
  }
  for (const id of Object.keys(TK)) if (m.tk && !m.tk[id]) delete TK[id];
  if (m.gestion) { Object.assign(GES.problemas, m.gestion.problemas || {}); Object.assign(GES.cambios, m.gestion.cambios || {}); }
  mayor = Object.values(TK).some(x => (x.prioridad || 0) >= 6 && x.estado < 5);
  contarCola();
}
function reiniciar() {
  for (const k of Object.keys(TK)) delete TK[k];
  GES.problemas = {}; GES.cambios = {};
  mayor = false; ST.cola = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// la oficina viva entre evento y evento
// ─────────────────────────────────────────────────────────────────────────────
function abiertos(k) {
  return Object.values(TK).filter(t => (CLIENTES.includes(k) ? t.cliente === k : t.tecnico === k) && t.estado < 5).length;
}
let proxRutina = 2;
const RUTINAS = {
  charla(k) {
    // platica con alguien de su mismo piso que este libre
    const a = ACT[k];
    const b = Object.keys(AGENTES).find(x => x !== k && Math.abs(ACT[x].y - a.y) < 2 && !ACT[x].fuera && !abiertos(x) && Math.abs(ACT[x].x - a.x) < 200);
    if (!b) return;
    return encola(k, async () => {
      const lado = a.x < ACT[b].x ? -16 : 16;
      await caminar(k, ACT[b].x + lado, a.y);
      a.mira(lado < 0 ? 1 : -1); ACT[b].mira(lado < 0 ? -1 : 1);
      await di(a, 1); await di(ACT[b], 1); await di(a, 1);
      callar();
      ACT[b].vista = 'frente';
      await alPuesto(k);
    });
  },
  estirarse(k) { ACT[k].saltar(3, 0.5); },
  ventana(k) {
    const ag = AGENTES[k];
    const v = { pb: 372, p2: 332 }[ag.piso];
    if (!v || ag.x > 600) return;
    return encola(k, async () => { await caminar(k, v, ag.piso); ACT[k].vista = 'espalda'; await espera(3); await alPuesto(k); });
  },
  ronda(k) {
    // el Responsable baja a ver a su equipo, mas seguido con un incidente mayor
    const quien = ['soporte1', 'soporte2', 'aplicaciones', 'datos'][Math.floor(Math.random() * 4)];
    return encola(k, async () => {
      const b = ACT[quien];
      await caminar(k, b.x + 18, b.y);
      ACT[k].mira(-1);
      await di(ACT[k], 1); await di(b, 1);
      callar();
      await alPuesto(k);
    });
  },
  bostezo(k) { if (horaNegocio() >= 17) fx.zzz(ACT[k].x + 6, ACT[k].y - 34); },
};
vida.push(dt => {
  // las gallinas de la bodega
  for (const g of GALLINAS) {
    g.prox -= dt;
    if (g.pica > 0) g.pica -= dt;
    if (g.prox <= 0 && !g.anda) {
      if (Math.random() < 0.5) { g.pica = 1.2; g.prox = 1.5 + Math.random() * 2; }
      else { g.vel = 16; g.ir(clamp(g.x + (Math.random() - 0.5) * 50, 1004, 1090)); g.prox = 2 + Math.random() * 3; }
    }
  }
  if (IA.despierta) {
    IA.parpadeo -= dt;
    if (IA.parpadeo < -3 - Math.random() * 3) IA.parpadeo = 0.14;
  } else if (Math.random() < dt * 0.8) fx.zzz(LLAMA.x + 8, LLAMA.y - 32);
  if (Math.random() < dt * 0.3) fx.burbujas(BALLENA.x + 22, BALLENA.y - 18, 1);
  // quien tiene trabajo teclea, quien esta saturado suda
  for (const k of Object.keys(AGENTES)) {
    const a = ACT[k];
    const n = abiertos(k);
    if (!a.fuera) a.teclea = n > 0;
    // su cara de fondo: saturado, cansado al final del dia, o normal
    a.animo = (TECNICOS.includes(k) && (n >= 3 || mayor)) || (CLIENTES.includes(k) && mayor && n) ? 'estres'
      : horaNegocio() >= 17 && !n ? 'cansado' : null;
    if (!a.fuera && (n >= 3 || (mayor && TECNICOS.includes(k))) && Math.random() < dt * 0.7) fx.sprite('gota', a.x + 9, a.y - 30, { vida: 0.7, vy: 6 });
  }
  // de vez en cuando alguien hace algo, pero nunca salen mas de dos a la vez ni nadie de TI con un incidente mayor
  proxRutina -= dt;
  if (proxRutina <= 0) {
    proxRutina = 4 + Math.random() * 6;
    const fuera = Object.keys(AGENTES).filter(k => ACT[k].fuera).length;
    const libres = Object.keys(AGENTES).filter(k => !ACT[k].fuera && !abiertos(k) && !(mayor && TECNICOS.includes(k)));
    if (libres.length && fuera < 2) {
      const k = libres[Math.floor(Math.random() * libres.length)];
      const ops = k === 'responsable' ? ['ronda', 'ronda', 'estirarse'] : ['charla', 'charla', 'estirarse', 'ventana', 'bostezo'];
      RUTINAS[ops[Math.floor(Math.random() * ops.length)]](k);
    }
  }
  // la hora del negocio pinta el cielo
  const h = horaNegocio();
  if (Math.abs(HORA.v - h) > 0.05) HORA.v = lerp(HORA.v, h, Math.min(1, dt * 2));
});

// ─────────────────────────────────────────────────────────────────────────────
// la camara, toda la oficina o un departamento
// ─────────────────────────────────────────────────────────────────────────────
function vistaGeneral() {
  const r = { x: 720, y: 448, w: 1460, h: 540 };
  const z = Math.min(ancho / r.w, alto / r.h);
  r.z = z >= 1 ? Math.floor(z) : z;
  return r;
}
const NOMBRE_SALA = {
  pb_izq: 'VENTAS, COMERCIAL', pb_der: 'DESPACHO Y RASTREO', bodega: 'BODEGA CENTRAL', p1_izq: 'MESA DE SERVICIO, NIVEL 1',
  p1_der: 'BASE DE CONOCIMIENTO', p2_izq: 'SISTEMAS Y APLICACIONES, NIVEL 2', p2_der: 'ADMINISTRACIÓN Y FINANZAS',
  p3_izq: 'COORDINACIÓN, NIVEL 3, Y PROBLEMAS', p3_der: 'SALA DEL CAB Y MEJORA CONTINUA', sot_izq: 'GLPI Y EL BOT EN DOCKER',
  sot_der: 'LABORATORIO DE LA IA', suc1: 'SUCURSAL 1', suc2: 'SUCURSAL 2',
};
let cerca = null, sobre = null, nombres = [];
const chip = document.getElementById('chip');
function aMundo(ev) {
  const z = cam.z * (1 + cam.golpe);
  return { x: cam.x + (ev.clientX * dpr - cv.width / 2) / z, y: cam.y + (ev.clientY * dpr - cv.height / 2) / z };
}
function salaEn(p) {
  return D.salas.find(s => p.x >= s.x0 - 4 && p.x <= s.x1 + 4 && p.y >= s.y0 - 4 && p.y <= s.y1 + 8) || null;
}
function acercar(s) {
  cerca = s;
  const r = { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 + 6, w: s.x1 - s.x0 + 30, h: s.y1 - s.y0 + 56 };
  // la sala entera, con pixeles enteros
  r.z = clamp(Math.floor(Math.min(ancho / r.w, alto / r.h)), 1, 5);
  camara(r, 1.0);
  chip.innerHTML = `${NOMBRE_SALA[s.id] || s.nombre}<small>Clic o Escape para ver toda la oficina</small>`;
  chip.classList.add('ver');
  // el nombre de cada agente que trabaja ahi
  for (const e of nombres) quitar(e);
  nombres = Object.entries(AGENTES).filter(([k]) => {
    const a = ACT[k];
    return a.x >= s.x0 - 4 && a.x <= s.x1 + 4 && Math.abs(a.y - s.piso) < 3;
  }).sort((p, q) => ACT[p[0]].x - ACT[q[0]].x)
    .map(([k, ag], i) => {
      const e = etiqueta(ag.nombre, ACT[k].x, ACT[k].y + 13 + (i % 2) * 13, ag.color, { fija: true, flota: false, libre: true });
      e.mueve = () => { e.x = ACT[k].x; e.y = ACT[k].y + 13 + (i % 2) * 13; };
      return e;
    });
  sobre = null;
}
function alejar() {
  cerca = null;
  camara(vistaGeneral(), 0.9);
  chip.classList.remove('ver');
  for (const e of nombres) quitar(e);
  nombres = [];
}
cv.addEventListener('click', ev => {
  SON.iniciar();
  if (cerca) { alejar(); return; }
  const s = salaEn(aMundo(ev));
  if (s) acercar(s);
});
cv.addEventListener('mousemove', ev => {
  if (cerca) { cv.style.cursor = 'zoom-out'; return; }
  sobre = salaEn(aMundo(ev));
  cv.style.cursor = sobre ? 'zoom-in' : 'default';
  cv.title = sobre ? (NOMBRE_SALA[sobre.id] || sobre.nombre) : '';
});
cv.addEventListener('mouseleave', () => { sobre = null; });
addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && cerca) alejar();
  if (ev.key === 'm' || ev.key === 'M') { SON.iniciar(); SON.mudo = !SON.mudo; }
});
addEventListener('resize', () => { medir(); if (cerca) acercar(cerca); else { const r = vistaGeneral(); cam.x = r.x; cam.y = r.y; cam.z = r.z; } });

// ─────────────────────────────────────────────────────────────────────────────
// de donde vienen los eventos
// ─────────────────────────────────────────────────────────────────────────────
addEventListener('message', m => {
  const d = m.data || {};
  if (d.tipo === 'evento') aplicar(d.ev, d.animar);
  else if (d.tipo === 'estado') sincronizar(d);
  else if (d.tipo === 'reinicio') reiniciar();
});
// sola, repite la corrida de ejemplo
async function demo(x) {
  const evs = window.CORRIDA || [];
  if (!evs.length) return;
  let reloj = Date.parse(evs[0].real), ultimo = performance.now();
  for (const ev of evs) {
    const cuando = Date.parse(ev.real);
    while (reloj < cuando) {
      await new Promise(r => setTimeout(r, 50));
      const ahora = performance.now();
      reloj += (ahora - ultimo) * x;
      ultimo = ahora;
    }
    aplicar(ev, true);
  }
}

SON.mudo = true;
medir();
cargar(['hoja', 'mundo', 'frente', 'lejos', 'cerca', 'portal']).then(() => {
  const r = vistaGeneral();
  cam.x = r.x; cam.y = r.y; cam.z = r.z;
  HORA.v = 9;
  requestAnimationFrame(t => { ultimo = t; bucle(t); });
  const q = new URLSearchParams(location.search);
  if (q.has('demo')) demo(Number(q.get('x') || 6));
  if (window.parent !== window) window.parent.postMessage({ tipo: 'oficina-lista' }, '*');
});
