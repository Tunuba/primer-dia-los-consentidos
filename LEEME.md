# Primer día en Los Consentidos

Presentación animada en pixel art de todo el proyecto ITIL de Distribuidora Los Consentidos, y la misma
oficina en vivo para la simulación con agentes.

Un empleado nuevo llega a la oficina y el Responsable de TI le enseña la empresa, los cuatro servicios, el
portal, la Mesa de Servicio, la IA que corre en local con Ollama, el escalado, la base de conocimiento,
problemas, cambios y la mejora continua. Todo lo que pasa sale del proyecto: los tickets 255, 256 y 258 de la
demo de la Entrega 5, lo que decidió el bot con `tev1:4b`, el problema 36 de las facturas con su error conocido
55, el cambio 70 y el Release 1.4.2, y el horario de cada servicio según su calendario en GLPI.

Los globos de diálogo no tienen palabras, solo líneas. Las palabras las ponen los que presentan, uno hace de
guía (A, camisa turquesa) y el otro de nuevo (B, camisa amarilla). Qué pasa en cada clic y qué conviene decir
está en `GUION.md`.

## Abrirla

Doble clic en `index.html`. Se abre en Edge o Chrome y no necesita internet ni servidor.

| Tecla | Hace |
|---|---|
| Espacio, flecha derecha, Enter o clic | siguiente paso |
| Flecha izquierda o clic en la orilla izquierda | vuelve al inicio del paso o de la escena |
| F | pantalla completa |
| M | quita o pone el sonido |
| H | esconde o muestra el título de abajo |
| Inicio | vuelve a la portada |

Si se aprieta mientras algo se está moviendo, lo apura y sigue con el siguiente paso.
Para abrir directo en una escena, `index.html?escena=12` (la de prender la IA).

## La oficina en vivo

`vivo.html` es el mismo edificio, pero lo mueven los eventos de los diez agentes de la simulación
(`simulacion/` del proyecto ITIL). Dentro del panel de la simulación (`simulacion/visor`, en
http://localhost:8098) ya sale en el centro, y el botón Oficina clásica vuelve al visor de antes. Sola,
`vivo.html?demo` repite una corrida grabada (`demo/corrida.js`).

- Cada ticket viaja como un paquete de luz por la red del edificio, de la computadora de quien reporta a GLPI,
  a la cola de la Mesa y a quien lo toma. Escalar, pedir un dato, resolver, aprobar, votar en el CAB e
  implementar un cambio se ven igual, con su recorrido.
- Si la corrida usa Ollama, la llama del laboratorio está despierta y cada texto que escribe un agente sale de
  ahí. Con Claude sale de la nube.
- Clic en un departamento y la cámara se acerca y dice quién trabaja ahí. En la vista general solo se ven los
  paquetes y las señales; los letreros con texto se ven al acercarse. Otro clic o Escape vuelve.
- La gente teclea si tiene tickets, suda si está saturada, se cansa al final del día, platica, se asoma a la
  ventana, y el Responsable baja a ver a su equipo. La hora del cielo y de los relojes es la de la corrida.

## Lo que se ve en el edificio

- Nadie aparece de la nada. La gente camina, afuera por la banqueta, sube el escalón de la puerta y cambia de
  piso en el elevador, que recoge por pisos como uno de verdad. El bus llega manejando y se va dando la vuelta.
- Los de bodega cargan los sacos al hombro, salen por el portón y suben por la rampa al camión. El montacargas
  deja la tarima en el piso. El vendedor va por el saco al estante y se lo da al cliente.
- Las caras cambian: parpadean, mueven la boca al hablar, se ponen contentas, sorprendidas, coloradas de estrés
  o pálidas de cansancio.
- Relojes con la hora del momento y una luz verde o roja junto al horario de cada servicio, abierto o cerrado.
- El ambiente se mueve solo: nubes, humo de los extractores y de la chimenea de la bodega, polvo en la luz de
  las lámparas, una araña que baja de su telaraña, la gotera del cuarto de máquinas, una lámpara que falla,
  plantas que se mecen, el ventilador del techo, el vapor de las tazas, hojas que caen, quetzales que vuelan
  y se posan en el letrero, y de noche polillas en la farola y luciérnagas.
- Los paneles con texto van a un tamaño fijo en la pantalla, se leen igual en todas las escenas y buscan solos
  un lugar donde no tapen un globo ni una cara.

## Cómo está hecha

Todo el pixel art sale de Python con el motor de `C:\Proyectos\PIXELES` (la gente de 32 px es la de
`gente_pixel.py`). El HTML solo mueve, anima y dibuja globos, partículas y textos.

- `generar.py` hornea todo y escribe `img/` y `datos.js`. Se corre con `python generar.py`, tarda unos 5
  segundos y necesita Pillow y la carpeta de PIXELES. Al final avisa si algún dibujo se sale de su lienzo o
  toca la orilla, porque eso se ve cortado.
- `mundo.py` el edificio en corte, las dos sucursales, la bodega, la calle, la red, los detalles (telarañas,
  manchas, extintores, escaleras, relojes, placas de horario) y la pantalla del portal.
- `sprites.py` la gente con sus caras, la llama de Ollama, la ballena de Docker, el perro, las gallinas, los
  quetzales, las plantas, los vehículos y lo demás.
- `pincel.py` la letra de 5x7 y lo común para dibujar.
- `js/motor.js` cámara, luces, hora del día, actores, globos, partículas, sonidos y los textos en pantalla.
- `js/comun.js` caminar, el elevador, la red de paquetes y las pantallas; lo usan la presentación y la oficina.
- `js/ambiente.js` lo que se mueve solo en el edificio.
- `js/guion.js` las 21 escenas de la presentación.
- `js/vivo.js` la oficina en vivo de la simulación.

## Cambiar algo

- Un globo de más o de menos, o quién lo dice, en `js/guion.js`: `di(A, 2)` es el guía con dos líneas,
  `di(B, 1)` el nuevo con una.
- Una sala, un mueble o un letrero, en `mundo.py`, y luego `python generar.py`.
- Un personaje o una cara, en `sprites.py`, y luego `python generar.py`.
- Textos de la pantalla sin dos puntos, punto y coma, comillas ni rayas.

Los archivos que empiezan con guion bajo (`_vitrina.py`, `_ver_mundo.py`) son para revisar los dibujos en
grande y no hacen falta para presentar.
