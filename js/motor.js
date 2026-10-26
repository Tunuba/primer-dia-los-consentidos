// El motor de la presentacion. Camara con zoom, gente, globos, particulas, luces y sonidos.
// No dibuja pixel art propio, todo sale de img/ (generar.py). Lo que pasa en cada escena esta en guion.js.
'use strict';

const D = window.DATOS;
const PISO = Object.assign({ az: D.mundo.azotea }, D.mundo.pisos);
const P = D.puntos;
const cv = document.getElementById('lienzo');
const ctx = cv.getContext('2d');
const IMG = {};
let ancho = 0, alto = 0, dpr = 1;

// ─────────────────────────────────────────────────────────────────────────────
// tiempo, esperas y tweens sobre el reloj del juego (se puede apurar)
// ─────────────────────────────────────────────────────────────────────────────
let T = 0;
let prisa = 1;
const esperas = [];
const tweens = [];
const espera = s => new Promise(r => esperas.push({ t: T + s, r }));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const E = {
  lineal: t => t,
  suave: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  sale: t => 1 - Math.pow(1 - t, 3),
  entra: t => t * t * t,
  rebote: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  resorte: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};
function tween(obj, props, dur, ease = E.suave) {
  return new Promise(r => {
    const desde = {};
    for (const k in props) desde[k] = obj[k];
    tweens.push({ obj, props, desde, t0: T, dur: Math.max(0.001, dur), ease, r });
  });
}
function correrTiempo(dt) {
  T += dt;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    const t = clamp((T - w.t0) / w.dur, 0, 1);
    const e = w.ease(t);
    for (const k in w.props) w.obj[k] = lerp(w.desde[k], w.props[k], e);
    if (t >= 1) { tweens.splice(i, 1); w.r(); }
  }
  for (let i = esperas.length - 1; i >= 0; i--) {
    if (T >= esperas[i].t) { const w = esperas[i]; esperas.splice(i, 1); w.r(); }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sonidos sintetizados, sin archivos
// ─────────────────────────────────────────────────────────────────────────────
const SON = {
  ac: null, master: null, mudo: false,
  iniciar() {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ac.destination);
    } catch (e) { this.ac = null; }
  },
  ok() { return this.ac && !this.mudo && prisa < 3; },
  tono(f, dur, tipo = 'square', vol = 0.3, f2 = null, cuando = 0) {
    if (!this.ok()) return;
    const t = this.ac.currentTime + cuando;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  ruido(dur, vol = 0.25, f0 = 800, f1 = 3000) {
    if (!this.ok()) return;
    const t = this.ac.currentTime;
    const n = Math.floor(this.ac.sampleRate * dur);
    const b = this.ac.createBuffer(1, n, this.ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ac.createBufferSource(); s.buffer = b;
    const fl = this.ac.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t);
  },
  blip(p = 1) { this.tono(520 * p, 0.05, 'square', 0.08); },
  pop() { this.tono(300, 0.09, 'sine', 0.35, 900); },
  tecla() { this.tono(900 + Math.random() * 500, 0.025, 'square', 0.035); },
  vuelo() { this.ruido(0.6, 0.18, 400, 2400); },
  ding() { this.tono(1320, 0.5, 'sine', 0.25); this.tono(1760, 0.6, 'sine', 0.2, null, 0.12); },
  golpe() { this.tono(140, 0.25, 'sine', 0.6, 40); this.ruido(0.18, 0.2, 300, 120); },
  brillo() { [0, 1, 2, 3].forEach(i => this.tono(880 * Math.pow(1.26, i), 0.12, 'triangle', 0.12, null, i * 0.06)); },
  prende() {
    this.tono(60, 1.6, 'sawtooth', 0.25, 600);
    this.tono(90, 1.6, 'square', 0.12, 1200);
    this.ruido(1.4, 0.18, 200, 5000);
  },
  click() { this.tono(1800, 0.03, 'square', 0.12); this.tono(400, 0.05, 'square', 0.1, null, 0.03); },
  alarma() { [0, 1, 2].forEach(i => { this.tono(880, 0.12, 'square', 0.12, null, i * 0.25); this.tono(660, 0.12, 'square', 0.12, null, i * 0.25 + 0.12); }); },
  moneda() { this.tono(988, 0.07, 'square', 0.1); this.tono(1319, 0.25, 'square', 0.1, null, 0.07); },
  bocina() { this.tono(330, 0.35, 'sawtooth', 0.15); this.tono(415, 0.35, 'sawtooth', 0.12); },
  fanfarria() { [523, 659, 784, 1047].forEach((f, i) => this.tono(f, 0.3, 'square', 0.12, null, i * 0.12)); },
  guau() { this.tono(500, 0.12, 'sawtooth', 0.15, 250); },
  cloc() { this.tono(1200, 0.06, 'square', 0.06, 700); },
};

// ─────────────────────────────────────────────────────────────────────────────
// la letra de pixeles
// ─────────────────────────────────────────────────────────────────────────────
const cacheTexto = new Map();
function textoCanvas(s, color, sombra) {
  const k = s + '|' + color + '|' + (sombra || '');
  if (cacheTexto.has(k)) return cacheTexto.get(k);
  const g = [...s.toUpperCase()].map(c => D.fuente[c] || D.fuente['?']);
  const w = g.reduce((a, f) => a + f[0].length + 1, 0) + 1;
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = 10;
  const x = c.getContext('2d');
  let cx = 0;
  for (const f of g) {
    for (let y = 0; y < 9; y++) for (let i = 0; i < f[y].length; i++) {
      if (f[y][i] !== '#') continue;
      if (sombra) { x.fillStyle = sombra; x.fillRect(cx + i + 1, y + 1, 1, 1); }
      x.fillStyle = color; x.fillRect(cx + i, y, 1, 1);
    }
    cx += f[0].length + 1;
  }
  cacheTexto.set(k, c);
  return c;
}
function medirTexto(s) {
  return [...s.toUpperCase()].reduce((a, c) => a + (D.fuente[c] || D.fuente['?'])[0].length + 1, 0) - 1;
}
// y es la fila de arriba de la mayuscula
function texto(c, s, x, y, color = '#fff', sombra = null, esc = 1) {
  const t = textoCanvas(s, color, sombra);
  c.drawImage(t, Math.round(x), Math.round(y - 2 * esc), t.width * esc, t.height * esc);
}

// ─────────────────────────────────────────────────────────────────────────────
// sprites
// ─────────────────────────────────────────────────────────────────────────────
function spr(c, nombre, f, x, y, o = {}) {
  const fr = D.sprites[nombre];
  if (!fr) return;
  const n = fr.length;
  const [sx, sy, sw, sh] = fr[((Math.floor(f) % n) + n) % n];
  const esc = o.esc ?? 1, ex = o.ex ?? esc, ey = o.ey ?? esc;
  const ax = o.ax ?? 0.5, ay = o.ay ?? 1;
  c.save();
  if (o.alfa !== undefined) c.globalAlpha *= clamp(o.alfa, 0, 1);
  c.translate(Math.round(x), Math.round(y));
  if (o.rot) c.rotate(o.rot);
  c.scale(o.flip ? -ex : ex, ey);
  c.drawImage(IMG.hoja, sx, sy, sw, sh, -Math.round(sw * ax), -Math.round(sh * ay), sw, sh);
  c.restore();
}
const altoDe = n => (D.sprites[n] ? D.sprites[n][0][3] : 0);

