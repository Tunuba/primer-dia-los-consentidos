// Lo que comparten la presentacion (guion.js) y la oficina en vivo de la simulacion (vivo.js).
// Gente que camina y toma el elevador, paquetes que viajan por la red del edificio, pantallas que
// senalan algo, vehiculos y la hora del dia. Se carga despues de motor.js.
'use strict';

const VEL = 52;          // pixeles por segundo al caminar
const TI = '#1fa59c';
const clavePiso = y => Object.keys(PISO).find(k => Math.abs(PISO[k] - y) < 2);
let candado = Promise.resolve();
const HORA = { v: 5 };
vida.push(() => { hora = HORA.v; });

// vehiculos, las ruedas giran segun lo que avanzan
function vehiculo(id, n, ruedas, o) {
  const v = new Actor(id, Object.assign({ tipo: 'vehiculo', spr: n, vel: 70, capa: 3 }, o));
  // mirando a la izquierda usa su propio dibujo si lo tiene, para que los letreros no se lean al reves
  v.anim = a => {
    const izq = a.dir < 0 && D.sprites[n + '_izq'];
    return { n: izq ? n + '_izq' : n, f: 0, dy: a.anda ? (Math.floor(T * 12) % 2) : 0, sinVolteo: !!izq };
  };
  v.extra = (c, a) => {
    for (const dx of ruedas) spr(c, 'rueda', Math.floor(a.x / 3.4) % 4, a.x + dx * a.dir * a.ex, a.y - a.salto, { ex: Math.max(0.15, a.ex) });
  };
  return v;
}

function puntoEn(ruta, t) {
  const L = [];
  let tot = 0;
  for (let i = 1; i < ruta.length; i++) { const l = Math.hypot(ruta[i][0] - ruta[i - 1][0], ruta[i][1] - ruta[i - 1][1]); L.push(l); tot += l; }
  let d = t * tot, i = 0;
  while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++; }
  const k = L[i] ? d / L[i] : 0;
  return [lerp(ruta[i][0], ruta[i + 1][0], k), lerp(ruta[i][1], ruta[i + 1][1], k)];
}

// ─────────────────────────────────────────────────────────────────────────────
// ayudantes del guion
// ─────────────────────────────────────────────────────────────────────────────
function pon(a, x, piso, o = {}) {
  a = typeof a === 'string' ? ACT[a] : a;
  a.x = x; a.y = typeof piso === 'number' ? piso : PISO[piso];
  a.visible = true; a.alfa = 1; a.anda = false; a.destino = undefined; a.alLlegar = null; a.salto = 0; a.sigue = null;
  a.enCabina = false; a.ex = 1;
  a.vista = o.vista || 'frente'; a.dir = o.dir || 1;
  Object.assign(a, o);
  return a;
}

function quedar(a, o) {
  a.anda = false;
  a.vista = o.vista || 'frente';
  if (o.dir) a.dir = o.dir;
  for (const k of ['sentado', 'teclea']) if (k in o) a[k] = o[k];
}

function usarAscensor(fn) {
  const r = candado.then(fn);
  candado = r.catch(() => {});
  return r;
}

// El elevador como uno de verdad. Cada quien camina a esperar junto a la puerta de su piso. La cabina va
// recogiendo y dejando en el orden del camino, sin cambiar de direccion mientras haya paradas adelante.
async function despachar(ps) {
  const cuenta = {};
  for (const l of ps) {
    l.a.sentado = false; l.a.sigue = null;
    const ld = l.a.x < ASC.x ? -1 : 1, key = Math.round(l.a.y) + '|' + ld;
    const k = cuenta[key] = (cuenta[key] ?? -1) + 1;
    l.estado = 'va';
    l.llega = l.a.ir(ASC.x + ld * (24 + k * 11), VEL).then(() => { if (l.estado === 'va') { l.a.vista = 'lado'; l.a.dir = -ld; } });
  }
  let dir = 0, vueltas = 0;
  while (ps.some(l => l.estado === 'va' || l.estado === 'dentro') && vueltas++ < 20) {
    const paradas = ps.filter(l => l.estado === 'va').map(l => l.a.y).concat(ps.filter(l => l.estado === 'dentro').map(l => l.y));
    let cand = paradas.filter(y => dir === 0 || Math.abs(y - ASC.y) < 1 || Math.sign(y - ASC.y) === dir);
    if (!cand.length) cand = paradas;
    cand.sort((p, q) => Math.abs(p - ASC.y) - Math.abs(q - ASC.y));
    const y = cand[0];
    if (Math.abs(y - ASC.y) >= 1) dir = Math.sign(y - ASC.y);
    await ascensor(clavePiso(y));
    const bajan = ps.filter(l => l.estado === 'dentro' && Math.abs(l.y - y) < 1);
    for (const l of bajan) {
      l.a.enCabina = false; l.a.y = l.y; l.estado = 'fuera';
      l.sale = l.a.ir(l.x, VEL).then(() => quedar(l.a, l.o));
    }
    if (bajan.length) await espera(0.45);
    const suben = ps.filter(l => l.estado === 'va' && Math.abs(l.a.y - y) < 1);
    await Promise.all(suben.map(l => l.llega));
    const dentro = ps.filter(l => l.estado === 'dentro').length;
    await Promise.all(suben.map((l, i) => {
      l.estado = 'entrando';
      return l.a.ir(ASC.x - 9 + ((dentro + i) % 4) * 6, VEL).then(() => { l.a.enCabina = true; l.estado = 'dentro'; l.a.vista = 'frente'; });
    }));
    if (suben.length) await espera(0.2);
  }
  await Promise.all(ps.map(l => l.sale));
}

