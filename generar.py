# -*- coding: utf-8 -*-
"""Genera todo el pixel art de la presentacion y la ficha que lee el HTML.

    python generar.py          hornea el mundo, la hoja de sprites y datos.js (unos 30 s)

Deja img/ y datos.js. El HTML no dibuja nada propio salvo globos, particulas y numeros en pantallas.
"""

import json
import os
import time

import mundo
import sprites
from pincel import Lienzo, glifo

AQUI = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(AQUI, 'img')


def empacar(piezas, ancho=1024):
    """Estantes simples, del mas alto al mas bajo. Devuelve el lienzo y {nombre: [[x,y,w,h], ...]}."""
    lista = []
    for nombre, frames in piezas.items():
        for i, f in enumerate(frames):
            lista.append((nombre, i, f))
    lista.sort(key=lambda t: -t[2].alto)
    x = y = 1
    fila = 0
    pos = []
    for nombre, i, f in lista:
        if x + f.ancho + 1 > ancho:
            x, y, fila = 1, y + fila + 1, 0
        pos.append((nombre, i, f, x, y))
        x += f.ancho + 1
        fila = max(fila, f.alto)
    alto = y + fila + 1
    hoja = Lienzo(ancho, alto)
    rects = {}
    for nombre, i, f, x, y in pos:
        hoja.pegar(f, x, y)
        rects.setdefault(nombre, {})[i] = [x, y, f.ancho, f.alto]
    return hoja, {k: [v[i] for i in sorted(v)] for k, v in rects.items()}


def revisar(piezas):
    """Avisa de lo que se sale de su lienzo o toca la orilla, porque eso se ve cortado."""
    malos = []
    for quien, n in sorted(sprites.FUERA.items()):
        malos.append('%s dibuja %d pixeles fuera de su rejilla' % (quien, n))
    for nombre, frames in piezas.items():
        if (getattr(frames[0], 'de_mapa', False) or nombre in ('rueda', 'moneda')) and not nombre.startswith('p_'):
            continue
        for i, f in enumerate(frames):
            w, h = f.ancho, f.alto
            borde = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] +                     [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
            tocan = sum(1 for x, y in borde if f.leer(x, y)[3] and f.leer(x, y)[:3] != (27, 21, 34))
            if nombre.startswith('p_'):
                tocan = sum(1 for x in range(w) if f.leer(x, 0)[3])
            if tocan:
                malos.append('%s cuadro %d toca la orilla en %d pixeles sin contorno' % (nombre, i, tocan))
    for m in malos:
        print('OJO:', m)
    if not malos:
        print('OK: ningun dibujo se sale ni toca la orilla')


def main():
    t0 = time.time()
    os.makedirs(IMG, exist_ok=True)
    claro, frente, salas = mundo.hornear()
    claro.guardar(os.path.join(IMG, 'mundo.png'))
    frente.guardar(os.path.join(IMG, 'frente.png'))
    mundo.lejos().guardar(os.path.join(IMG, 'lejos.png'))
    mundo.cerca().guardar(os.path.join(IMG, 'cerca.png'))
    mundo.portal().guardar(os.path.join(IMG, 'portal.png'))
    print('ESCRITO: mundo, %.1f s' % (time.time() - t0))

    piezas = sprites.todo()
    revisar(piezas)
    hoja, rects = empacar(piezas)
    hoja.guardar(os.path.join(IMG, 'hoja.png'))
    print('ESCRITO: hoja %dx%d con %d piezas' % (hoja.ancho, hoja.alto, len(rects)))

    letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789-.,!?/%+() _:'
    fuente = {c: glifo(c) for c in letras}
    datos = {
        'mundo': {'ancho': mundo.W, 'alto': mundo.H, 'calle': mundo.CALLE, 'pisos': mundo.PISOS,
                  'techo': mundo.TECHO, 'azotea': mundo.TECHO - 10, 'pozo': mundo.POZO,
                  # tramos limpios de calle para repetir a los lados, de 66 y de 22 para que las rayas cuadren
                  # cada 22; el de la derecha va despues de la sucursal 2, que antes se repetia con su fibra
                  'tramos': [[0, 66], [mundo.W - 22, 22]], 'edificio': [mundo.BX0, mundo.BX1]},
        'salas': salas,
        'puntos': mundo.PUNTOS,
        'rutas': mundo.RUTAS,
        'rects': mundo.RECTS,
        'sprites': rects,
        'fuente': fuente,
    }
    with open(os.path.join(AQUI, 'datos.js'), 'w', encoding='utf-8') as fh:
        fh.write('// Generado por generar.py. No se edita a mano.\n')
        fh.write('window.DATOS = %s;\n' % json.dumps(datos, ensure_ascii=False, separators=(',', ':')))
    print('ESCRITO: datos.js, %.1f s en total' % (time.time() - t0))


if __name__ == '__main__':
    main()
