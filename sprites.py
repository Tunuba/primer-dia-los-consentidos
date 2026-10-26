# -*- coding: utf-8 -*-
"""Todo lo que se mueve, la gente, los animales, la llama de la IA, la ballena, los camiones y los papelitos.

Cada funcion devuelve {nombre: [frames]} con frames de Lienzo. generar.py los mete en la hoja y le dice al
HTML donde quedo cada uno. El ancla de todos es el centro de abajo, los pies.
"""

import math
import random

from pincel import (Lienzo, rampa, rgba, mezclar, dibujo, caja, texto, medir, texto_grande, TINTA,
                    oscuro, claro, aire, a_hex)
import gente_pixel as G
from motor.mapas import componer


# ──────────────────────────────────────────────────────────────────────────────
# una rejilla de letras que se llena con figuras, para no contar columnas a mano
# ──────────────────────────────────────────────────────────────────────────────
FUERA = {}


class Rejilla:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.c = [['.'] * w for _ in range(h)]
        import inspect
        self.quien = inspect.stack()[1].function

    def p(self, x, y, ch):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y][x] = ch
        else:
            FUERA[self.quien] = FUERA.get(self.quien, 0) + 1

    def r(self, x0, y0, x1, y1, ch):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.p(x, y, ch)

    def e(self, cx, cy, rx, ry, ch, solo=None):
        for y in range(self.h):
            for x in range(self.w):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    if solo is None or self.c[y][x] in solo:
                        self.c[y][x] = ch

    def poli(self, pts, ch):
        for y in range(self.h):
            for x in range(self.w):
                if _dentro(x + 0.5, y + 0.5, pts):
                    self.c[y][x] = ch

    def cambia(self, de, a, y0=0, y1=None):
        y1 = self.h - 1 if y1 is None else y1
        for y in range(y0, y1 + 1):
            for x in range(self.w):
                if self.c[y][x] in de:
                    self.c[y][x] = a

    def filas(self):
        return [''.join(f) for f in self.c]


def _dentro(x, y, pts):
    n, d = len(pts), False
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            d = not d
        j = i
    return d


# ──────────────────────────────────────────────────────────────────────────────
# la gente, con el motor de PIXELES
# ──────────────────────────────────────────────────────────────────────────────
P = G.PIELES
TI = '#1fa59c'
REPARTO = {
    'guia':     G.Persona('guia', P[1], '#2a1c14', TI, '#2e3040', '#3a2418', manga='larga', cuello='claro'),
    'nuevo':    G.Persona('nuevo', P[2], '#5b3620', '#f0c040', '#3a4a7a', '#e8e0d0', peinado='puntas',
                          mejillas=True),
    'tec1':     G.Persona('tec1', P[0], '#a8662c', TI, '#2e3040', '#3a2a4a', peinado='coleta', abajo='falda',
                          mejillas=True),
    'tec2':     G.Persona('tec2', P[3], '#2a1c14', TI, '#3a4a7a', '#2a2a32', peinado='afro'),
    'sistemas': G.Persona('sistemas', P[1], '#1c1c2c', TI, '#5a6a80', '#c83838', peinado='mono', manga='larga'),
    'coord':    G.Persona('coord', P[2], '#d9d4cc', TI, '#2e3040', '#3a2418', peinado='calvo', barba=True,
                          manga='larga', cuello='claro'),
    'datos':    G.Persona('datos', P[0], '#5b3620', TI, '#4a3a8a', '#3a2a4a', peinado='bob', abajo='falda',
                          mejillas=True),
    'vendedor': G.Persona('vendedor', P[1], '#5b3620', '#d8443c', '#2e3040', '#3a2418', peinado='corto',
                          manga='larga', cuello='claro'),
    'cliente':  G.Persona('cliente', P[2], '#d9d4cc', '#e8e0cc', '#5a4632', '#3a2418', manga='larga', barba=True,
                          sombrero='sombrero', sombrero_color='#d8b870'),
    'bodega1':  G.Persona('bodega1', P[3], '#2a1c14', '#f08a30', '#34507a', '#5a3a20', sombrero='casco',
                          sombrero_color='#f4d020', cuello='claro'),
    'bodega2':  G.Persona('bodega2', P[1], '#1c1c2c', '#f08a30', '#34507a', '#5a3a20', sombrero='casco',
                          sombrero_color='#f4d020', abajo='corto'),
    'piloto':   G.Persona('piloto', P[2], '#2a1c14', '#4a78d8', '#2a5a3a', '#2a2a32', sombrero='gorra',
                          sombrero_color='#f08a30'),
    'despacho': G.Persona('despacho', P[4], '#1c1c2c', '#8a5ad0', '#2e3040', '#e8e0d0', peinado='coleta',
                          abajo='falda', mejillas=True),
    'finanzas': G.Persona('finanzas', P[0], '#e2b653', '#f07aa0', '#4a3a8a', '#3a2a4a', peinado='largo',
                          manga='larga', mejillas=True),
    'contador': G.Persona('contador', P[2], '#2a1c14', '#e8e0cc', '#2e3040', '#2a2a32', peinado='corto',
                          manga='larga', cuello='claro'),
    'davi':     G.Persona('davi', P[1], '#1c1c2c', TI, '#2e3040', '#2a2a32', peinado='puntas', manga='larga'),
    'juanpa':   G.Persona('juanpa', P[0], '#5b3620', TI, '#3a4a7a', '#e8e0d0', peinado='corto', mejillas=True),
    'meme':     G.Persona('meme', P[2], '#2a1c14', TI, '#2a2a3a', '#c83838', peinado='afro'),
    # los cinco clientes de la simulacion con agentes, uno por area
    'andrea':   G.Persona('andrea', P[1], '#2a1c14', '#d8443c', '#2e3040', '#3a2418', peinado='largo', manga='larga',
                          mejillas=True),
    'luis':     G.Persona('luis', P[0], '#5b3620', '#f07aa0', '#3a4a7a', '#2a2a32', peinado='corto', manga='larga',
                          cuello='claro'),
    'marta':    G.Persona('marta', P[3], '#1c1c2c', '#f08a30', '#34507a', '#5a3a20', peinado='coleta', mejillas=True),
    'carlos':   G.Persona('carlos', P[2], '#2a1c14', '#3aa060', '#5a4632', '#3a2418', sombrero='gorra',
                          sombrero_color='#2c7a3a', barba=True),
    'sofia':    G.Persona('sofia', P[1], '#a8662c', '#8a5ad0', '#2e3040', '#e8e0d0', peinado='bob', abajo='falda',
                          mejillas=True),
}
# el nuevo con su gafete y el nuevo ya del equipo de TI
REPARTO['nuevog'] = REPARTO['nuevo']
REPARTO['nuevoti'] = G.Persona('nuevoti', P[2], '#5b3620', TI, '#3a4a7a', '#e8e0d0', peinado='puntas',
                               mejillas=True)
