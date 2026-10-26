// El ambiente del edificio, lo que se mueve solo y no cuenta nada pero hace que se sienta real. Lo usan la
// presentacion y la oficina en vivo. Las posiciones salen de mundo.py (PUNTOS.ambiente).
//
//   nubes que pasan, humo de los extractores y de la chimenea, polvo flotando en la luz de las lamparas,
//   la arana que baja y sube de su telarana, la gotera del cuarto de maquinas, la lampara que parpadea,
//   plantas que se mecen, el ventilador del techo, el vapor de las tazas, hojas que caen de los arboles,
//   polillas en la farola de noche, relojes con la hora y la luz de abierto o cerrado de cada servicio.
'use strict';

const AMB = P.ambiente;
let diaSemana = 4;        // 0 domingo; la presentacion pasa un jueves, la oficina en vivo lo saca de la hora simulada

// nubes de adorno, lejos y cerca, que cruzan el cielo y vuelven a entrar por el otro lado
const NUBES = Array.from({ length: 8 }, (_, i) => ({
  x: -300 + i * 260 + Math.random() * 120, y: 20 + Math.random() * 190,
  v: 2.5 + Math.random() * 4, f: i % 3, esc: i % 3 === 0 ? 2 : 1, alfa: 0.55 + Math.random() * 0.35,
}));
capaExtra.unshift({ capa: 0, fn: c => {
  const noche = clamp((6.2 - hora) / 1.2, 0, 1) + clamp((hora - 18.6) / 0.8, 0, 1);
  for (const n of NUBES) {
    c.save();
    c.globalAlpha = n.alfa * (1 - noche * 0.6);
    spr(c, 'nube', n.f, n.x, n.y, { esc: n.esc, ay: 0.5 });
    c.restore();
  }
} });

// lo que va pegado al edificio y se mueve: plantas, ventilador, arana, tazas, relojes, placas
const ARANA = { y: 0, meta: 0, prox: 3 };
capaExtra.push({ capa: 1, fn: c => {
  AMB.plantas.forEach(([n, x, y], i) => {
    const f = [0, 1, 2, 1][Math.floor(T * 1.3 + i * 0.7) % 4];
    spr(c, n, f, x, y);
  });
  for (const [x, y] of AMB.ventiladores) spr(c, 'ventilador', Math.floor(T * 14), x, y, { ay: 0 });
  // la arana cuelga de su hilo
  const [ax, ay] = AMB.arana;
  if (ARANA.y > 0.5) {
    c.fillStyle = 'rgba(230,230,240,0.55)';
    c.fillRect(ax, ay, 1, Math.round(ARANA.y));
  }
  spr(c, 'arana', 0, ax + 1, ay + Math.round(ARANA.y) + 4, { ay: 0.5 });
} });
capaExtra.push({ capa: 3, fn: c => {
  for (const [x, y, n] of AMB.tazas) spr(c, n, 0, x, y);
} });
capaExtra.push({ capa: 8, fn: c => {
  // relojes: la aguja corta es la hora y la larga los minutos
  AMB.relojes.forEach(([cx, cy, r], i) => {
    const h = hora;
    for (const [frac, largo, col] of [[(h % 12) / 12, r * 0.55, '#1b1522'], [h % 1, r * 0.85, '#c0302a']]) {
      const a = -Math.PI / 2 + frac * Math.PI * 2;
      c.fillStyle = col;
      for (let k = 0; k <= largo; k++) c.fillRect(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), 1, 1);
    }
    c.fillStyle = '#1b1522'; c.fillRect(cx, cy, 1, 1);
  });
  // abierto o cerrado, segun el calendario de cada servicio y el dia
  for (const [x, y, ini, fin] of AMB.placas) {
    const abierto = diaSemana !== 0 && hora >= ini && hora < fin;
    const brilla = 0.75 + 0.25 * Math.sin(T * 3);
    c.fillStyle = '#1b1522'; c.fillRect(x - 1, y - 2, 4, 4);
    c.fillStyle = abierto ? `rgba(90,240,110,${brilla})` : `rgba(240,70,60,${brilla})`;
    c.fillRect(x, y - 1, 2, 2);
  }
  // la lampara del cuarto de maquinas, que ya falla
  if (parpadeo > T) {
    const [lx, ly] = AMB.parpadea;
    c.fillStyle = 'rgba(10,8,24,0.45)';
    c.fillRect(lx - 40, ly + 3, 80, D.mundo.pisos.sot - ly - 3);
    c.fillStyle = '#3a3a44'; c.fillRect(lx - 5, ly + 3, 11, 1);
  }
} });

