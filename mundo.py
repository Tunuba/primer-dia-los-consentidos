# -*- coding: utf-8 -*-
"""El edificio de Distribuidora Los Consentidos en corte, la calle, la bodega y lo de atras.

Deja estas capas, todas del mismo tamano que el mundo salvo los fondos.
    mundo.png         lo de atras de la gente, con las luces prendidas (el HTML apaga cada sala encima)
    frente.png        lo que tapa a la gente, escritorios, mostrador, la pecera
    lejos.png, cerca.png   volcanes y ciudad, para el paralaje
    portal.png        la pantalla del portal de autoservicio

Y PUNTOS, SALAS y RUTAS, que generar.py le pasa al HTML para que sepa donde esta cada cosa.
"""

import math
import random

from pincel import Lienzo, rampa, rgba, mezclar, caja, texto, medir, texto_grande, TINTA, oscuro, claro

W, H = 1440, 800
CALLE = 600
# linea del piso de cada nivel, el interior va de piso-72 a piso
PISOS = {'sot': 680, 'pb': 600, 'p1': 520, 'p2': 440, 'p3': 360}
ALTO = 72
BX0, BX1 = 300, 860          # muros de afuera del edificio
IZQ = (308, 563)             # salas de la izquierda
POZO = (568, 599)            # pozo del ascensor
DER = (604, 851)             # salas de la derecha
BOD = (868, 1119)            # bodega, del piso 600 hasta 448
TECHO = 280
SUC1 = (14, 98)              # sala de la Sucursal 1, a la izquierda
SUC2 = (1300, 1408)          # sala de la Sucursal 2, a la derecha

SALAS = [
    # id, x0, x1, piso, nombre del letrero, area, pared
    ('sot_izq', IZQ[0], IZQ[1], 'sot', 'CUARTO DE MÁQUINAS', 'ti', '#3a4458'),
    ('sot_der', DER[0], DER[1], 'sot', 'LABORATORIO DE IA', 'ti', '#33285a'),
    ('pb_izq', IZQ[0], IZQ[1], 'pb', 'VENTAS', 'comercial', '#f2d7a8'),
    ('pb_der', DER[0], DER[1], 'pb', 'DESPACHO', 'operaciones', '#cfe0c8'),
    ('p1_izq', IZQ[0], IZQ[1], 'p1', 'MESA DE SERVICIO', 'ti', '#bfe6e0'),
    ('p1_der', DER[0], DER[1], 'p1', 'BASE DE CONOCIMIENTO', 'ti', '#ead6b2'),
    ('p2_izq', IZQ[0], IZQ[1], 'p2', 'SISTEMAS', 'ti', '#c8d4ec'),
    ('p2_der', DER[0], DER[1], 'p2', 'ADMINISTRACIÓN Y FINANZAS', 'finanzas', '#f0d0dc'),
    ('p3_izq', IZQ[0], IZQ[1], 'p3', 'COORDINACIÓN', 'ti', '#d8e8c0'),
    ('p3_der', DER[0], DER[1], 'p3', 'SALA DEL CAB', 'ti', '#e2d8f0'),
    ('suc1', SUC1[0], SUC1[1], 'pb', 'SUCURSAL 1', 'sucursal', '#dcebd4'),
    ('suc2', SUC2[0], SUC2[1], 'pb', 'SUCURSAL 2', 'sucursal', '#e7dcee'),
]

PUNTOS = {}
RUTAS = {}
RECTS = {}


def piso_y(p):
    return PISOS[p]


