// El guion. Cada escena tiene su camara, su hora del dia y sus pasos. Cada clic corre un paso,
// y casi todos terminan con un solo globo, para que quien presenta tenga su turno de hablar.
// A es el Responsable de TI, que hace de guia (camisa turquesa), y B es el nuevo (camisa amarilla).
// Todo lo que pasa sale del proyecto, los tickets 255, 256 y 258 de la demo de la Entrega 5, lo que decidio el bot
// con tev1:4b (escalado-ia/datos/lista-bot.json), el problema 36 de las facturas con su cambio 70 y el Release 1.4.2.
'use strict';


// ─────────────────────────────────────────────────────────────────────────────
// el reparto, las 5 personas de TI son A, los dos tecnicos de la Mesa, el Analista de Aplicaciones y el de Datos
// ─────────────────────────────────────────────────────────────────────────────
const A = new Actor('guia', { color: TI });
const B = new Actor('nuevo', { color: '#f0c040' });
const GENTE = {
  tec1: [348, 'p1'], tec2: [426, 'p1'], sistemas: [378, 'p2'], datos: [350, 'p3'],
  vendedor: [462, 'pb'], despacho: [812, 'pb'], finanzas: [660, 'p2'], contador: [762, 'p2'],
  bodega1: [1104, 'pb'], bodega2: [905, 'pb'], enc1: [P.suc1[0], 'pb'], enc2: [P.suc2[0], 'pb'],
};
const COLOR = { tec1: TI, tec2: TI, sistemas: '#2a7ad8', datos: '#8a5ad0', vendedor: '#d8443c',
  despacho: '#8a5ad0', finanzas: '#f07aa0', contador: '#f07aa0', bodega1: '#f08a30', bodega2: '#f08a30',
  cliente: '#c8a050', davi: TI, juanpa: TI, meme: TI };
// las encargadas de las dos sucursales
const BASE = { enc1: 'marta', enc2: 'sofia' };
COLOR.enc1 = COLOR.enc2 = '#3aa060';
for (const id of Object.keys(GENTE).concat(['cliente', 'davi', 'juanpa', 'meme'])) new Actor(id, { color: COLOR[id], base: BASE[id] || id });
const SALA_DE = { tec1: 'p1_izq', tec2: 'p1_izq', sistemas: 'p2_izq', datos: 'p3_izq', vendedor: 'pb_izq',
  despacho: 'pb_der', finanzas: 'p2_der', contador: 'p2_der', bodega1: 'bodega', bodega2: 'bodega' };

// el perro de la distribuidora, da un paso cada 4 pixeles
const PERRO = new Actor('perro', { tipo: 'animal', cabeza: 18, color: '#d08a3c', ancho: 8 });
PERRO.anim = a => {
  if (a.anda) return { n: 'perro_camina', f: Math.floor(a.recorrido / 4) };
  if (a.sentado) return { n: 'perro_sentado', f: Math.floor(a.fase * 4) };
  return { n: 'perro_quieto', f: Math.floor(a.fase * 5) };
};
// las gallinas de la bodega
const GALLINAS = [0, 1, 2].map(i => {
  const g = new Actor('gallina' + i, { tipo: 'animal', x: 1010 + i * 30, y: PISO.pb, cabeza: 14, ancho: 4 });
  g.pica = 0;
  g.anim = a => a.anda ? { n: 'gallina_camina', f: Math.floor(a.recorrido / 3) } : { n: 'gallina_pica', f: a.pica > 0 ? Math.floor(a.fase * 6) % 2 : 0 };
  g.prox = 1 + Math.random() * 3;
  return g;
});
// la IA en la laptop con GPU, la tarjeta de video y la palanca
const IA = { despierta: false, cara: 'cerrados', parpadeo: 0, aura: 0 };
const LLAMA = new Actor('llama', { tipo: 'fijo', x: P.llama[0], y: P.llama[1], cabeza: 38, color: '#58f0ff' });
LLAMA.anim = () => {
  let cara = IA.cara;
  if (IA.despierta && cara === 'abiertos' && IA.parpadeo > 0) cara = 'parpadeo';
  return { n: 'llama_' + cara, f: 0, dy: IA.despierta ? Math.round(Math.sin(T * 2) * 0.6) : (Math.sin(T * 1.2) > 0 ? 0 : 1) };
};
const LAPTOP = new Actor('laptop', { tipo: 'fijo', spr: 'laptop', x: P.laptop[0], y: P.laptop[1] + 1 });
LAPTOP.pantalla = 0;
LAPTOP.anim = a => ({ n: 'laptop', f: a.pantalla });
const GPU = new Actor('gpu', { tipo: 'fijo', x: P.gpu[0], y: P.gpu[1] });
GPU.prendida = false;
GPU.anim = a => a.prendida ? { n: 'gpu', f: Math.floor(T * 14) } : { n: 'gpu_apagada', f: 0 };
const PALANCA = new Actor('palanca', { tipo: 'fijo', x: P.palanca[0], y: P.palanca[1] });
PALANCA.pos = 0;
PALANCA.anim = a => ({ n: 'palanca', f: a.pos });
// el bot de escalado, en Docker, la ballena dentro de su pecera
const BALLENA = new Actor('ballena', { tipo: 'fijo', capa: 0.5, x: P.ballena[0], y: D.rects.pecera[3] + 3, cabeza: 30, color: '#2496ed' });
BALLENA.anim = a => ({ n: 'ballena', f: Math.floor(T * 2) % 2, dy: Math.round(Math.sin(T * 1.4) * 2) });

const CAMION = vehiculo('camion', 'camion', [-36, 26, 40], { x: 1182, y: 636 });
// con la puerta de atras abierta se ve la rampa del anden y los sacos que van entrando
const ruedasCamion = CAMION.extra;
CAMION.extra = (c, a) => {
  ruedasCamion(c, a);
  if (a.carga === undefined) return;
  const x0 = Math.round(a.x) - 51, y0 = Math.round(a.y - a.salto) - 43;
  c.fillStyle = '#2a2018'; c.fillRect(x0, y0, 17, 28);
  c.fillStyle = '#3a2c20'; c.fillRect(x0, y0, 17, 2);
  for (let i = 0; i < a.carga; i++) {
    const sx = x0 + 1 + (i % 2) * 8, sy = y0 + 27 - (Math.floor(i / 2) + 1) * 7;
    c.fillStyle = '#1b1522'; c.fillRect(sx, sy, 8, 7);
    c.fillStyle = '#e8d8b0'; c.fillRect(sx + 1, sy + 1, 6, 5);
    c.fillStyle = ['#f0c040', '#3aa060', '#8a5a2e', '#2a7ad8'][i % 4]; c.fillRect(sx + 2, sy + 3, 4, 2);
  }
  // la puerta abierta hacia la izquierda
  c.fillStyle = '#1b1522'; c.fillRect(x0 - 10, y0 - 1, 9, 30);
  c.fillStyle = '#f4f1ea'; c.fillRect(x0 - 9, y0, 7, 28);
  c.fillStyle = '#d8d0c0'; c.fillRect(x0 - 9, y0 + 14, 7, 1); c.fillRect(x0 - 3, y0 + 2, 1, 24);
  // la rampa del anden al piso del camion
  const [rx0, ry0, rx1, ry1] = [1117, 601, x0 + 3, y0 + 28];
  const n = Math.ceil(Math.hypot(rx1 - rx0, ry1 - ry0));
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = Math.round(lerp(rx0, rx1, t)), y = Math.round(lerp(ry0, ry1, t));
    c.fillStyle = '#1b1522'; c.fillRect(x, y - 1, 1, 4);
    c.fillStyle = k % 6 === 0 ? '#7a4e22' : '#a8703a'; c.fillRect(x, y, 1, 2);
  }
};
const CAMIONETA = vehiculo('camioneta', 'camioneta', [-38, 34], { x: -460, y: 636 });
const MONTA = vehiculo('montacargas', 'montacargas', [-12, 6], { x: 1180, y: PISO.pb, vel: 50 });

// ─────────────────────────────────────────────────────────────────────────────
// estado de las pantallas y tableros
// ─────────────────────────────────────────────────────────────────────────────
const ST = {};
function estadoInicial() {
  Object.assign(ST, {
    resaltes: [], sacos: 1240, bodegaMsg: '', mapa: false, nubeEnlace: false, constelacion: 0, impacto: -1,
    falla: false, ok: false, sla: 0, nubes: 0, cola: 0, kpi: [0, 0, 0, 0, 0, 0], linea: 0, pdca: 0,
    hilos: [], tunel: false, glpiFlash: 0, medidor: null, fiesta: false, fin: 0, sistemasPant: '',
    tarjetas: [],
  });
}
estadoInicial();

// la CMDB como constelacion, 44 elementos y 37 relaciones
const ESTR = (() => {
  let s = 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pts = Array.from({ length: 44 }, () => [340 + r() * 600, 18 + r() * 190]);
  const lineas = [];
  for (let i = 1; i < pts.length && lineas.length < 37; i++) {
    let mejor = 0, d = 1e9;
    for (let j = 0; j < i; j++) { const dd = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (dd < d) { d = dd; mejor = j; } }
    lineas.push([i, mejor]);
  }
  return { pts, lineas };
})();
const ROJO_CMDB = new Set();
function impactoDesde(k) {
  // todo lo que cuelga de k en la constelacion
  ROJO_CMDB.clear(); ROJO_CMDB.add(k);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const [i, j] of ESTR.lineas) if (ROJO_CMDB.has(j) && !ROJO_CMDB.has(i)) { ROJO_CMDB.add(i); cambio = true; }
  }
}

capaExtra.push({ capa: 0, fn: c => {
  if (ST.constelacion > 0) {
    const n = Math.floor(ST.constelacion * 44);
    for (let k = 0; k < Math.min(37, Math.floor(ST.constelacion * 37)); k++) {
      const [i, j] = ESTR.lineas[k];
      const roja = ST.impacto >= 0 && ROJO_CMDB.has(i) && ROJO_CMDB.has(j);
      c.fillStyle = roja ? `rgba(255,90,70,${0.6 + 0.4 * Math.sin(T * 8)})` : 'rgba(255,240,180,0.55)';
      const [x0, y0] = ESTR.pts[i], [x1, y1] = ESTR.pts[j];
      const pasos = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
      for (let s = 0; s <= pasos; s += 2) c.fillRect(Math.round(lerp(x0, x1, s / pasos)), Math.round(lerp(y0, y1, s / pasos)), 1, 1);
    }
    for (let k = 0; k < n; k++) {
      const [x, y] = ESTR.pts[k];
      const roja = ST.impacto >= 0 && ROJO_CMDB.has(k);
      const b = 0.6 + 0.4 * Math.sin(T * 4 + k);
      c.fillStyle = roja ? `rgba(255,80,60,${b})` : `rgba(255,236,150,${b})`;
      c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); c.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      if (roja && k === ST.impacto) { c.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); c.fillRect(Math.round(x), Math.round(y) - 2, 1, 5); }
    }
  }
  P.nubes.forEach(([x, y], i) => {
    if (ST.nubes <= 0) return;
    const yy = y + Math.round(Math.sin(T * 0.8 + i * 2) * 3);
    c.save(); c.globalAlpha *= ST.nubes;
    if (ST.nubeEnlace) {
      const [ax, ay] = P.antena;
      const n = 26;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = lerp(ax, x, t), py = lerp(ay, yy + 6, t) - Math.sin(t * Math.PI) * 16;
        const on = ((k - T * 12 + i * 5) % 6 + 6) % 6 < 1.2;
        c.fillStyle = on ? '#fff7a0' : 'rgba(255,255,255,0.8)';
        c.fillRect(Math.round(px) - (on ? 1 : 0), Math.round(py) - (on ? 1 : 0), on ? 3 : 1, on ? 3 : 1);
      }
    }
    spr(c, 'nube', i, x, yy + 18);
    spr(c, 'servidor', 0, x, yy + 6);
    for (let k = 0; k < 4; k++) {
      c.fillStyle = Math.sin(T * (5 + k) + i * 3 + k) > 0.2 ? '#7aff8a' : '#2a6a3a';
      c.fillRect(x + 6, yy - 25 + k * 7, 2, 2);
      c.fillStyle = Math.sin(T * (7 + k) + i) > 0.6 ? '#ffd23c' : '#5a4a1a';
      c.fillRect(x + 9, yy - 25 + k * 7, 2, 2);
    }
    texto(c, P.nube_nombres[i], x - Math.floor(medirTexto(P.nube_nombres[i]) / 2), yy + 22, '#2a3a5a');
    c.restore();
  });
} });