let parpadeo = 0, proxParpadeo = 6, proxGota = 2, proxHoja = 1, proxPolilla = 0;
vida.push(dt => {
  for (const n of NUBES) {
    n.x += n.v * dt;
    if (n.x > D.mundo.ancho + 300) { n.x = -300; n.y = 20 + Math.random() * 190; }
  }
  // humo, se lo lleva el viento hacia la derecha
  for (const [x, y] of AMB.humos) {
    if (Math.random() < dt * 3) particula({ x: x + (Math.random() - 0.5) * 3, y, vx: 4 + Math.random() * 5, vy: -8 - Math.random() * 6,
      g: -2, vida: 2.2 + Math.random(), color: 'rgba(200,200,210,0.55)', tam: 2, roce: 0.995, crece: true, capa: 1.5 });
  }
  // polvo que flota en la luz de las lamparas
  for (const [lx, ly, piso] of AMB.polvo) {
    if (Math.random() < dt * 0.8) {
      const yy = ly + 6 + Math.random() * (piso - ly - 12);
      const ancho = 4 + (yy - ly) * 0.35;
      particula({ x: lx + (Math.random() - 0.5) * ancho * 1.6, y: yy, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        vida: 3 + Math.random() * 2, color: 'rgba(255,246,210,0.7)', tam: 1, ondula: true, capa: 9 });
    }
  }
  // la arana baja un rato y vuelve a subir
  ARANA.prox -= dt;
  if (ARANA.prox <= 0) { ARANA.meta = ARANA.meta > 0 ? 0 : 8 + Math.random() * 18; ARANA.prox = 3 + Math.random() * 5; }
  ARANA.y += clamp(ARANA.meta - ARANA.y, -dt * 6, dt * 6);
  // la gotera
  proxGota -= dt;
  if (proxGota <= 0) {
    proxGota = 1.6 + Math.random() * 2;
    const [gx, gy, suelo] = AMB.gotera;
    particula({ x: gx, y: gy, vy: 0, g: 160, vida: Math.sqrt(2 * (suelo - gy) / 160), color: '#8ad8ff', tam: 1, capa: 9,
      fin: p => { for (let k = 0; k < 4; k++) particula({ x: p.x, y: suelo, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20,
        g: 160, vida: 0.25, color: '#8ad8ff', tam: 1, capa: 9 }); } });
  }
  // la lampara que falla parpadea de vez en cuando, dos o tres veces seguidas
  proxParpadeo -= dt;
  if (proxParpadeo <= 0) {
    proxParpadeo = 5 + Math.random() * 9;
    const veces = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < veces; k++) espera(k * 0.16).then(() => { parpadeo = T + 0.07; });
  }
  // vapor de las tazas
  for (const [x, y] of AMB.tazas) {
    if (Math.random() < dt * 1.1) particula({ x: x - 1 + Math.random() * 3, y: y - 6, vx: (Math.random() - 0.5) * 2, vy: -5 - Math.random() * 3,
      g: -1, vida: 1.2, color: 'rgba(255,255,255,0.5)', tam: 1, ondula: true, capa: 9 });
  }
  // hojas que caen de los arboles y se van con el viento
  proxHoja -= dt;
  if (proxHoja <= 0) {
    proxHoja = 1.5 + Math.random() * 3;
    const [tx, ty] = AMB.arboles[Math.floor(Math.random() * AMB.arboles.length)];
    particula({ x: tx + (Math.random() - 0.5) * 22, y: ty + (Math.random() - 0.5) * 10, vx: 4 + Math.random() * 6, vy: 4,
      g: 3, vida: 4, color: Math.random() < 0.5 ? '#6ad070' : '#d8c040', tam: 2, roce: 0.99, ondula: true, gira: true, capa: 9 });
  }
  // de noche, polillas alrededor de la farola y luciernagas junto a los arboles
  const noche = hora < 6 || hora > 18.5;
  proxPolilla -= dt;
  if (noche && proxPolilla <= 0) {
    proxPolilla = 0.4;
    const [fx0, fy0] = AMB.farola;
    const a = Math.random() * Math.PI * 2;
    particula({ x: fx0 + Math.cos(a) * 6, y: fy0 + 4 + Math.sin(a) * 4, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20,
      vida: 1.4, color: '#e8e0c8', tam: 1, ondula: true, capa: 9 });
    const [tx, ty] = AMB.arboles[Math.floor(Math.random() * AMB.arboles.length)];
    particula({ x: tx + (Math.random() - 0.5) * 40, y: ty + Math.random() * 30, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      vida: 2.5, color: '#e8ff70', tam: 1, ondula: true, capa: 9 });
  }
});