DIADEMA = {'tec1', 'tec2', 'nuevoti'}
GAFETE = {'nuevog', 'nuevoti'}

GRIS = (58, 58, 70, 255)
GRIS_L = (120, 120, 136, 255)
ROJO_MIC = (220, 60, 60, 255)


def _arriba(l):
    for y in range(l.alto):
        for x in range(l.ancho):
            if l.leer(x, y)[3]:
                return y
    return 0


def _diadema(l, vista):
    d = _arriba(l)
    if vista == 'frente':
        for x in range(9, 23):
            l.px(x, d + 1, GRIS)
        for x in range(10, 22):
            l.px(x, d + 2 if x in (10, 21) else d + 1, GRIS)
        l.rect(6, d + 7, 8, d + 11, GRIS)
        l.rect(23, d + 7, 25, d + 11, GRIS)
        l.vl(7, d + 8, d + 10, GRIS_L)
        l.vl(24, d + 8, d + 10, GRIS_L)
        for i, (x, y) in enumerate(((8, 12), (9, 13), (10, 13), (11, 13))):
            l.px(x, d + y, ROJO_MIC if i == 3 else GRIS)
    elif vista == 'lado':
        for x in range(11, 18):
            l.px(x, d + 1, GRIS)
        l.vl(12, d + 2, d + 7, GRIS)
        l.rect(11, d + 7, 14, d + 11, GRIS)
        l.vl(12, d + 8, d + 10, GRIS_L)
        for x in range(15, 22):
            l.px(x, d + 12, GRIS)
        l.px(22, d + 12, ROJO_MIC)
    else:
        for x in range(9, 23):
            l.px(x, d + 1, GRIS)
        l.rect(6, d + 7, 8, d + 11, GRIS)
        l.rect(23, d + 7, 25, d + 11, GRIS)


def _gafete(l, vista):
    d = _arriba(l)
    if vista == 'frente':
        l.vl(15, d + 15, d + 16, (40, 120, 220, 255))
        l.vl(17, d + 15, d + 16, (40, 120, 220, 255))
        l.rect(14, d + 17, 18, d + 21, TINTA)
        l.rect(15, d + 18, 17, d + 20, (246, 241, 231, 255))
        l.px(16, d + 18, (40, 120, 220, 255))
    elif vista == 'lado':
        l.rect(17, d + 17, 20, d + 21, TINTA)
        l.rect(18, d + 18, 19, d + 20, (246, 241, 231, 255))


# Las caras, de frente. En el mapa de 32 los ojos van en las filas 8 a 10 (columnas 11 y 12, 19 y 20) y la boca en
# las filas 11 a 13 (columnas 14 a 17). Solo se cambia lo que es cara, asi el pelo que tapa la frente sigue encima.
# Es la misma tecnica del visor de la simulacion (simulacion/visor/generar.py).
CARA = set('eilkmrj')


def _cara(mapa, cambios):
    m = [list(r) for r in mapa]
    for (y, x), letra in cambios.items():
        if m[y][x] in CARA:
            m[y][x] = letra
    return [''.join(r) for r in m]


def _ojos(f8, f9, f10):
    c = {}
    for x0 in (11, 19):
        for dx in (0, 1):
            c[(8, x0 + dx)], c[(9, x0 + dx)], c[(10, x0 + dx)] = f8, f9, f10
    return c


GESTOS = {
    'parpadeo': lambda: _ojos('k', 'e', 'k'),
    # hablando, la boca abierta un poco
    'habla': lambda: {(12, 15): 'e', (12, 16): 'e', (11, 15): 'm', (11, 16): 'm'},
    'contento': lambda: {(11, 14): 'm', (11, 17): 'm', (12, 15): 'm', (12, 16): 'm'},
    'sorpresa': lambda: {(12, 15): 'e', (12, 16): 'e', (13, 15): 'e', (13, 16): 'e', (11, 15): 'm', (11, 16): 'm'},
    'estres': lambda: {(6, 11): 'j', (6, 12): 'k', (7, 12): 'j', (6, 20): 'j', (6, 19): 'k', (7, 19): 'j',
                       (12, 15): 'k', (12, 16): 'k', (11, 15): 'm', (11, 16): 'm', (12, 14): 'm', (12, 17): 'm'},
    'cansado': lambda: {**_ojos('e', 'e', 'i'), (12, 15): 'k', (12, 16): 'k', (13, 15): 'm', (13, 16): 'm'},
}


def _figura(p, nombre, vista, i, cambios=None, piel=None):
    base = G.mapa_persona(p, 32, vista, i)
    if cambios:
        base = _cara(base, cambios)
    q = p
    if piel:
        q = G.Persona(**{k: v for k, v in p.como_dict().items()})
        q.piel = piel
    # dos filas de aire arriba, para que el pelo y el casco cierren su contorno
    l = componer(['.' * 32] * 2 + list(base), q.letras())
    if nombre in DIADEMA:
        _diadema(l, vista)
    if nombre in GAFETE:
        _gafete(l, vista)
    return l


def gente():
    out = {}
    for nombre, p in REPARTO.items():
        for vista in G.VISTAS:
            out['p_%s_%s' % (nombre, vista)] = [_figura(p, nombre, vista, i) for i in range(4)]
        # las caras del momento, de frente y quieto; el estres le sube el color y el cansancio se lo apaga
        pieles = {'estres': a_hex(mezclar(p.piel, '#e0503f', 0.38)), 'cansado': a_hex(mezclar(p.piel, '#a9a39c', 0.22))}
        if p.abajo != 'pantalon':
            pieles = {}      # con las piernas a la vista el color subiria hasta las rodillas
        for g, cambios in GESTOS.items():
            out['p_%s_cara_%s' % (nombre, g)] = [_figura(p, nombre, 'frente', 0, cambios(), pieles.get(g))]
        # de lado tambien parpadea
        lado = {(8, 19): 'k', (9, 19): 'e', (10, 19): 'k', (8, 20): 'k', (9, 20): 'e', (10, 20): 'k',
                (8, 18): 'k', (9, 18): 'e', (10, 18): 'k'}
        out['p_%s_cara_parpadeo_lado' % nombre] = [_figura(p, nombre, 'lado', 0, lado)]
    return out


# ──────────────────────────────────────────────────────────────────────────────
# la llama de la IA (Ollama), de frente
# ──────────────────────────────────────────────────────────────────────────────
LANA = '#f5efe2'