async function viaje(lista) {
  const tareas = [];
  const pasajeros = [];
  for (const l of lista) {
    l.a.sigue = null;
    if (Math.abs(l.a.y - l.y) < 2) { l.a.sentado = false; tareas.push(l.a.ir(l.x, VEL).then(() => quedar(l.a, l.o))); }
    else pasajeros.push(l);
  }
  if (pasajeros.length) tareas.push(usarAscensor(() => despachar(pasajeros)));
  await Promise.all(tareas);
}

// La red. Un paquete sale de un equipo, sube por su cable a la bandeja del techo, la sigue hasta el ducto,
// cambia de piso por el ducto y baja por el cable del equipo que lo recibe.
function camino(k) {
  const R = P.red;
  if (k === 'bodega') return R.bodega.slice().reverse();
  if (k === 'calle') return R.calle.slice();
  if (R.externos[k]) return R.externos[k].map(p => p.slice());
  const [x, y, p] = R.nodos[k];
  return [[x, y], [x, R.bandejas[p]]];
}

function rutaRed(a, b) {
  const R = P.red;
  const ida = camino(a), vuelta = camino(b).slice().reverse();
  const ya = ida[ida.length - 1][1], yb = vuelta[0][1];
  if (Math.abs(ya - yb) < 1) return ida.concat(vuelta);
  return ida.concat([[R.ducto, ya], [R.ducto, yb]]).concat(vuelta);
}

function paqueteEn(pts, o = {}) {
  const color = o.color || '#7af0ff';
  const p = cosa({ x: pts[0][0], y: pts[0][1], capa: 9, estela: true });
  p.dibujar = (c, p) => {
    const x = Math.round(p.x), y = Math.round(p.y);
    c.save(); c.globalAlpha *= p.alfa;
    c.fillStyle = color; c.globalAlpha *= 0.3; c.fillRect(x - 3, y - 3, 7, 7); c.globalAlpha /= 0.3;
    c.fillStyle = color; c.fillRect(x - 1, y - 1, 3, 3);
    c.fillStyle = '#ffffff'; c.fillRect(x, y, 1, 1);
    if (o.spr) spr(c, o.spr, 0, x, y - 3, { ay: 1 });
    c.restore();
  };
  p.esPaquete = true;
  p.hud = (c, H) => {
    if (!o.txt || (o.txt.length > 5 && cam.z < 2)) return;
    const s = H.s;
    const [sx, sy] = H.aP(p.x, p.y - (o.spr ? 18 : 5));
    const w = (medirTexto(o.txt) + 6) * s, h = 9 * s;
    const x0 = Math.round(sx - w / 2), y0 = Math.round(sy - h - 2 * s);
    c.save(); c.globalAlpha *= p.alfa;
    c.fillStyle = '#1b1522'; c.fillRect(x0 - s, y0 - s, w + 2 * s, h + 2 * s);
    c.fillStyle = color; c.fillRect(x0, y0, w, h);
    texto(c, o.txt, x0 + 3 * s, y0 + 2 * s, '#1b1522', null, s);
    c.restore();
  };
  return p;
}

async function enviar(a, b, o = {}) {
  const pts = o.pts || rutaRed(a, b);
  const p = paqueteEn(pts, o);
  if (o.seguir) seguir(p, o.seguir, 5);
  SON.tono(1400, 0.06, 'square', 0.06);
  await recorrer(p, pts, o.vel || 200);
  quitar(p);
  const fin = pts[pts.length - 1];
  fx.chispas(fin[0], fin[1], 8, [o.color || '#7af0ff', '#ffffff']);
  SON.tono(1800, 0.05, 'square', 0.05);
  return fin;
}

