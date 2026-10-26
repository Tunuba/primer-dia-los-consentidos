import sys
from pincel import Lienzo, texto
import sprites
todo = sprites.todo()
pat = sys.argv[1] if len(sys.argv) > 1 else ''
items = [(k, v) for k, v in todo.items() if pat in k]
ancho = int(sys.argv[3]) if len(sys.argv) > 3 else 900
x = y = 4
fila = 0
pos = []
for k, frames in items:
    for i, f in enumerate(frames):
        if x + f.ancho + 4 > ancho:
            x = 4; y += fila + 14; fila = 0
        pos.append((f, x, y, k if i == 0 else ''))
        x += max(f.ancho, 6 * len(k[:14]) if i == 0 else 0) + 6
        fila = max(fila, f.alto)
alto = y + fila + 16
l = Lienzo(ancho, alto, (120, 140, 120, 255))
for f, x, y, k in pos:
    l.pegar(f, x, y + 10)
    if k:
        texto(l, x, y + 2, k[:14].upper(), (20, 20, 30, 255))
l.escalado(int(sys.argv[2]) if len(sys.argv) > 2 else 2).guardar('_vitrina.png')
print(len(items), l.tam)