def _llama(ojos='abiertos'):
    g = Rejilla(28, 36)
    # orejas
    g.r(7, 1, 9, 8, 'w')
    g.r(18, 1, 20, 8, 'w')
    g.p(7, 1, '.')
    g.p(20, 1, '.')
    g.r(8, 2, 8, 7, 'p')
    g.r(19, 2, 19, 7, 'p')
    # cabeza y hocico
    g.e(13.5, 12, 9.2, 6.6, 'w')
    g.e(13.5, 15.2, 4.6, 3.0, 'n')
    # copete de lana
    for x, y in ((10, 5), (12, 4), (14, 4), (16, 5), (11, 5), (13, 4), (15, 4), (17, 6), (9, 6)):
        g.p(x, y, 'w')
    # cuello y cuerpo
    g.r(9, 18, 18, 25, 'w')
    g.e(13.5, 28.5, 10.4, 5.4, 'w')
    for x in (4, 7, 20, 23):
        g.p(x, 26, 'w')
    # patas
    g.r(7, 32, 9, 34, 'w')
    g.r(18, 32, 20, 34, 'w')
    g.r(7, 35, 9, 35, 'h')
    g.r(18, 35, 20, 35, 'h')
    # panuelo de TI
    g.r(9, 20, 18, 21, 'b')
    g.r(12, 22, 15, 22, 'b')
    g.r(13, 23, 14, 23, 'b')
    # mejillas
    g.r(6, 15, 7, 15, 'k')
    g.r(20, 15, 21, 15, 'k')
    # nariz y boca
    g.p(12, 14, 'e')
    g.p(15, 14, 'e')
    if ojos == 'feliz':
        g.r(12, 16, 15, 16, 'e')
        g.p(11, 15, 'e')
        g.p(16, 15, 'e')
    else:
        g.r(13, 16, 14, 16, 'e')
    # ojos
    L, R = 9, 17
    if ojos in ('abiertos', 'brillo'):
        c = 'e' if ojos == 'abiertos' else 'c'
        for x0 in (L, R):
            g.r(x0, 10, x0 + 1, 12, c)
            g.p(x0 + 1, 10, 'l')
    elif ojos == 'piensa':
        for x0 in (L, R):
            g.r(x0, 9, x0 + 1, 10, 'e')
            g.p(x0 + 1, 9, 'l')
    elif ojos == 'cerrados':
        for x0 in (L, R):
            g.p(x0 - 1, 11, 'e')
            g.r(x0, 12, x0 + 1, 12, 'e')
            g.p(x0 + 2, 11, 'e')
    elif ojos == 'feliz':
        for x0 in (L, R):
            g.p(x0 - 1, 12, 'e')
            g.r(x0, 10, x0 + 1, 10, 'e')
            g.p(x0 + 2, 12, 'e')
            g.p(x0 - 1, 11, 'e')
            g.p(x0 + 2, 11, 'e')
    elif ojos == 'parpadeo':
        for x0 in (L, R):
            g.r(x0 - 1, 11, x0 + 2, 11, 'e')
    col = {
        'w': (LANA, {'brillo': True}),
        'n': '#eadcc6',
        'p': '#f2a2b4',
        'h': '#6a4a36',
        'b': TI,
        'k': ('#f6a0a0', {'tono': 2}),
        'e': ('#1b1522', {'fijo': True}),
        'l': ('#ffffff', {'fijo': True}),
        'c': ('#58f0ff', {'fijo': True}),
    }
    return dibujo(g.filas(), col)


def llama():
    out = {}
    for k in ('abiertos', 'cerrados', 'parpadeo', 'feliz', 'brillo', 'piensa'):
        out['llama_' + k] = [_llama(k)]
    return out


# ──────────────────────────────────────────────────────────────────────────────
# la ballena de los contenedores (Docker), de lado mirando a la derecha
# ──────────────────────────────────────────────────────────────────────────────
def _ballena(cola):
    g = Rejilla(66, 40)
    g.e(36, 28, 25, 8.6, 'a')
    g.r(11, 28, 60, 31, 'a')
    g.e(56, 27, 8, 8.4, 'a')
    # panza
    g.e(38, 33, 21, 3.4, 'v', solo='a')
    # cola
    if cola == 0:
        g.poli([(13, 27), (2, 18), (6, 17), (12, 22), (16, 25)], 'a')
        g.poli([(13, 27), (8, 30), (3, 31), (12, 25)], 'a')
    else:
        g.poli([(13, 27), (1, 24), (4, 22), (13, 25)], 'a')
        g.poli([(13, 28), (2, 34), (6, 35), (15, 29)], 'a')
    # contenedores
    colores = 'rtyuiq'
    k = 0
    for fila, (y, xs) in enumerate(((14, (22, 30, 38, 46)), (8, (30, 38)))):
        for x in xs:
            g.r(x, y, x + 6, y + 5, colores[k % len(colores)])
            for xx in (x + 2, x + 4):
                g.r(xx, y + 1, xx, y + 4, 'o')
            k += 1
    # ojo y boca
    g.r(55, 25, 56, 26, 'e')
    g.p(56, 25, 'l')
    for x in range(52, 62):
        g.p(x, 31, 'o')
    col = {
        'a': ('#2496ed', {'brillo': True}),
        'v': '#cfe9fb',
        'r': '#f08a30', 't': TI, 'y': '#f0c040', 'u': '#d8443c', 'i': '#8a5ad0', 'q': '#3aa060',
        'e': ('#1b1522', {'fijo': True}),
        'l': ('#ffffff', {'fijo': True}),
    }
    return dibujo(g.filas(), col)


def ballena():
    return {'ballena': [_ballena(0), _ballena(1)]}


# ──────────────────────────────────────────────────────────────────────────────
# animales de la distribuidora, el perro Consentido y las gallinas
# ──────────────────────────────────────────────────────────────────────────────
def _perro(paso, sentado=False, cola=0):
    g = Rejilla(26, 20)
    if sentado:
        g.e(10, 12, 5.5, 5, 'c')
        g.r(6, 15, 14, 17, 'c')
        g.r(12, 16, 13, 18, 'c')
        g.r(7, 17, 9, 18, 'c')
        g.e(11, 12, 2.6, 3.6, 'b', solo='c')
        hx, hy = 13, 6
    else:
        g.e(11, 11, 8, 4, 'c')
        g.e(11, 13.2, 5, 1.8, 'b', solo='c')
        piernas = [(5, 0), (8, 1), (14, 0), (17, 1)]
        for i, (x, fase) in enumerate(piernas):
            dx = 0
            if paso in (1, 3):
                dx = (1 if (i % 2 == 0) == (paso == 1) else -1)
            g.r(x + dx, 14, x + dx + 1, 17, 'c')
            g.p(x + dx, 18, 'z')
            g.p(x + dx + 1, 18, 'z')
        hx, hy = 18, 5
    # cabeza
    g.e(hx + 1, hy + 2.5, 4.4, 4, 'c')
    g.r(hx + 4, hy + 3, hx + 7, hy + 5, 'c')
    g.p(hx + 7, hy + 3, 'e')
    g.e(hx + 2, hy + 5, 2.2, 1.2, 'b', solo='c')
    # oreja
    g.r(hx - 1, max(0, hy - 1), hx + 1, hy + 4, 'r')
    # ojo y collar
    g.p(hx + 3, hy + 1, 'e')
    g.p(hx + 4, hy + 1, 'e')
    g.p(hx + 4, hy, 'l')
    cy = hy + 6
    for x in range(hx - 2, hx + 3):
        g.p(x, cy, 'k')
    g.p(hx, cy + 1, 'y')
    # cola
    cx, cyy = (4, 12) if sentado else (4, 9)
    if cola == 0:
        g.r(cx - 1, cyy - 4, cx, cyy, 'c')
        g.p(cx - 2, cyy - 5, 'c')
    else:
        g.r(cx - 3, cyy - 2, cx, cyy - 1, 'c')
        g.p(cx - 4, cyy - 3, 'c')
    col = {
        'c': ('#d08a3c', {'brillo': True}), 'b': '#f6ead8', 'r': '#8a4e22', 'z': '#5a3a20',
        'k': '#d8443c', 'y': ('#f0c040', {'tono': 3}),
        'e': ('#1b1522', {'fijo': True}), 'l': ('#ffffff', {'fijo': True}),
    }
    return dibujo(g.filas(), col)