// el agua y el vidrio de la pecera, encima de la ballena
capaExtra.push({ capa: 1.4, fn: c => {
  const [x0, y0, x1, y1] = D.rects.pecera;
  c.fillStyle = 'rgba(40,132,216,0.28)';
  c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  c.fillStyle = 'rgba(200,240,255,0.55)';
  c.fillRect(x0, y0, x1 - x0 + 1, 1);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fillRect(x0 + 4, y0 + 2, 1, 12); c.fillRect(x0 + 6, y0 + 2, 1, 6);
} });

// lo que va pegado a las paredes, detras de la gente
function camioncito(c, x, y, dir) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = '#1b1522'; c.fillRect(x - 4, y - 3, 9, 5);
  c.fillStyle = '#f4f1ea'; c.fillRect(x - 3 - (dir < 0 ? -2 : 0), y - 2, 5, 3);
  c.fillStyle = '#f08a30'; c.fillRect(dir > 0 ? x + 2 : x - 3, y - 1, 2, 2);
  c.fillStyle = '#1b1522'; c.fillRect(x - 3, y + 1, 1, 1); c.fillRect(x + 2, y + 1, 1, 1);
}
capaExtra.push({ capa: 1, fn: c => {
  const [cx0, cy0] = D.rects.contador;
  // el letrero de la bodega, centrado; si un mensaje no cabe se parte en dos renglones
  {
    const msg = ST.bodegaMsg || ('SACOS ' + Math.round(ST.sacos));
    const ancho = D.rects.contador[2] - cx0 - 4, col = ST.bodegaMsg ? '#ffd23c' : '#7aff8a';
    if (medirTexto(msg) <= ancho) texto(c, msg, cx0 + Math.floor((ancho + 4 - medirTexto(msg)) / 2), cy0 + 4, col);
    else {
      const p = msg.split(' '), r1 = p.slice(0, Math.ceil(p.length / 2)).join(' '), r2 = p.slice(Math.ceil(p.length / 2)).join(' ');
      for (const [r, dy] of [[r1, 0], [r2, 8]]) texto(c, r, cx0 + Math.floor((ancho + 4 - medirTexto(r)) / 2), cy0 + 1 + dy, col);
    }
  }
  if (ST.mapa) {
    ['mapa0', 'mapa1', 'mapa2'].forEach((r, i) => {
      const ruta = D.rutas[r];
      const t = ((T * 0.06 + i * 0.33) % 1);
      const p = puntoEn(ruta, t), q = puntoEn(ruta, Math.min(1, t + 0.01));
      camioncito(c, p[0], p[1], q[0] >= p[0] ? 1 : -1);
    });
  }
  const [qx0, qy0] = D.rects.cola;
  for (let i = 0; i < ST.cola; i++) spr(c, 'ticket_inc', 0, qx0 + 8 + i * 13, qy0 + 18);
  const [kx0, ky0, kx1, ky1] = D.rects.kpi;
  const cols = ['#3aa060', '#58e0d8', '#f0c040', '#2a7ad8', '#a070ff', '#ff7a5a'];
  ST.kpi.forEach((v, i) => {
    const h = Math.round(v * (ky1 - ky0 - 6));
    c.fillStyle = cols[i]; c.fillRect(kx0 + 6 + i * 11, ky1 - 2 - h, 7, h);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(kx0 + 6 + i * 11, ky1 - 2 - h, 7, 1);
  });
  if (ST.linea > 0) {
    const lx0 = kx0 + 76, lx1 = kx1 - 4;
    const n = Math.floor((lx1 - lx0) * ST.linea);
    for (let k = 0; k <= n; k++) {
      const t = k / (lx1 - lx0);
      const y = ky1 - 4 - (t * 0.8 + Math.sin(t * 9) * 0.08) * (ky1 - ky0 - 8);
      c.fillStyle = '#7aff8a'; c.fillRect(lx0 + k, Math.round(y), 1, 2);
    }
  }
  spr(c, 'pdca', ST.pdca, P.pdca[0], P.pdca[1], { ay: 0.5 });
  // las tarjetas del corcho
  for (const t of ST.tarjetas) {
    const x = Math.round(t.x), y = Math.round(t.y);
    c.fillStyle = '#1b1522'; c.fillRect(x - 1, y - 1, t.w + 2, 12);
    c.fillStyle = t.fondo; c.fillRect(x, y, t.w, 10);
    c.fillStyle = t.color; c.fillRect(x, y, t.w, 2);
    texto(c, t.txt, x + 2, y + 3, '#1b1522');
    c.fillStyle = '#e03a30'; c.fillRect(x + Math.floor(t.w / 2), y - 2, 2, 2);
  }
  for (const h of ST.hilos) {
    const [x0, y0] = h.de, [x1, y1] = h.a;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= n * h.t; k++) {
      const t = k / n;
      c.fillStyle = '#e03a30';
      c.fillRect(Math.round(lerp(x0, x1, t)), Math.round(lerp(y0, y1, t) + Math.sin(t * Math.PI) * 4), 1, 1);
    }
  }
} });

// lo que brilla aunque la sala este a oscuras
capaExtra.push({ capa: 8, fn: c => {
  const [gx0, gy0, gx1] = D.rects.glpi;
  for (let i = 0; i < 7; i++) {
    const y = gy0 + 3 + i * 8 + 3;
    const on = Math.sin(T * (6 + i) + i * 2) > 0 || ST.glpiFlash > 0;
    c.fillStyle = ST.glpiFlash > 0 ? '#ffffff' : (on ? '#7aff8a' : '#1a4a2a');
    c.fillRect(gx1 - 8, y, 2, 2);
    c.fillStyle = Math.sin(T * 9 + i * 5) > 0.5 ? '#ffd23c' : '#4a3a10';
    c.fillRect(gx1 - 5, y, 2, 2);
  }
  if (ST.tunel) {
    const ruta = D.rutas.tunel;
    for (let k = 0; k < 6; k++) {
      const p = puntoEn(ruta, ((T * 0.35 + k / 6) % 1));
      c.fillStyle = 'rgba(255,200,120,0.5)'; c.fillRect(Math.round(p[0]) - 2, Math.round(p[1]) - 2, 5, 5);
      c.fillStyle = '#fff3c0'; c.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3);
    }
  }
  if (LAPTOP.pantalla > 0) { c.fillStyle = 'rgba(88,240,255,0.12)'; c.fillRect(LAPTOP.x - 16, LAPTOP.y - 30, 32, 24); }
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
  if (IA.despierta) { c.fillStyle = 'rgba(88,240,255,0.25)'; c.fillRect(LLAMA.x - 6, LLAMA.y - 26, 4, 3); c.fillRect(LLAMA.x + 2, LLAMA.y - 26, 4, 3); }
  // la pantalla de ventas, una x roja cuando la factura sale mal, verde cuando ya salio bien
  const [vx, vy] = P.pantalla_venta;
  if (ST.falla && Math.floor(T * 3) % 2) {
    c.fillStyle = '#ff3a3a';
    for (let k = -2; k <= 2; k++) { c.fillRect(vx + k, vy - 2 + k + 2, 1, 1); c.fillRect(vx + k, vy + 2 - k - 2 + 2, 1, 1); }
  } else if (ST.ok) { c.fillStyle = 'rgba(122,255,138,0.55)'; c.fillRect(vx - 6, vy - 4, 12, 7); }
  // las barras de la pantalla de Finanzas, crecen cuando llega algo
  if (ST.fin > 0) {
    const [fx0, fy0] = [P.red.nodos.finanzas[0] - 6, P.red.nodos.finanzas[1] + 2];
    for (let k = 0; k < 3; k++) {
      const h = Math.max(1, Math.round((2 + k) * ST.fin));
      c.fillStyle = ['#7aff8a', '#ffd23c', '#58e0d8'][k];
      c.fillRect(fx0 + 2 + k * 3, fy0 + 8 - h, 2, h);
    }
  }
  // el reloj del acuerdo de servicio
  if (ST.sla > 0) {
    const [rx, ry] = P.reloj;
    for (let a = 0; a < 60; a++) {
      const t = a / 60;
      const ang = -Math.PI / 2 + t * Math.PI * 2;
      c.fillStyle = t <= ST.sla ? (ST.sla > 0.85 ? '#ff5a3a' : '#7aff8a') : 'rgba(27,21,34,0.35)';
      c.fillRect(Math.round(rx + Math.cos(ang) * 10), Math.round(ry + Math.sin(ang) * 10), 2, 2);
    }
    const ang = -Math.PI / 2 + ST.sla * Math.PI * 2;
    c.fillStyle = '#1b1522';
    for (let k = 0; k < 6; k++) c.fillRect(Math.round(rx + Math.cos(ang) * k), Math.round(ry + Math.sin(ang) * k), 1, 1);
  }
  // el medidor de la IA, la aguja es la probabilidad de escalar y la raya el umbral de 60
  if (ST.medidor) {
    const m = ST.medidor;
    const cx = m.x, cy = m.y, r = 16;
    c.fillStyle = '#1b1522'; c.fillRect(cx - r - 3, cy - r - 3, 2 * r + 7, r + 17);
    c.fillStyle = '#fbf6ea'; c.fillRect(cx - r - 2, cy - r - 2, 2 * r + 5, r + 15);
    for (let a = 0; a <= 40; a++) {
      const t = a / 40;
      const ang = Math.PI + t * Math.PI;
      c.fillStyle = t < 0.6 ? '#f0a020' : '#3aa060';
      for (let g = 0; g < 3; g++) c.fillRect(Math.round(cx + Math.cos(ang) * (r - g)), Math.round(cy + Math.sin(ang) * (r - g)), 1, 1);
    }
    const um = Math.PI + 0.6 * Math.PI;
    c.fillStyle = '#1b1522';
    for (let g = 0; g < 6; g++) c.fillRect(Math.round(cx + Math.cos(um) * (r + 2 - g)), Math.round(cy + Math.sin(um) * (r + 2 - g)), 1, 1);
    const ang = Math.PI + m.v * Math.PI;
    c.fillStyle = '#e03a30';
    for (let k = 0; k < r - 2; k++) c.fillRect(Math.round(cx + Math.cos(ang) * k), Math.round(cy + Math.sin(ang) * k), 1, 1);
    c.fillStyle = '#1b1522'; c.fillRect(cx - 1, cy - 1, 3, 3);
    const pct = (m.v * 100 < 1 ? (m.v * 100).toFixed(1) : Math.round(m.v * 100)) + '%';
    texto(c, pct, cx - Math.floor(medirTexto(pct) / 2), cy + 4, m.v >= 0.6 ? '#2c7a3a' : '#c0571a');
  }
  if (ST.glpiFlash > 0) ST.glpiFlash -= 1 / 60;
} });

// resaltes de las areas
capaExtra.push({ capa: 8, fn: c => {
  for (const r of ST.resaltes) {
    const pulso = 0.6 + 0.4 * Math.sin(T * 5);
    c.globalAlpha = r.alfa * pulso;
    c.fillStyle = r.color;
    for (const id of r.salas) {
      const s = D.salas.find(s => s.id === id);
      const g = 2;
      c.fillRect(s.x0, s.y0, s.x1 - s.x0 + 1, g); c.fillRect(s.x0, s.y1 - g + 1, s.x1 - s.x0 + 1, g);
      c.fillRect(s.x0, s.y0, g, s.y1 - s.y0 + 1); c.fillRect(s.x1 - g + 1, s.y0, g, s.y1 - s.y0 + 1);
      c.globalAlpha = r.alfa * 0.12;
      c.fillRect(s.x0, s.y0, s.x1 - s.x0 + 1, s.y1 - s.y0 + 1);
      c.globalAlpha = r.alfa * pulso;
    }
    c.globalAlpha = 1;
  }
} });