// Una pantalla flotante que apunta a algo, con titulo y lineas que se escriben solas
function pantalla(ax, ay, lineas, o = {}) {
  const L = lineas.map(l => typeof l === 'string' ? { t: l } : l);
  const p = cosa({ x: ax, y: ay, capa: 9, esc: 0, txt: '', fija: !!o.fija, t0: T });
  const col = o.color || TI;
  p.esPantalla = true;
  p.hud = (c, H) => {
    const s = H.s;
    const w = (Math.max(...L.map(l => medirTexto(l.t)), o.titulo ? medirTexto(o.titulo) : 0) + 10) * s;
    const h = (L.length * 9 + 5 + (o.titulo ? 11 : 0)) * s;
    const [ax, ay] = H.aP(p.x, p.y);
    // si lo que senala quedo fuera de cuadro, la pantalla espera
    if (ax < -H.W * 0.05 || ax > H.W * 1.05 || ay < -H.H * 0.05 || ay > H.H * 1.05) return;
    const g = 9 * s, dx = (o.dx || 0) * s;
    // cuatro lugares posibles; se queda con el que menos tapa, y no salta si el de antes sigue sirviendo
    const lados = {
      arriba: [ax - w / 2 + dx, ay - h - g], abajo: [ax - w / 2 + dx, ay + g],
      der: [ax + g * 2, ay - h / 2], izq: [ax - w - g * 2, ay - h / 2],
    };
    const preferencia = o.abajo ? ['abajo', 'arriba', 'der', 'izq'] : ['arriba', 'abajo', 'der', 'izq'];
    // la gente cercana tambien cuenta, para que el panel no le tape la cara a nadie
    const caras = [];
    for (const a of Object.values(ACT)) {
      if (!a.visible || a.tipo !== 'persona') continue;
      const [px, py] = H.aP(a.x, a.y - 30);
      if (px > -50 && px < H.W + 50 && py > -50 && py < H.H + 50) caras.push({ x0: px - 9 * H.z, y0: py - 6 * H.z, x1: px + 9 * H.z, y1: py + 30 * H.z });
    }
    const caja = lado => {
      let [x0, y0] = lados[lado];
      const cx0 = clamp(x0, 8, Math.max(8, H.W - w - 8)), cy0 = clamp(y0, 8, Math.max(8, H.H - h - H.abajo));
      const r = { x0: cx0, y0: cy0, x1: cx0 + w, y1: cy0 + h };
      // tapar un globo o salirse de su lugar cuesta; lo mas natural es arriba
      const costo = solape(r, H.ocupado) * 2 + solape(r, caras) + (Math.abs(cx0 - x0) + Math.abs(cy0 - y0)) * w * 0.15 + preferencia.indexOf(lado) * w * 2;
      return { lado, r, costo };
    };
    const opciones = preferencia.map(caja).sort((a, b) => a.costo - b.costo);
    let elegido = opciones[0];
    const antes = p.lado && opciones.find(x => x.lado === p.lado);
    if (antes && antes.costo <= elegido.costo * 1.25 + w) elegido = antes;
    p.lado = elegido.lado;
    const { x0, y0 } = { x0: Math.round(elegido.r.x0), y0: Math.round(elegido.r.y0) };
    H.ocupado.push({ x0, y0, x1: x0 + w, y1: y0 + h });
    c.save();
    c.globalAlpha *= p.alfa;
    c.translate(ax, ay); c.scale(p.esc, p.esc); c.translate(-ax, -ay);
    // la colita hacia lo que se senala, si la caja quedo cerca
    c.fillStyle = '#1b1522';
    const lado = p.lado;
    const pegada = lado === 'arriba' ? Math.abs(y0 + h - (ay - g)) < 2 : lado === 'abajo' ? Math.abs(y0 - (ay + g)) < 2
      : Math.abs((lado === 'der' ? x0 : x0 + w) - (lado === 'der' ? ax + g * 2 : ax - g * 2)) < 2;
    if (pegada) {
      if (lado === 'arriba' || lado === 'abajo') {
        const cx = clamp(Math.round(ax), x0 + 4 * s, x0 + w - 5 * s);
        for (let i = 0; i < 6; i++) {
          const yy = lado === 'abajo' ? ay + g - i * s - s : ay - g + i * s;
          c.fillRect(cx - Math.floor(i / 2) * s, Math.round(yy), (1 + 2 * Math.floor(i / 2)) * s, s);
        }
      } else {
        const cy = clamp(Math.round(ay), y0 + 4 * s, y0 + h - 5 * s);
        for (let i = 0; i < 6; i++) {
          const xx = lado === 'der' ? ax + g * 2 - i * s - s : ax - g * 2 + i * s;
          c.fillRect(Math.round(xx), cy - Math.floor(i / 2) * s, s, (1 + 2 * Math.floor(i / 2)) * s);
        }
      }
    }
    c.fillRect(x0 - s, y0 - s, w + 2 * s, h + 2 * s);
    c.fillStyle = '#121626'; c.fillRect(x0, y0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let yy = y0 + s; yy < y0 + h; yy += 2 * s) c.fillRect(x0, yy, w, s);
    let y = y0 + 3 * s;
    if (o.titulo) {
      c.fillStyle = col; c.fillRect(x0, y0, w, 10 * s);
      texto(c, o.titulo, x0 + 5 * s, y0 + 2 * s, '#ffffff', 'rgba(0,0,0,0.3)', s);
      y += 11 * s;
    }
    let quedan = (T - p.t0) * (o.vel || 75);
    for (const l of L) {
      const n = clamp(Math.floor(quedan), 0, l.t.length);
      if (n > 0) texto(c, l.t.slice(0, n), x0 + 5 * s, y, l.c || '#e8ecf4', null, s);
      quedan -= l.t.length + 3;
      y += 9 * s;
    }
    c.restore();
  };
  tween(p, { esc: 1 }, 0.35, E.resorte);
  SON.pop();
  return p;
}