// ─────────────────────────────────────────────────────────────────────────────
// actores, la gente, los animales y cualquier sprite que se mueve
// ─────────────────────────────────────────────────────────────────────────────
const ACT = {};
class Actor {
  constructor(id, o) {
    Object.assign(this, {
      id, base: id, tipo: 'persona', x: 0, y: 0, vista: 'frente', dir: 1, anda: false, vel: 46,
      visible: true, alfa: 1, esc: 1, salto: 0, habla: 0, frame: 0, capa: 1, cabeza: 34,
      color: '#1fa59c', teclea: false, sigue: null, spr: null, fps: 8, recorrido: 0, ex: 1, enCabina: false,
    }, o);
    this.fase = Math.random() * 10;
    this.proxParpadeo = Math.random() * 4;
    ACT[id] = this;
  }
  nombreSpr() {
    if (this.tipo === 'persona') return 'p_' + this.base + '_' + this.vista;
    return this.spr;
  }
  ir(x, vel) {
    // si iba a otro lado, ese viaje se da por terminado y sigue hacia el nuevo
    if (this.alLlegar) { const r0 = this.alLlegar; this.alLlegar = null; r0(); }
    return new Promise(r => {
      this.destino = x; this.alLlegar = r; this.anda = true;
      if (vel) this.vel = vel;
      this.vista = this.tipo === 'persona' ? 'lado' : this.vista;
      this.dir = x >= this.x ? 1 : -1;
    });
  }
  async saltar(h = 6, dur = 0.32) {
    await tween(this, { salto: h }, dur / 2, E.sale);
    await tween(this, { salto: 0 }, dur / 2, E.entra);
  }
  mira(d) { this.vista = 'lado'; this.dir = d; }
  // la cara del momento: parpadear manda, luego hablar, luego un gesto pasajero y al final su animo
  caraAhora() {
    if (this.parpadeoHasta > T && (this.vista === 'frente' || this.vista === 'lado')) return 'parpadeo';
    if (this.vista !== 'frente') return null;
    if (this.habla > 0) return Math.floor(T * 7 + this.fase) % 2 ? 'habla' : null;
    if (this.gesto && this.gestoHasta > T) return this.gesto;
    return this.animo || null;
  }
  gestoPor(g, seg = 2) { this.gesto = g; this.gestoHasta = T + seg; }
  frente() { this.vista = 'frente'; }
  actualizar(dt) {
    const x0 = this.x;
    if (this.anda && this.destino !== undefined) {
      const d = this.destino - this.x;
      const paso = this.vel * dt;
      if (Math.abs(d) <= paso) {
        this.x = this.destino; this.anda = false; this.destino = undefined;
        const r = this.alLlegar; this.alLlegar = null; if (r) r();
      } else { this.x += Math.sign(d) * paso; this.dir = Math.sign(d); }
    }
    if (this.sigue) {
      const o = ACT[this.sigue];
      if (o && o.visible) {
        const meta = o.x - o.dir * 20;
        if (Math.abs(meta - this.x) > 6 && Math.abs(o.y - this.y) < 4) {
          this.anda = true; this.destino = undefined;
          this.dir = Math.sign(meta - this.x);
          this.x += this.dir * Math.min(Math.abs(meta - this.x), 70 * dt);
        } else if (this.destino === undefined) this.anda = false;
        if (Math.abs(o.y - this.y) >= 4) { this.y = o.y; this.x = meta; }
      }
    }
    if (this.enCabina) this.y = ASC.y;
    // parpadea cada pocos segundos, cada quien a su ritmo
    if (T > this.proxParpadeo) { this.parpadeoHasta = T + 0.13; this.proxParpadeo = T + 2.2 + Math.random() * 4.5; }
    this.recorrido += Math.abs(this.x - x0);
    this.fase += dt;
  }
  sombra(c) {
    if (this.tipo !== 'persona' && this.tipo !== 'animal') return;
    // la sombra se queda en el piso y se achica cuando salta
    const k = clamp(1 - this.salto / 24, 0.45, 1);
    const w = Math.round((this.ancho || 7) * k);
    const x = Math.round(this.x), y = Math.round(this.y);
    c.fillStyle = `rgba(24,14,34,${(0.30 * k * this.alfa).toFixed(3)})`;
    c.fillRect(x - w, y - 1, w * 2 + 1, 1);
    c.fillRect(x - w + 2, y, Math.max(1, w * 2 - 3), 1);
  }
  dibujar(c) {
    if (!this.visible || this.alfa <= 0) return;
    let n = this.nombreSpr();
    let f = 0;
    let dy = -this.salto;
    this.sombra(c);
    if (this.tipo === 'persona') {
      // un paso cada 5 pixeles recorridos, asi los pies no patinan a ninguna velocidad
      if (this.anda) f = Math.floor(this.recorrido / 5) % 4;
      else {
        const cara = this.caraAhora();
        const nn = cara && 'p_' + this.base + '_cara_' + cara + (this.vista === 'lado' ? '_lado' : '');
        if (nn && D.sprites[nn]) n = nn;
        if (this.teclea && !this.habla && Math.floor(this.fase * 5 + this.x) % 5 === 0) dy -= 1;
      }
    } else if (this.anim) {
      const a = this.anim(this);
      n = a.n; f = a.f; dy += a.dy || 0;
      if (a.sinVolteo) var sinVolteo = true;
    } else if (D.sprites[n] && D.sprites[n].length > 1) f = Math.floor(this.fase * this.fps);
    spr(c, n, f, this.x, this.y + dy, { flip: this.dir < 0 && this.tipo !== 'fijo' && !sinVolteo, esc: this.esc, ex: this.esc * this.ex, alfa: this.alfa });
    if (this.extra) this.extra(c, this);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cosas sueltas, papelitos, libros, etiquetas, cualquier dibujo con su capa
// ─────────────────────────────────────────────────────────────────────────────
let COSAS = [];
function cosa(o) {
  const c = Object.assign({ x: 0, y: 0, esc: 1, alfa: 1, rot: 0, capa: 9, f: 0, nace: T, fija: false }, o);
  COSAS.push(c);
  return c;
}
function quitar(c) { c.muerta = true; }

// vuela por una curva de Bezier con dos puntos de control
function volar(c, a, b, dur, alto = -40, ease = E.suave) {
  const o = { t: 0 };
  const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) + alto;
  c.x = a[0]; c.y = a[1];
  c.mueve = () => {
    const t = o.t, u = 1 - t;
    const nx = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
    const ny = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
    if (c.giraConRumbo) c.flip = nx < c.x;
    c.x = nx; c.y = ny;
  };
  return tween(o, { t: 1 }, dur, ease).then(() => { c.mueve = null; c.x = b[0]; c.y = b[1]; });
}
// recorre una lista de puntos a velocidad pareja
function recorrer(c, pts, vel) {
  const tramos = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    tramos.push(l); total += l;
  }
  const o = { d: 0 };
  c.mueve = () => {
    let d = o.d, i = 0;
    while (i < tramos.length - 1 && d > tramos[i]) { d -= tramos[i]; i++; }
    const t = tramos[i] ? clamp(d / tramos[i], 0, 1) : 1;
    const nx = lerp(pts[i][0], pts[i + 1][0], t);
    if (c.giraConRumbo && Math.abs(nx - c.x) > 0.01) c.flip = nx < c.x;
    c.x = nx; c.y = lerp(pts[i][1], pts[i + 1][1], t);
  };
  return tween(o, { d: total }, total / vel, E.lineal).then(() => { c.mueve = null; const p = pts[pts.length - 1]; c.x = p[0]; c.y = p[1]; });
}