# ──────────────────────────────────────────────────────────────────────────────
# piezas del edificio
# ──────────────────────────────────────────────────────────────────────────────
def pared(l, x0, x1, y0, y1, color, patron, az):
    r = rampa(color)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = r[2]
            if patron == 'rayas' and (x // 6) % 2 == 0:
                c = mezclar(r[2], r[3], 0.35)
            elif patron == 'azulejo' and (x % 12 == 0 or (y - y0) % 12 == 0):
                c = r[1]
            elif patron == 'ladrillo':
                fila = (y - y0) // 6
                if (y - y0) % 6 == 0 or (x + (fila % 2) * 6) % 12 == 0:
                    c = r[1]
            elif patron == 'madera' and x % 10 == 0:
                c = r[1]
            elif patron == 'lamina' and x % 8 in (0, 1):
                c = r[3] if x % 8 == 0 else r[1]
            if az.random() < 0.03:
                c = mezclar(c, r[1], 0.4)
            l.px(x, y, c)
    # sombra del techo
    for i in range(4):
        l.hl(y0 + i, x0, x1, mezclar(l.leer(x0, y0 + i), '#000000', 0.25 - i * 0.06))


def losa(l, x0, x1, y):
    """La losa de piso de 8 de alto que empieza en y."""
    caja(l, x0, y, x1, y + 7, '#8e8a86', borde=False)
    l.hl(y, x0, x1, rgba('#c8c2b8'))
    l.hl(y + 7, x0, x1, rgba('#5e5a58'))


def rodapie(l, x0, x1, piso, color):
    l.rect(x0, piso - 3, x1, piso - 1, rgba(oscuro(color, 0.35)))
    l.hl(piso - 3, x0, x1, rgba(oscuro(color, 0.2)))


def lampara(l, x, y):
    l.rect(x - 6, y, x + 6, y + 2, (70, 70, 80, 255))
    l.rect(x - 5, y + 3, x + 5, y + 3, (250, 244, 210, 255))
    l.vl(x, y - 2, y, (70, 70, 80, 255))
    return (x, y + 3)


def letrero(l, x, y, txt, fondo='#fbf6ea', tinta=TINTA, borde=None):
    w = medir(txt) + 6
    caja(l, x, y, x + w, y + 11, fondo)
    texto(l, x + 3, y + 3, txt, tinta)
    return w


def planta(l, x, piso, az):
    caja(l, x - 4, piso - 9, x + 4, piso - 1, '#c86a3c')
    for i in range(9):
        a = -math.pi / 2 + (i - 4) * 0.33
        largo = 8 + az.randint(0, 5)
        for k in range(largo):
            px = x + math.cos(a) * k * 0.9
            py = piso - 9 + math.sin(a) * k
            l.px(px, py, rgba('#3aa060' if k < largo - 2 else '#6ad070'))


def ventana(l, x0, y0, x1, y1):
    """Hueco transparente, ahi se ve el cielo de atras."""
    caja(l, x0 - 2, y0 - 2, x1 + 2, y1 + 2, '#f4f1ea')
    l.rect(x0, y0, x1, y1, (0, 0, 0, 0))
    l.vl((x0 + x1) // 2, y0, y1, rgba('#f4f1ea'))
    l.rect(x0 - 3, y1 + 2, x1 + 3, y1 + 3, rgba('#d8d0c0'))


def monitor(l, x, y, pantalla='#1a2a3a', ancho=16, alto=11, contenido=None):
    """Monitor de frente, x,y arriba a la izquierda."""
    caja(l, x, y, x + ancho, y + alto, '#30343e')
    l.rect(x + 2, y + 2, x + ancho - 2, y + alto - 2, rgba(pantalla))
    if contenido == 'texto':
        for i in range(3):
            l.hl(y + 3 + i * 2, x + 3, x + 4 + (ancho - 8) * (0.5 + 0.5 * ((i * 7) % 3) / 2), (140, 220, 255, 255))
    elif contenido == 'barras':
        for i in range(4):
            h = 2 + (i * 5) % 6
            l.rect(x + 3 + i * 3, y + alto - 2 - h, x + 4 + i * 3, y + alto - 3, rgba(('#3aa060', '#f0c040', '#2a7ad8', '#d8443c')[i]))
    elif contenido == 'codigo':
        for i in range(4):
            l.hl(y + 3 + i * 2, x + 3 + (i % 2) * 2, x + 6 + (i * 3) % 7, rgba(('#f0c040', '#7ae07a', '#c08af0', '#7ad0f0')[i]))
    l.rect(x + ancho // 2 - 1, y + alto + 1, x + ancho // 2 + 1, y + alto + 2, (50, 50, 60, 255))
    l.rect(x + ancho // 2 - 4, y + alto + 3, x + ancho // 2 + 4, y + alto + 3, (50, 50, 60, 255))


def escritorio(fr, x0, x1, piso, color='#c89a5c'):
    """El frente del escritorio va en la capa de adelante, tapa las piernas."""
    top = piso - 15
    caja(fr, x0, top, x1, top + 3, claro(color, 0.1))
    caja(fr, x0 + 2, top + 4, x1 - 2, piso - 1, oscuro(color, 0.08))
    caja(fr, x1 - 12, top + 6, x1 - 4, top + 10, oscuro(color, 0.02))
    fr.rect(x1 - 9, top + 8, x1 - 7, top + 8, (60, 40, 30, 255))
    return top


def silla(l, x, piso):
    l.rect(x - 1, piso - 8, x + 1, piso - 2, (50, 50, 60, 255))
    l.rect(x - 4, piso - 1, x + 4, piso - 1, (50, 50, 60, 255))


def sacos_pila(l, x, piso, filas, cols, az, colores=None):
    """Una pila de sacos sobre una tarima, dibujados con su etiqueta."""
    cols_saco = colores or ['#f0c040', '#d8443c', '#3aa060', '#8a5a2e', '#2a7ad8']
    caja(l, x - 2, piso - 4, x + cols * 13 + 1, piso - 1, '#a8703a')
    for f in range(filas):
        n = cols - (f % 2)
        for c in range(n):
            sx = x + c * 13 + (f % 2) * 6
            sy = piso - 4 - (f + 1) * 9
            col = cols_saco[(c + f * 2 + az.randint(0, 1)) % len(cols_saco)] if colores is None else colores[0]
            caja(l, sx, sy, sx + 12, sy + 9, '#e8d8b0')
            l.rect(sx + 3, sy + 3, sx + 9, sy + 6, rgba(col))
            l.hl(sy + 4, sx + 4, sx + 8, rgba('#fbf6ea'))


def estante_libros(l, x0, x1, y0, piso, az, grupos):
    caja(l, x0, y0, x1, piso - 1, '#8a5a2e')
    filas = 4
    alto = (piso - y0 - 6) // filas
    for f in range(filas):
        y = y0 + 3 + f * alto
        l.rect(x0 + 3, y, x1 - 3, y + alto - 3, rgba('#4a2c10'))
        l.rect(x0 + 2, y + alto - 2, x1 - 2, y + alto - 1, rgba('#c89a5c'))
        x = x0 + 4
        while x < x1 - 6:
            col = grupos[min(len(grupos) - 1, (x - x0) * len(grupos) // (x1 - x0))]
            col = mezclar(col, '#ffffff', az.random() * 0.25) if az.random() < 0.5 else mezclar(col, '#000000', az.random() * 0.2)
            hb = az.randint(alto - 9, alto - 4)
            wb = az.choice((2, 3, 3, 4))
            if az.random() < 0.08:
                x += 3
                continue
            l.rect(x, y + alto - 2 - hb, x + wb - 1, y + alto - 3, col)
            l.vl(x, y + alto - 2 - hb, y + alto - 3, mezclar(col, '#000000', 0.3))
            l.hl(y + alto - 2 - hb + 2, x, x + wb - 1, mezclar(col, '#ffffff', 0.4))
            x += wb
    return alto


# ──────────────────────────────────────────────────────────────────────────────
# la red, bandeja en el techo de cada piso, un ducto que sube por la pared y un cable a cada equipo
# ──────────────────────────────────────────────────────────────────────────────
DUCTO = 313
NODOS = {
    # nombre, x, y de arriba del equipo, piso
    'glpi': (339, 622, 'sot'),
    'ventas': (484, 572, 'pb'),
    'despacho': (786, 572, 'pb'),
    'tec1': (378, 492, 'p1'),
    'tec2': (456, 492, 'p1'),
    'cola': (524, 468, 'p1'),
    'sistemas': (398, 412, 'p2'),
    'finanzas': (698, 412, 'p2'),
    'coord': (384, 332, 'p3'),
    'kpi': (773, 306, 'p3'),
    'lab': (700, 642, 'sot'),        # la laptop con la IA local
}


def bandeja_y(p):
    return PISOS[p] - ALTO + 7


def cable_h(l, y, x0, x1):
    l.hl(y - 1, x0, x1, rgba('#4a4e5a'))
    l.hl(y, x0, x1, rgba('#2a7ad8'))
    l.hl(y + 1, x0, x1, rgba('#1a3a6a'))
    for x in range(x0 + 6, x1, 18):
        l.rect(x, y - 1, x + 1, y + 1, rgba('#6a6e7a'))


def cable_v(l, x, y0, y1):
    l.vl(x - 1, y0, y1, rgba('#1a3a6a'))
    l.vl(x, y0, y1, rgba('#2a7ad8'))
    l.vl(x + 1, y0, y1, rgba('#5a9ae8'))


# de la pantalla de cada sucursal hasta el ducto, bajo tierra. La 2 pasa por debajo del sotano.
EXTERNOS = {
    'suc1': [(SUC1[1] - 18, 572), (SUC1[1] - 18, CALLE + 52), (DUCTO, CALLE + 52)],
    'suc2': [(SUC2[1] - 18, 572), (SUC2[1] - 18, 704), (BX0 - 10, 704), (BX0 - 10, CALLE + 52), (DUCTO, CALLE + 52)],
}


def red(l):
    for p in PISOS:
        y = bandeja_y(p)
        cable_h(l, y, DUCTO, DER[1] if p != 'pb' else 860)
    # el ducto sube por la pared de la izquierda y atraviesa las losas
    cable_v(l, DUCTO, bandeja_y('p3'), CALLE + 52)
    for p in PISOS:
        y = bandeja_y(p)
        caja(l, DUCTO - 3, y - 3, DUCTO + 3, y + 3, '#5a5e6a')
        l.px(DUCTO + 1, y - 1, rgba('#7aff8a'))
    for n, (x, yd, p) in NODOS.items():
        cable_v(l, x, bandeja_y(p) + 2, yd - 1)
    # hasta la bodega, por encima del muro y por su techo
    yb = bandeja_y('pb')
    cable_v(l, 860, 450, yb)
    cable_h(l, 450, 860, 1073)
    cable_v(l, 1073, 452, 477)
    PUNTOS['red'] = {
        'ducto': DUCTO,
        'bandejas': {p: bandeja_y(p) for p in PISOS},
        'nodos': {n: [x, yd, p] for n, (x, yd, p) in NODOS.items()},
        'bodega': [[860, yb], [860, 450], [1073, 450], [1073, 478]],
        'calle': [[-60, CALLE + 52], [DUCTO, CALLE + 52]],
        'externos': {n: [list(p) for p in r] for n, r in EXTERNOS.items()},
    }



# ──────────────────────────────────────────────────────────────────────────────
# los detalles, lo que hace que el edificio se vea usado y vivo
# ──────────────────────────────────────────────────────────────────────────────
# letra de 3x5 para las placas chicas
MINI = {
    'A': '.#. #.# ### #.# #.#', 'B': '##. #.# ##. #.# ##.', 'H': '#.# #.# ### #.# #.#', 'L': '#.. #.. #.. #.. ###',
    'N': '#.# ### ### #.# #.#', 'S': '.## #.. .#. ..# ##.', 'U': '#.# #.# #.# #.# ###', ' ': '... ... ... ... ...',
    '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '5': '### #.. ##. ..# ##.', '6': '.## #.. ### #.# ###',
    '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ##.',
}


def mini(l, x, y, txt, color):
    for ch in txt.upper().replace('Á', 'A'):
        for fy, fila in enumerate(MINI.get(ch, MINI[' ']).split(' ')):
            for fx, v in enumerate(fila):
                if v == '#':
                    l.px(x + fx, y + fy, color)
        x += 4
    return x


def telarana(l, cx, cy, sx, sy, r):
    """Una telarana en una esquina: hilos que salen del rincon y tres vueltas que los unen, combadas."""
    hilo = (232, 232, 240, 120)
    angs = [k * (math.pi / 2) / 5 for k in range(6)]
    puntas = []
    for a in angs:
        pts = []
        for k in range(int(r) + 1):
            x, y = cx + sx * math.cos(a) * k, cy + sy * math.sin(a) * k
            l.mezcla(x, y, hilo)
            pts.append((x, y))
        puntas.append(pts)
    for frac in (0.35, 0.65, 0.95):
        for i in range(len(angs) - 1):
            a0, a1 = angs[i], angs[i + 1]
            rr = r * frac
            for t in range(6):
                u = t / 5
                a = a0 + (a1 - a0) * u
                comba = math.sin(u * math.pi) * rr * 0.12
                l.mezcla(cx + sx * math.cos(a) * (rr - comba), cy + sy * math.sin(a) * (rr - comba), hilo)


def mancha(l, cx, cy, rx, ry, color, az, fuerza=40):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 and az.random() < 0.9 - d * 0.4:
                c = rgba(color)
                l.mezcla(x, y, (c[0], c[1], c[2], int(fuerza * (1 - d * 0.7))))


def grieta(l, x, y, largo, az, color=(40, 30, 30, 150)):
    for k in range(largo):
        l.mezcla(x, y, color)
        x += az.choice((-1, 0, 1)); y += 1
        if az.random() < 0.25:
            l.mezcla(x + az.choice((-1, 1)), y, color)


def suciedad(l, x0, x1, piso, az, alto=10, fuerza=26):
    """Lo que se junta junto al piso: polvo y marcas de zapatos."""
    for x in range(x0, x1 + 1):
        h = int(alto * (0.4 + 0.6 * az.random()))
        for k in range(h):
            if az.random() < 0.5:
                l.mezcla(x, piso - 4 - k, (60, 40, 30, int(fuerza * (1 - k / h))))


def extintor(l, x, piso):
    y1 = piso - 3
    caja(l, x, y1 - 10, x + 4, y1, '#d8302a', bisel=True)
    l.rect(x + 1, y1 - 12, x + 3, y1 - 11, rgba('#3a3a44'))
    l.px(x + 5, y1 - 11, rgba('#3a3a44')); l.vl(x + 6, y1 - 10, y1 - 6, rgba('#3a3a44'))
    l.rect(x + 1, y1 - 7, x + 3, y1 - 5, rgba('#f4f1ea'))
    caja(l, x - 1, y1 - 20, x + 5, y1 - 15, '#d8302a', bisel=False)
    l.px(x + 2, y1 - 18, rgba('#ffffff'))


def garrafon(l, x, piso):
    caja(l, x - 4, piso - 14, x + 4, piso - 3, '#e8e8ec')
    l.rect(x - 2, piso - 9, x - 1, piso - 8, rgba('#3a7ad8')); l.rect(x + 1, piso - 9, x + 2, piso - 8, rgba('#d8443c'))
    l.circulo(x, piso - 19, 4.6, rgba('#8ad8f6'))
    l.rect(x - 4, piso - 21, x + 4, piso - 17, rgba('#8ad8f6'))
    l.hl(piso - 22, x - 2, x + 2, rgba('#c8f0ff')); l.vl(x - 3, piso - 21, piso - 17, rgba('#d8f6ff'))
    l.marco(x - 5, piso - 24, x + 5, piso - 14, (0, 0, 0, 0))
    for yy in range(piso - 24, piso - 14):
        for xx in range(x - 5, x + 6):
            if l.leer(xx, yy)[3] and not l.leer(xx - 1, yy)[3]:
                l.px(xx - 1, yy, TINTA)
            if l.leer(xx, yy)[3] and not l.leer(xx + 1, yy)[3]:
                l.px(xx + 1, yy, TINTA)


def cuadro(l, x, y, w, h, tema):
    caja(l, x, y, x + w, y + h, '#8a5a2e', bisel=False)
    l.rect(x + 2, y + 2, x + w - 2, y + h - 2, rgba('#9ad8f0' if tema == 'gallina' else '#f4f1ea'))
    if tema == 'gallina':
        l.rect(x + 2, y + h - 4, x + w - 2, y + h - 2, rgba('#3aa060'))
        l.circulo(x + w // 2, y + h - 5, 2.5, rgba('#fbf6ea'))
        l.px(x + w // 2 + 1, y + h - 8, rgba('#e03a30'))
    else:
        l.hl(y + 4, x + 3, x + w - 3, rgba('#2a7ad8')); l.hl(y + 6, x + 3, x + w - 5, rgba('#9a9aaa'))
        l.circulo(x + w - 4, y + h - 4, 1.5, rgba('#f0c040'))


def escalera(l, x0, y0, x1, y1, ancho=5, color='#a8703a'):
    """Una escalera recargada, de (x0, y0) abajo a (x1, y1) arriba, con sus peldanos."""
    r = rampa(color)
    n = int(math.hypot(x1 - x0, y1 - y0))
    for k in range(n + 1):
        t = k / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        l.px(x, y, r[0]); l.px(x + ancho, y, r[0])
        l.px(x + 1, y, r[2]); l.px(x + ancho - 1, y, r[1])
    for k in range(3, n, 5):
        t = k / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        l.hl(int(y), int(x) + 1, int(x) + ancho - 1, r[3])


def hierba(l, x, y, az):
    for k in range(az.randint(3, 5)):
        h = az.randint(2, 5)
        dx = az.choice((-1, 0, 1))
        for j in range(h):
            l.px(x + k - 2 + (dx if j > h // 2 else 0), y - j, rgba(az.choice(('#3aa060', '#4cb868', '#2c8848'))))


def reloj_cara(l, cx, cy, r):
    l.circulo(cx, cy, r + 1.4, TINTA)
    l.circulo(cx, cy, r, rgba('#fbf6ea'))
    for k in range(12):
        a = k * math.pi / 6
        l.px(cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1), rgba('#5a5e6a' if k % 3 else '#1b1522'))


def detalles(l, fr, az):
    sot, pb, p1, p2, p3 = (PISOS[k] for k in ('sot', 'pb', 'p1', 'p2', 'p3'))
    amb = PUNTOS.setdefault('ambiente', {})
    # telaranas en los rincones del sotano, de la bodega y de una sucursal
    for cx, cy, sx, sy, r in ((309, sot - ALTO + 1, 1, 1, 14), (562, sot - ALTO + 1, -1, 1, 10), (850, sot - ALTO + 1, -1, 1, 17),
                              (BOD[0] + 1, 449, 1, 1, 18), (BOD[1] - 1, 449, -1, 1, 13), (SUC2[1] - 1, CALLE - ALTO + 1, -1, 1, 8)):
        telarana(l, cx, cy, sx, sy, r)
    amb['arana'] = [839, sot - ALTO + 9]
    # humedad y una gotera en el techo del cuarto de maquinas, grietas y suciedad abajo
    mancha(l, 430, sot - ALTO + 4, 16, 4, '#6a5030', az, 46)
    mancha(l, 760, sot - ALTO + 3, 10, 3, '#6a5030', az, 36)
    amb['gotera'] = [430, sot - ALTO + 6, sot - 2]
    grieta(l, 590 - 24, sot - 40, 12, az)
    grieta(l, 640, sot - 60, 9, az)
    suciedad(l, 308, 563, sot, az, 12, 30)
    suciedad(l, 604, 851, sot, az, 9, 24)
    suciedad(l, BOD[0], BOD[1], CALLE, az, 14, 34)
    for x0, x1, p in ((IZQ[0], IZQ[1], 'pb'), (DER[0], DER[1], 'pb'), (SUC1[0], SUC1[1], 'pb'), (SUC2[0], SUC2[1], 'pb')):
        suciedad(l, x0, x1, PISOS[p], az, 5, 14)
    # chorreado del techo de la bodega
    for x in range(BOD[0] - 8, BOD[1] + 8, 9):
        if az.random() < 0.5:
            for k in range(az.randint(3, 9)):
                l.mezcla(x, 441 + k, (120, 70, 40, 70 - k * 6))
    # extintores junto al elevador, uno por piso
    for x, p in ((606, 'pb'), (556, 'p1'), (559, 'p2'), (559, 'p3'), (557, 'sot')):
        extintor(l, x, PISOS[p])
    garrafon(l, 481, p1)
    cuadro(l, 646, p2 - 60, 16, 11, 'gallina')
    cuadro(l, 404, p3 - 50, 13, 10, 'diploma')
    # la escalera de la biblioteca y la rodante de la estanteria de la bodega
    escalera(l, 782, p1 - 1, 792, p1 - 54, 6, '#c89a5c')
    escalera(l, 1012, CALLE - 1, 999, 452, 6, '#d0661a')
    # tarimas vacias, una escoba
    for k in range(3):
        caja(l, 1080, CALLE - 4 - k * 4, 1104, CALLE - 1 - k * 4, '#a8703a', bisel=False)
        l.hl(CALLE - 3 - k * 4, 1081, 1103, rgba('#7a4e22'))
    l.linea(872, CALLE - 2, 866, CALLE - 32, rgba('#8a5a2e'))
    l.rect(869, CALLE - 6, 876, CALLE - 1, rgba('#d8b060')); l.hl(CALLE - 6, 869, 876, rgba('#5a3a20'))
    # tazas en los escritorios, con su vapor de vez en cuando
    tazas = []
    for x, p, c in ((336, 'p1', 'taza_blanca'), (366, 'p2', 'taza_roja'), (336, 'p3', 'taza_azul'), (650, 'p2', 'taza_blanca'),
                    (828, 'pb', 'taza_roja')):
        tazas.append([x, PISOS[p] - 15, c])
    amb['tazas'] = tazas
    # afuera, hierbitas en la banqueta, basura, la alcantarilla
    for x in (106, 196, 252, 1236, 1284, 1424):
        hierba(l, x, CALLE, az)
    l.rect(228, CALLE + 26, 240, CALLE + 29, rgba('#2a2a32'))
    for x in range(229, 240, 2):
        l.vl(x, CALLE + 27, CALLE + 28, rgba('#5a5a64'))
    l.circulo(186, CALLE + 2, 1.6, rgba('#f4f1ea')); l.px(187, CALLE + 1, rgba('#c8c0b0'))
    l.rect(1262, CALLE + 1, 1264, CALLE + 3, rgba('#d8443c'))
    # extractores en el techo y la chimenea de la bodega, de donde sale el humo
    for x in (384, 700):
        caja(l, x, TECHO - 22, x + 14, TECHO - 11, '#9aa2ae')
        for k in range(3):
            l.hl(TECHO - 19 + k * 3, x + 3, x + 11, rgba('#5a606a'))
    caja(l, 1052, 404, 1060, 422, '#8a8e9a')
    caja(l, 1050, 401, 1062, 404, '#5a5e6a')
    amb['humos'] = [[391, TECHO - 24], [707, TECHO - 24], [1056, 399]]
    # relojes, la bodega y las sucursales
    relojes = [[1018, 468, 6], [SUC1[0] + 66, CALLE - 58, 5], [SUC2[0] + 74, CALLE - 58, 5],
               [PUNTOS['reloj'][0], PUNTOS['reloj'][1], 7]]
    for cx, cy, r in relojes[:3]:
        reloj_cara(l, cx, cy, r)
    amb['relojes'] = relojes
    # el horario de cada servicio, el de su calendario en GLPI
    placas = []
    for x, y, txt, ini, fin in ((402, pb - 58, 'LUN A SAB 6 A 18 H', 6, 18), (768, pb - 42, 'LUN A SAB 5 A 18 H', 5, 18),
                                (672, pb - 68, 'LUN A SAB 5 A 19 H', 5, 19), (1036, 503, 'LUN A SAB 5 A 18 H', 5, 18)):
        w = len(txt) * 4 + 9
        caja(l, x, y, x + w, y + 8, '#1a1e28', bisel=False)
        mini(l, x + 2, y + 2, txt, (232, 236, 244, 255))
        placas.append([x + w - 4, y + 4, ini, fin])
    amb['placas'] = placas
    # plantas que se mecen, el ventilador, de donde caen hojas, la farola de las polillas
    amb['plantas'] = [['planta_grande', 548, pb], ['planta_chica', 400, p1], ['planta_chica', 458, p2], ['planta_chica', 728, p2],
                      ['planta_chica', 418, p3], ['planta_chica', 613, p3], ['planta_chica', 759, pb]]
    amb['ventiladores'] = [[728, p2 - ALTO]]
    amb['arboles'] = [[228, CALLE - 36], [1262, CALLE - 34]]
    amb['farola'] = [272, CALLE - 52]
    amb['parpadea'] = [393, sot - ALTO]


# ──────────────────────────────────────────────────────────────────────────────
# el mundo
# ──────────────────────────────────────────────────────────────────────────────
def hornear():
    az = random.Random(26)
    l = Lienzo(W, H)
    fr = Lienzo(W, H)
    luces = []          # (x, y, ancho_abajo, piso) de cada lampara
    brillos = []        # pantallas que brillan con la luz

    # ── suelo y calle ──
    for y in range(CALLE, H):
        for x in range(W):
            t = (y - CALLE) / (H - CALLE)
            c = mezclar('#7a5024', '#3a2412', t)
            if az.random() < 0.06:
                c = mezclar(c, '#a07040', 0.4)
            if (y - CALLE) % 37 == 0 and az.random() < 0.6:
                c = mezclar(c, '#2a1a0c', 0.3)
            l.px(x, y, c)
    for x0, x1 in ((0, BX0 - 1), (BX1 + 268, W - 1)):
        l.rect(x0, CALLE, x1, CALLE + 5, rgba('#b8b4ac'))
        l.hl(CALLE, x0, x1, rgba('#dedad2'))
        l.rect(x0, CALLE + 6, x1, CALLE + 7, rgba('#8a8680'))
        l.rect(x0, CALLE + 8, x1, CALLE + 34, rgba('#3c3c46'))
        for x in range(x0, x1, 22):
            l.rect(x, CALLE + 20, x + 10, CALLE + 21, rgba('#e8e0b0'))
        l.rect(x0, CALLE + 35, x1, CALLE + 37, rgba('#5a5a64'))
    # anden de carga y la calle de la bodega
    l.rect(BOD[1] + 8, CALLE, BX1 + 268, CALLE + 37, rgba('#9a968e'))
    l.hl(CALLE, BOD[1] + 8, BX1 + 268, rgba('#cfcac0'))
    for x in range(BOD[1] + 10, BX1 + 268, 16):
        l.vl(x, CALLE + 1, CALLE + 37, rgba('#86827a'))
    # cables de fibra bajo la calle hasta el sotano
    for i, c in enumerate(('#f08a30', '#2a7ad8')):
        y = CALLE + 50 + i * 4
        l.hl(y, 0, BX0, rgba(c))
    RUTAS['fibra'] = [(0, CALLE + 52), (BX0, CALLE + 52)]

    # ── el cascaron del edificio ──
    crema = '#ecdcbc'
    caja(l, BX0 - 4, TECHO - 8, BX1 + 4, PISOS['sot'] + 8, crema, borde=True)
    # bodega
    caja(l, BOD[0] - 8, 432, BOD[1] + 8, CALLE - 1, '#c9c2b4')
    # las sucursales, un local de un piso con su toldo
    for x0, x1, c in ((SUC1[0], SUC1[1], '#f0e2c4'), (SUC2[0], SUC2[1], '#ead8e6')):
        caja(l, x0 - 6, CALLE - ALTO - 14, x1 + 6, CALLE + 7, c)

    # salas
    for sid, x0, x1, p, nombre, area, color in SALAS:
        piso = PISOS[p]
        y0 = piso - ALTO
        patron = {'sot_izq': 'azulejo', 'sot_der': 'azulejo', 'pb_izq': 'rayas', 'pb_der': 'liso',
                  'p1_izq': 'rayas', 'p1_der': 'madera', 'p2_izq': 'liso', 'p2_der': 'rayas',
                  'p3_izq': 'liso', 'p3_der': 'rayas', 'suc1': 'rayas', 'suc2': 'rayas'}[sid]
        pared(l, x0, x1, y0, piso - 1, color, patron, az)
        rodapie(l, x0, x1, piso, color)
        losa(l, x0 - 8 if not sid.startswith('suc') else x0 - 4, x1 + 4, piso)
        n = 2 if x1 - x0 > 200 else 1
        for k in range(n):
            lx = x0 + (x1 - x0) * (k + 1) // (n + 1)
            luces.append((lampara(l, lx, y0), 60, piso))
        RECTS[sid] = (x0, y0, x1, piso - 1)
    # losa del techo y de la bodega
    losa(l, BX0 - 4, BX1 + 4, TECHO)
    pared(l, BOD[0], BOD[1], 448, CALLE - 1, '#b8b0a0', 'lamina', az)
    rodapie(l, BOD[0], BOD[1], CALLE, '#b8b0a0')
    RECTS['bodega'] = (BOD[0], 448, BOD[1], CALLE - 1)
    for lx in (930, 1000, 1070):
        luces.append((lampara(l, lx, 450), 70, CALLE))
    losa(l, BOD[0] - 8, BOD[1] + 8, CALLE)
    # techo de lamina curvo de la bodega
    for x in range(BOD[0] - 12, BOD[1] + 13):
        t = (x - (BOD[0] - 12)) / (BOD[1] - BOD[0] + 24)
        top = int(432 - math.sin(t * math.pi) * 18)
        for y in range(top, 440):
            c = '#9aa2ae' if (x // 4) % 2 else '#b8c0cc'
            l.px(x, y, rgba(c))
        l.px(x, top, TINTA)
    l.hl(440, BOD[0] - 12, BOD[1] + 12, TINTA)
    texto(l, 952, 406, 'BODEGA CENTRAL', rgba('#2c3a4a'))

    # muro entre la bodega y el despacho con su puerta
    l.rect(BX1 - 8, CALLE - 48, BX1 + 8, CALLE - 1, rgba('#cfe0c8'))
    l.rect(BX1 - 8, CALLE - 48, BX1 + 8, CALLE - 46, rgba('#8e8a86'))
    # portón de la bodega al anden
    l.rect(BOD[1] + 1, CALLE - 52, BOD[1] + 8, CALLE - 1, rgba('#b8b0a0'))
    l.rect(BOD[1] + 1, CALLE - 52, BOD[1] + 8, CALLE - 50, rgba('#5e5a58'))
    # entrada principal a la izquierda
    l.rect(BX0 - 4, CALLE - 48, IZQ[0] - 1, CALLE - 1, rgba('#f2d7a8'))
    caja(l, BX0 - 6, CALLE - 52, IZQ[0] + 1, CALLE - 48, '#f08a30')
    for i in range(3):
        caja(l, BX0 - 14 + i * 3, CALLE + i * 0, BX0 - 4, CALLE + 3, '#c8c2b8')
    PUNTOS['entrada'] = (BX0 + 2, CALLE)

    # pozo del ascensor
    l.rect(POZO[0] - 4, TECHO + 8, POZO[1] + 4, PISOS['sot'] - 1, rgba('#5a5e6a'))
    l.rect(POZO[0], TECHO + 8, POZO[1], PISOS['sot'] - 1, rgba('#2a2c36'))
    for x in (POZO[0] + 3, POZO[1] - 3):
        l.vl(x, TECHO + 8, PISOS['sot'] - 1, rgba('#4a4e5a'))
    l.vl((POZO[0] + POZO[1]) // 2, TECHO + 8, PISOS['sot'] - 1, rgba('#15161c'))
    for p, piso in PISOS.items():
        l.rect(POZO[0] - 4, piso, POZO[1] + 4, piso + 7, rgba('#8e8a86'))
        etq = {'sot': 'S', 'pb': 'PB', 'p1': '1', 'p2': '2', 'p3': '3'}[p]
        caja(l, POZO[0] + 4, piso - 64, POZO[1] - 4, piso - 54, '#1a1e28')
        texto(l, (POZO[0] + POZO[1]) // 2 - medir(etq) // 2, piso - 62, etq, rgba('#58f0ff'))
    PUNTOS['ascensor_x'] = ((POZO[0] + POZO[1]) // 2, 0)

    # ── la red del edificio, por donde viajan los tickets ──
    red(l)

    # ── amueblar cada sala ──
    sot, pb, p1, p2, p3 = (PISOS[k] for k in ('sot', 'pb', 'p1', 'p2', 'p3'))

    # SOTANO IZQ, GLPI y la pecera de la ballena
    x = 322
    caja(l, x, sot - 58, x + 34, sot - 1, '#2a2e3a')
    for i in range(7):
        y = sot - 55 + i * 8
        caja(l, x + 3, y, x + 31, y + 6, '#3c4250', bisel=False)
        for k in range(4):
            l.px(x + 6 + k * 3, y + 3, (90, 96, 110, 255))
    letrero(l, x + 3, sot - 66 - 12 + 6, 'GLPI', '#f0c040')
    RECTS['glpi'] = (x, sot - 62, x + 34, sot - 1)
    PUNTOS['glpi'] = (x + 17, sot - 30)
    # pecera, el fondo atras y el vidrio adelante
    px0, px1, py0 = 384, 548, sot - 47
    caja(l, px0 - 3, py0 - 3, px1 + 3, sot - 1, '#5a6070')
    l.rect(px0, py0, px1, sot - 5, rgba('#0d4298'))
    for i in range(18):
        gx = az.randint(px0 + 2, px1 - 6)
        l.rect(gx, sot - 9, gx + az.randint(2, 6), sot - 6, rgba(az.choice(('#e8d8a0', '#c8b880', '#a0a0a0'))))
    for i in range(5):
        gx = px0 + 10 + i * 34
        for k in range(14):
            l.px(gx + int(math.sin(k * 0.7) * 2), sot - 8 - k, rgba('#3aa060'))
    # el agua y el vidrio los pone el HTML sobre la ballena, asi quien se para enfrente no queda dentro del agua
    l.marco(px0 - 3, py0 - 3, px1 + 3, sot - 1, TINTA)
    letrero(l, px1 - 52, py0 - 14, 'DOCKER', '#2496ed', rgba('#ffffff'))
    RECTS['pecera'] = (px0, py0 + 6, px1, sot - 5)
    PUNTOS['ballena'] = ((px0 + px1) // 2, sot - 14)

    # SOTANO DER, el laboratorio de la IA
    top = escritorio(fr, 676, 770, sot, '#5a4a7a')
    l.rect(676, top, 770, top + 3, rgba('#6a5a8a'))
    PUNTOS['laptop'] = (712, top)
    PUNTOS['llama'] = (748, top)
    PUNTOS['gpu'] = (800, sot)
    PUNTOS['palanca'] = (640, sot)
    letrero(l, 786, sot - 66, 'TEV1 4B', '#1a1e28', rgba('#58f0ff'))
    # el tunel naranja, del laboratorio a la pecera por el techo
    tubo = [(712, top - 18), (712, sot - 68), (580, sot - 68), (540, sot - 68), (540, py0 - 4)]
    for (ax, ay), (bx, by) in zip(tubo, tubo[1:]):
        if ax == bx:
            l.rect(ax - 2, min(ay, by), ax + 2, max(ay, by), rgba('#f08a30'))
            l.vl(ax - 2, min(ay, by), max(ay, by), rgba('#c0571a'))
            l.vl(ax + 2, min(ay, by), max(ay, by), rgba('#ffb060'))
        else:
            l.rect(min(ax, bx), ay - 2, max(ax, bx), ay + 2, rgba('#f08a30'))
            l.hl(ay - 2, min(ax, bx), max(ax, bx), rgba('#ffb060'))
            l.hl(ay + 2, min(ax, bx), max(ax, bx), rgba('#c0571a'))
    texto(l, 717, sot - 62, 'TÚNEL', rgba('#ffb060'))
    RUTAS['tunel'] = tubo
    # cables del piso al gpu
    l.hl(sot - 2, 770, 800, rgba('#20222a'))

    # PB IZQ, ventas, con la entrada
    top = escritorio(fr, 420, 500, pb, '#d8443c')
    monitor(l, 476, top - 14, '#1a3a2a', contenido='texto')
    brillos.append((478, top - 12, 490, top - 6))
    caja(l, 440, top - 7, 456, top - 1, '#3c3c46')
    l.rect(443, top - 6, 453, top - 5, rgba('#7ae07a'))
    PUNTOS['vendedor'] = (462, pb)
    PUNTOS['cliente'] = (396, pb)
    PUNTOS['pantalla_venta'] = (484, top - 8)
    PUNTOS['caja'] = (448, top - 7)
    # estante con sacos al fondo
    caja(l, 512, pb - 50, 558, pb - 1, '#a8703a', bisel=False)
    for f in range(3):
        y = pb - 47 + f * 16
        l.rect(514, y + 13, 556, y + 14, rgba('#6a4a20'))
        for c in range(3):
            sx = 515 + c * 14
            caja(l, sx, y + 2, sx + 11, y + 12, '#e8d8b0')
            l.rect(sx + 3, y + 5, sx + 8, y + 8, rgba(['#f0c040', '#d8443c', '#3aa060', '#8a5a2e', '#2a7ad8'][(f * 3 + c) % 5]))
    ventana(l, 352, pb - 58, 392, pb - 34)

    # PB DER, despacho con el mapa del rastreo
    mx0, my0, mx1, my1 = 616, pb - 52, 744, pb - 18
    caja(l, mx0 - 4, my0 - 4, mx1 + 4, my1 + 4, '#30343e')
    for y in range(my0, my1 + 1):
        for xx in range(mx0, mx1 + 1):
            u = (xx - mx0) / (mx1 - mx0)
            v = (y - my0) / (my1 - my0)
            mar = v > 0.78 - 0.12 * math.sin(u * 5) - 0.1 * u
            c = '#1a4a8a' if mar else ('#2e7a4a' if (int(u * 9) + int(v * 6)) % 3 else '#3a8a56')
            l.px(xx, y, rgba(c))
    # el mapa, los puntos de las sedes y las rutas
    sedes = [(640, my0 + 12), (700, my0 + 8), (724, my0 + 24), (668, my0 + 26), (632, my0 + 26)]
    rutas = [[sedes[0], (660, my0 + 10), sedes[1], (716, my0 + 14), sedes[2]],
             [sedes[0], (650, my0 + 20), sedes[3], (700, my0 + 30), sedes[2]],
             [sedes[0], sedes[4], (650, my0 + 30), sedes[3]]]
    for r in rutas:
        for (ax, ay), (bx, by) in zip(r, r[1:]):
            l.linea(ax, ay, bx, by, rgba('#e8e0b0'))
    for i, (sx, sy) in enumerate(sedes):
        l.rect(sx - 1, sy - 1, sx + 1, sy + 1, rgba('#f0c040' if i else '#f08a30'))
    for i, r in enumerate(rutas):
        RUTAS['mapa%d' % i] = r
    RECTS['mapa'] = (mx0, my0, mx1, my1)
    letrero(l, mx0, my0 - 17, 'RASTREO', '#1a1e28', rgba('#58f0ff'))
    top = escritorio(fr, 770, 846, pb, '#8a5ad0')
    monitor(l, 778, top - 14, '#1a2a3a', contenido='texto')
    brillos.append((780, top - 12, 792, top - 6))
    PUNTOS['despacho'] = (812, pb)
    caja(l, 800, top - 6, 812, top - 1, '#f6f3ec')
    PUNTOS['pedidos'] = (806, top - 6)

    # BODEGA
    sacos_pila(l, 878, pb, 6, 4, az)
    sacos_pila(l, 940, pb, 4, 3, az)
    sacos_pila(l, 878, pb - 62, 0, 0, az)
    # estanteria alta
    caja(l, 876, 452, 1000, 456, '#d0661a')
    for xx in (876, 936, 996):
        l.rect(xx, 452, xx + 3, pb - 66, rgba('#2a5aa0'))
    for yy in (488, pb - 66):
        caja(l, 876, yy, 999, yy + 3, '#d0661a')
    for c in range(9):
        sx = 880 + c * 13
        for yy in (466, 474):
            caja(l, sx, yy, sx + 11, yy + 8 + (0 if yy == 474 else 0), '#e8d8b0')
            l.rect(sx + 3, yy + 3, sx + 8, yy + 5, rgba(['#f0c040', '#d8443c', '#3aa060', '#8a5a2e', '#2a7ad8'][(c + yy) % 5]))
        caja(l, sx, pb - 66 - 22, sx + 11, pb - 66 - 13, '#e8d8b0')
        caja(l, sx, pb - 66 - 12, sx + 11, pb - 66 - 3, '#e8d8b0')
        l.rect(sx + 3, pb - 66 - 9, sx + 8, pb - 66 - 7, rgba(['#f0c040', '#d8443c', '#3aa060', '#8a5a2e', '#2a7ad8'][c % 5]))
    # contador del inventario
    caja(l, 1034, 478, 1112, 500, '#1a1e28')
    RECTS['contador'] = (1037, 481, 1109, 497)
    PUNTOS['montacargas'] = (1040, pb)
    PUNTOS['bodega1'] = (1000, pb)
    PUNTOS['porton'] = (BOD[1] + 4, pb)
    PUNTOS['camion'] = (BOD[1] + 76, pb + 30)
    PUNTOS['camioneta'] = (150, pb + 32)

    # PISO 1 IZQ, mesa de servicio
    letrero(l, 418, p1 - 66, 'NIVEL 1', '#1fa59c', rgba('#ffffff'))
    for i, (x0, x1) in enumerate(((330, 392), (408, 470))):
        top = escritorio(fr, x0, x1, p1, '#e8e0d0')
        monitor(l, x1 - 22, top - 14, '#1a2a3a', contenido='texto')
        brillos.append((x1 - 20, top - 12, x1 - 8, top - 6))
        PUNTOS['tec%d' % (i + 1)] = (x0 + 18, p1)
        PUNTOS['pantalla_tec%d' % (i + 1)] = (x1 - 14, top - 8)
    # bandeja de entrada de tickets
    caja(l, 492, p1 - 52, 556, p1 - 20, '#30343e')
    l.rect(495, p1 - 49, 553, p1 - 23, rgba('#1a1e28'))
    RECTS['cola'] = (495, p1 - 49, 553, p1 - 23)
    letrero(l, 504, p1 - 64, 'COLA', '#fbf6ea')
    # reloj del acuerdo de servicio
    l.circulo(321, p1 - 37, 7, rgba('#fbf6ea'), borde=TINTA)
    PUNTOS['reloj'] = (321, p1 - 37)

    # PISO 1 DER, base de conocimiento
    grupos = ['#f0c040', '#d8443c', '#3aa060', '#2a7ad8']
    for i, x0 in enumerate((612, 676, 740)):
        estante_libros(l, x0, x0 + 58, p1 - 54, p1, az, grupos)
    RECTS['estantes'] = (612, p1 - 54, 798, p1 - 1)
    top = escritorio(fr, 806, 848, p1, '#c89a5c')
    caja(l, 816, top - 5, 830, top - 1, '#2a7ad8')
    PUNTOS['lector'] = (826, p1)

    # PISO 2 IZQ, sistemas
    letrero(l, 380, p2 - 66, 'NIVEL 2', '#2a7ad8', rgba('#ffffff'))
    top = escritorio(fr, 360, 450, p2, '#e8e0d0')
    monitor(l, 390, top - 14, '#141a24', contenido='codigo')
    monitor(l, 410, top - 14, '#141a24', contenido='codigo')
    brillos.append((392, top - 12, 425, top - 6))
    PUNTOS['sistemas'] = (378, p2)
    # pizarra con codigo
    caja(l, 466, p2 - 56, 556, p2 - 26, '#f4f1ea')
    for i in range(5):
        l.hl(p2 - 51 + i * 5, 470 + (i % 3) * 4, 500 + (i * 13) % 40, rgba(('#2a7ad8', '#d8443c', '#3aa060')[i % 3]))
    ventana(l, 318, p2 - 58, 346, p2 - 34)

    # PISO 2 DER, finanzas
    top = escritorio(fr, 640, 716, p2, '#f07aa0')
    monitor(l, 690, top - 14, '#1a2a3a', contenido='barras')
    brillos.append((692, top - 12, 704, top - 6))
    PUNTOS['finanzas'] = (660, p2)
    top = escritorio(fr, 740, 806, p2, '#e8e0d0')
    caja(l, 778, top - 8, 792, top - 1, '#3c3c46')
    PUNTOS['contador'] = (762, p2)
    caja(l, 820, p2 - 30, 846, p2 - 1, '#5a5e6a')
    l.circulo(833, p2 - 16, 5, rgba('#8a8e9a'), borde=TINTA)
    texto(l, 822, p2 - 44, 'Q', rgba('#3aa060'))
    caja(l, 610, p2 - 40, 630, p2 - 1, '#9a8a70')
    for y in range(p2 - 36, p2 - 2, 9):
        l.hl(y, 612, 628, rgba('#5a4a30'))

    # PISO 3 IZQ, coordinacion con el corcho de problemas
    letrero(l, 392, p3 - 66, 'NIVEL 3', '#8a5ad0', rgba('#ffffff'))
    top = escritorio(fr, 330, 400, p3, '#5a4632')
    monitor(l, 376, top - 14, '#1a2a3a', contenido='barras')
    brillos.append((378, top - 12, 390, top - 6))
    PUNTOS['coord'] = (350, p3)
    cx0, cy0, cx1, cy1 = 436, p3 - 50, 552, p3 - 18
    caja(l, cx0 - 3, cy0 - 3, cx1 + 3, cy1 + 3, '#8a5a2e')
    for y in range(cy0, cy1 + 1):
        for xx in range(cx0, cx1 + 1):
            l.px(xx, y, rgba('#c8965a' if az.random() > 0.15 else '#a87840'))
    pines = []
    for i, (xx, yy) in enumerate(((446, cy0 + 4), (474, cy0 + 18), (448, cy0 + 20), (512, cy0 + 6), (534, cy0 + 19))):
        caja(l, xx, yy, xx + 10, yy + 9, '#fbf6ea' if i != 3 else '#f0c040', bisel=False)
        l.hl(yy + 2, xx + 1, xx + 9, rgba('#e03a30' if i < 3 else '#2a7ad8'))
        l.hl(yy + 5, xx + 2, xx + 7, rgba('#9a9aaa'))
        l.rect(xx + 4, yy - 1, xx + 5, yy, rgba('#e03a30'))
        pines.append((xx + 5, yy))
    PUNTOS['pines'] = pines
    letrero(l, cx0 + 50, cy0 - 14, 'PROBLEMAS', '#fbf6ea')
    PUNTOS['corcho'] = ((cx0 + cx1) // 2, cy0)

    # PISO 3 DER, sala del CAB
    caja(l, 700, p3 - 54, 846, p3 - 20, '#1a1e28')
    RECTS['kpi'] = (704, p3 - 50, 842, p3 - 24)
    letrero(l, 750, p3 - 67, 'MEJORA CONTINUA', '#1fa59c', rgba('#ffffff'))
    PUNTOS['pdca'] = (652, p3 - 30)
    mesa_y = p3 - 14
    caja(fr, 620, mesa_y, 840, mesa_y + 4, '#8a5a2e')
    caja(fr, 640, mesa_y + 5, 646, p3 - 1, '#6a4a20')
    caja(fr, 814, mesa_y + 5, 820, p3 - 1, '#6a4a20')
    PUNTOS['cab'] = [(690, p3), (722, p3), (754, p3), (786, p3)]
    PUNTOS['mesa_cab'] = (730, mesa_y)

    # letreros de cada sala y luz de colores por area
    for sid, x0, x1, p, nombre, area, color in SALAS:
        piso = PISOS[p]
        if sid in ('pb_der', 'p3_der', 'suc1', 'suc2'):
            continue
        sx = x0 + 6
        if sid == 'sot_izq':
            sx = x0 + 52
        if sid in ('sot_izq', 'sot_der'):
            letrero(l, sx, piso - 62, nombre)
            continue
        letrero(l, sx, piso - 66, nombre)
    letrero(l, 770, PISOS['pb'] - 66, 'DESPACHO')
    letrero(l, 616, PISOS['p3'] - 66, 'SALA DEL CAB')

    # ── las sucursales ──
    for i, (x0, x1) in enumerate((SUC1, SUC2)):
        n = i + 1
        y0 = CALLE - ALTO
        # techo plano con toldo de rayas y el letrero
        caja(l, x0 - 8, y0 - 16, x1 + 8, y0 - 10, '#c0571a')
        for x in range(x0 - 6, x1 + 7, 6):
            l.rect(x, y0 - 9, x + 2, y0 - 5, rgba('#f0c040' if (x // 6) % 2 else '#fbf6ea'))
        t = 'SUCURSAL %d' % n
        letrero(l, (x0 + x1) // 2 - (medir(t) + 6) // 2, y0 - 30, t, '#2c7a3a', rgba('#ffffff'))
        # mostrador con la caja y la pantalla del inventario
        top = escritorio(fr, x1 - 52, x1 - 4, CALLE, '#3aa060')
        monitor(l, x1 - 26, top - 14, '#1a3a2a', contenido='texto')
        brillos.append((x1 - 24, top - 12, x1 - 12, top - 6))
        PUNTOS['suc%d' % n] = (x1 - 40, CALLE)
        # estante con sacos y una ventana
        caja(l, x0 + 4, CALLE - 40, x0 + 26, CALLE - 1, '#a8703a', bisel=False)
        for f in range(2):
            caja(l, x0 + 7, CALLE - 36 + f * 18, x0 + 23, CALLE - 26 + f * 18, '#e8d8b0')
            l.rect(x0 + 11, CALLE - 33 + f * 18, x0 + 19, CALLE - 30 + f * 18, rgba(('#f0c040', '#3aa060')[f]))
        ventana(l, x0 + 34, CALLE - 58, x0 + 52, CALLE - 40)
    # el enlace de cada sucursal, de su pantalla hasta el ducto del edificio, bajo tierra
    for n, ruta in EXTERNOS.items():
        for (ax, ay), (bx, by) in zip(ruta, ruta[1:]):
            if ax == bx:
                cable_v(l, ax, min(ay, by), max(ay, by))
            else:
                cable_h(l, ay, min(ax, bx), max(ax, bx))
        caja(l, ruta[0][0] - 3, CALLE + 8, ruta[0][0] + 3, CALLE + 13, '#5a5e6a')

    # ── la azotea ──
    caja(l, BX0 - 4, TECHO - 10, BX1 + 4, TECHO - 1, '#d8c8a8')
    # tinaco
    caja(l, 316, TECHO - 40, 344, TECHO - 14, '#2a2a34')
    l.rect(322, TECHO - 13, 324, TECHO - 11, rgba('#5a5a64'))
    l.rect(336, TECHO - 13, 338, TECHO - 11, rgba('#5a5a64'))
    # caseta del elevador, el elevador sube hasta la azotea
    cx0, cx1 = POZO[0] - 8, POZO[1] + 8
    caja(l, cx0, TECHO - 58, cx1, TECHO - 11, crema)
    caja(l, cx0 - 3, TECHO - 63, cx1 + 3, TECHO - 58, '#c0571a')
    l.rect(POZO[0], TECHO - 56, POZO[1], TECHO + 7, rgba('#2a2c36'))
    for x in (POZO[0] + 3, POZO[1] - 3):
        l.vl(x, TECHO - 56, TECHO + 7, rgba('#4a4e5a'))
    l.vl((POZO[0] + POZO[1]) // 2, TECHO - 56, TECHO + 7, rgba('#15161c'))
    # letrero grande, arriba de la caseta
    t = texto_grande('LOS CONSENTIDOS', '#f0c040', TINTA, escala=2, sombra='#b05a10')
    lx = (BX0 + BX1) // 2 - t.ancho // 2
    ly = TECHO - 63 - 12 - t.alto
    for xx in (lx + 16, lx + t.ancho - 18):
        l.rect(xx, ly + t.alto - 4, xx + 3, TECHO - 11, rgba('#4a4a58'))
    caja(l, lx - 6, ly - 4, lx + t.ancho + 5, ly + t.alto + 3, '#2c7a3a')
    l.pegar(t, lx, ly)
    PUNTOS['letrero'] = ((BX0 + BX1) // 2, ly)
    # antena
    l.rect(818, TECHO - 84, 820, TECHO - 11, rgba('#8a8e9a'))
    for k in range(6):
        y = TECHO - 80 + k * 12
        l.linea(812, y + 10, 819, y, rgba('#6a6e7a'))
        l.linea(826, y + 10, 819, y, rgba('#6a6e7a'))
    l.circulo(836, TECHO - 52, 7, rgba('#d8dce4'), borde=TINTA)
    l.rect(824, TECHO - 52, 830, TECHO - 51, rgba('#8a8e9a'))
    PUNTOS['antena'] = (819, TECHO - 86)

    # ── afuera a la izquierda, parada y arboles ──
    for tx in (228,):
        l.rect(tx - 2, CALLE - 26, tx + 2, CALLE - 1, rgba('#6a4020'))
        for k in range(26):
            a = az.random() * 2 * math.pi
            r = az.random() * 14
            cx, cy = tx + math.cos(a) * r, CALLE - 36 + math.sin(a) * r * 0.8
            l.circulo(cx, cy, 5, rgba(az.choice(('#3aa060', '#2c8848', '#4cb868'))))
    caja(l, 112, CALLE - 38, 176, CALLE - 34, '#2a7ad8')
    l.rect(116, CALLE - 34, 118, CALLE - 1, rgba('#4a4e5a'))
    l.rect(170, CALLE - 34, 172, CALLE - 1, rgba('#4a4e5a'))
    caja(l, 124, CALLE - 12, 164, CALLE - 9, '#c89a5c')
    letrero(l, 126, CALLE - 52, 'PARADA', '#2a7ad8', rgba('#ffffff'))
    l.rect(266, CALLE - 54, 268, CALLE - 1, rgba('#3a3e4a'))
    l.rect(262, CALLE - 56, 276, CALLE - 54, rgba('#3a3e4a'))
    luces.append(((272, CALLE - 53), 26, CALLE))
    PUNTOS['parada'] = (150, CALLE)
    # afuera a la derecha
    tx = 1262
    l.rect(tx - 2, CALLE - 26, tx + 2, CALLE - 1, rgba('#6a4020'))
    for k in range(22):
        a = az.random() * 2 * math.pi
        r = az.random() * 12
        l.circulo(tx + math.cos(a) * r, CALLE - 34 + math.sin(a) * r * 0.8, 5,
                  rgba(az.choice(('#3aa060', '#2c8848', '#4cb868'))))

    # ── la nube, servidores arriba ──
    PUNTOS['nubes'] = [(470, 96), (590, 70), (710, 100)]
    PUNTOS['nube_nombres'] = ['SRV-APP-01', 'SRV-BD-01', 'SRV-ALM-01']

    detalles(l, fr, az)
    PUNTOS['ambiente']['polvo'] = [[lx, ly, piso] for (lx, ly), ancho, piso in luces if ly > 440 or lx > BOD[0]]

    # ── la luz de las lamparas y el brillo de las pantallas ──
    for (lx, ly), ancho, piso in luces:
        for y in range(ly + 1, piso):
            t = (y - ly) / max(1, piso - ly)
            media = 4 + ancho * 0.5 * t
            for xx in range(int(lx - media), int(lx + media) + 1):
                borde = abs(xx - lx) / media
                a = int(38 * (1 - t * 0.6) * (1 - borde ** 2))
                if a > 0 and l.leer(xx, y)[3]:
                    l.mezcla(xx, y, (255, 246, 200, a))
    for x0, y0, x1, y1 in brillos:
        for y in range(y0 - 3, y1 + 4):
            for xx in range(x0 - 3, x1 + 4):
                if l.leer(xx, y)[3]:
                    l.mezcla(xx, y, (140, 220, 255, 22))
    salas_json = [dict(id=s[0], x0=s[1], x1=s[2], y0=PISOS[s[3]] - ALTO, y1=PISOS[s[3]] - 1, piso=PISOS[s[3]],
                       nombre=s[4], area=s[5]) for s in SALAS]
    salas_json.append(dict(id='bodega', x0=BOD[0], x1=BOD[1], y0=448, y1=CALLE - 1, piso=CALLE,
                           nombre='BODEGA', area='operaciones'))
    return l, fr, salas_json


# ──────────────────────────────────────────────────────────────────────────────
# lo de atras, volcanes y ciudad
# ──────────────────────────────────────────────────────────────────────────────
def lejos():
    az = random.Random(5)
    w, h = 1700, 360
    l = Lienzo(w, h)
    volcanes = [(180, 250, 120), (520, 300, 160), (900, 230, 110), (1250, 280, 150), (1560, 240, 120)]
    for cx, alto, ancho in volcanes:
        for x in range(int(cx - ancho * 1.6), int(cx + ancho * 1.6)):
            d = abs(x - cx) / ancho
            top = h - alto * max(0, 1 - d ** 1.4 * 0.62) if d < 1.6 else h
            crater = 6 if d < 0.08 else 0
            for y in range(int(top + crater), h):
                t = (y - top) / alto
                c = mezclar('#6a7aa8', '#8a9ac4', min(1, t * 1.5))
                if x > cx:
                    c = mezclar(c, '#4a5a88', 0.25)
                l.px(x, y, c)
    PUNTOS['humo'] = (520, h - 300)
    return l


def cerca():
    az = random.Random(9)
    w, h = 1600, 220
    l = Lienzo(w, h)
    for y in range(h - 70, h):
        for x in range(w):
            l.px(x, y, mezclar('#4a8a5a', '#3a7048', (y - h + 70) / 70))
    x = 0
    while x < w:
        bw = az.randint(26, 60)
        bh = az.randint(30, 110)
        col = az.choice(('#8a94b0', '#9aa0bc', '#7a84a4', '#a49ab8'))
        l.rect(x, h - bh, x + bw, h - 1, rgba(col))
        l.hl(h - bh, x, x + bw, rgba(claro(col, 0.25)))
        for wy in range(h - bh + 6, h - 8, 9):
            for wx in range(x + 4, x + bw - 4, 8):
                if az.random() < 0.7:
                    l.rect(wx, wy, wx + 3, wy + 4, rgba(oscuro(col, 0.3)))
        x += bw + az.randint(4, 30)
    for k in range(40):
        tx = az.randint(0, w)
        l.circulo(tx, h - 20 - az.randint(0, 20), az.randint(6, 12), rgba(az.choice(('#3a7a48', '#2c6a3c', '#4a8a52'))))
    return l


# ──────────────────────────────────────────────────────────────────────────────
# la pantalla del portal de autoservicio
# ──────────────────────────────────────────────────────────────────────────────
def portal():
    w, h = 320, 180
    l = Lienzo(w, h, rgba('#eef2f6'))
    # barra del navegador
    caja(l, 0, 0, w - 1, 13, '#3a3e4a', borde=False)
    for i, c in enumerate(('#e03a30', '#f0c040', '#3aa060')):
        l.circulo(7 + i * 8, 6.5, 2.4, rgba(c))
    caja(l, 34, 3, 250, 10, '#f4f6fa', borde=False)
    texto(l, 38, 5 - 1, 'GLPI.HUELLAGAMES.COM', rgba('#5a5e6a'))
    # encabezado del portal
    caja(l, 0, 14, w - 1, 38, '#1fa59c', borde=False)
    texto(l, 12, 22, 'PORTAL DE AUTOSERVICIO', (255, 255, 255, 255))
    texto(l, 222, 22, 'LOS CONSENTIDOS', rgba('#fdf0c0'))
    # menu
    caja(l, 0, 39, 74, h - 1, '#e2e8ee', borde=False)
    for i, t in enumerate(('INICIO', 'MIS TICKETS', 'CATÁLOGO', 'AYUDA')):
        if i == 0:
            l.rect(0, 46 + i * 16, 74, 58 + i * 16, rgba('#cfe9e6'))
        texto(l, 8, 50 + i * 16, t, rgba('#3a3e4a'))
    # los dos botones grandes
    PUNTOS['portal_falla'] = (90 + 50, 60 + 40)
    PUNTOS['portal_pide'] = (202 + 50, 60 + 40)
    for x0, color, t1, t2 in ((90, '#e03a30', 'ALGO NO', 'FUNCIONA'), (202, '#2a7ad8', 'NECESITO', 'ALGO')):
        caja(l, x0 + 2, 64, x0 + 103, 140, oscuro(color, 0.4))
        caja(l, x0, 60, x0 + 100, 136, color)
        l.circulo(x0 + 50, 84, 12, rgba(claro(color, 0.3)))
        if t1 == 'ALGO NO':
            texto(l, x0 + 48, 79, '!', (255, 255, 255, 255))
        else:
            texto(l, x0 + 47, 79, '+', (255, 255, 255, 255))
        texto(l, x0 + 50 - medir(t1) // 2, 104, t1, (255, 255, 255, 255))
        texto(l, x0 + 50 - medir(t2) // 2, 116, t2, (255, 255, 255, 255))
    texto(l, 90, 152, 'TU TICKET LLEGA A LA MESA DE SERVICIO', rgba('#7a7e8a'))
    return l
