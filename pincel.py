# -*- coding: utf-8 -*-
"""Lo comun para dibujar, la letra de 5x7, el dibujo por letras y las cajas con volumen.

Todo se apoya en el motor de C:\\Proyectos\\PIXELES, el mismo de la gente de 32 px.
"""

import os
import sys

PIXELES = r'C:\Proyectos\PIXELES'
sys.path.insert(0, PIXELES)
sys.path.insert(0, os.path.join(PIXELES, 'generadores'))

from motor import Lienzo, rampa, rgba, mezclar, a_hex  # noqa: E402,F401
from motor.mapas import Letra, LINEA, HUECO, componer  # noqa: E402,F401

TINTA = (27, 21, 34, 255)

# ──────────────────────────────────────────────────────────────────────────────
# la letra, 5 de ancho y 7 de alto, solo mayusculas
# ──────────────────────────────────────────────────────────────────────────────
_G = {
    'A': '.###. #...# #...# ##### #...# #...# #...#',
    'B': '####. #...# #...# ####. #...# #...# ####.',
    'C': '.###. #...# #.... #.... #.... #...# .###.',
    'D': '####. #...# #...# #...# #...# #...# ####.',
    'E': '##### #.... #.... ####. #.... #.... #####',
    'F': '##### #.... #.... ####. #.... #.... #....',
    'G': '.###. #...# #.... #.### #...# #...# .####',
    'H': '#...# #...# #...# ##### #...# #...# #...#',
    'I': '### .#. .#. .#. .#. .#. ###',
    'J': '..### ...#. ...#. ...#. #..#. #..#. .##..',
    'K': '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
    'L': '#.... #.... #.... #.... #.... #.... #####',
    'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#',
    'N': '#...# ##..# #.#.# #..## #...# #...# #...#',
    'O': '.###. #...# #...# #...# #...# #...# .###.',
    'P': '####. #...# #...# ####. #.... #.... #....',
    'Q': '.###. #...# #...# #...# #.#.# #..#. .##.#',
    'R': '####. #...# #...# ####. #.#.. #..#. #...#',
    'S': '.#### #.... #.... .###. ....# ....# ####.',
    'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#...# #...# #...# #...# #...# #...# .###.',
    'V': '#...# #...# #...# #...# #...# .#.#. ..#..',
    'W': '#...# #...# #...# #.#.# #.#.# ##.## #...#',
    'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
    'Z': '##### ....# ...#. ..#.. .#... #.... #####',
    '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
    '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
    '2': '.###. #...# ....# ...#. ..#.. .#... #####',
    '3': '####. ....# ....# .###. ....# ....# ####.',
    '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
    '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '.###. #.... #.... ####. #...# #...# .###.',
    '7': '##### ....# ...#. ..#.. .#... .#... .#...',
    '8': '.###. #...# #...# .###. #...# #...# .###.',
    '9': '.###. #...# #...# .#### ....# ....# .###.',
    '-': '.... .... .... #### .... .... ....',
    '.': '. . . . . . #',
    ',': '.. .. .. .. .. .# #.',
    '!': '# # # # # . #',
    '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
    '/': '....# ...#. ...#. ..#.. .#... .#... #....',
    '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
    '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
    '(': '.# #. #. #. #. #. .#',
    ')': '#. .# .# .# .# .# #.',
    ' ': '... ... ... ... ... ... ...',
    '_': '..... ..... ..... ..... ..... ..... #####',
    ':': '. # . . . # .',
}
_ACENTO = {'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N'}


def glifo(ch):
    """Filas del glifo de 9 de alto, las dos de arriba son para el acento."""
    ch = ch.upper()
    base = _ACENTO.get(ch, ch)
    filas = _G.get(base, _G['?']).split(' ')
    ancho = len(filas[0])
    vacio = '.' * ancho
    arriba = [vacio, vacio]
    if ch == 'Ñ':
        arriba = ['.##.#', '#.##.']
    elif ch in _ACENTO:
        m = ancho // 2
        arriba = [vacio[:m + 1] + '#' + vacio[m + 2:], vacio[:m] + '#' + vacio[m + 1:]]
        arriba = [a[:ancho] for a in arriba]
    return arriba + filas


def medir(texto, esp=1):
    return sum(len(glifo(c)[0]) + esp for c in texto) - esp if texto else 0