function dibujarCosa(cx, c) {
  if (c.alfa <= 0) return;
  if (c.dibujar) { c.dibujar(cx, c); return; }
  if (c.spr) {
    const fr = D.sprites[c.spr];
    const f = c.fps ? Math.floor((T - c.nace) * c.fps) : c.f;
    spr(cx, c.spr, f, c.x, c.y, { esc: c.esc, alfa: c.alfa, rot: c.rot, flip: c.flip, ay: c.ay ?? 0.5, ax: c.ax ?? 0.5 });
  }
}

// una etiqueta flotante con letra de pixeles
function vistaMundo(m = 4) {
  const z = cam.z * (1 + cam.golpe);
  const w = ancho / z / 2, h = alto / z / 2;
  return { x0: cam.x - w + m, x1: cam.x + w - m, y0: cam.y - h + m, y1: cam.y + h - m };
}
// mueve una caja para que quede entera dentro de lo que se ve
function dentro(x0, y0, w, h, m = 4) {
  const v = vistaMundo(m);
  return [clamp(x0, v.x0, Math.max(v.x0, v.x1 - w)), clamp(y0, v.y0 + 2, Math.max(v.y0, v.y1 - h - 18))];
}
// Lo que se lee (etiquetas, pantallas, el texto de los paquetes) va a tamano fijo de pantalla, con pixeles enteros,
// asi se ve igual de nitido y del mismo tamano en todas las escenas, se acerque o no la camara.
// El tamano de la letra sale del lado corto de la pantalla, asi en un telefono de pie no crece con lo alto.
// Y si una caja no cabe en el ancho, se achica sola hasta caber.
function escalaLetra(H, W = H * 16 / 9) { return clamp(Math.round(Math.min(W / 450, H / 240)), 2, 6); }
function cabe(anchoLetras, s, W) { while (s > 1 && anchoLetras * s > W * 0.92) s--; return s; }
// las cajas en pantalla que ya estan ocupadas este cuadro (globos, etiquetas, pantallas)
function solape(r, lista) {
  let a = 0;
  for (const o of lista) {
    const w = Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0), h = Math.min(r.y1, o.y1) - Math.max(r.y0, o.y0);
    if (w > 0 && h > 0) a += w * h;
  }
  return a;
}
function etiqueta(txt, x, y, color = '#1fa59c', o = {}) {
  const e = cosa(Object.assign({ x, y, txt, color, esc: 0, capa: 9, flota: true }, o));
  e.hud = (c, H) => {
    const s = cabe(medirTexto(e.txt) + 8, H.s, H.W);
    const w = (medirTexto(e.txt) + 8) * s, h = 13 * s;
    const fy = e.flota ? Math.round(Math.sin((T - e.nace) * 2.2) * 1.5) * s : 0;
    const [sx, sy] = H.aP(e.x, e.y);
    // si lo que nombra quedo fuera de cuadro, la etiqueta no se muestra
    if (sx < -H.W * 0.1 || sx > H.W * 1.1 || sy < -H.H * 0.1 || sy > H.H * 1.1) return;
    let x0 = Math.round(sx - w / 2), y0 = Math.round(sy - h + fy);
    // la etiqueta nunca se sale del cuadro, salvo las que siguen a algo que se fue
    if (!e.libre) { x0 = clamp(x0, 8, Math.max(8, H.W - w - 8)); y0 = clamp(y0, 8, Math.max(8, H.H - h - H.abajo)); }
    // y si tapa un globo u otra etiqueta, sube un renglon
    for (let k = 0; k < 4 && solape({ x0, y0, x1: x0 + w, y1: y0 + h }, H.ocupado) > 0; k++) y0 -= h + 3 * s;
    if (x0 > H.W || y0 > H.H || x0 + w < 0 || y0 + h < 0) return;
    H.ocupado.push({ x0, y0, x1: x0 + w, y1: y0 + h });
    c.save();
    c.globalAlpha *= e.alfa;
    const px = x0 + w / 2, py = y0 + h;
    c.translate(px, py); c.scale(e.esc, e.esc); c.translate(-px, -py);
    c.fillStyle = '#1b1522'; c.fillRect(x0 - s, y0, w + 2 * s, h); c.fillRect(x0, y0 - s, w, h + 2 * s);
    c.fillStyle = e.color; c.fillRect(x0, y0, w, h - s);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x0, y0, w, 2 * s);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0, y0 + h - 2 * s, w, s);
    texto(c, e.txt, x0 + 4 * s, y0 + 3 * s, e.tinta || '#ffffff', 'rgba(0,0,0,0.35)', s);
    c.restore();
  };
  tween(e, { esc: 1 }, 0.35, E.resorte);
  SON.pop();
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// globos de dialogo, solo lineas, porque las palabras las ponen los que presentan
// ─────────────────────────────────────────────────────────────────────────────
let GLOBOS = [];
function hacerLineas(n, largo) {
  const lineas = [];
  for (let i = 0; i < n; i++) {
    const l = i === n - 1 && n > 1 ? Math.round(largo * (0.45 + Math.random() * 0.35)) : largo - Math.floor(Math.random() * 6);
    const palabras = [];
    let x = 0;
    while (x < l - 2) {
      const w = Math.min(l - x, 3 + Math.floor(Math.random() * 7));
      palabras.push([x, w]);
      x += w + 2;
    }
    lineas.push({ l, palabras });
  }
  return lineas;
}
function di(quien, n = 2, o = {}) {
  const a = typeof quien === 'string' ? ACT[quien] : quien;
  const largo = o.largo ?? (n === 1 ? 22 + Math.floor(Math.random() * 10) : 34 + Math.floor(Math.random() * 10));
  const lado = o.lado ?? 0;
  const alto = n * 5 + 6;
  for (const g of GLOBOS) {
    if (g.quien === a || g.vieja) g.muere = true;
    else {
      g.vieja = true;
      // el globo anterior sube y deja su lugar, como en un chat
      if (Math.abs(g.quien.x + (g.lado || 0) - a.x - lado) < (g.largo + largo) / 2 + 14 && Math.abs(g.quien.y - a.y) < 30) tween(g, { subir: alto + 6 + (a.cabeza - g.quien.cabeza) + (a.y - g.quien.y) }, 0.3, E.sale);
    }
  }
  const g = {
    quien: a, lineas: hacerLineas(n, largo), largo, tipo: o.tipo || 'habla', nace: T, esc: 0, subir: 0,
    escrito: 0, color: o.color || a.color || '#1fa59c', lado, icono: o.icono,
  };
  g.total = g.lineas.reduce((s, l) => s + l.l, 0);
  GLOBOS.push(g);
  a.habla = 1;
  SON.pop();
  tween(g, { esc: 1 }, 0.3, E.resorte);
  return new Promise(r => {
    const vel = o.vel ?? 70;
    const o2 = { e: 0 };
    let ultimo = 0;
    const t0 = T;
    g.tick = () => {
      g.escrito = Math.min(g.total, (T - t0 - 0.12) * vel);
      if (g.escrito - ultimo > 3) { ultimo = g.escrito; SON.tecla(); }
    };
    espera(0.12 + g.total / vel).then(() => { g.escrito = g.total; g.tick = null; a.habla = 0; r(); });
  });
}
function callar() { for (const g of GLOBOS) g.muere = true; }