// los faros, al amanecer y al anochecer
capaExtra.push({ capa: 8, fn: c => {
  if (hora > 6.4 && hora < 18.2) return;
  for (const v of [CAMIONETA, CAMION]) {
    if (!v.visible) continue;
    const fx = v.x + v.dir * v.ex * 56, fy = v.y - 8;
    for (let k = 0; k < 40; k++) {
      const a = 0.22 * (1 - k / 40);
      c.fillStyle = `rgba(255,236,170,${a.toFixed(3)})`;
      const h = 1 + Math.floor(k / 5);
      c.fillRect(Math.round(fx + v.dir * k), Math.round(fy - h / 2), 1, h);
    }
  }
} });


// ─────────────────────────────────────────────────────────────────────────────
// lo que vive solo, cada cuadro
// ─────────────────────────────────────────────────────────────────────────────
let zzzT = 0;
vida.push(dt => {
  for (const g of GALLINAS) {
    if (!g.visible) continue;
    g.prox -= dt;
    if (g.pica > 0) g.pica -= dt;
    if (g.prox <= 0 && !g.anda && !g.ocupada) {
      if (Math.random() < 0.5) { g.pica = 1.2; g.prox = 1.5 + Math.random() * 2; }
      else { g.vel = 16; g.ir(clamp(g.x + (Math.random() - 0.5) * 50, 1004, 1090)); g.prox = 2 + Math.random() * 3; }
    }
  }
  if (IA.despierta) {
    IA.parpadeo -= dt;
    if (IA.parpadeo < -3 - Math.random() * 3) IA.parpadeo = 0.14;
  } else if (LLAMA.visible) {
    zzzT -= dt;
    if (zzzT <= 0) { zzzT = 1.3; fx.zzz(LLAMA.x + 8, LLAMA.y - 32); }
  }
  if (Math.random() < dt * 0.8) fx.burbujas(BALLENA.x + 22, BALLENA.y - 18, 2);
  if (ST.fiesta && Math.random() < dt * 2.2) fx.cohete(330 + Math.random() * 520, 300, 120 + Math.random() * 60);
  for (const v of [CAMIONETA, CAMION, MONTA]) if (v.anda && v.visible && Math.random() < dt * 8) fx.humo(v.x - 50 * v.dir * v.ex, v.y - 8);
});

// Nadie se teletransporta. Cada escena dice a donde va cada quien con va(), y si ya estaba a la vista
// camina por su piso y, si tiene que cambiar de piso, toma el elevador.
let INSTANTE = true;
let LUGARES = [];
function va(a, x, piso, o = {}) {
  a = typeof a === 'string' ? ACT[a] : a;
  const y = typeof piso === 'number' ? piso : PISO[piso];
  if (INSTANTE || !a.visible || a.alfa <= 0) return pon(a, x, piso, o);
  if (Math.abs(a.x - x) < 1 && Math.abs(a.y - y) < 1) { quedar(a, o); return; }
  LUGARES.push({ a, x, y, o });
}