def perro():
    return {
        'perro_camina': [_perro(i) for i in range(4)],
        'perro_sentado': [_perro(0, True, 0), _perro(0, True, 1)],
        'perro_quieto': [_perro(0, False, 0), _perro(0, False, 1)],
    }


def _gallina(paso, picotea=False):
    g = Rejilla(16, 16)
    g.e(7, 9, 5, 3.6, 'w')
    g.poli([(2, 9), (0, 4), (3, 6), (4, 8)], 'w')
    hx, hy = (11, 9) if picotea else (11, 4)
    g.e(hx, hy + 1, 2.4, 2.4, 'w')
    g.r(hx - 1, hy + 2, hx + 1, 9, 'w') if not picotea else None
    g.p(hx + 3, hy + 1, 'y')
    g.p(hx + 2, hy + 1, 'y')
    g.p(hx, hy - 2, 'r')
    g.p(hx + 1, hy - 2, 'r')
    g.p(hx - 1, hy - 1, 'r')
    g.p(hx + 2, hy + 3, 'r')
    g.p(hx + 1, hy, 'e')
    g.e(6, 9, 2.6, 1.6, 'a', solo='w')
    a, b = (6, 9) if paso == 0 else ((5, 10) if paso == 1 else (7, 8))
    g.r(a, 12, a, 14, 'y')
    g.r(b, 12, b, 14, 'y')
    g.p(a + 1, 14, 'y')
    g.p(b + 1, 14, 'y')
    col = {'w': ('#f6f0e6', {'brillo': True}), 'a': '#e2d6c2', 'y': '#f0a020', 'r': '#e03a30',
           'e': ('#1b1522', {'fijo': True})}
    return dibujo(g.filas(), col)


def gallina():
    return {'gallina_camina': [_gallina(1), _gallina(0), _gallina(2), _gallina(0)],
            'gallina_pica': [_gallina(0), _gallina(0, True)]}