function dibujarGlobo(c, g) {
  const a = g.quien;
  if (!a.visible) return;
  const n = g.lineas.length;
  const w = g.largo + 10, h = n * 5 + 6;
  const ax = Math.round(a.x);
  const ay = Math.round(a.y - a.cabeza - a.salto - 5);
  let x0 = ax - Math.floor(w / 2) + (a.dir < 0 ? -4 : 4) + (g.lado || 0);
  const y0 = ay - h - 4 - Math.round(g.subir || 0);
  g.rect = { x: x0 - 2, y: y0 - 2, w: w + 4, h: h + 8 };
  c.save();
  c.globalAlpha *= (g.vieja ? 0.55 : 1) * g.alfaMuerte;
  c.translate(ax, ay);
  c.scale(g.esc, g.esc);
  c.translate(-ax, -ay);
  const tinta = '#1b1522';
  const fondo = g.tipo === 'grita' ? '#fff3f0' : '#ffffff';
  // cuerpo con esquinas recortadas
  c.fillStyle = tinta;
  c.fillRect(x0 + 1, y0 - 1, w - 2, h + 2);
  c.fillRect(x0 - 1, y0 + 1, w + 2, h - 2);
  c.fillRect(x0, y0, w, h);
  c.fillStyle = fondo;
  c.fillRect(x0 + 1, y0, w - 2, h);
  c.fillRect(x0, y0 + 1, w, h - 2);
  // franja del que habla
  c.fillStyle = g.color;
  c.fillRect(x0 + 1, y0, w - 2, 2);
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.fillRect(x0 + 1, y0 + h - 2, w - 2, 1);
  // cola
  if (g.subir > 2) {
    // ya subio, queda sin cola, como un mensaje anterior del chat
  } else if (g.tipo === 'piensa') {
    c.fillStyle = tinta; c.fillRect(ax - 2, ay - 4, 4, 3); c.fillRect(ax - 1, ay - 1, 2, 2);
    c.fillStyle = fondo; c.fillRect(ax - 1, ay - 3, 2, 1);
  } else {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = tinta; c.fillRect(ax - 3 + i, y0 + h - 1 + i, 7 - 2 * i, 1);
      if (i < 3) { c.fillStyle = fondo; c.fillRect(ax - 2 + i, y0 + h - 1 + i, 5 - 2 * i, 1); }
    }
  }
  if (g.tipo === 'grita') {
    c.fillStyle = '#e03a30';
    c.fillRect(x0 - 3, y0 - 3, 2, 2); c.fillRect(x0 + w + 1, y0 - 3, 2, 2);
    c.fillRect(x0 - 4, y0 + h, 2, 2); c.fillRect(x0 + w + 2, y0 + h, 2, 2);
  }
  // lineas que se van escribiendo
  let quedan = g.escrito;
  for (let i = 0; i < n; i++) {
    const L = g.lineas[i];
    const ly = y0 + 4 + i * 5;
    for (const [px, pw] of L.palabras) {
      const ver = clamp(quedan - px, 0, pw);
      if (ver <= 0) continue;
      c.fillStyle = '#8a90a8';
      c.fillRect(x0 + 5 + px, ly, ver, 2);
      c.fillStyle = '#b8bccc';
      c.fillRect(x0 + 5 + px, ly, ver, 1);
    }
    quedan -= L.l;
  }
  if (g.tick && Math.floor(T * 6) % 2) {
    let resto = g.escrito, li = 0;
    while (li < n - 1 && resto > g.lineas[li].l) { resto -= g.lineas[li].l; li++; }
    c.fillStyle = g.color;
    c.fillRect(x0 + 5 + Math.min(resto, g.lineas[li].l) + 1, y0 + 3 + li * 5, 1, 4);
  }
  c.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// particulas