def texto(l, x, y, txt, color, sombra=None, esp=1):
    """Escribe con la letra de 5x7. y es la fila de arriba de la mayuscula (el acento cae 2 arriba)."""
    cx = x
    for ch in txt:
        g = glifo(ch)
        for fy, fila in enumerate(g):
            for fx, v in enumerate(fila):
                if v == '#':
                    if sombra:
                        l.px(cx + fx + 1, y + fy - 2 + 1, sombra)
                    l.px(cx + fx, y + fy - 2, color)
        cx += len(g[0]) + esp
    return cx - x


def texto_grande(txt, color, borde, escala=2, sombra=None):
    """Un titulo a escala con contorno grueso, en su propio lienzo."""
    w = medir(txt) * escala + 6
    h = 9 * escala + 6
    l = Lienzo(w, h)
    cx = 3
    luz = mezclar(color, '#ffffff', 0.45)
    for ch in txt:
        g = glifo(ch)
        for fy, fila in enumerate(g):
            for fx, v in enumerate(fila):
                if v == '#':
                    for a in range(escala):
                        for b in range(escala):
                            c = luz if (b == 0 and fy >= 2 and (fy == 2 or g[fy - 1][fx] != '#')) else color
                            l.px(cx + fx * escala + a, 3 + fy * escala + b, c)
        cx += (len(g[0]) + 1) * escala
    if sombra:
        s = Lienzo(w, h)
        for yy in range(h):
            for xx in range(w):
                if l.leer(xx, yy)[3]:
                    s.px(xx + 1, yy + 2, sombra)
        s.pegar(l)
        l = s
    l.contorno(borde)
    l.contorno(borde)
    return l


# ──────────────────────────────────────────────────────────────────────────────
# dibujo por letras, el motor sombrea y contornea
# ──────────────────────────────────────────────────────────────────────────────
def dibujo(mapa, colores, contorno=True):
    """mapa es una lista de filas, colores {letra: '#hex' | ('#hex', {opciones})}.

    Opciones, tono (0 a 4 fijo), fijo (color sin sombrear), parte (para unir letras al sombrear), brillo.
    La letra 'o' es linea interior y '_' hueco.
    """
    ancho = max(len(f) for f in mapa)
    mapa = [f.ljust(ancho, '.') for f in mapa]
    if contorno:
        mapa = ['.' * (ancho + 2)] + ['.' + f + '.' for f in mapa] + ['.' * (ancho + 2)]
    letras = {'o': LINEA, '_': HUECO}
    for ch, v in colores.items():
        hexc, op = (v if isinstance(v, tuple) else (v, {}))
        if op.get('fijo'):
            letras[ch] = Letra(op.get('parte', ch), fijo=rgba(hexc), capa=ch)
        else:
            letras[ch] = Letra(op.get('parte', ch), rampa(hexc), tono=op.get('tono'),
                               brillo=op.get('brillo', False), mezcla=op.get('mezcla', ()))
    l = componer(mapa, letras, contorno=contorno)
    l.de_mapa = True
    return l


def aire(l):
    """Le da un pixel de aire a un dibujo que toca la orilla y le cierra el contorno donde se habia cortado."""
    w, h = l.ancho, l.alto
    out = Lienzo(w + 2, h + 2)
    out.pegar(l, 1, 1)
    for y in range(h):
        for x in range(w):
            if not l.leer(x, y)[3]:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h):
                    out.px(nx + 1, ny + 1, TINTA)
    return out


def caja(l, x0, y0, x1, y1, color, borde=True, bisel=True):
    """Un bloque con luz arriba a la izquierda y sombra abajo a la derecha."""
    r = rampa(color)
    l.rect(x0, y0, x1, y1, r[2])
    if bisel:
        l.hl(y0 + (1 if borde else 0), x0 + (1 if borde else 0), x1 - 1, r[3])
        l.vl(x0 + (1 if borde else 0), y0 + 1, y1 - 1, r[3])
        l.hl(y1 - (1 if borde else 0), x0 + 1, x1 - (1 if borde else 0), r[1])
        l.vl(x1 - (1 if borde else 0), y0 + 1, y1 - 1, r[1])
    if borde:
        l.marco(x0, y0, x1, y1, r[0])
    return r


def oscuro(c, f):
    return mezclar(c, '#000000', f)


def claro(c, f):
    return mezclar(c, '#ffffff', f)