function sala(id, w, dy = -6, h = 100) {
  const s = D.salas.find(s => s.id === id);
  return { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 + dy, w: w || (s.x1 - s.x0 + 26), h };
}

function popEn(nombre, x, y, o = {}) {
  const k = cosa(Object.assign({ spr: nombre, x, y, esc: 0, capa: 9 }, o));
  tween(k, { esc: o.escFinal || 1 }, 0.35, E.resorte);
  SON.pop();
  if (o.flota) k.mueve = () => { k.y = y + Math.sin((T - k.nace) * 3) * 1.5; };
  return k;
}

async function encuesta(quien, n, nota) {
  const a = ACT[quien];
  for (let k = 0; k < 5; k++) {
    const e = popEn('estrella', a.x - 24 + k * 12, a.y - 50, { flota: true });
    if (k >= n) e.alfa = 0.3;
    SON.blip(1 + k * 0.15);
    await espera(0.13);
  }
  etiqueta('ENCUESTA ' + n + ' DE 5', a.x, a.y - 58, '#f0a020');
  if (nota) etiqueta(nota, a.x, a.y - 72, '#3a3e4a');
}

function horaA(h, dur = 2) { return tween(HORA, { v: h }, dur, E.suave); }

async function conducir(v, x, dur, ease) {
  v.anda = true;
  await tween(v, { x }, dur, ease);
  v.anda = false;
}

async function darVuelta(v, dy = -10) {
  await tween(v, { ex: 0.12, y: v.y + dy / 2 }, 0.4, E.entra);
  v.dir = -v.dir;
  await tween(v, { ex: 1, y: v.y + dy / 2 }, 0.4, E.sale);
}

// Afuera se pisa a media banqueta, unos pixeles mas abajo que el piso del edificio, como en un juego de lado.
// En la puerta se sube o se baja el escalon.
const ACERA = D.mundo.calle + 4;
const PUERTA = D.puntos.entrada[0] - 10;
async function escalon(a, y) {
  a.saltar(3, 0.24);
  await tween(a, { y }, 0.24, E.suave);
}
async function andar(a, x, vel = VEL) {
  const fuera = a.y > PISO.pb + 1;
  if (fuera && x >= PUERTA) { await a.ir(PUERTA - 2, vel); await escalon(a, PISO.pb); }
  else if (!fuera && Math.abs(a.y - PISO.pb) < 1 && a.x >= PUERTA && x < PUERTA) { await a.ir(PUERTA + 1, vel); await escalon(a, ACERA); }
  await a.ir(x, vel);
}
// algo que alguien lleva, al hombro (un saco) o en la mano (un papel, una caja); va delante de quien lo lleva
function llevar(a, nombre, o = {}) {
  const k = cosa({ spr: nombre, x: a.x, y: a.y, capa: 2, ay: 1 });
  k.mueve = () => {
    const paso = a.anda ? Math.floor(a.recorrido / 5) % 2 : 0;
    const d = a.vista === 'lado' ? a.dir : 1;
    // el saco va en el hombro de atras, detras de la cabeza; lo de la mano va delante
    k.x = a.x + (o.mano ? 8 : -7) * d;
    k.y = a.y - (o.mano ? 9 : 13) - a.salto - paso;
    k.capa = o.mano ? (a.capa === 3 ? 3 : 2) : (a.capa === 3 ? 2.9 : 1);
    k.alfa = a.alfa;
    k.flip = d < 0;
  };
  return k;
}
// lo deja en un lugar, bajandolo sin lanzarlo
async function dejar(k, x, y, dur = 0.35) {
  k.mueve = null;
  await tween(k, { x, y }, dur, E.suave);
}