function resaltar(salas, color, txt, x, y) {
  const r = { salas, color, alfa: 0 };
  ST.resaltes.push(r);
  tween(r, { alfa: 1 }, 0.3);
  for (const id of salas) if (!id.startsWith('sot')) luz(id, 1, 0.2);
  SON.brillo();
  if (txt) etiqueta(txt, x, y, color, { fija: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// las escenas
// ─────────────────────────────────────────────────────────────────────────────
const ESCENAS = [
  {
    id: 'portada', titulo: 'Distribuidora Los Consentidos', hora: 5,
    cam: { x: 640, y: 420, w: 1320, h: 800 },
    prep() {
      for (const s of D.salas) luzYa(s.id, 0);
      B.visible = false;
      pon(A, 380, 'pb', { vista: 'frente' });
      pon(PERRO, -80, ACERA, { visible: true, sentado: false });
      pon(CAMIONETA, -460, 636, { vista: 'lado', dir: 1 });
    },
    pasos: [
      async () => {
        horaA(5.9, 5);
        const t1 = cosa({ spr: 'titulo_1', x: 580, y: -80, capa: 10 });
        await tween(t1, { y: 120 }, 0.9, E.rebote);
        SON.golpe(); sacudir(5); fx.chispas(580, 120, 40, ['#ffd23c', '#ffffff', '#f08a30'], 90);
        const t2 = cosa({ spr: 'titulo_2', x: 580, y: 160, capa: 10, esc: 0 });
        await tween(t2, { esc: 1 }, 0.5, E.resorte);
        SON.brillo();
        t1.mueve = () => { t1.y = 120 + Math.sin(T * 2) * 2; };
        ST.titulos = [t1, t2];
      },
      async () => {
        for (const t of ST.titulos || []) { t.mueve = null; tween(t, { y: t.y - 200, alfa: 0 }, 0.8, E.entra); }
        camara({ x: 190, y: 576, w: 300, h: 110 });
        // la camioneta llega frenando a la parada
        await conducir(CAMIONETA, 150, 3.2, E.sale);
        SON.ruido(0.5, 0.15, 3000, 600);
        await espera(0.3);
        // el nuevo se baja por el lado de la acera, detras de la camioneta, y sube a la banqueta
        pon(B, 172, 618, { vista: 'lado', dir: 1, base: 'nuevo' });
        tween(B, { y: ACERA }, 0.45, E.sale);
        B.saltar(4, 0.45);
        await espera(0.2);
        const llega = B.ir(288, VEL);
        seguir(B, 280, 3);
        // cuando ya paso, la camioneta da la vuelta y regresa por donde vino
        (async () => {
          while (B.x < 236) await espera(0.1);
          await darVuelta(CAMIONETA, -10);
          SON.bocina();
          await conducir(CAMIONETA, -620, 3.4, E.entra);
          CAMIONETA.visible = false;
        })();
        await llega;
        B.mira(1);
        await di(B, 1);
      },
      async () => {
        await camara({ x: 580, y: 258, w: 360, h: 120 }, 1.4);
        fx.chispas(P.letrero[0] - 60, P.letrero[1] + 10, 20); fx.chispas(P.letrero[0] + 60, P.letrero[1] + 10, 20);
        SON.brillo();
        await espera(0.7);
        await camara({ x: 300, y: 574, w: 280, h: 110 }, 1.4);
        B.saltar(8);
        await di(B, 2);
      },
    ],
  },
  {
    id: 'llegada', titulo: 'El primer día', hora: 6,
    cam: { x: 330, y: 566, w: 280, h: 110 },
    prep() {
      for (const s of D.salas) luzYa(s.id, 0);
      va(B, 288, ACERA, { vista: 'lado', dir: 1 });
      va(A, 380, 'pb', { vista: 'frente' });
      pon(PERRO, -80, ACERA, { sentado: false });
    },
    async entrada() { await andar(B, 360); B.mira(1); },
    pasos: [
      async () => {
        SON.click(); luz('pb_izq', 1, 0.1); await espera(0.15);
        fx.chispas(436, 532, 10, ['#fff3a0', '#ffffff']);
        await A.ir(398, VEL); A.mira(-1); await A.saltar(6);
        etiqueta('RESPONSABLE DE TI', A.x + 30, A.y + 14, TI);
        await di(A, 2);
      },
      async () => { await di(B, 1); },
      async () => {
        await A.ir(386, VEL); A.mira(-1);
        const g = cosa({ spr: 'gafete', x: A.x - 6, y: A.y - 16, capa: 9 });
        await volar(g, [A.x - 6, A.y - 16], [B.x + 2, B.y - 16], 0.45, -8);
        quitar(g);
        B.base = 'nuevog'; B.mira(1);
        fx.chispas(B.x, B.y - 16, 22); SON.brillo(); B.saltar(5);
        etiqueta('PRIMER DÍA', B.x - 4, B.y + 14, '#f0a020');
        await di(A, 2);
      },
      async () => {
        PERRO.vel = 110; SON.guau();
        // el perro se queda adentro de la sala, con la cola lejos de la puerta
        await andar(PERRO, Math.max(B.x - 22, 336), 110);
        PERRO.dir = 1;
        await PERRO.saltar(7, 0.3); SON.guau(); fx.corazones(PERRO.x, PERRO.y - 18, 3);
        await PERRO.saltar(7, 0.3);
        PERRO.sentado = true;
        B.frente(); B.gestoPor('contento', 3);
        B.mira(-1);
        await di(B, 2);
      },
      async () => { A.mira(-1); await di(A, 2); },
    ],
  },
  {
    id: 'areas', titulo: 'Sesenta personas y cuatro áreas', hora: 6.6,
    cam: { x: 712, y: 474, w: 880, h: 440 },
    prep() {
      va(B, 358, 'pb', { vista: 'frente' }); va(A, 384, 'pb', { vista: 'frente' });
      va(PERRO, 336, 'pb', { sentado: true, dir: 1 });
    },
    pasos: [
      async () => {
        const orden = ['suc1', 'pb_der', 'bodega', 'suc2', 'p1_izq', 'p1_der', 'p2_izq', 'p2_der', 'p3_izq', 'p3_der'];
        for (let i = 0; i < orden.length; i++) {
          const id = orden[i];
          luz(id, 1, 0.12); SON.blip(1 + i * 0.12);
          const s = D.salas.find(s => s.id === id);
          fx.chispas((s.x0 + s.x1) / 2, s.y0 + 6, 8, ['#fff3a0', '#ffffff']);
          for (const g in SALA_DE) if (SALA_DE[g] === id) ACT[g].saltar(3, 0.25);
          await espera(0.22);
        }
        ST.cont = etiqueta('COLABORADORES 0', 712, 268, '#3a3e4a', { fija: true });
        etiqueta('BODEGA CENTRAL Y 2 SUCURSALES', 712, 282 + 4, '#5a5e6a', { fija: true });
        await di(A, 2);
      },
      async () => { resaltar(['pb_izq'], '#d8443c', 'COMERCIAL 16', 470, 556); ST.cont.txt = 'COLABORADORES 16'; await di(A, 1); },
      async () => { resaltar(['pb_der', 'bodega'], '#f08a30', 'OPERACIONES Y LOGÍSTICA 34', 994, 520); ST.cont.txt = 'COLABORADORES 50'; await di(B, 1); },
      async () => { resaltar(['p2_der'], '#f07aa0', 'ADMINISTRACIÓN Y FINANZAS 5', 740, 398); ST.cont.txt = 'COLABORADORES 55'; await di(A, 1); },
      async () => {
        resaltar(['p1_izq', 'p1_der', 'p2_izq', 'p3_izq', 'p3_der', 'sot_izq', 'sot_der'], TI, 'TI 5', 440, 478);
        ST.cont.txt = 'COLABORADORES 60'; ST.cont.color = TI; SON.fanfarria();
        await di(A, 2);
      },
      async () => { await di(B, 1); },
    ],
  },
  {
    id: 'inventario', titulo: 'Servicio 1, gestión de inventario', hora: 7,
    cam: { x: 994, y: 528, w: 290, h: 170 },
    prep() {
      va(A, 948, 'pb', { vista: 'frente' }); va(B, 976, 'pb', { vista: 'frente' });
      va(PERRO, 924, 'pb', { sentado: true });
    },
    pasos: [
      async () => {
        pantalla(1073, 478, ['ENTRADAS, SALIDAS Y TRASLADOS', 'DE CADA SACO EN LAS 3 SEDES', '39 USUARIOS, LUNES A SÁBADO 5 A 18 H'], { titulo: 'SRV-01 INVENTARIO', color: '#f08a30' });
        await di(A, 2);
      },
      async () => {
        const tarima = cosa({ x: 0, y: 0, capa: 2, alto: 9 });
        tarima.dibujar = (c, t) => {
          const x = Math.round(t.x), y = Math.round(t.y);
          c.fillStyle = '#1b1522'; c.fillRect(x - 13, y - 3, 26, 4);
          c.fillStyle = '#a8703a'; c.fillRect(x - 12, y - 3, 24, 2);
          c.fillStyle = '#7a4e22'; c.fillRect(x - 12, y - 1, 3, 1); c.fillRect(x - 1, y - 1, 3, 1); c.fillRect(x + 9, y - 1, 3, 1);
          spr(c, 'saco_pollo', 0, x - 6, y - 3); spr(c, 'saco_vaca', 0, x + 6, y - 3); spr(c, 'saco_mascota', 0, x, y - 12);
        };
        // las unas del montacargas van del lado al que mira
        tarima.mueve = () => { tarima.x = MONTA.x + MONTA.dir * 16; tarima.y = MONTA.y - 7 - tarima.alto + 9; };
        MONTA.vel = 40; MONTA.anda = true;
        await MONTA.ir(1016); MONTA.anda = false;
        // baja las unas y deja la tarima en el piso
        await tween(tarima, { alto: 2 }, 0.7, E.suave);
        tarima.mueve = null;
        await tween(tarima, { y: PISO.pb }, 0.25, E.suave);
        SON.golpe(); fx.polvo(tarima.x, PISO.pb, 6);
        ST.bodegaMsg = 'ENTRADA +3';
        for (let k = 0; k < 3; k++) { ST.sacos += 1; SON.moneda(); await espera(0.2); }
        MONTA.anda = true; MONTA.vel = 30;
        await MONTA.ir(1070); MONTA.anda = false; MONTA.dir = -1;
        ACT.bodega2.ir(985, 40).then(() => { ACT.bodega2.frente(); ACT.bodega2.gestoPor('contento', 2); });
        await espera(0.6); ST.bodegaMsg = '';
        await di(B, 1);
      },
      async () => {
        const g = GALLINAS[0];
        g.ocupada = true; g.vel = 40;
        await g.ir(B.x + 12); g.dir = -1; g.pica = 1; SON.cloc();
        await espera(0.4);
        B.saltar(10, 0.4); fx.sprite('gota', B.x + 8, B.y - 30, { vida: 0.8 }); fx.sprite('gota', B.x - 6, B.y - 30, { vida: 0.8 });
        SON.cloc(); await espera(0.3);
        g.vel = 60; g.ir(1080).then(() => (g.ocupada = false));
        await di(B, 1, { tipo: 'grita' });
      },
      async () => {
        // Finanzas toma de aqui el valor del inventario para el cierre del mes
        await enviar('bodega', 'finanzas', { txt: 'VALOR DEL INVENTARIO', color: '#ffd23c', seguir: 300 });
        tween(ST, { fin: 1 }, 0.8, E.resorte);
        pantalla(698, 412, ['TOMA EL VALOR DEL INVENTARIO', 'PARA EL CIERRE DEL MES'], { titulo: 'FINANZAS USA SRV-01', color: '#f07aa0' });
        ACT.finanzas.saltar(4);
        await espera(2.2);
        await camara({ x: 994, y: 528, w: 290, h: 170 }, 1.1);
        await di(A, 1);
      },
    ],
  },
  {
    id: 'ventas', titulo: 'Servicio 2, gestión de ventas', hora: 8,
    cam: { x: 436, y: 562, w: 270, h: 100 },
    prep() {
      va(A, 524, 'pb', { vista: 'frente' }); va(B, 546, 'pb', { vista: 'frente' });
      va(PERRO, 504, 'pb', { sentado: true, dir: -1 });
      pon('cliente', 130, ACERA, { vista: 'lado', dir: 1 });
    },
    pasos: [
      async () => {
        await andar(ACT.cliente, 396, VEL); ACT.cliente.mira(1);
        await di('cliente', 1);
      },
      async () => {
        ACT.vendedor.mira(-1);
        pantalla(P.pantalla_venta[0], P.pantalla_venta[1] - 6, ['VENDER, COBRAR Y FACTURAR', '21 USUARIOS', 'LUNES A SÁBADO 6 A 18 H'], { titulo: 'SRV-02 VENTAS', color: '#d8443c' });
        await di('vendedor', 1);
      },
      async () => {
        const c = ACT.cliente;
        for (let k = 0; k < 5; k++) {
          const m = cosa({ spr: 'moneda', x: c.x, y: c.y - 18, capa: 9 });
          volar(m, [c.x + 4, c.y - 18], [P.caja[0] + (k % 3) - 1, P.caja[1]], 0.5, -18).then(() => { quitar(m); SON.moneda(); fx.chispas(P.caja[0], P.caja[1], 4, ['#ffd23c']); });
          await espera(0.12);
        }
        await espera(0.6);
        const f = cosa({ spr: 'ticket_oro', x: P.caja[0], y: P.caja[1], capa: 9 });
        SON.tecla(); await tween(f, { y: P.caja[1] - 12 }, 0.5, E.lineal);
        etiqueta('FACTURA', c.x - 22, c.y - 30, '#f0a020');
        await volar(f, [f.x, f.y], [c.x + 6, c.y - 16], 0.5, -14); quitar(f);
        const v = ACT.vendedor;
        v.teclea = false;
        await v.ir(534, 50); v.vista = 'espalda'; await espera(0.5);
        const s = llevar(v, 'saco_gallina');
        v.vista = 'lado';
        await v.ir(428, 46); v.mira(-1);
        await dejar(s, c.x + 2, c.y - 17, 0.45);
        quitar(s);
        const s2 = llevar(c, 'saco_gallina');
        c.gestoPor('contento', 3); fx.corazones(c.x, c.y - 40, 2);
        v.ir(462, 50).then(() => { v.frente(); v.teclea = true; });
        await espera(0.5);
        andar(c, -90, VEL).then(() => { c.visible = false; quitar(s2); });
        await espera(0.8);
        await di('vendedor', 1);
      },
      async () => {
        await enviar('ventas', 'finanzas', { txt: 'FACTURA', color: '#ffd23c', seguir: 300 });
        tween(ST, { fin: 1.6 }, 0.8, E.resorte);
        pantalla(698, 412, ['LLEVA LA FACTURACIÓN', 'Y LA CONTABILIDAD'], { titulo: 'FINANZAS USA SRV-02', color: '#f07aa0' });
        ACT.finanzas.saltar(4);
        await espera(2.2);
        await camara({ x: 436, y: 562, w: 270, h: 100 }, 1.1);
        await di(A, 2);
      },
      async () => { await di(B, 1); },
    ],
  },
  {
    id: 'pedidos', titulo: 'Servicio 3, gestión de pedidos', hora: 9,
    // a 820 el guia con su globo y el nuevo, junto al mapa del rastreo, quedan en cuadro de 1280 a 1920 de ancho
    cam: { x: 820, y: 560, w: 430, h: 150 },
    prep() {
      va(A, 650, 'pb', { vista: 'frente' }); va(B, 676, 'pb', { vista: 'frente' });
      va(PERRO, 700, 'pb', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        pantalla(786, 572, ['DE LO QUE PIDE EL CLIENTE', 'A LO QUE SUBE CADA CAMIÓN', '50 USUARIOS, EL QUE MÁS SE USA', 'LUNES A SÁBADO 5 A 18 H'], { titulo: 'SRV-03 PEDIDOS', color: '#8a5ad0' });
        await di(A, 2);
      },
      async () => {
        await enviar('ventas', 'despacho', { txt: 'PEDIDO', color: '#c89aff' });
        ACT.despacho.mira(1);
        await di('despacho', 1);
      },
      async () => {
        await enviar('despacho', 'bodega', { txt: 'PREPARAR 4 SACOS', color: '#c89aff' });
        ST.bodegaMsg = 'PEDIDO 4 SACOS';
        ACT.bodega1.saltar(5);
        await espera(0.4);
        // el camion abre la puerta de atras y se pone la rampa
        CAMION.carga = 0;
        SON.click();
        await camara({ x: 1078, y: 574, w: 380, h: 130 }, 1.0);
        let rampa = Promise.resolve();
        const usarRampa = fn => (rampa = rampa.then(fn));
        const viajeSaco = async (w, nombre, xPila) => {
          w.vista = 'lado';
          await w.ir(xPila, 52);
          w.vista = 'espalda'; await espera(0.35);
          const s = llevar(w, nombre); ST.sacos -= 1;
          w.vista = 'lado';
          await w.ir(1110, 40);
          await usarRampa(async () => {
            await w.ir(1119, 36);
            w.capa = 3; w.dir = 1; w.anda = true;
            await tween(w, { x: 1139, y: 620 }, 0.85, E.lineal);
            w.anda = false;
            await dejar(s, 1142, 619, 0.3); quitar(s);
            CAMION.carga++; CAMION.saltar(1.5, 0.15); SON.golpe(); fx.polvo(1142, 620, 3);
            await espera(0.2);
            w.dir = -1; w.anda = true;
            await tween(w, { x: 1119, y: PISO.pb }, 0.85, E.lineal);
            w.anda = false; w.capa = 1;
          });
        };
        const b1 = ACT.bodega1, b2 = ACT.bodega2;
        await Promise.all([
          (async () => { await viajeSaco(b2, 'saco_pollo', 934); await viajeSaco(b2, 'saco_caballo', 922); })(),
          (async () => { await espera(1.2); await viajeSaco(b1, 'saco_vaca', 946); await viajeSaco(b1, 'saco_mascota', 958); })(),
        ]);
        b1.ir(1104, 50).then(() => { b1.mira(-1); });
        b2.ir(905, 50).then(() => b2.frente());
        ST.bodegaMsg = 'SALIDA -4';
        await camara({ x: 820, y: 560, w: 430, h: 150 }, 1.0);
        await espera(0.6); ST.bodegaMsg = '';
        await di(B, 1);
      },
      async () => {
        CAMION.carga = undefined; SON.click();
        await espera(0.4);
        SON.bocina();
        seguir(CAMION, 360, 3);
        await conducir(CAMION, 1600, 3.2, E.entra);
        CAMION.visible = false;
        await camara({ x: 820, y: 560, w: 430, h: 150 }, 1.2);
        await di(A, 1);
      },
    ],
  },
  {
    id: 'rastreo', titulo: 'Servicio 4, rastreo y seguimiento', hora: 10,
    cam: { x: 690, y: 562, w: 230, h: 92 },
    prep() {
      va(B, 726, 'pb', { vista: 'lado', dir: -1 }); va(A, 752, 'pb', { vista: 'lado', dir: -1 });
      va(PERRO, 704, 'pb', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        ST.mapa = true; SON.brillo();
        for (const r of ['mapa0', 'mapa1', 'mapa2']) { const p = D.rutas[r][0]; fx.anillo(p[0], p[1], '#ffd23c', 10, 0.6, 1); }
        pantalla(680, 548, ['DÓNDE VA CADA CAMIÓN', 'Y CUÁNDO LLEGA CADA PEDIDO', '5 CAMIONES Y 2 PANELES CON GPS', 'LUNES A SÁBADO 5 A 19 H'], { titulo: 'SRV-04 RASTREO', color: '#2a7ad8' });
        await di(A, 2);
      },
      async () => {
        await camara({ x: 680, y: 565, w: 190, h: 76 }, 1.2);
        const d = D.rutas.mapa0[D.rutas.mapa0.length - 1];
        fx.anillo(d[0], d[1], '#7aff8a', 12, 0.7, 1); fx.chispas(d[0], d[1], 14, ['#7aff8a', '#ffffff']); SON.ding();
        etiqueta('ENTREGADO', d[0], d[1] - 6, '#3aa060');
        await di(B, 1);
      },
      async () => { await camara({ x: 690, y: 562, w: 230, h: 92 }, 1); await di(A, 2); },
    ],
  },
  {
    id: 'nube', titulo: 'Todo vive en la nube', hora: 10.6,
    cam: { x: 640, y: 152, w: 560, h: 300 },
    prep() {
      va(A, 720, 'az', { vista: 'frente' }); va(B, 748, 'az', { vista: 'frente' });
      va(PERRO, 772, 'az', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        await tween(ST, { nubes: 1 }, 1.2, E.suave);
        SON.brillo();
        ST.nubeEnlace = true; SON.brillo();
        P.nubes.forEach(([x, y]) => fx.anillo(x, y - 6, '#fff7a0', 22, 0.8, 1));
        ['APLICACIÓN', 'BASE DE DATOS', 'ALMACENAMIENTO'].forEach((t, i) => etiqueta(t, P.nubes[i][0], P.nubes[i][1] + 44, '#2a7ad8'));
        etiqueta('AMAZON WEB SERVICES', 590, 18, '#f08a30');
        await di(A, 2);
      },
      async () => { await di(B, 1); },
      async () => {
        tween(ST, { constelacion: 1 }, 2.4, E.lineal);
        for (let k = 0; k < 12; k++) { SON.blip(1 + k * 0.08); await espera(0.18); }
        etiqueta('CMDB 44 ELEMENTOS Y 37 RELACIONES', 640, 18, '#a070ff');
        await di(A, 2);
      },
      async () => {
        impactoDesde(0); ST.impacto = 0; SON.alarma();
        etiqueta('SI ALGO FALLA, SE VE A QUIÉN AFECTA', 640, 18, '#e03a30');
        await di(B, 1);
      },
    ],
  },
  {
    id: 'falla', titulo: 'La factura sale mal', hora: 11,
    cam: { x: 452, y: 556, w: 250, h: 110 },
    prep() {
      va(A, 528, 'pb', { vista: 'frente' }); va(B, 550, 'pb', { vista: 'frente' });
      va(PERRO, 506, 'pb', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        ST.falla = true; SON.alarma(); sacudir(4);
        ACT.vendedor.saltar(8, 0.4); ACT.vendedor.animo = 'estres';
        fx.sprite('gota', ACT.vendedor.x + 9, ACT.vendedor.y - 32, { vida: 0.9 });
        pantalla(P.pantalla_venta[0], P.pantalla_venta[1] - 6, ['CLIENTE DE MAYOREO', { t: 'SALE CON PRECIO DE LISTA', c: '#ff7a6a' }, 'YA VAN 5 FACTURAS HOY'], { titulo: 'FACTURA MAL', color: '#e03a30', dx: -78 });
        await di('vendedor', 2, { tipo: 'grita' });
      },
      async () => { B.saltar(6); await di(B, 1, { tipo: 'grita' }); },
      async () => { await di(A, 2); },
    ],
  },
  {
    id: 'portal', titulo: 'El portal de autoservicio', hora: 11.1,
    cam: { x: 484, y: 573, w: 60, h: 24 },
    prep() {
      ST.falla = true;
      va(A, 528, 'pb', { vista: 'frente' }); va(B, 550, 'pb', { vista: 'frente' });
      va(PERRO, 506, 'pb', { sentado: true, dir: -1 });
      Object.assign(PORTAL, { cx: 60, cy: 160, presion: 0, form: 0, escrito: 0, ticket: 0, avion: 0, ax: 0, ay: 0, boton: 0 });
    },
    async entrada() {
      await camara({ x: P.pantalla_venta[0], y: P.pantalla_venta[1], w: 22, h: 14 }, 0.8);
      await tween(PANT, { pixelado: 30 }, 0.35, E.entra);
      modo = 'pantalla';
      await tween(PANT, { pixelado: 1 }, 0.35, E.sale);
    },
    pasos: [
      async () => {
        await tween(PORTAL, { cx: P.portal_falla[0], cy: P.portal_falla[1] + 6 }, 0.9, E.suave);
        SON.click(); PORTAL.presion = 1; tween(PORTAL, { presion: 0 }, 0.3);
        PORTAL.ondas = T;
        await espera(0.25);
        await tween(PORTAL, { form: 1 }, 0.4, E.resorte);
        // la persona llena el formulario Mesa de Servicio como en el portal
        const total = FORM.reduce((s, f) => s + f[1].length, 0);
        await tween(PORTAL, { escrito: total }, 4.2, E.lineal);
      },
      async () => {
        await tween(PORTAL, { cx: 252, cy: 166 }, 0.6, E.suave);
        SON.click(); PORTAL.boton = 1;
        await espera(0.25);
        await tween(PORTAL, { ticket: 1 }, 0.5, E.resorte);
        SON.brillo();
        await espera(1.4);
        await tween(PORTAL, { ticket: 0 }, 0.2, E.entra);
        await tween(PANT, { pixelado: 30 }, 0.3, E.entra);
        modo = 'mundo';
        cam.x = P.pantalla_venta[0]; cam.y = P.pantalla_venta[1]; cam.z = zoomPara({ w: 60, h: 24 });
        await tween(PANT, { pixelado: 1 }, 0.3, E.sale);
        await camara({ x: 452, y: 556, w: 250, h: 110 }, 0.9);
        await di(B, 1);
      },
    ],
  },
  {
    id: 'viaje', titulo: 'El ticket 258 viaja a GLPI', hora: 11.2,
    cam: { x: 420, y: 646, w: 280, h: 96 },
    prep() {
      ST.falla = true;
      luzYa('sot_izq', 1);
      va(A, 470, 'sot', { vista: 'frente' }); va(B, 500, 'sot', { vista: 'frente' });
      va(PERRO, 530, 'sot', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        await camara({ x: P.pantalla_venta[0], y: P.pantalla_venta[1], w: 220, h: 90 }, 1);
        await enviar('ventas', 'glpi', { spr: 'ticket_inc', txt: 'TICKET 258', color: '#ff7a6a', seguir: 260, vel: 170 });
        ST.glpiFlash = 0.8; SON.ding();
        pantalla(339, 622, ['VENTAS, LA FACTURA SALE MAL', 'REGLA 08, TODO ENTRA', 'A LA MESA DE SERVICIO'], { titulo: 'GLPI RECIBE EL 258', color: '#f0c040' });
        await camara({ x: 420, y: 646, w: 280, h: 96 }, 0.9);
        await di(A, 2);
      },
      async () => {
        // GLPI le avisa al bot por webhook
        await enviar(null, null, { pts: [[356, 640], [400, 632], [BALLENA.x, BALLENA.y - 22]], txt: 'WEBHOOK', color: '#58c8ff', vel: 120 });
        BALLENA.saltar(6, 0.35); fx.burbujas(BALLENA.x, BALLENA.y - 20, 12); SON.pop();
        pantalla(BALLENA.x, BALLENA.y - 30, ['BOT DE ESCALADO EN DOCKER', 'JUNTO A GLPI, EN LA PC', 'DE JOSÉ DAVID'], { titulo: 'EL BOT', color: '#2496ed' });
        await di(B, 1);
      },
      async () => { await di(A, 2); },
    ],
  },
  {
    id: 'ia', titulo: 'A prender la IA', hora: 11.3,
    cam: { x: 718, y: 646, w: 250, h: 96 },
    prep() {
      luzYa('sot_izq', 1); luzYa('sot_der', 0);
      IA.despierta = false; IA.cara = 'cerrados'; IA.aura = 0;
      LAPTOP.pantalla = 0; GPU.prendida = false; PALANCA.pos = 0; ST.tunel = false;
      va(A, 614, 'sot', { vista: 'lado', dir: 1 }); va(B, 662, 'sot', { vista: 'lado', dir: -1 });
      va(PERRO, 740, 'sot', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => { SON.click(); flash = 0.1; await di(A, 2); },
      async () => { popEn('signo_duda', B.x + 14, B.y - 30, { flota: true }); await di(B, 1); },
      async () => {
        B.mira(-1);
        await espera(0.2);
        PALANCA.pos = 1; SON.click(); await espera(0.18);
        PALANCA.pos = 2; SON.golpe(); fx.chispas(PALANCA.x, PALANCA.y - 30, 26, ['#ffe45c', '#ffffff', '#ff8a3a'], 80);
        sacudir(4);
        await espera(0.3);
        SON.prende();
        for (const v of [0.7, 0, 0.9, 0.1, 1]) { luzYa('sot_der', v); await espera(0.09); }
        GPU.prendida = true;
        LAPTOP.pantalla = 1;
        await espera(0.6);
        LAPTOP.pantalla = 2;
        sacudir(9); golpeZoom(0.14); flash = 0.9; flashColor = '120,240,255';
        IA.cara = 'brillo'; IA.despierta = true;
        B.frente(); B.gestoPor('sorpresa', 2.5); A.gestoPor('contento', 3);
        tween(IA, { aura: 1 }, 0.4);
        fx.anillo(LLAMA.x, LLAMA.y - 18, '#58f0ff', 40, 0.7, 2);
        fx.anillo(LLAMA.x, LLAMA.y - 18, '#ffffff', 26, 0.5, 1);
        fx.chispas(LLAMA.x, LLAMA.y - 20, 50, ['#58f0ff', '#ffffff', '#a070ff', '#ffd23c'], 110);
        LLAMA.saltar(10, 0.45);
        SON.brillo();
        ST.tunel = true;
        fx.burbujas(BALLENA.x, BALLENA.y - 20, 14);
        await espera(1.0);
        IA.cara = 'feliz';
        fx.corazones(LLAMA.x, LLAMA.y - 38, 3);
        pantalla(712, 641, ['OLLAMA CON TEV1 4B', 'EN LA RTX 5050 DE LA LAPTOP', 'DE MEME, SIN SALIR A INTERNET'], { titulo: 'IA LOCAL', color: '#58c8e8', dx: -20 });
        await espera(0.4);
        await di(B, 1, { tipo: 'grita' });
      },
      async () => { IA.cara = 'abiertos'; await di(LLAMA, 2, { tipo: 'piensa', color: '#58f0ff' }); },
      async () => {
        etiqueta('TÚNEL IA-ITIL.LEDKID.COM', 640, 606, '#f08a30');
        await di(A, 2);
      },
    ],
  },
  {
    id: 'decide', titulo: 'La IA decide el nivel', hora: 11.5,
    cam: { x: 580, y: 646, w: 560, h: 100 },
    prep() {
      luzYa('sot_izq', 1); luzYa('sot_der', 1);
      IA.despierta = true; IA.cara = 'abiertos'; IA.aura = 0.5; LAPTOP.pantalla = 2; GPU.prendida = true; PALANCA.pos = 2;
      ST.tunel = true;
      va(A, 614, 'sot', { vista: 'lado', dir: 1 }); va(B, 662, 'sot', { vista: 'lado', dir: 1 });
      va(PERRO, 740, 'sot', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        // el bot lee el ticket y se lo manda a la IA por el tunel, con la lista de articulos
        const ida = [[BALLENA.x + 24, BALLENA.y - 24]].concat(D.rutas.tunel.slice().reverse()).concat([[692, 632]]);
        await enviar(null, null, { pts: ida, spr: 'ticket_inc', txt: '258', color: '#ff7a6a', vel: 150 });
        IA.cara = 'piensa';
        await camara({ x: 740, y: 640, w: 230, h: 92 }, 0.9);
        await di(A, 2);
      },
      async () => {
        ST.medidor = { x: 806, y: 628, v: 0 };
        for (const v of [0.4, 0.8, 0.7]) { await tween(ST.medidor, { v }, 0.25, E.suave); SON.blip(0.7 + v); }
        await tween(ST.medidor, { v: 0.9567 }, 0.45, E.resorte);
        SON.ding(); IA.cara = 'feliz';
        fx.chispas(806, 612, 16, ['#7aff8a', '#ffffff']);
        pantalla(692, 632, ['CRITERIO E2, DATOS INCORRECTOS', { t: 'ESCALAR 96 %, UMBRAL 60 %', c: '#7aff8a' }, 'SUBE A SISTEMAS Y APLICACIONES', 'SUGIERE EL ARTÍCULO 69'], { titulo: 'DECISIÓN DE LA IA', color: '#3aa060', dx: -40 });
        await di(B, 1);
      },
      async () => {
        // la decision vuelve al bot, que mueve el ticket y deja su nota privada en GLPI
        const vuelta = [[692, 632]].concat(D.rutas.tunel).concat([[BALLENA.x + 24, BALLENA.y - 24], [356, 640]]);
        await camara({ x: 520, y: 640, w: 330, h: 100 }, 0.8);
        await enviar(null, null, { pts: vuelta, txt: 'NIVEL 2', color: '#7aff8a', vel: 170 });
        ST.glpiFlash = 0.8; SON.ding();
        pantalla(339, 622, ['NOTA PRIVADA DEL BOT', 'ESCALADO AUTOMÁTICO', 'AL NIVEL 2'], { titulo: 'GLPI', color: '#f0c040' });
        await di(A, 2);
      },
    ],
  },
  {
    id: 'nivel2', titulo: 'Nivel 2, Sistemas y Aplicaciones', hora: 12,
    cam: { x: 436, y: 404, w: 270, h: 100 },
    prep() {
      ST.falla = true;
      va(A, 480, 'p2', { vista: 'frente' }); va(B, 506, 'p2', { vista: 'frente' });
      va(PERRO, 532, 'p2', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        await enviar('glpi', 'sistemas', { spr: 'ticket_inc', txt: 'TICKET 258', color: '#ff7a6a', seguir: 260, vel: 220 });
        await camara({ x: 436, y: 404, w: 270, h: 100 }, 0.6);
        pantalla(398, 412, ['LISTA DE PRECIOS DE MAYOREO', { t: 'VENCIÓ EL 15 DE OCTUBRE', c: '#ff7a6a' }], { titulo: 'SISTEMAS REVISA', color: '#2a7ad8' });
        etiqueta('NIVEL 2', 378, 388, '#2a7ad8');
        await di('sistemas', 2);
      },
      async () => {
        pantalla(398, 412, [{ t: 'SE EXTENDIÓ LA VIGENCIA', c: '#7aff8a' }], { titulo: 'SOLUCIÓN', color: '#3aa060' });
        await espera(0.8);
        await enviar('sistemas', 'finanzas', { txt: 'ANULAR 5 FACTURAS', color: '#ffd23c', seguir: 300 });
        for (let k = 0; k < 5; k++) { popEn('ticket_oro', 676 + k * 9, 410, { flota: true }); await espera(0.12); }
        etiqueta('FINANZAS LAS VUELVE A EMITIR', 698, 396, '#f07aa0');
        ACT.finanzas.saltar(4);
        await espera(1.6);
        await camara({ x: 436, y: 404, w: 270, h: 100 }, 0.8);
        await di('sistemas', 1);
      },
      async () => {
        await camara({ x: 452, y: 556, w: 250, h: 110 }, 1.2);
        ST.falla = false; ST.ok = true; SON.ding();
        ACT.vendedor.animo = null; ACT.vendedor.gestoPor('contento', 5);
        popEn('signo_ok', P.pantalla_venta[0], P.pantalla_venta[1] - 16, { flota: true });
        ACT.vendedor.saltar(8, 0.4); fx.corazones(ACT.vendedor.x, ACT.vendedor.y - 36, 4);
        await encuesta('vendedor', 5, 'LO ARREGLARON EL MISMO DÍA');
        await espera(0.6);
        await camara({ x: 436, y: 404, w: 270, h: 100 }, 1.0);
        await di(B, 1);
      },
    ],
  },
  {
    id: 'nivel1', titulo: 'Nivel 1, la Mesa de Servicio', hora: 13,
    cam: { x: 436, y: 486, w: 280, h: 100 },
    prep() {
      ST.ok = false; ST.cola = 0;
      va(A, 500, 'p1', { vista: 'frente' }); va(B, 540, 'p1', { vista: 'frente' });
      va(PERRO, 520, 'p1', { sentado: true, dir: 1 });
      for (const id of ['tec1', 'tec2']) ACT[id].teclea = true;
    },
    pasos: [
      async () => {
        // de la Sucursal 1, por la fibra, a GLPI, al bot y a la IA, y de vuelta a la cola de la Mesa
        await camara({ x: 90, y: 566, w: 260, h: 100 }, 1.2);
        ACT.enc1.teclea = true; ACT.enc1.animo = 'estres';
        pantalla(P.red.externos.suc1[0][0], P.red.externos.suc1[0][1], ['NO PUEDO ENTRAR AL INVENTARIO', 'MI CUENTA ESTÁ BLOQUEADA'], { titulo: 'SUCURSAL 1 REPORTA', color: '#3aa060' });
        await espera(1.6);
        await enviar('suc1', 'glpi', { spr: 'ticket_inc', txt: 'TICKET 255', color: '#ff7a6a', seguir: 300, vel: 220 });
        ST.glpiFlash = 0.6;
        ST.medidor = { x: 806, y: 628, v: 0 };
        await camara({ x: 760, y: 640, w: 230, h: 92 }, 0.9);
        await tween(ST.medidor, { v: 0.2 }, 0.3); await tween(ST.medidor, { v: 0.0037 }, 0.5, E.sale);
        pantalla(692, 632, ['CRITERIO Q2, ARREGLO CONOCIDO', { t: 'ESCALAR 0.4 %, UMBRAL 60 %', c: '#ffd23c' }, 'SE QUEDA EN LA MESA', 'SUGIERE EL ARTÍCULO 23'], { titulo: 'DECISIÓN DE LA IA', color: '#f0a020', dx: -40 });
        await espera(2.4);
        ST.medidor = null;
        await enviar('glpi', 'cola', { spr: 'ticket_inc', txt: '255', color: '#ff7a6a', seguir: 280, vel: 230 });
        ST.cola = 1; SON.pop();
        await camara({ x: 436, y: 486, w: 280, h: 100 }, 0.6);
        pantalla(524, 468, ['NO PUEDO ENTRAR AL INVENTARIO', 'MI CUENTA ESTÁ BLOQUEADA'], { titulo: 'COLA DE LA MESA', color: TI });
        await di(A, 2);
      },
      async () => {
        ST.cola = 0;
        await enviar('cola', 'tec1', { spr: 'ticket_inc', color: '#ff7a6a', vel: 160 });
        ACT.tec1.teclea = true;
        tween(ST, { sla: 0.12 }, 0.6);
        etiqueta('TOMAR EN 1 H, RESOLVER EN 8 H', 432, 459, '#3aa060');
        await di('tec1', 1);
      },
      async () => {
        await enviar('glpi', 'tec1', { txt: 'ARTÍCULO 23', color: '#7aff8a', vel: 260 });
        pantalla(378, 492, ['ARTÍCULO 23', 'OLVIDÉ MI CONTRASEÑA O', 'MI USUARIO QUEDÓ BLOQUEADO'], { titulo: 'LO SUGIRIÓ EL BOT', color: '#3aa060' });
        tween(ST, { sla: 0.3 }, 2, E.lineal);
        await espera(1.2);
        await di('tec1', 2);
      },
      async () => {
        await enviar('tec1', 'suc1', { txt: 'CLAVE TEMPORAL', color: '#7aff8a', vel: 260, seguir: 300 });
        ACT.enc1.saltar(6); fx.corazones(ACT.enc1.x, ACT.enc1.y - 36, 3);
        ACT.enc1.animo = null; ACT.enc1.gestoPor('contento', 4);
        await espera(0.8);
        await camara({ x: 436, y: 486, w: 280, h: 100 }, 1.2);
        fx.chispas(ACT.tec1.x, ACT.tec1.y - 24, 24); SON.brillo();
        popEn('signo_ok', ACT.tec1.x, ACT.tec1.y - 44, { flota: true });
        ST.sla = 0;
        etiqueta('RESUELTO EN LA MESA, SIN ESCALAR', 436, 446, '#3aa060');
        await di(B, 1);
      },
      async () => {
        etiqueta('ENCUESTA 5 DE 5, RÁPIDO', 436, 459, '#f0a020');
        for (let k = 0; k < 5; k++) { popEn('estrella', 404 + k * 16, 474, { flota: true }); SON.blip(1 + k * 0.15); await espera(0.13); }
        await di(A, 2);
      },
    ],
  },
  {
    id: 'nivel3', titulo: 'Nivel 3, Coordinación', hora: 14,
    cam: { x: 436, y: 326, w: 270, h: 100 },
    prep() {
      va(A, 480, 'p3', { vista: 'frente' }); va(B, 506, 'p3', { vista: 'frente' });
      va(PERRO, 532, 'p3', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => {
        await camara({ x: 436, y: 404, w: 270, h: 100 }, 1);
        await enviar('glpi', 'sistemas', { spr: 'ticket_inc', txt: 'TICKET 256', color: '#ff7a6a', vel: 260 });
        pantalla(398, 412, ['EL KARDEX DA ERROR 500', 'IA, E3 AL 90 %, NIVEL 2', { t: 'LA VISTA ES DE SRV-BD-01', c: '#ffd23c' }], { titulo: 'SISTEMAS REVISA', color: '#2a7ad8' });
        await di('sistemas', 2);
      },
      async () => {
        await enviar('sistemas', 'coord', { spr: 'ticket_inc', txt: 'NIVEL 3', color: '#c89aff', seguir: 260, vel: 160 });
        await camara({ x: 436, y: 326, w: 270, h: 100 }, 0.6);
        etiqueta('LO ESCALA SISTEMAS, NUNCA EL BOT', 436, 296, '#8a5ad0');
        pantalla(384, 332, ['ANALISTA DE DATOS', 'SRV-BD-01'], { titulo: 'COORDINACIÓN', color: '#8a5ad0' });
        await di('datos', 2);
      },
      async () => {
        pantalla(384, 332, ['A LA APLICACIÓN LE FALTABA', 'UN PERMISO DE LECTURA', { t: 'SE DEVOLVIÓ', c: '#7aff8a' }], { titulo: 'SOLUCIÓN', color: '#3aa060' });
        fx.chispas(ACT.datos.x, ACT.datos.y - 22, 40); SON.fanfarria();
        ACT.datos.gestoPor('contento', 3);
        popEn('signo_ok', ACT.datos.x + 18, ACT.datos.y - 34, { flota: true });
        await di(B, 1);
      },
      async () => { await di(A, 2); },
    ],
  },
  {
    id: 'conocimiento', titulo: 'Base de conocimiento', hora: 14.6,
    cam: { x: 728, y: 486, w: 270, h: 100 },
    prep() {
      va(A, 632, 'p1', { vista: 'frente' }); va(B, 660, 'p1', { vista: 'frente' });
      va(PERRO, 684, 'p1', { sentado: true, dir: -1 });
    },
    pasos: [
      async () => { await di(A, 2); },
      async () => {
        const [ex0, ey0, ex1] = D.rects.estantes;
        const cont = etiqueta('ARTÍCULOS 0', 690, 462, '#3aa060');
        const n = { v: 0 };
        tween(n, { v: 95 }, 2.6, E.lineal);
        cont.mueve = () => { cont.txt = 'ARTÍCULOS ' + Math.round(n.v); };
        const tipos = ['a', 'b', 'c', 'd', 'e'];
        for (let k = 0; k < 40; k++) {
          const a = [ex0 + 8 + Math.random() * (ex1 - ex0 - 16), ey0 + 9 + Math.floor(Math.random() * 4) * 12];
          particula({ x: a[0], y: a[1], vida: 0.5, color: '#ffffff', tam: 2, capa: 9 });
          particula({ x: a[0] + 1, y: a[1] - 2, vida: 0.4, color: '#7aff8a', tam: 1, capa: 9 });
          if (k % 3 === 0) SON.blip(1 + k * 0.02);
          await espera(0.06);
        }
        await espera(1);
        cont.mueve = null; cont.txt = 'ARTÍCULOS 95';
        etiqueta('UNA SECCIÓN POR CADA UNA DE LAS 42 HOJAS', 728, 448, '#f08a30');
        await di(B, 1);
      },
      async () => {
        pantalla(826, 500, ['EL BOT SUGIERE ARTÍCULO', 'EN 95 % DE LOS INCIDENTES', 'Y CALLA SI NO HAY UNO QUE SIRVA'], { titulo: 'SUGERENCIA', color: '#3aa060', dx: -50 });
        await B.ir(762, VEL); B.vista = 'espalda'; await espera(0.5);
        const l = llevar(B, 'libro_b', { mano: true });
        B.vista = 'lado';
        await B.ir(790, VEL); B.frente();
        await espera(0.8);
        quitar(l);
        popEn('foco', B.x - 17, B.y - 34, { flota: true, f: 1 });
        SON.ding(); fx.chispas(B.x, B.y - 50, 18, ['#ffe45c', '#ffffff']);
        await di(B, 2);
      },
    ],
  },
  {
    id: 'problemas', titulo: 'Problemas y errores conocidos', hora: 15.2,
    cam: { x: 470, y: 326, w: 270, h: 100 },
    prep() {
      ST.tarjetas = []; ST.hilos = [];
      va('sistemas', 318, 'p3', { vista: 'lado', dir: 1, teclea: false });
      va(B, 396, 'p3', { vista: 'lado', dir: 1 }); va(A, 418, 'p3', { vista: 'lado', dir: 1 });
      va(PERRO, 374, 'p3', { sentado: true, dir: 1 });
    },
    pasos: [
      async () => {
        const fichas = [['268', 442, 313], ['270', 442, 324], ['271', 442, 335]];
        for (const [txt, x, y] of fichas) {
          const t = { txt, x, y, w: medirTexto(txt) + 4, fondo: '#fbf6ea', color: '#e03a30' };
          ST.tarjetas.push(t); SON.pop(); fx.anillo(x + 20, y + 5, '#e03a30', 12, 0.5, 1);
          await espera(0.45);
        }
        etiqueta('5, 6 Y 7 DE OCTUBRE, TRES SEDES', 494, 302, '#e03a30');
        await di(A, 2);
      },
      async () => {
        const pr = { txt: 'PROBLEMA 36', x: 486, y: 314, w: medirTexto('PROBLEMA 36') + 4, fondo: '#f0c040', color: '#c0571a' };
        ST.tarjetas.push(pr); SON.golpe();
        for (const t of ST.tarjetas.slice(0, 3)) {
          const h = { de: [t.x + t.w, t.y + 5], a: [pr.x, pr.y + 5], t: 0 };
          ST.hilos.push(h); SON.tecla();
          await tween(h, { t: 1 }, 0.4, E.suave);
        }
        pantalla(ACT.sistemas.x, ACT.sistemas.y - 34, ['LA APP ESPERA SOLO 10 S', 'AL CERTIFICADOR Y NO REINTENTA', { t: 'EN HORA PICO TARDA HASTA 30 S', c: '#ffd23c' }], { titulo: 'CAUSA RAÍZ, CINCO PORQUÉS', color: '#2a7ad8' });
        popEn('foco', ACT.sistemas.x - 17, ACT.sistemas.y - 34, { flota: true, f: 1 });
        ACT.sistemas.frente(); ACT.sistemas.gestoPor('sorpresa', 2);
        SON.ding();
        await di('sistemas', 2);
      },
      async () => {
        const ec = { txt: 'ERROR 55', x: 496, y: 331, w: medirTexto('ERROR 55') + 4, fondo: '#d8ecff', color: '#2a7ad8' };
        ST.tarjetas.push(ec);
        ST.hilos.push({ de: [518, 325], a: [ec.x + ec.w / 2, ec.y - 1], t: 1 });
        etiqueta('ERROR CONOCIDO 55', 494, 288, '#2a7ad8');
        fx.anillo(ec.x + 30, ec.y + 5, '#2a7ad8', 14, 0.6, 1); fx.chispas(ec.x + 30, ec.y + 5, 16, ['#58c8ff', '#ffffff']);
        etiqueta('EL 272 YA LO RESUELVE LA MESA', 470, 302, '#2a7ad8');
        await di(B, 1);
      },
    ],
  },
  {
    id: 'cab', titulo: 'El cambio 70 pasa por el CAB', hora: 16,
    cam: { x: 728, y: 326, w: 280, h: 100 },
    prep() {
      // votan los cuatro de TI y el Responsable decide al final
      ['tec1', 'tec2', 'sistemas', 'datos'].forEach((id, i) => va(id, P.cab[i][0], 'p3', { vista: 'frente', teclea: false }));
      va(A, 840, 'p3', { vista: 'lado', dir: -1 }); va(B, 616, 'p3', { vista: 'lado', dir: 1 });
      va(PERRO, 640, 'p3', { sentado: true, dir: 1 });
    },
    pasos: [
      async () => {
        const t = llevar(A, 'ticket_sol', { mano: true });
        await A.ir(P.mesa_cab[0] + 14, VEL); A.frente();
        await dejar(t, P.mesa_cab[0], P.mesa_cab[1] - 2);
        await A.ir(812, VEL); A.mira(-1);
        pantalla(P.mesa_cab[0], P.mesa_cab[1] - 10, ['ESPERAR 45 S AL CERTIFICADOR', 'Y REINTENTAR 3 VECES'], { titulo: 'CAMBIO NORMAL 70', color: '#2a7ad8' });
        await di(A, 2);
      },
      async () => {
        for (const [i, id] of ['tec1', 'tec2', 'sistemas', 'datos'].entries()) {
          ACT[id].saltar(5, 0.3);
          popEn('signo_ok', ACT[id].x, ACT[id].y - 44, { flota: true });
          etiqueta('A FAVOR', ACT[id].x, ACT[id].y - 50 - (i % 2) * 13, '#3aa060');
          SON.blip(1 + i * 0.2);
          await espera(0.35);
        }
        await di('sistemas', 1);
      },
      async () => {
        // el Responsable sella la solicitud
        await A.ir(P.mesa_cab[0] + 14, VEL); A.frente();
        const m = cosa({ spr: 'sello_mano', x: P.mesa_cab[0], y: P.mesa_cab[1] - 26, capa: 3 });
        await tween(m, { y: P.mesa_cab[1] - 6 }, 0.25, E.entra);
        SON.golpe(); sacudir(3);
        const s = cosa({ spr: 'sello', x: 744, y: 318, esc: 1.6, alfa: 0, capa: 10 });
        tween(s, { esc: 1, alfa: 1 }, 0.3, E.entra);
        fx.polvo(P.mesa_cab[0], P.mesa_cab[1] - 2, 5);
        await tween(m, { y: P.mesa_cab[1] - 26, alfa: 0 }, 0.4, E.sale); quitar(m);
        for (const id of ['tec1', 'tec2', 'sistemas', 'datos']) ACT[id].gestoPor('contento', 3);
        etiqueta('APROBADO, VENTANA DEL DOMINGO 11', 728, 296, '#3aa060');
        await di(B, 1, { tipo: 'grita' });
      },
      async () => {
        const si = ACT.sistemas;
        const r = llevar(si, 'release', { mano: true });
        await dejar(r, si.x + 10, P.mesa_cab[1] - 2, 0.5);
        SON.golpe();
        etiqueta('RELEASE 1.4.2 DE VENTAS, SEDE POR SEDE', 760, 304, '#f08a30');
        // se instala por etapas, la bodega central y despues cada sucursal
        await camara({ x: 600, y: 470, w: 900, h: 420 }, 1.0);
        for (const sede of ['ventas', 'suc1', 'suc2']) {
          await enviar('kpi', sede, { txt: '1.4.2', color: '#ffd23c', vel: 420 });
          SON.ding();
        }
        await camara({ x: 728, y: 326, w: 280, h: 100 }, 1.0);
        SON.fanfarria();
        etiqueta('SE CIERRA EL PROBLEMA 36', 728, 284, '#3aa060');
        await di(A, 2);
      },
    ],
  },
  {
    id: 'mejora', titulo: 'Mejora continua', hora: 17.2,
    cam: { x: 742, y: 324, w: 250, h: 100 },
    prep() {
      for (const id of ['tec1', 'tec2', 'sistemas', 'datos']) va(id, GENTE[id][0], GENTE[id][1], { vista: 'frente', teclea: true });
      va(A, 628, 'p3', { vista: 'frente' }); va(B, 676, 'p3', { vista: 'frente' });
      va(PERRO, 822, 'p3', { sentado: true, dir: -1 });
      ST.kpi = [0, 0, 0, 0, 0, 0]; ST.linea = 0;
    },
    pasos: [
      async () => {
        const meta = [0.55, 0.7, 0.62, 0.82, 0.74, 0.9];
        for (let i = 0; i < 6; i++) { tween(ST.kpi, { [i]: meta[i] }, 0.6, E.resorte); SON.blip(1 + i * 0.12); await espera(0.14); }
        await tween(ST, { linea: 1 }, 1.2, E.lineal);
        fx.chispas(838, 314, 16, ['#7aff8a', '#ffffff']); SON.brillo();
        pantalla(773, 306, ['27 INDICADORES MEDIDOS', 'SOBRE LAS TABLAS DE GLPI', 'CON SU LISTA DE TICKETS'], { titulo: 'PLUGIN MEJORA CONTINUA', color: TI });
        await di(A, 2);
      },
      async () => {
        for (let k = 0; k < 12; k++) { ST.pdca = k % 4; SON.blip(1 + (k % 4) * 0.25); if (k % 4 === 3) fx.anillo(P.pdca[0], P.pdca[1], '#ffffff', 28, 0.4, 1); await espera(0.22); }
        ST.pdca = 0;
        etiqueta('PLANEAR, HACER, VERIFICAR Y ACTUAR', 652, 296, '#3a3e4a');
        await di(B, 1);
      },
      async () => {
        etiqueta('REGISTRO CSI, 7 OPORTUNIDADES DE MEJORA', 742, 284, '#a070ff');
        await di(A, 2);
      },
    ],
  },
  {
    id: 'fin', titulo: 'Bienvenido al equipo', hora: 18,
    cam: { x: 436, y: 486, w: 300, h: 100 },
    prep() {
      va('tec2', 760, 'p1', { vista: 'frente' });
      va(A, 398, 'p1', { vista: 'frente' }); va(B, 520, 'p1', { vista: 'frente' });
      va(PERRO, 548, 'p1', { sentado: true, dir: -1 });
      for (const id of ['davi', 'juanpa', 'meme']) ACT[id].visible = false;
      ST.fiesta = false;
    },
    pasos: [
      async () => {
        await B.ir(446, VEL); B.frente();
        for (let k = 0; k < 8; k++) { B.vista = ['frente', 'lado', 'espalda', 'lado'][k % 4]; B.dir = k % 8 < 4 ? 1 : -1; SON.blip(1 + k * 0.1); await espera(0.07); }
        flash = 0.7; flashColor = '255,255,255';
        B.base = 'nuevoti'; B.frente();
        fx.chispas(B.x, B.y - 16, 50, ['#58e0d8', '#ffffff', '#ffd23c'], 90); SON.fanfarria();
        B.saltar(8, 0.4);
        fx.corazones(PERRO.x, PERRO.y - 16, 3);
        await di(A, 2);
      },
      async () => { await di(B, 2); },
      async () => {
        callar();
        camara({ x: 470, y: 482, w: 290, h: 100 }, 0.8);
        // el equipo baja del piso de arriba en el elevador
        const quien = [['davi', 'JOSÉ DAVID', 'CAMBIOS Y RELEASES'], ['juanpa', 'JUAN PABLO', 'ESTRATEGIA, CONOCIMIENTO Y MEJORA'], ['meme', 'JOSÉ MANUEL', 'INCIDENTES Y PROBLEMAS']];
        await usarAscensor(async () => {
          await ascensor('p3');
          SON.click(); await tween(ASC, { puerta: 0 }, 0.22);
          quien.forEach(([id], i) => pon(id, ASC.x - 6 + i * 6, 'p3', { enCabina: true }));
          await ascensor('p1');
        });
        PERRO.ir(380).then(() => { PERRO.sentado = true; PERRO.dir = 1; });
        const xs = [486, 516, 546];
        for (const [i, [id, nombre, rol]] of quien.entries()) {
          ACT[id].enCabina = false; ACT[id].vista = 'lado';
          ACT[id].ir(xs[i], VEL).then(() => {
            ACT[id].frente(); ACT[id].saltar(6);
            fx.chispas(xs[i], PISO.p1 - 20, 14, ['#58e0d8', '#ffffff']);
          });
          await espera(0.5);
        }
        await espera(1.6);
        fx.cohete(430, 500, 40); fx.cohete(520, 500, 40); SON.fanfarria();
        fx.confeti(500, 450, 60, 120);
        await espera(0.6);
        pantalla(516, PISO.p1 - 38, quien.map(([, n, rol]) => n + ', ' + rol), { titulo: 'EL EQUIPO', color: TI, fija: true, vel: 110 });
      },
      async () => {
        callar();
        horaA(18.8, 4);
        ST.fiesta = true;
        await camara({ x: 640, y: 380, w: 1300, h: 760 }, 2.6);
        const t1 = cosa({ spr: 'titulo_fin', x: 580, y: -60, capa: 10 });
        await tween(t1, { y: 110 }, 0.9, E.rebote);
        SON.golpe(); sacudir(5); fx.chispas(580, 110, 50, ['#ffd23c', '#ffffff'], 100);
        await espera(0.4);
        const t2 = cosa({ spr: 'titulo_gracias', x: 580, y: 160, esc: 0, capa: 10 });
        await tween(t2, { esc: 1 }, 0.6, E.resorte);
        SON.fanfarria();
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// el portal, la pantalla de la compu de ventas a pantalla completa, con el formulario Mesa de Servicio
// ─────────────────────────────────────────────────────────────────────────────
const FORM = [
  ['SERVICIO', 'GESTIÓN DE VENTAS'],
  ['QUÉ ESTÁ PASANDO', 'LA FACTURA O LOS MONTOS SALEN MAL'],
  ['A QUIÉN AFECTA', 'VARIAS PERSONAS DE MI ÁREA'],
  ['PUEDE SEGUIR TRABAJANDO', 'PUEDO CONTINUAR PARCIALMENTE'],
  ['DESDE CUÁNDO', 'HACE UNAS HORAS'],
  ['CUÉNTENOS', 'MAYOREO SALE CON PRECIO DE LISTA'],
];
const PORTAL = { cx: 60, cy: 160, presion: 0, form: 0, escrito: 0, ticket: 0, boton: 0, ondas: -9 };
dibujarPantalla = (c, W, H) => {
  c.fillStyle = '#14101e'; c.fillRect(0, 0, W, H);
  const s = Math.max(1, Math.floor(Math.min(W * 0.9 / 330, H * 0.86 / 196)));
  const pw = 320 * s, ph = 180 * s;
  const ox = Math.round((W - pw) / 2), oy = Math.round((H - ph) / 2);
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#30343e'; c.fillRect(ox - 6 * s, oy - 6 * s, pw + 12 * s, ph + 12 * s);
  c.fillStyle = '#1b1522'; c.fillRect(ox - 7 * s, oy - 7 * s, pw + 14 * s, s); c.fillRect(ox - 7 * s, oy + ph + 6 * s, pw + 14 * s, s);
  c.drawImage(IMG.portal, ox, oy, pw, ph);
  c.save();
  c.translate(ox, oy); c.scale(s, s);
  if (PORTAL.presion > 0) { c.fillStyle = `rgba(0,0,0,${0.3 * PORTAL.presion})`; c.fillRect(90, 60, 101, 77); }
  if (T - PORTAL.ondas < 0.6) {
    const r = (T - PORTAL.ondas) * 90;
    c.fillStyle = `rgba(255,255,255,${0.6 - (T - PORTAL.ondas)})`;
    for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; c.fillRect(Math.round(PORTAL.cx + Math.cos(t) * r), Math.round(PORTAL.cy + Math.sin(t) * r), 2, 2); }
  }
  if (PORTAL.form > 0) {
    // el formulario sobre el portal
    c.save();
    c.translate(196, 108); c.scale(PORTAL.form, PORTAL.form); c.translate(-196, -108);
    c.fillStyle = '#1b1522'; c.fillRect(79, 39, 236, 140);
    c.fillStyle = '#fbfcfd'; c.fillRect(80, 40, 234, 138);
    c.fillStyle = '#e03a30'; c.fillRect(80, 40, 234, 12);
    texto(c, 'ALGO NO FUNCIONA, MESA DE SERVICIO', 85, 43, '#ffffff');
    let quedan = PORTAL.escrito;
    FORM.forEach(([et, val], i) => {
      const y = 56 + i * 17;
      texto(c, et, 85, y, '#8a90a0');
      c.fillStyle = '#e6ebf2'; c.fillRect(84, y + 7, 226, 9);
      const n = clamp(Math.floor(quedan), 0, val.length);
      if (n > 0) texto(c, val.slice(0, n), 86, y + 9, '#1b1522');
      if (n > 0 && n < val.length && Math.floor(T * 6) % 2) { c.fillStyle = '#1b1522'; c.fillRect(86 + medirTexto(val.slice(0, n)) + 1, y + 8, 1, 7); }
      quedan -= val.length;
    });
    c.fillStyle = PORTAL.boton ? '#2c7a3a' : '#3aa060'; c.fillRect(226, 160, 84, 14);
    texto(c, 'ENVIAR', 254, 164, '#ffffff');
    c.restore();
  }
  if (PORTAL.ticket > 0) {
    c.fillStyle = `rgba(20,16,30,${0.5 * clamp(PORTAL.ticket, 0, 1)})`; c.fillRect(0, 14, 320, 166);
    const e = PORTAL.ticket;
    c.save(); c.translate(196, 104); c.scale(e, e);
    c.fillStyle = '#1b1522'; c.fillRect(-72, -44, 144, 88);
    c.fillStyle = '#fbf6ea'; c.fillRect(-71, -43, 142, 86);
    c.fillStyle = '#e03a30'; c.fillRect(-71, -43, 142, 12);
    texto(c, 'TICKET 258 CREADO', -66, -40, '#ffffff');
    texto(c, 'INCIDENTE', -66, -24, '#e03a30');
    texto(c, 'GESTIÓN DE VENTAS', -66, -12, '#1b1522');
    texto(c, 'LA FACTURA O LOS MONTOS', -66, 0, '#5a5e6a');
    texto(c, 'SALEN MAL', -66, 10, '#5a5e6a');
    texto(c, 'LE AVISAMOS CADA AVANCE', -66, 26, '#3aa060');
    c.restore();
  }
  spr(c, 'cursor', 0, PORTAL.cx, PORTAL.cy, { ax: 0, ay: 0 });
  c.restore();
};

// ─────────────────────────────────────────────────────────────────────────────
// navegar
// ─────────────────────────────────────────────────────────────────────────────
let escena = 0, paso = 0, ocupado = false, pendiente = 0;
const idx = n => ESCENAS.findIndex(e => e.id === n);
function base(i, instantaneo) {
  estadoInicial();
  COSAS = []; PART = []; GLOBOS = [];
  modo = 'mundo'; PANT.pixelado = 1; flash = 0; camSigue = null; camVuelo = null;
  for (const s of D.salas) luzYa(s.id, i >= idx('inventario') ? 1 : 0);
  luzYa('sot_izq', i >= idx('viaje') ? 1 : 0);
  luzYa('sot_der', i > idx('ia') ? 1 : 0);
  const despierta = i > idx('ia');
  ST.tunel = despierta;
  ST.mapa = i > idx('rastreo');
  ST.nubeEnlace = i > idx('nube');
  ST.nubes = i > idx('nube') ? 1 : 0;
  if (i !== idx('ventas')) ACT.cliente.visible = false;
  // las caras de fondo de cada escena; el vendedor sigue molesto desde que falla la factura hasta que se arregla
  for (const a of Object.values(ACT)) { a.animo = null; a.gesto = null; }
  if (i >= idx('falla') && i < idx('nivel2')) ACT.vendedor.animo = 'estres';
  if (instantaneo) {
    for (const gid in GENTE) {
      const [x, p] = GENTE[gid];
      pon(gid, x, p, { vista: 'frente', teclea: !gid.startsWith('bodega') });
    }
    ACT.bodega1.vista = 'lado'; ACT.bodega1.dir = -1;
    for (const id of ['cliente', 'davi', 'juanpa', 'meme']) ACT[id].visible = false;
    B.base = i >= idx('fin') + 1 ? 'nuevoti' : (i >= idx('llegada') + 1 ? 'nuevog' : 'nuevo');
    pon(A, 330, 'pb'); pon(B, 350, 'pb'); pon(PERRO, 370, 'pb', { sentado: true });
    IA.despierta = despierta; IA.cara = despierta ? 'abiertos' : 'cerrados'; IA.aura = despierta ? 0.5 : 0;
    LAPTOP.pantalla = despierta ? 2 : 0; GPU.prendida = despierta; PALANCA.pos = despierta ? 2 : 0;
    pon(CAMION, 1182, 636, { vista: 'lado', dir: 1, visible: i <= idx('pedidos') });
    pon(CAMIONETA, -460, 636, { vista: 'lado', dir: 1, visible: false });
    pon(MONTA, i <= idx('inventario') ? 1180 : 1070, 'pb', { vista: 'lado', dir: -1 });
    GALLINAS.forEach((g, k) => pon(g, 1012 + k * 34, 'pb', { vista: 'lado', dir: k % 2 ? -1 : 1, ocupada: false }));
    ASC.y = PISO.p1; ASC.puerta = 4;
    HORA.v = ESCENAS[i].hora;
  } else {
    horaA(ESCENAS[i].hora, 2);
  }
  cam.sacudida = 0; cam.golpe = 0;
}
async function irEscena(i, instantaneo = false) {
  i = clamp(i, 0, ESCENAS.length - 1);
  ocupado = true;
  escena = i; paso = 0;
  const e = ESCENAS[i];
  base(i, instantaneo);
  INSTANTE = instantaneo; LUGARES = [];
  e.prep && e.prep();
  INSTANTE = true;
  const lugares = LUGARES; LUGARES = [];
  HUD.titulo = e.titulo.toUpperCase(); HUD.num = i + 1; HUD.total = ESCENAS.length; HUD.paso = 0; HUD.pasos = e.pasos.length;
  HUD.alfa = 1; HUD.x = -500 * dpr;
  tween(HUD, { x: 0 }, 0.5, E.sale);
  try {
    if (instantaneo) { cam.x = e.cam.x; cam.y = e.cam.y; cam.z = zoomPara(e.cam); }
    else if (lugares.some(l => l.a === A && Math.abs(A.y - l.y) > 2)) {
      // si el guia cambia de piso, la camara lo acompana en el elevador
      seguir(A, 330, 3);
      await viaje(lugares);
      await camara(e.cam);
    } else await Promise.all([camara(e.cam), viaje(lugares)]);
    if (e.entrada) await e.entrada();
  } catch (err) { console.error(err); }
  terminar();
}
function terminar() {
  ocupado = false;
  prisa = 1;
  if (pendiente > 0) { pendiente--; avanzar(); }
}
async function avanzar() {
  SON.iniciar();
  if (ocupado) { prisa = 6; pendiente = Math.min(1, pendiente + 1); return; }
  const e = ESCENAS[escena];
  if (paso < e.pasos.length) {
    ocupado = true;
    for (const c of COSAS) if (c.txt !== undefined && !c.fija && !c.muerta) tween(c, { alfa: 0 }, 0.25).then(() => quitar(c));
    const k = paso++;
    HUD.paso = paso;
    try { await e.pasos[k](); } catch (err) { console.error(err); }
    terminar();
  } else if (escena < ESCENAS.length - 1) {
    irEscena(escena + 1);
  }
}
function soltarTodo() {
  // lo que estaba a medio camino se corta, y el elevador queda libre
  tweens.length = 0; esperas.length = 0;
  candado = Promise.resolve();
  for (const x of Object.values(ACT)) { x.alLlegar = null; x.destino = undefined; x.anda = false; x.enCabina = false; }
}
function retroceder() {
  pendiente = 0; prisa = 1;
  soltarTodo();
  ocupado = false;
  irEscena(paso > 0 ? escena : escena - 1, true);
}

window.addEventListener('keydown', ev => {
  const k = ev.key;
  if (['ArrowRight', ' ', 'Enter', 'PageDown', 'ArrowDown'].includes(k)) { ev.preventDefault(); avanzar(); }
  else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(k)) { ev.preventDefault(); retroceder(); }
  else if (k === 'Home') { soltarTodo(); ocupado = false; irEscena(0, true); }
  else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); }
  else if (k === 'm' || k === 'M') { SON.iniciar(); SON.mudo = !SON.mudo; }
  else if (k === 'h' || k === 'H') HUD.visible = !HUD.visible;
});
cv.addEventListener('pointerdown', ev => {
  if (ev.button === 2) return;
  if (ev.clientX < window.innerWidth * 0.12) retroceder(); else avanzar();
});
cv.addEventListener('contextmenu', ev => { ev.preventDefault(); retroceder(); });
window.addEventListener('resize', () => { const k = ancho; medir(); cam.z = Math.max(1, Math.round(cam.z * ancho / k)); });

// para probar desde la consola o con ?escena=n
window.PRESENTACION = { irEscena, avanzar, ESCENAS, ST, ACT, get escena() { return escena; }, get paso() { return paso; }, get ocupado() { return ocupado; } };

medir();
cargar(['hoja', 'mundo', 'frente', 'lejos', 'cerca', 'portal']).then(() => {
  requestAnimationFrame(t => { ultimo = t; bucle(t); });
  const q = new URLSearchParams(location.search);
  irEscena(parseInt(q.get('escena') || '1', 10) - 1, true);
}).catch(err => {
  document.body.insertAdjacentHTML('beforeend', '<p style="color:#fff;font:16px monospace;padding:20px">' + err.message + '. Corre python generar.py</p>');
});