# ──────────────────────────────────────────────────────────────────────────────
# pajaros, el quetzal, de lado mirando a la derecha
# ──────────────────────────────────────────────────────────────────────────────
def _ala(g, raiz, ang, largo, ancho, plumas, ch, ch2):
    """Un ala abierta como abanico. Sale de la raiz hacia ang (radianes, -pi/2 es arriba) y se abre hacia atras,
    las plumas de atras son mas cortas. Las puntas llevan el color claro ch2."""
    rx, ry = raiz
    abre = 0.55 + ancho * 0.04
    pasos = 26
    for i in range(pasos + 1):
        t = i / pasos
        a = ang + abre * t * (1 if math.cos(ang) <= 0 else -1) * (1 if math.sin(ang) < 0 else -1)
        lg = largo * (1 - 0.45 * t)
        ox = rx - t * ancho * 0.5
        for j in range(int(lg) + 1):
            x, y = ox + math.cos(a) * j, ry + math.sin(a) * j
            pluma = j > lg - 3 and (i % max(1, pasos // plumas)) < 3
            g.p(x, y, ch2 if pluma else ch)
            g.p(x + 0.5, y, ch2 if pluma else ch)


def _quetzal(f, posado=False):
    """f 0 a 3 es el aleteo, ala arriba, media, abajo, media. La cola ondula con f."""
    g = Rejilla(58, 36)
    oy = 7
    g.p = (lambda p0: (lambda x, y, ch: p0(x + 10, y, ch)))(g.p)
    g.e = (lambda e0: (lambda cx, cy, rx, ry, ch, solo=None: e0(cx + 10, cy, rx, ry, ch, solo)))(g.e)
    g.r = (lambda r0: (lambda x0, y0, x1, y1, ch: r0(x0 + 10, y0, x1 + 10, y1, ch)))(g.r)
    # cola larga, dos plumas que ondulan
    for k in range(28):
        x = 19 - k
        onda = math.sin(k * 0.3 - f * 1.5) * (k / 28) * 3.5 if not posado else k * 0.45
        y1 = oy + 13 + onda + k * 0.1
        y2 = oy + 14 + onda * 0.85 + k * 0.22
        if x >= 0:
            g.p(x, y1, 'c')
            g.p(x, y2, 'c')
            if k < 9:
                g.p(x, y1 + 1, 'c')
    # cuerpo y pecho rojo
    g.e(27, oy + 13, 8.5, 4.8, 'v')
    g.e(29, oy + 15.8, 5.8, 2.6, 'r', solo='v')
    # cabeza con cresta
    g.e(35, oy + 10, 4.4, 4.2, 'v')
    for x, y in ((33, 5), (34, 5), (35, 5), (32, 6), (36, 6), (34, 4), (33, 4)):
        g.p(x, oy + y, 'v')
    # pico y ojo
    g.p(39, oy + 10, 'y'); g.p(40, oy + 10, 'y'); g.p(39, oy + 11, 'y')
    g.p(36, oy + 9, 'e'); g.p(37, oy + 9, 'l')
    raiz = (27, oy + 11)
    if posado:
        g.e(25, oy + 12, 7, 3.2, 'a', solo='v')
        for k in range(4):
            g.p(19 + k * 2, oy + 14, 'b')
        g.r(28, oy + 18, 28, oy + 21, 'y'); g.r(30, oy + 18, 30, oy + 21, 'y')
    else:
        ang = (-1.5, -2.25, 1.95, -2.25)[f]
        largo = (15, 14, 12, 14)[f]
        _ala(g, raiz, ang, largo, 8, 5, 'a', 'b')
    col = {
        'v': ('#2fb85a', {'brillo': True}), 'a': ('#1f8a48', {'brillo': True}), 'b': '#7ad070',
        'c': ('#36c46a', {'brillo': True}), 'r': '#e0303a', 'y': '#f0c040',
        'e': ('#1b1522', {'fijo': True}), 'l': ('#ffffff', {'fijo': True}),
    }
    return dibujo(g.filas(), col)


def pajaros():
    return {'quetzal': [_quetzal(i) for i in range(4)], 'quetzal_posado': [_quetzal(0, True)],
            }


# ──────────────────────────────────────────────────────────────────────────────
# vehiculos, de lado mirando a la derecha
# ──────────────────────────────────────────────────────────────────────────────
def rueda(fase):
    l = Lienzo(14, 14)
    l.circulo(6.5, 6.5, 6.6, (30, 28, 36, 255))
    l.circulo(6.5, 6.5, 4.2, (70, 70, 82, 255))
    l.circulo(6.5, 6.5, 2.6, (170, 172, 184, 255))
    for k in range(3):
        a = fase * math.pi / 6 + k * 2 * math.pi / 3
        l.px(6.5 + math.cos(a) * 3.4, 6.5 + math.sin(a) * 3.4, (210, 212, 222, 255))
    l.px(6, 6, (230, 230, 236, 255))
    return l


def camion():
    l = Lienzo(108, 46)
    # caja de carga
    caja(l, 2, 2, 74, 34, '#f4f1ea')
    l.rect(4, 26, 72, 29, rgba('#f08a30'))
    l.rect(4, 30, 72, 31, rgba('#3a9a4a'))
    texto(l, 6, 18, 'CONSENTIDOS', rgba('#2c7a3a'))
    texto(l, 6, 8, 'LOS', rgba('#c0571a'))
    # cara del perro en la caja
    l.circulo(60, 11, 5, rgba('#d08a3c'))
    l.rect(54, 5, 56, 11, rgba('#8a4e22'))
    l.rect(64, 5, 66, 11, rgba('#8a4e22'))
    l.px(58, 10, TINTA)
    l.px(62, 10, TINTA)
    l.rect(59, 13, 61, 14, TINTA)
    # cabina
    caja(l, 76, 10, 104, 34, '#f08a30')
    caja(l, 86, 13, 101, 22, '#9ad8f0')
    l.hl(14, 87, 92, (230, 248, 255, 255))
    l.rect(77, 23, 103, 24, rgba('#c0571a'))
    l.rect(102, 28, 105, 31, rgba('#f0e070'))
    l.rect(79, 15, 82, 26, rgba('#e07a20'))
    # chasis
    l.rect(2, 35, 105, 37, (50, 46, 56, 255))
    l.rect(0, 33, 3, 36, (80, 80, 90, 255))
    l.contorno(TINTA)
    return l


def panel():
    l = Lienzo(64, 34)
    caja(l, 2, 6, 60, 24, '#f4f1ea')
    caja(l, 44, 8, 56, 15, '#9ad8f0')
    l.rect(4, 18, 58, 19, rgba('#f08a30'))
    texto(l, 6, 9, 'LOS C', rgba('#2c7a3a'))
    l.rect(2, 25, 61, 26, (50, 46, 56, 255))
    l.contorno(TINTA)
    return l


def camioneta(izq=False):
    """La camioneta de colores, el bus de la ruta. Con izq=True mira a la izquierda y el letrero se sigue leyendo."""
    l = Lienzo(112, 52)
    franjas = ['#d8443c', '#f0c040', '#2a7ad8', '#3aa060', '#f08a30']
    caja(l, 4, 12, 106, 40, '#2a7ad8')
    for i, c in enumerate(franjas):
        l.rect(5, 30 + i * 2, 105, 31 + i * 2, rgba(c))
    # ventanas
    for i in range(9):
        x = 10 + i * 10
        caja(l, x, 16, x + 7, 24, '#bfe8f8', bisel=False)
        l.px(x + 1, 17, (255, 255, 255, 255))
    # puerta
    caja(l, 96, 16, 103, 38, '#bfe8f8', bisel=False)
    l.vl(99, 17, 37, (60, 90, 120, 255))
    # parrilla de arriba con bultos
    l.rect(8, 9, 100, 10, (60, 50, 50, 255))
    for x0, c in ((12, '#c86a3c'), (26, '#3aa060'), (40, '#f0c040'), (60, '#8a5ad0'), (80, '#d8443c')):
        caja(l, x0, 2, x0 + 11, 8, c)
    l.rect(104, 30, 107, 33, rgba('#f0e070'))
    l.rect(2, 40, 108, 42, (50, 46, 56, 255))
    if izq:
        l = l.espejo()
    texto(l, 30 if not izq else 112 - 30 - medir('RUTA 2'), 26 - 1, 'RUTA 2', rgba('#ffffff'))
    l.contorno(TINTA)
    return l


def montacargas():
    l = Lienzo(46, 36)
    caja(l, 4, 12, 28, 28, '#f0c040')
    caja(l, 8, 4, 20, 13, '#40404c', bisel=False)
    l.rect(9, 5, 19, 12, (0, 0, 0, 0))
    l.vl(8, 4, 13, (50, 50, 60, 255))
    l.vl(20, 4, 13, (50, 50, 60, 255))
    l.hl(4, 8, 20, (50, 50, 60, 255))
    # mastil y unas
    l.rect(30, 2, 32, 30, (80, 80, 92, 255))
    l.rect(33, 27, 45, 29, (110, 110, 124, 255))
    l.rect(0, 22, 4, 28, (60, 60, 70, 255))
    l.contorno(TINTA)
    return l


# ──────────────────────────────────────────────────────────────────────────────
# cosas chicas
# ──────────────────────────────────────────────────────────────────────────────
SACOS = {'pollo': '#f0c040', 'gallina': '#d8443c', 'vaca': '#3aa060', 'caballo': '#8a5a2e', 'mascota': '#2a7ad8'}


def saco(color):
    g = Rejilla(14, 17)
    g.e(7, 9.5, 6.4, 7.4, 's')
    g.r(1, 5, 12, 15, 's')
    g.r(3, 1, 10, 3, 's')
    g.r(2, 7, 11, 11, 'b')
    g.r(4, 8, 9, 10, 'w')
    g.r(5, 2, 8, 2, 'o')
    return dibujo(g.filas(), {'s': ('#e8d8b0', {'brillo': True}), 'b': color, 'w': '#fbf6ea'})


def ticket(color):
    l = Lienzo(11, 13)
    l.rect(0, 0, 10, 12, TINTA)
    l.rect(1, 1, 9, 11, (250, 248, 240, 255))
    l.rect(1, 1, 9, 3, rgba(color))
    for y in (5, 7, 9):
        l.hl(y, 2, 8 if y != 9 else 6, (150, 150, 170, 255))
    l.px(9, 11, (200, 196, 186, 255))
    l.px(8, 11, (200, 196, 186, 255))
    l.px(9, 10, (200, 196, 186, 255))
    l.px(10, 12, (0, 0, 0, 0))
    l.px(10, 11, TINTA)
    return l


def avion(f, color):
    g = Rejilla(17, 11)
    if f == 0:
        g.poli([(0, 3), (16, 5), (5, 10)], 'w')
        g.poli([(0, 3), (16, 5), (7, 6)], 'v')
        g.poli([(5, 7), (16, 5), (7, 9.5)], 'c')
    else:
        g.poli([(0, 5), (16, 5), (4, 9)], 'w')
        g.poli([(0, 2), (16, 5), (7, 6)], 'v')
        g.poli([(5, 6), (16, 5), (7, 8.5)], 'c')
    return dibujo(g.filas(), {'w': '#f6f3ec', 'v': '#dcd6ca', 'c': color})


def libro_volador(f, color):
    g = Rejilla(14, 10)
    if f == 0:
        g.poli([(7, 8), (0, 2), (1, 1), (7, 5)], 'a')
        g.poli([(7, 8), (14, 2), (13, 1), (7, 5)], 'a')
        g.poli([(7, 7), (1, 2.5), (7, 5.5)], 'p')
        g.poli([(7, 7), (13, 2.5), (7, 5.5)], 'p')
    else:
        g.poli([(7, 6), (0, 6), (1, 4), (7, 4)], 'a')
        g.poli([(7, 6), (14, 6), (13, 4), (7, 4)], 'a')
        g.r(2, 4, 6, 4, 'p')
        g.r(8, 4, 12, 4, 'p')
    return dibujo(g.filas(), {'a': color, 'p': '#fbf6ea'})


def libro(color, alto=8):
    l = Lienzo(4, alto)
    caja(l, 0, 0, 3, alto - 1, color, bisel=False)
    l.hl(2, 1, 2, rgba(claro(color, 0.5)))
    return l


def moneda():
    l = Lienzo(9, 9)
    l.circulo(4, 4, 4.5, rgba('#b07810'))
    l.circulo(4, 4, 3.5, rgba('#f0c040'))
    texto(l, 3, 1 + 2, 'Q', rgba('#b07810'))
    l.px(2, 2, (255, 250, 200, 255))
    return Lienzo.desde(l.img)


def corazon():
    g = ['.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...']
    return dibujo(g, {'h': ('#ff5a7a', {'brillo': True})})


def estrella():
    g = ['....s....', '...sss...', 'sssssssss', '.sssssss.', '..sssss..', '.sss.sss.', '.ss...ss.']
    return dibujo(g, {'s': ('#ffd23c', {'brillo': True})})


def foco(encendido):
    g = ['..fffff..', '.fffffff.', 'fffffffff', 'fffffffff', 'fffffffff', '.fffffff.', '..fffff..',
         '...mmm...', '...mmm...', '....m....']
    c = '#ffe45c' if encendido else '#c8c8c8'
    return dibujo(g, {'f': (c, {'brillo': True}), 'm': '#8a8a98'})


def signo(ch, color):
    l = Lienzo(9, 13)
    l.rect(1, 1, 7, 11, rgba(color))
    texto(l, 2, 3 + 2, ch, (255, 255, 255, 255))
    l.contorno(TINTA)
    return l


def gota():
    g = ['.d.', 'ddd', 'ddd', '.d.']
    return dibujo(g, {'d': '#8ad8ff'})


def gafete():
    l = Lienzo(9, 13)
    l.vl(2, 0, 3, rgba('#2a7ad8'))
    l.vl(6, 0, 3, rgba('#2a7ad8'))
    caja(l, 0, 3, 8, 12, '#f6f3ec')
    l.rect(2, 5, 6, 6, rgba(TI))
    l.rect(3, 8, 5, 10, rgba('#d8a070'))
    return l


def sello():
    t = texto_grande('APROBADO', '#3aa060', TINTA, escala=1)
    l = Lienzo(t.ancho + 6, t.alto + 6)
    l.rect(1, 1, l.ancho - 2, l.alto - 2, rgba('#f4fbf0'))
    l.marco(0, 0, l.ancho - 1, l.alto - 1, TINTA)
    l.marco(1, 1, l.ancho - 2, l.alto - 2, rgba('#3aa060'))
    l.marco(2, 2, l.ancho - 3, l.alto - 3, rgba('#3aa060'))
    l.pegar(t, 3, 3)
    return l


def sello_mano():
    l = Lienzo(12, 18)
    caja(l, 4, 0, 7, 6, '#8a5a2e')
    l.circulo(5.5, 2, 3, rgba('#a8703a'))
    caja(l, 1, 7, 10, 12, '#4a4a58')
    caja(l, 0, 13, 11, 16, '#3aa060')
    return l


def caja_release(version):
    l = Lienzo(22, 18)
    caja(l, 0, 3, 21, 17, '#c89a5c')
    l.rect(1, 0, 20, 3, rgba('#d8ae74'))
    l.vl(10, 0, 17, rgba('#f0d070'))
    l.vl(11, 0, 17, rgba('#f0d070'))
    caja(l, 3, 8, 18, 15, '#fbf6ea', bisel=False)
    texto(l, 11 - medir(version) // 2, 9, version, TINTA)
    l.contorno(TINTA)
    return l


def cursor():
    g = ['k.......', 'kk......', 'kwk.....', 'kwwk....', 'kwwwk...', 'kwwwwk..', 'kwwwwwk.', 'kwwwkkkk',
         'kwkwk...', 'kk.kwk..', 'k...kwk.', '.....kk.']
    l = Lienzo(8, 12)
    for y, f in enumerate(g):
        for x, ch in enumerate(f):
            if ch == 'k':
                l.px(x, y, TINTA)
            elif ch == 'w':
                l.px(x, y, (255, 255, 255, 255))
    return l


def nube(var):
    az = random.Random(var * 7 + 3)
    w, h = 84, 30
    g = Rejilla(w, h)
    g.e(42, 22, 38, 7.5, 'n')
    for i in range(5):
        cx = 14 + i * 14 + az.randint(-3, 3)
        r = az.randint(7, 11) + (3 if i == 2 else 0)
        g.e(cx, 22 - r * 0.6, r, r * 0.9, 'n')
    g.e(42, 26, 34, 3, 's', solo='n')
    return dibujo(g.filas(), {'n': ('#ffffff', {'brillo': True}), 's': '#dce6f4'})


def servidor(nombre):
    l = Lienzo(26, 34)
    caja(l, 0, 0, 25, 33, '#3c4250')
    for i in range(4):
        y = 3 + i * 7
        caja(l, 2, y, 23, y + 5, '#272b36', bisel=False)
        for x in range(4, 14, 2):
            l.px(x, y + 2, (90, 96, 110, 255))
            l.px(x, y + 3, (90, 96, 110, 255))
    l.contorno(TINTA)
    return l


def palanca(f):
    """La palanca de prender, f 0 abajo a la izquierda, 1 en medio, 2 arriba a la derecha."""
    l = Lienzo(36, 38)
    ang = (-0.75, -0.1, 0.75)[f]
    cx, cy = 18, 28
    x1, y1 = cx + math.sin(ang) * 17, cy - math.cos(ang) * 17
    l.linea_gruesa(cx, cy, x1, y1, (150, 150, 164, 255), 3)
    l.linea(cx - 1, cy, x1 - 1, y1, (196, 198, 210, 255))
    l.circulo(x1, y1, 3.6, rgba('#e03a30'))
    l.circulo(x1 - 0.8, y1 - 0.8, 1.6, rgba('#ff8a7a'))
    l.px(x1 - 1, y1 - 2, (255, 220, 214, 255))
    caja(l, 9, 26, 27, 37, '#f0c040')
    for x in range(10, 26, 4):
        l.rect(x, 34, x + 1, 36, (40, 40, 48, 255))
    l.rect(15, 27, 21, 29, (60, 60, 70, 255))
    l.contorno(TINTA)
    return l


def laptop(estado):
    l = Lienzo(34, 24)
    caja(l, 4, 0, 29, 17, '#30343e')
    pantalla = {'apagada': '#141820', 'prende': '#1d3a6a', 'lista': '#1a2a3a'}[estado]
    l.rect(6, 2, 27, 15, rgba(pantalla))
    if estado == 'prende':
        for i, y in enumerate((5, 8, 11)):
            l.hl(y, 8, 8 + 6 + i * 5, (120, 220, 255, 255))
    if estado == 'lista':
        texto(l, 8, 4, 'IA', (88, 240, 255, 255))
        l.hl(12, 8, 25, (60, 200, 120, 255))
        l.hl(13, 8, 20, (60, 200, 120, 255))
    caja(l, 0, 18, 33, 21, '#4a505c')
    l.hl(19, 12, 21, (30, 30, 36, 255))
    l.contorno(TINTA)
    return l


def gpu(f, prendida):
    l = Lienzo(30, 40)
    caja(l, 0, 0, 29, 39, '#22252e')
    caja(l, 3, 3, 26, 24, '#14161c', bisel=False)
    for cx, cy in ((14.5, 9), (14.5, 19)):
        l.circulo(cx, cy, 4.6, (40, 44, 54, 255))
        for k in range(3):
            a = f * 0.9 + k * 2 * math.pi / 3
            l.linea(cx, cy, cx + math.cos(a) * 4, cy + math.sin(a) * 4, (110, 116, 130, 255))
        l.px(cx, cy, (160, 160, 170, 255))
    if prendida:
        arco = ['#ff4a8a', '#ffb43c', '#5af07a', '#4ac8ff', '#a070ff']
        for i in range(24):
            c = arco[(i // 5 + f) % len(arco)]
            l.px(3 + i, 27, rgba(c))
            l.px(3 + i, 36, rgba(arco[(i // 5 + f + 2) % len(arco)]))
    texto(l, 6, 29, 'RTX', (200, 200, 210, 255) if prendida else (90, 90, 100, 255))
    l.contorno(TINTA)
    return l


def ascensor_cabina():
    """La cabina por dentro, con su luz, el pasamanos y el piso. La gente va delante de esto."""
    l = Lienzo(30, 46)
    caja(l, 0, 0, 29, 45, '#9aa2b2')
    l.rect(2, 4, 27, 44, rgba('#d8d2c2'))
    for x in range(3, 27, 4):
        l.vl(x, 5, 40, rgba('#cdc6b4'))
    l.rect(2, 4, 27, 6, rgba('#fff6d0'))
    l.rect(8, 4, 21, 4, rgba('#ffffff'))
    l.rect(2, 41, 27, 44, rgba('#8a8478'))
    l.hl(41, 2, 27, rgba('#a8a294'))
    l.hl(26, 3, 26, rgba('#b8bcc8'))
    l.hl(27, 3, 26, rgba('#7a7e8a'))
    l.marco(0, 0, 29, 45, TINTA)
    return l


def ascensor_puertas(abierto):
    """Solo las puertas, abierto de 0 a 4. Lo de en medio queda transparente para ver la cabina."""
    l = Lienzo(30, 46)
    m = abierto * 3
    for x0, x1 in ((2 - m, 14 - m), (15 + m, 27 + m)):
        a0, a1 = max(2, x0), min(27, x1)
        if a1 > a0:
            caja(l, a0, 4, a1, 44, '#c8ced8')
            l.vl(a0 + 2, 6, 42, rgba('#dfe3ea'))
    caja(l, 0, 0, 29, 3, '#9aa2b2', borde=False)
    l.rect(0, 0, 1, 45, rgba('#9aa2b2'))
    l.rect(28, 0, 29, 45, rgba('#9aa2b2'))
    l.marco(0, 0, 29, 45, TINTA)
    return l


def rueda_pdca(quien):
    l = Lienzo(48, 48)
    cols = ['#3aa060', '#2a7ad8', '#f0c040', '#d8443c']
    for y in range(48):
        for x in range(48):
            dx, dy = x - 23.5, y - 23.5
            d = math.hypot(dx, dy)
            if 10 <= d <= 22:
                a = (math.atan2(dy, dx) + math.pi / 2) % (2 * math.pi)
                q = int(a / (math.pi / 2)) % 4
                c = rgba(cols[q])
                if q != quien:
                    c = mezclar(c, '#2a2a34', 0.55)
                elif d > 19:
                    c = mezclar(c, '#ffffff', 0.3)
                l.px(x, y, c)
    l.contorno(TINTA)
    for k, ch in enumerate('PHVA'):
        a = k * math.pi / 2 - math.pi / 2 + math.pi / 4
        x = 23.5 + math.cos(a) * 16 - 2
        y = 23.5 + math.sin(a) * 16 - 3
        texto(l, int(x), int(y), ch, (255, 255, 255, 255) if k == quien else (150, 150, 160, 255))
    return l


def letrero_titulo():
    return {'titulo_1': [texto_grande('LOS CONSENTIDOS', '#f0c040', TINTA, escala=3, sombra='#b05a10')],
            'titulo_2': [texto_grande('PRIMER DÍA EN TI', '#58e0d8', TINTA, escala=2, sombra='#1a6a70')],
            'titulo_fin': [texto_grande('BIENVENIDO AL EQUIPO', '#f0c040', TINTA, escala=3, sombra='#b05a10')],
            'titulo_gracias': [texto_grande('GRACIAS', '#58e0d8', TINTA, escala=4, sombra='#1a6a70')]}


def cosas():
    out = {}
    out['rueda'] = [rueda(i) for i in range(4)]
    out['camion'] = [camion()]
    out['panel'] = [panel()]
    out['camioneta'] = [camioneta()]
    out['camioneta_izq'] = [camioneta(True)]
    out['montacargas'] = [montacargas()]
    for k, c in SACOS.items():
        out['saco_' + k] = [saco(c)]
    out['ticket_inc'] = [ticket('#e03a30')]
    out['ticket_sol'] = [ticket('#2a7ad8')]
    out['ticket_oro'] = [ticket('#f0c040')]
    out['avion_inc'] = [avion(0, '#e03a30'), avion(1, '#e03a30')]
    out['avion_sol'] = [avion(0, '#2a7ad8'), avion(1, '#2a7ad8')]
    for k, c in (('a', '#e03a30'), ('b', '#2a7ad8'), ('c', '#3aa060'), ('d', '#f0a020'), ('e', '#8a5ad0')):
        out['libro_vuela_' + k] = [libro_volador(0, c), libro_volador(1, c)]
        out['libro_' + k] = [libro(c)]
    out['moneda'] = [moneda()]
    out['corazon'] = [corazon()]
    out['estrella'] = [estrella()]
    out['foco'] = [foco(False), foco(True)]
    out['signo_alerta'] = [signo('!', '#e03a30')]
    out['signo_duda'] = [signo('?', '#2a7ad8')]
    out['signo_ok'] = [signo('+', '#3aa060')]
    out['gota'] = [gota()]
    out['gafete'] = [gafete()]
    out['sello'] = [sello()]
    out['sello_mano'] = [sello_mano()]
    out['release'] = [caja_release('1.4.2')]
    out['cursor'] = [cursor()]
    out['nube'] = [nube(0), nube(1), nube(2)]
    out['servidor'] = [servidor('x')]
    out['palanca'] = [palanca(0), palanca(1), palanca(2)]
    out['laptop'] = [laptop('apagada'), laptop('prende'), laptop('lista')]
    out['gpu_apagada'] = [gpu(0, False)]
    out['gpu'] = [gpu(i, True) for i in range(5)]
    out['ascensor_cabina'] = [ascensor_cabina()]
    out['ascensor_puertas'] = [ascensor_puertas(i) for i in range(5)]
    out['pdca'] = [rueda_pdca(i) for i in range(4)]
    out.update(letrero_titulo())
    return out


# los de cajas que tocan la orilla, se les da aire y se les cierra el contorno
CON_AIRE = ('camion', 'montacargas', 'release', 'palanca', 'laptop', 'gpu', 'gpu_apagada', 'servidor', 'gafete',
            'sello_mano', 'libro_a', 'libro_b', 'libro_c', 'libro_d', 'libro_e', 'panel', 'camioneta', 'camioneta_izq')


# ──────────────────────────────────────────────────────────────────────────────
# el ambiente, plantas que se mecen, el ventilador del techo, la arana y la taza de cafe
# ──────────────────────────────────────────────────────────────────────────────
def _mecer(g, alto_tallo, f, fuerza=1.6):
    """Corre cada fila de hojas segun su altura: arriba se mueve mas, junto a la maceta casi nada."""
    s = (-1, 0, 1, 0)[f]
    for y in range(alto_tallo):
        d = round(s * fuerza * (alto_tallo - y) / alto_tallo)
        if d:
            fila = g.c[y]
            g.c[y] = (['.'] * d + fila[:-d]) if d > 0 else (fila[-d:] + ['.'] * (-d))


def _planta_grande(f):
    g = Rejilla(24, 32)
    # hojas de monstera, grandes y con su nervio
    for cx, cy, rx, ry in ((6, 9, 5, 3), (18, 8, 5, 3), (12, 4, 4, 3), (5, 16, 4, 2.6), (19, 15, 4, 2.6), (12, 12, 4, 3)):
        g.e(cx, cy, rx, ry, 'h')
        g.e(cx - 1, cy - 1, rx - 2, ry - 1.5, 'H', solo='h')
        for k in range(-int(rx) + 1, int(rx)):
            g.p(cx + k, cy, 'v' if abs(k) < rx - 1 else 'h')
    for x0, y0 in ((6, 9), (18, 8), (12, 4), (5, 16), (19, 15), (12, 12)):
        for t in range(12):
            g.p(round(12 + (x0 - 12) * t / 11), round(23 + (y0 - 23) * t / 11), 'v')
    _mecer(g, 23, f)
    g.r(7, 24, 16, 30, 'm'); g.r(6, 23, 17, 24, 'M'); g.r(8, 23, 15, 23, 't')
    return dibujo(g.filas(), {'h': ('#3aa060', {'brillo': True}), 'H': '#5cc878', 'v': '#2c7a3a',
                              'm': ('#c86a3c', {'brillo': True}), 'M': '#d8804c', 't': '#5a3a20'})


def _planta_chica(f):
    g = Rejilla(18, 24)
    # sansevieria, hojas largas, separadas, terminadas en punta y con rayas claras
    for i, (x, alto, ladeo) in enumerate(((3, 9, -1), (6, 15, 0), (9, 17, 0), (12, 13, 0), (14, 8, 1))):
        top = 17 - alto
        for y in range(top + 1, 17):
            t = (y - top) / alto
            xx = x + round(ladeo * (1 - t) * 2)
            g.p(xx, y, 'H' if (y + i) % 4 == 0 else 'h')
            if y > top + 2:
                g.p(xx + 1, y, 'h' if (y + i) % 4 else 'H')
        g.p(x + ladeo * 2, top, 'h')
    _mecer(g, 17, f, 1.2)
    g.r(5, 18, 13, 23, 'm'); g.r(4, 17, 14, 18, 'M')
    return dibujo(g.filas(), {'h': ('#2c8848', {'brillo': True}), 'H': '#a8d070', 'm': ('#e8e0d0', {'brillo': True}),
                              'M': '#c8c0b0'})


def _ventilador(f):
    l = Lienzo(36, 10)
    l.rect(17, 0, 18, 3, (70, 70, 80, 255))
    l.rect(15, 4, 20, 6, (90, 90, 100, 255))
    largo = (16, 10, 3, 10)[f]
    l.rect(18 - largo, 5, 17 + largo, 5, (150, 110, 70, 255))
    l.rect(18 - largo, 6, 17 + largo, 6, (110, 80, 50, 255))
    l.rect(16, 7, 19, 8, (240, 230, 190, 255))
    return aire(l)


def _arana():
    g = ['o.o.o.o', '.ooooo.', 'oo.o.oo', '.ooooo.', 'o.o.o.o']
    l = Lienzo(7, 5)
    for y, f in enumerate(g):
        for x, ch in enumerate(f):
            if ch == 'o':
                l.px(x, y, (30, 24, 36, 255))
    l.px(2, 2, (220, 60, 60, 255)); l.px(4, 2, (220, 60, 60, 255))
    return l


def _taza(color):
    l = Lienzo(7, 6)
    caja(l, 0, 0, 4, 5, color, bisel=False)
    l.rect(1, 1, 3, 1, (70, 40, 20, 255))
    l.marco(4, 1, 6, 3, TINTA)
    return l


def ambiente():
    return {
        'planta_grande': [_planta_grande(i) for i in range(4)],
        'planta_chica': [_planta_chica(i) for i in range(4)],
        'ventilador': [_ventilador(i) for i in range(4)],
        'arana': [aire(_arana())],
        'taza_blanca': [aire(_taza('#f4f1ea'))], 'taza_roja': [aire(_taza('#d8443c'))], 'taza_azul': [aire(_taza('#2a7ad8'))],
    }


def todo():
    out = {}
    for f in (gente, llama, ballena, perro, gallina, pajaros, ambiente, cosas):
        out.update(f())
    for n in CON_AIRE:
        out[n] = [aire(fr) for fr in out[n]]
    return out