// ─────────────────────────────────────────────────────────────────────────────
let PART = [];
function particula(o) {
  PART.push(Object.assign({ vx: 0, vy: 0, g: 0, vida: 1, t: 0, tam: 1, color: '#fff', roce: 1, capa: 9 }, o));
}
const fx = {
  chispas(x, y, n = 16, colores = ['#ffe45c', '#ffffff', '#58f0ff'], fuerza = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = fuerza * (0.4 + Math.random());
      particula({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 90, vida: 0.5 + Math.random() * 0.6,
        color: colores[i % colores.length], tam: Math.random() < 0.3 ? 2 : 1, roce: 0.96 });
    }
  },
  confeti(x, y, n = 40, ancho = 80) {
    const col = ['#ff5a7a', '#ffd23c', '#58e0d8', '#7ae07a', '#a070ff', '#ffffff', '#f08a30'];
    for (let i = 0; i < n; i++) {
      particula({ x: x + (Math.random() - 0.5) * ancho, y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 90,
        g: 70, vida: 1.6 + Math.random() * 1.4, color: col[i % col.length], tam: 2, roce: 0.985, gira: true });
    }
  },
  polvo(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      particula({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 14,
        g: 10, vida: 0.5 + Math.random() * 0.5, color: 'rgba(220,210,190,0.8)', tam: 2, roce: 0.9 });
    }
  },
  humo(x, y, n = 1, color = 'rgba(80,80,90,0.6)') {
    for (let i = 0; i < n; i++) {
      particula({ x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 10,
        g: -4, vida: 1 + Math.random(), color, tam: 2 + Math.floor(Math.random() * 2), roce: 0.98, crece: true });
    }
  },
  sprite(nombre, x, y, o = {}) {
    particula(Object.assign({ x, y, spr: nombre, vx: (Math.random() - 0.5) * 20, vy: -26, g: 0, vida: 1.2, roce: 0.98 }, o));
  },
  corazones(x, y, n = 4) {
    for (let i = 0; i < n; i++) fx.sprite('corazon', x + (Math.random() - 0.5) * 16, y, { vy: -20 - Math.random() * 20, vida: 1 + Math.random() * 0.6, ondula: true });
  },
  zzz(x, y) {
    particula({ x, y, txt: 'Z', color: '#c8d8ff', vx: 6, vy: -9, vida: 2.2, roce: 1, ondula: true, crece2: true });
  },
  burbujas(x, y, n = 6) {
    for (let i = 0; i < n; i++) particula({ x: x + (Math.random() - 0.5) * 8, y, vy: -12 - Math.random() * 14, vida: 1.4,
      color: 'rgba(200,240,255,0.9)', tam: 1 + (Math.random() < 0.4 ? 1 : 0), ondula: true, aro: true, capa: 1.5 });
  },
  anillo(x, y, color = '#58f0ff', r1 = 30, dur = 0.6, grosor = 2) {
    const a = cosa({ x, y, r: 2, alfa: 1, capa: 9 });
    a.dibujar = (c, a) => {
      c.save(); c.globalAlpha *= a.alfa; c.fillStyle = color;
      const r = Math.round(a.r);
      for (let k = 0; k < 64; k++) {
        const t = k / 64 * Math.PI * 2;
        c.fillRect(Math.round(a.x + Math.cos(t) * r), Math.round(a.y + Math.sin(t) * r * 0.9), grosor, grosor);
      }
      c.restore();
    };
    tween(a, { r: r1, alfa: 0 }, dur, E.sale).then(() => quitar(a));
  },
  cohete(x, y, alto = 90) {
    const c0 = ['#ff5a7a', '#ffd23c', '#58e0d8', '#7ae07a', '#a070ff'];
    const col = c0[Math.floor(Math.random() * c0.length)];
    particula({ x, y, vx: (Math.random() - 0.5) * 20, vy: -alto * 1.3, g: alto * 0.8, vida: 0.95, color: '#fff7c0', tam: 2, estela: true,
      fin: p => { fx.chispas(p.x, p.y, 36, [col, '#ffffff', col], 70); SON.ruido(0.25, 0.12, 2000, 300); } });
  },
};
function actualizarParticulas(dt) {
  for (const p of PART) {
    p.t += dt;
    p.vx *= Math.pow(p.roce, dt * 60); p.vy *= Math.pow(p.roce, dt * 60);
    p.vy += p.g * dt;
    p.x += p.vx * dt + (p.ondula ? Math.sin(p.t * 6 + p.x) * 0.25 : 0);
    p.y += p.vy * dt;
    if (p.estela && Math.random() < 0.8) PART.push({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0, vida: 0.3, t: 0, tam: 1, color: '#ffd23c', roce: 1, capa: 9 });
    if (p.t >= p.vida && p.fin) { const f = p.fin; p.fin = null; f(p); }
  }
  PART = PART.filter(p => p.t < p.vida);
}
function dibujarParticulas(c, capa) {
  for (const p of PART) {
    if ((p.capa ?? 9) !== capa) continue;
    const vida = 1 - p.t / p.vida;
    c.save();
    c.globalAlpha *= clamp(vida * 2, 0, 1);
    if (p.spr) spr(c, p.spr, 0, p.x, p.y, { ay: 0.5 });
    else if (p.txt) texto(c, p.txt, p.x, p.y, p.color, '#1b1522', p.crece2 ? (p.t > p.vida * 0.4 ? 2 : 1) : 1);
    else if (p.aro) { c.fillStyle = p.color; const s = p.tam + 1; c.fillRect(Math.round(p.x), Math.round(p.y), s, 1); c.fillRect(Math.round(p.x), Math.round(p.y) + s, s, 1); c.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 1, 1, s - 1); c.fillRect(Math.round(p.x) + s, Math.round(p.y) + 1, 1, s - 1); }
    else {
      c.fillStyle = p.color;
      const s = p.crece ? p.tam + Math.floor(p.t * 3) : p.tam;
      if (p.gira && Math.floor(p.t * 10 + p.x) % 2) c.fillRect(Math.round(p.x), Math.round(p.y), s, 1);
      else c.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    c.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// camara, vuela con un zoom en arco
// ─────────────────────────────────────────────────────────────────────────────
const cam = { x: 640, y: 420, z: 1, sacudida: 0, golpe: 0 };
let camSigue = null;
function zoomPara(r) {
  if (r.z) return r.z;
  let z = Math.min(ancho / r.w, alto / (r.h || r.w * 9 / 16));
  // de pie (un telefono), mostrar todo el ancho deja la escena en una franja chiquita; se acerca hasta que
  // lo importante ocupe el ancho, recortando un poco los lados, sin pasar de lo que cabe de alto
  if (alto > ancho * 1.15) z = Math.max(z, Math.min(alto / ((r.h || r.w * 9 / 16) * 1.4), ancho / (r.w * 0.85)));
  // pixeles enteros siempre que se pueda; si no cabe ni a 1, se encoge
  return z < 1 ? z : Math.max(1, Math.round(z));
}
function camara(r, dur) {
  camSigue = null;
  const z1 = zoomPara(r);
  const x0 = cam.x, y0 = cam.y, z0 = cam.z;
  const dist = Math.hypot(r.x - x0, r.y - y0);
  if (dur === undefined) dur = clamp(0.7 + dist / 600 + Math.abs(Math.log(z1 / z0)) * 0.35, 0.8, 2.6);
  const k = Math.max(0, Math.log((dist * Math.max(z0, z1)) / ancho + 1) * 0.55);
  const o = { t: 0 };
  if (dur > 0.5) SON.vuelo();
  const h = { t0: T };
  camVuelo = () => {
    const e = E.suave(o.t);
    cam.x = lerp(x0, r.x, e); cam.y = lerp(y0, r.y, e);
    cam.z = Math.exp(lerp(Math.log(z0), Math.log(z1), e) - k * Math.sin(Math.PI * e));
  };
  return tween(o, { t: 1 }, dur, E.lineal).then(() => { camVuelo = null; cam.x = r.x; cam.y = r.y; cam.z = z1; });
}
let camVuelo = null;
function seguir(o, w, suave = 4) { camSigue = { o, w, suave }; }
function sacudir(f = 4) { cam.sacudida = Math.max(cam.sacudida, f); }
function golpeZoom(f = 0.08) { cam.golpe = f; }

// ─────────────────────────────────────────────────────────────────────────────
// luces por sala y hora del dia
// ─────────────────────────────────────────────────────────────────────────────
const LUZ = {};
for (const s of D.salas) LUZ[s.id] = 1;
function luz(id, v, dur = 0.25) { return tween(LUZ, { [id]: v }, dur, E.lineal); }
function luzYa(id, v) { LUZ[id] = v; }
let hora = 12;
const CIELOS = [
  [4.5, '#0b1030', '#2a2350'], [5.5, '#1a2050', '#c86a6a'], [6.3, '#3a6ab0', '#f6b07a'], [8, '#5aa8e8', '#cfe8f8'],
  [13, '#4aa0ec', '#bfe4fa'], [16.5, '#5a9ad8', '#f0dca8'], [17.8, '#4a5aa8', '#f89a5a'], [18.6, '#2a2a68', '#e86a6a'],
  [19.5, '#0e1238', '#3a2a5a'],
];
function colorHex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mezclaColor(a, b, t) { const A = colorHex(a), B = colorHex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }
function cieloEn(h) {
  for (let i = 0; i < CIELOS.length - 1; i++) {
    const [h0, a0, b0] = CIELOS[i], [h1, a1, b1] = CIELOS[i + 1];
    if (h <= h1) {
      const t = clamp((h - h0) / (h1 - h0), 0, 1);
      return [mezclaColor(a0, a1, t), mezclaColor(b0, b1, t)];
    }
  }
  const u = CIELOS[CIELOS.length - 1];
  return [mezclaColor(u[1], u[1], 0), mezclaColor(u[2], u[2], 0)];
}
function tinteDe(h) {
  // multiplica el exterior, frio de noche, calido al amanecer y al atardecer
  if (h < 5.3) return [0.45, 0.5, 0.8];
  if (h < 6.5) { const t = (h - 5.3) / 1.2; return [lerp(0.55, 1, t), lerp(0.55, 0.92, t), lerp(0.85, 0.85, t)]; }
  if (h < 16.8) return [1, 1, 1];
  if (h < 18.4) { const t = (h - 16.8) / 1.6; return [1, lerp(1, 0.82, t), lerp(1, 0.7, t)]; }
  const t = clamp((h - 18.4) / 1, 0, 1);
  return [lerp(1, 0.5, t), lerp(0.82, 0.5, t), lerp(0.7, 0.85, t)];
}

// ─────────────────────────────────────────────────────────────────────────────
// el elevador
// ─────────────────────────────────────────────────────────────────────────────
const ASC = { x: (D.mundo.pozo[0] + D.mundo.pozo[1]) / 2 + 0.5, y: PISO.p1, puerta: 0, carga: null };
async function ascensor(piso) {
  const y1 = PISO[piso];
  if (Math.abs(ASC.y - y1) < 1) { if (ASC.puerta < 3.9) await tween(ASC, { puerta: 4 }, 0.28); return; }
  SON.click();
  await tween(ASC, { puerta: 0 }, 0.22);
  const dur = 0.4 + Math.abs(y1 - ASC.y) / 200;
  await tween(ASC, { y: y1 }, dur, E.suave);
  SON.ding();
  await tween(ASC, { puerta: 4 }, 0.3);
}

// ─────────────────────────────────────────────────────────────────────────────
// el dibujo de cada cuadro
// ─────────────────────────────────────────────────────────────────────────────
const ESTRELLAS = Array.from({ length: 140 }, () => [Math.random(), Math.random() * 0.75, Math.random()]);
// pajaros con su fisica, aletean al subir y planean al bajar, y el quetzal se posa en el letrero
const PAJAROS = [];
function bandada() {
  // dos o tres quetzales juntos, separados por mas de un cuerpo, cada uno con su aleteo
  const izq = Math.random() < 0.5;
  const x0 = izq ? -90 : D.mundo.ancho + 90;
  const y0 = 80 + Math.random() * 130;
  const n = 2 + Math.floor(Math.random() * 2);
  const v = (izq ? 1 : -1) * (46 + Math.random() * 8);
  for (let i = 0; i < n; i++) {
    PAJAROS.push({ tipo: 'quetzal', x: x0 - (izq ? 1 : -1) * (i * 70 + Math.random() * 20), y: y0 + (i % 2 ? 22 : -6) * Math.ceil(i / 2) + Math.random() * 6,
      vx: v * (0.95 + Math.random() * 0.1), vy: 0, fase: Math.random() * 5, meta: null, posado: 0 });
  }
}
function quetzal() {
  const izq = Math.random() < 0.5;
  const [lx, ly] = D.puntos.letrero;
  PAJAROS.push({ tipo: 'quetzal', x: izq ? -60 : D.mundo.ancho + 60, y: 120 + Math.random() * 60, vx: izq ? 52 : -52, vy: 0, fase: 0,
    meta: Math.random() < 0.6 ? [lx + (Math.random() - 0.5) * 80, ly - 1] : null, posado: 0 });
}
function moverPajaros(dt) {
  for (const p of PAJAROS) {
    p.fase += dt;
    if (p.posado > 0) {
      p.posado -= dt;
      if (p.posado <= 0) { p.vx = (Math.random() < 0.5 ? -1 : 1) * 56; p.vy = -60; p.meta = null; }
    } else if (p.meta) {
      const dx = p.meta[0] - p.x, dy = p.meta[1] - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) { p.x = p.meta[0]; p.y = p.meta[1]; p.vx = Math.sign(p.vx) * 0.01; p.vy = 0; p.posado = 4 + Math.random() * 5; }
      else {
        const v = Math.min(52, 14 + d * 0.5);
        p.vx += ((dx / d) * v - p.vx) * Math.min(1, dt * 2.5);
        p.vy += ((dy / d) * v - p.vy) * Math.min(1, dt * 2.5);
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    } else {
      p.vy += (Math.sin(p.fase * 1.3) * 18 - p.vy) * Math.min(1, dt * 2) - 4 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  for (let i = PAJAROS.length - 1; i >= 0; i--) {
    const p = PAJAROS[i];
    if (p.x < -160 || p.x > D.mundo.ancho + 160 || p.y < -200) PAJAROS.splice(i, 1);
  }
  if (PAJAROS.length < 4 && Math.random() < dt * 0.05) bandada();
  if (!PAJAROS.some(p => p.meta || p.posado > 0) && Math.random() < dt * 0.04) quetzal();
}
function dibujarPajaros(c) {
  for (const p of PAJAROS) {
    const flip = p.vx < 0;
    if (p.posado > 0) {
      spr(c, 'quetzal_posado', 0, p.x, p.y, { flip, ay: 0.85 });
    } else {
      const lento = p.meta && Math.hypot(p.meta[0] - p.x, p.meta[1] - p.y) < 30;
      const f = p.vy > 8 && !lento ? 1 : Math.floor(p.fase * (lento ? 16 : 9)) % 4;
      spr(c, 'quetzal', f, p.x, p.y, { flip, ay: 0.5, rot: clamp(p.vy / 160, -0.35, 0.35) * (flip ? -1 : 1) });
    }
  }
}
let flash = 0, flashColor = '255,255,255';
let modo = 'mundo';
const PANT = { pixelado: 1 };
let dibujarPantalla = null;   // el portal, lo pone el guion
let capaExtra = [];           // funciones de dibujo del guion por capa

function dibujarMundo(c, W, H) {
  const z = cam.z * (1 + cam.golpe) * (W / ancho);
  const sx = cam.sacudida ? (Math.random() - 0.5) * cam.sacudida : 0;
  const sy = cam.sacudida ? (Math.random() - 0.5) * cam.sacudida : 0;
  const cx = cam.x + sx / z, cy = cam.y + sy / z;
  const tx = Math.round(W / 2 - cx * z), ty = Math.round(H / 2 - cy * z);

  // cielo
  const [arriba, abajo] = cieloEn(hora);
  const top = ty + 0 * z, horizonte = ty + 600 * z;
  const gr = c.createLinearGradient(0, Math.min(top, horizonte - 10), 0, horizonte);
  gr.addColorStop(0, arriba); gr.addColorStop(1, abajo);
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // estrellas
  const noche = clamp((6.2 - hora) / 1.2, 0, 1) + clamp((hora - 18.6) / 0.8, 0, 1);
  if (noche > 0) {
    for (const [ex, ey, b] of ESTRELLAS) {
      const tw = 0.5 + 0.5 * Math.sin(T * 3 + b * 20);
      c.fillStyle = `rgba(255,255,240,${noche * tw * 0.9})`;
      const px = Math.round(((ex * 1600 - cam.x * 0.1) % W + W) % W), py = Math.round(ey * H * 0.7);
      c.fillRect(px, py, Math.max(1, Math.round(z * 0.6)), Math.max(1, Math.round(z * 0.6)));
    }
  }
  // sol
  const ts = clamp((hora - 5.5) / 13.2, 0, 1);
  const solX = W * (0.12 + 0.76 * ts) - (cam.x - 640) * z * 0.05;
  const solY = horizonte - Math.sin(ts * Math.PI) * 360 * Math.min(z, 2) - 20 * z;
  const solR = Math.max(6, 16 * Math.min(z, 3));
  if (hora > 5.2 && hora < 19) {
    c.fillStyle = hora > 17.5 || hora < 6.6 ? 'rgba(255,170,90,0.25)' : 'rgba(255,240,180,0.22)';
    c.beginPath(); c.arc(solX, solY, solR * 1.8, 0, Math.PI * 2); c.fill();
    c.fillStyle = hora > 17.5 || hora < 6.6 ? '#ffb070' : '#fff2b0';
    const pas = Math.max(2, Math.round(solR / 6));
    for (let yy = -solR; yy <= solR; yy += pas) {
      const ww = Math.sqrt(solR * solR - yy * yy);
      c.fillRect(Math.round(solX - ww), Math.round(solY + yy), Math.round(ww * 2), pas);
    }
  }
  // capas de atras con paralaje
  const tinte = tinteDe(hora);
  c.imageSmoothingEnabled = false;
  for (const [img, f, base, wx] of [[IMG.lejos, 0.25, 640, -210], [IMG.cerca, 0.55, 615, -160]]) {
    const ex = 640 + (cam.x - 640) * f, ey = 420 + (cam.y - 420) * f;
    const px0 = W / 2 + (wx - ex) * z, py0 = H / 2 + (base - img.height - ey) * z;
    c.drawImage(img, Math.round(px0), Math.round(py0), Math.round(img.width * z), Math.round(img.height * z));
  }

  c.save();
  c.setTransform(z, 0, 0, z, tx, ty);
  c.imageSmoothingEnabled = false;
  // el cielo del mundo, nubes con servidores
  for (const f of capaExtra.filter(f => f.capa === 0)) f.fn(c);
  dibujarPajaros(c);
  // la calle y la tierra siguen mas alla del mundo, nada sale de la nada
  const izq = cx - W / 2 / z, der = cx + W / 2 / z, piso = cy + H / 2 / z;
  const [[ti, tw], [td, tw2]] = D.mundo.tramos, ys = D.mundo.calle, hs = D.mundo.alto - D.mundo.calle;
  for (let x = -tw; x > izq - tw; x -= tw) c.drawImage(IMG.mundo, ti, ys, tw, hs, x, ys, tw, hs);
  for (let x = D.mundo.ancho; x < der + tw2; x += tw2) c.drawImage(IMG.mundo, td, ys, tw2, hs, x, ys, tw2, hs);
  if (piso > D.mundo.alto) { c.fillStyle = '#3a2412'; c.fillRect(Math.floor(izq) - 2, D.mundo.alto, der - izq + 4, piso - D.mundo.alto + 2); }
  c.drawImage(IMG.mundo, 0, 0);
  for (const f of capaExtra.filter(f => f.capa === 1)) f.fn(c);
  dibujarCapaCosas(c, 1);
  // lo que va dentro de algo (la ballena en su pecera) y luego lo que lo cubre (el agua y el vidrio)
  for (const a of Object.values(ACT)) if (a.visible && a.capa === 0.5) a.dibujar(c);
  dibujarParticulas(c, 1.5);
  for (const f of capaExtra.filter(f => f.capa === 1.4)) f.fn(c);
  // el elevador, la cabina por dentro, la gente que va adentro y las puertas
  spr(c, 'ascensor_cabina', 0, ASC.x, ASC.y);
  c.save();
  c.beginPath(); c.rect(Math.round(ASC.x) - 13, Math.round(ASC.y) - 42, 26, 42); c.clip();
  for (const a of Object.values(ACT)) if (a.visible && a.enCabina) a.dibujar(c);
  c.restore();
  dibujarCapaCosas(c, 'cabina');
  spr(c, 'ascensor_puertas', Math.round(ASC.puerta), ASC.x, ASC.y);
  // lo que esta mas al fondo (y menor) se dibuja primero
  const vis = Object.values(ACT).filter(a => a.visible && a.capa === 1 && !a.enCabina).sort((a, b) => (a.y - b.y) || ((a.z || 0) - (b.z || 0)));
  for (const a of vis) a.dibujar(c);
  dibujarCapaCosas(c, 2);
  c.drawImage(IMG.frente, 0, 0);
  dibujarCapaCosas(c, 2.9);
  for (const a of Object.values(ACT).filter(a => a.visible && a.capa === 3).sort((p, q) => (p.tipo === 'vehiculo' ? 0 : 1) - (q.tipo === 'vehiculo' ? 0 : 1))) a.dibujar(c);
  dibujarCapaCosas(c, 3);
  for (const f of capaExtra.filter(f => f.capa === 3)) f.fn(c);
  // tinte del exterior y salas a oscuras
  c.globalCompositeOperation = 'multiply';
  if (tinte[0] < 0.999 || tinte[2] < 0.999 || tinte[1] < 0.999) {
    c.save();
    c.beginPath();
    c.rect(-4000, -4000, 10000, 10000);
    for (const s of D.salas) if (LUZ[s.id] >= 0.999) c.rect(s.x0, s.y0, s.x1 - s.x0 + 1, s.y1 - s.y0 + 1);
    c.clip('evenodd');
    c.fillStyle = `rgb(${Math.round(tinte[0] * 255)},${Math.round(tinte[1] * 255)},${Math.round(tinte[2] * 255)})`;
    c.fillRect(-4000, -4000, 10000, 10000);
    c.restore();
  }
  const delante = Object.values(ACT).filter(a => a.visible && a.tipo === 'vehiculo');
  c.save();
  if (delante.length) {
    c.beginPath(); c.rect(-4000, -4000, 10000, 10000);
    for (const v of delante) c.rect(v.x - 62, v.y - 58, 124, 62);
    c.clip('evenodd');
  }
  for (const s of D.salas) {
    const v = LUZ[s.id];
    if (v >= 0.999) continue;
    const k = 1 - v;
    // si el exterior ya va tenido, la sala se aclara para no oscurecer dos veces
    const r = Math.round(lerp(255, 34, k) / Math.max(0.4, tinte[0])), g = Math.round(lerp(255, 38, k) / Math.max(0.4, tinte[1])), b = Math.round(lerp(255, 80, k) / Math.max(0.4, tinte[2]));
    c.fillStyle = `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`;
    c.fillRect(s.x0, s.y0, s.x1 - s.x0 + 1, s.y1 - s.y0 + 1);
  }
  c.restore();
  c.globalCompositeOperation = 'source-over';
  // lo que brilla aunque este oscuro
  for (const f of capaExtra.filter(f => f.capa === 8)) f.fn(c);
  dibujarCapaCosas(c, 8);
  dibujarParticulas(c, 9);
  dibujarCapaCosas(c, 9);
  for (const g of GLOBOS) dibujarGlobo(c, g);
  dibujarCapaCosas(c, 10);
  c.restore();
  const Hd = {
    s: escalaLetra(H, W), W, H, z, abajo: Math.round(Math.min(H * 0.11, 30 * escalaLetra(H, W))),
    aP: (x, y) => [x * z + tx, y * z + ty],
    ocupado: [],
  };
  for (const g of GLOBOS) {
    if (!g.rect || !g.quien.visible) continue;
    const [x0, y0] = Hd.aP(g.rect.x, g.rect.y);
    Hd.ocupado.push({ x0, y0, x1: x0 + g.rect.w * z, y1: y0 + g.rect.h * z });
  }
  // primero lo fijo, despues las pantallas que buscan su lugar, y al final el texto de lo que vuela
  const orden = k => k.esPantalla ? 1 : k.esPaquete ? 2 : 0;
  const lista = COSAS.filter(k => !k.muerta && k.hud && k.alfa > 0).sort((p, q) => orden(p) - orden(q));
  for (const k of lista) k.hud(c, Hd);
}
function dibujarCapaCosas(c, capa) {
  for (const k of COSAS) if (!k.muerta && k.capa === capa) dibujarCosa(c, k);
}

let buf = document.createElement('canvas');
function cuadro() {
  const W = cv.width, H = cv.height;
  ctx.imageSmoothingEnabled = false;
  let destino = ctx, bw = W, bh = H;
  if (PANT.pixelado > 1.01) {
    bw = Math.max(8, Math.round(W / PANT.pixelado)); bh = Math.max(8, Math.round(H / PANT.pixelado));
    if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
    destino = buf.getContext('2d');
    destino.imageSmoothingEnabled = false;
  }
  destino.setTransform(1, 0, 0, 1, 0, 0);
  if (modo === 'pantalla' && dibujarPantalla) dibujarPantalla(destino, bw, bh);
  else dibujarMundo(destino, bw, bh);
  if (destino !== ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, bw, bh, 0, 0, W, H);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // vineta
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,24,0.38)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (flash > 0) { ctx.fillStyle = `rgba(${flashColor},${clamp(flash, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  dibujarHUD();
}

// ─────────────────────────────────────────────────────────────────────────────
// lo de abajo de la pantalla, el numero y nombre de la escena
// ─────────────────────────────────────────────────────────────────────────────
let HUD = { titulo: '', num: 0, total: 1, alfa: 0, x: -400, visible: true, paso: 0, pasos: 0 };
function dibujarHUD() {
  if (!HUD.visible || HUD.alfa <= 0) return;
  const e = Math.max(2, Math.round(Math.min(cv.width / 330, cv.height / 270)));
  const c = ctx;
  c.save();
  c.globalAlpha = HUD.alfa;
  const num = String(HUD.num).padStart(2, '0');
  const w = (medirTexto(num) + medirTexto(HUD.titulo) + 22) * e;
  const h = 15 * e;
  const x = Math.round(12 * e + HUD.x), y = cv.height - h - 10 * e;
  c.fillStyle = '#1b1522'; c.fillRect(x - e, y - e, w + 2 * e, h + 2 * e);
  c.fillStyle = '#f0c040'; c.fillRect(x, y, (medirTexto(num) + 8) * e, h);
  c.fillStyle = '#fbf6ea'; c.fillRect(x + (medirTexto(num) + 8) * e, y, w - (medirTexto(num) + 8) * e, h);
  texto(c, num, x + 4 * e, y + 4 * e, '#1b1522', null, e);
  texto(c, HUD.titulo, x + (medirTexto(num) + 13) * e, y + 4 * e, '#1b1522', null, e);
  // avance de pasos dentro de la escena
  for (let i = 0; i < HUD.pasos; i++) {
    c.fillStyle = i < HUD.paso ? '#f0c040' : 'rgba(251,246,234,0.45)';
    c.fillRect(x + i * 5 * e, y + h + 4 * e, 3 * e, 2 * e);
  }
  // barra de toda la presentacion
  c.fillStyle = 'rgba(27,21,34,0.5)';
  c.fillRect(0, cv.height - e, cv.width, e);
  c.fillStyle = '#58e0d8';
  c.fillRect(0, cv.height - e, cv.width * (HUD.num) / HUD.total, e);
  c.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// el bucle
// ─────────────────────────────────────────────────────────────────────────────
let ultimo = performance.now();
let vida = [];   // funciones que corren cada cuadro (gallinas, ballena, vehiculos)
function bucle(ahora) {
  let dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  dt *= prisa;
  correrTiempo(dt);
  for (const g of GLOBOS) {
    if (g.tick) g.tick();
    g.alfaMuerte = g.alfaMuerte ?? 1;
    if (g.muere) g.alfaMuerte -= dt * 6;
  }
  GLOBOS = GLOBOS.filter(g => g.alfaMuerte > 0);
  for (const a of Object.values(ACT)) a.actualizar(dt);
  for (const k of COSAS) {
    if (k.mueve) k.mueve(dt);
    if (k.estela && Math.random() < 0.7) particula({ x: k.x, y: k.y, vida: 0.4, color: '#ffffff', tam: 1 });
  }
  COSAS = COSAS.filter(k => !k.muerta);
  for (const f of vida) f(dt);
  actualizarParticulas(dt);
  if (camVuelo) camVuelo();
  else if (camSigue) {
    const o = camSigue.o;
    const zt = zoomPara({ w: camSigue.w });
    const k = 1 - Math.exp(-camSigue.suave * dt);
    cam.x = lerp(cam.x, o.x, k); cam.y = lerp(cam.y, o.y - 10, k); cam.z = lerp(cam.z, zt, k);
    if (Math.abs(cam.z - zt) < 0.03) cam.z = zt;
  }
  cam.sacudida = Math.max(0, cam.sacudida - dt * 18);
  cam.golpe *= Math.pow(0.02, dt);
  flash = Math.max(0, flash - dt * 2.2);
  moverPajaros(dt);
  requestAnimationFrame(bucle);
  try { cuadro(); } catch (e) { if (!bucle.avisado) { console.error(e); bucle.avisado = true; } }
}

function medir() {
  dpr = window.devicePixelRatio || 1;
  ancho = window.innerWidth; alto = window.innerHeight;
  cv.width = Math.round(ancho * dpr); cv.height = Math.round(alto * dpr);
  cv.style.width = ancho + 'px'; cv.style.height = alto + 'px';
  // la camara trabaja en pixeles del lienzo
  ancho = cv.width; alto = cv.height;
}

function cargar(lista) {
  return Promise.all(lista.map(n => new Promise((r, f) => {
    const i = new Image();
    i.onload = () => { IMG[n] = i; r(); };
    i.onerror = () => f(new Error('falta img/' + n + '.png'));
    i.src = 'img/' + n + '.png';
  })));
}
