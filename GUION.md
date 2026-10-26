# Guion para presentar

Uno hace de **A, el Responsable de TI**, que guía (camisa turquesa), y el otro de **B, el nuevo** (camisa amarilla).
Cada clic hace una cosa y casi siempre termina en un globo. La franja de color del globo dice quién habla,
turquesa A, amarillo B, y otros colores para la gente de la oficina. Si habla alguien que no es A ni B, lo dice
cualquiera de los dos con otra voz.

Todo lo que pasa es lo que tiene el proyecto. Los tres tickets son los de la demo de la Entrega 5 en
glpi.huellagames.com, lo que decide la IA es lo que dio `tev1:4b` con esos textos (`escalado-ia/datos/lista-bot.json`),
y el problema es el 36 de las facturas, con su error conocido 55, el cambio 70 y el Release 1.4.2 de ventas.

TI son cinco personas, como en el proyecto. A es el Responsable de TI, los dos de diadema son los Técnicos de
Soporte de la Mesa de Servicio (nivel 1), el de azul en el piso 2 es el Analista de Aplicaciones (Sistemas y
Aplicaciones, nivel 2) y la del piso 3 es la Analista de Datos (Coordinación, nivel 3).

Nadie aparece de la nada. Entre escenas la gente camina y toma el elevador, y los tickets viajan como paquetes
de luz por la red del edificio, la bandeja azul del techo, el ducto de la pared y el cable de cada computadora.
Las dos sucursales están a los lados del edificio, unidas por su enlace bajo tierra. Junto a cada servicio está
su horario con una luz verde si a esa hora está abierto.

## 1. Distribuidora Los Consentidos
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Cae el título, amanece | nadie | Presentar el proyecto y la empresa |
| 2 | Llega la camioneta, el nuevo se baja y camina a la puerta, la camioneta da la vuelta y se va | B | Hoy empiezo en TI |
| 3 | La cámara sube al letrero y regresa | B | Distribuidora de concentrado para animales |

## 2. El primer día
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | A prende la luz y se acerca, sale Responsable de TI | A | Bienvenida |
| 2 | | B | Qué hace TI aquí |
| 3 | Le da el gafete | A | Te enseño todo |
| 4 | Entra el perro desde la calle | B | Reacción al perro |
| 5 | | A | Vámonos |

## 3. Sesenta personas y cuatro áreas
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Se prenden las salas, contador de colaboradores | A | 60 personas, bodega central y 2 sucursales |
| 2 | Comercial 16 | A | Venden y atienden |
| 3 | Operaciones y Logística 34 | B | Bodega, despacho, pilotos |
| 4 | Administración y Finanzas 5 | A | Usan ventas e inventario para el cierre |
| 5 | TI 5 | A | Somos cinco, la Mesa son los dos técnicos |
| 6 | | B | Y el sótano |

## 4 a 7. Los cuatro servicios
| Escena | Lo que se ve | Idea |
|---|---|---|
| 4 Inventario | Ficha SRV-01, el montacargas deja una tarima con 3 sacos y el contador dice ENTRADA +3, la gallina, y el valor del inventario viaja a Finanzas | Cuenta cada saco, 39 usuarios, lunes a sábado 5 a 18 h, Finanzas lo usa al cierre |
| 5 Ventas | El cliente entra de la calle, paga, le dan factura, el vendedor va por el saco al estante, y la factura viaja a Finanzas | Vender, cobrar, facturar, 21 usuarios, lunes a sábado 6 a 18 h |
| 6 Pedidos | El pedido viaja de Ventas a Despacho y a la Bodega, los de bodega suben los sacos al hombro por la rampa (SALIDA -4) y el camión sale | El que más se usa, 50 usuarios, lunes a sábado 5 a 18 h |
| 7 Rastreo | Camioncitos en el mapa, uno llega y dice ENTREGADO | 5 camiones y 2 paneles con GPS, lunes a sábado 5 a 19 h |

## 8. Todo vive en la nube
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Caen los 3 servidores de Amazon Web Services | A | Aplicación, base de datos y almacenamiento |
| 2 | | B | Y si se cae algo |
| 3 | La constelación de la CMDB | A | 44 elementos y 37 relaciones |
| 4 | Un elemento se pone rojo y todo lo que cuelga de él | B | Se sabe a quién afecta |

## 9. La factura sale mal (ticket 258)
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | La factura de mayoreo sale con precio de lista, ya van 5 | vendedor | No sale el precio de mayoreo |
| 2 | | B | Y ahora |
| 3 | | A | No se llama, se reporta en el portal |

## 10. El portal de autoservicio
| Clic | Pasa | Idea |
|---|---|---|
| 1 | Algo no funciona, el formulario Mesa de Servicio se llena solo con las respuestas reales del 258 | Servicio, qué pasa, a quién afecta, desde cuándo |
| 2 | Enviar, TICKET 258 CREADO | Le avisan cada avance |

## 11. El ticket 258 viaja a GLPI
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | El paquete baja por la red hasta GLPI, regla 08 lo deja en la Mesa | A | Todo entra a la Mesa de Servicio |
| 2 | GLPI avisa al bot por webhook, la ballena es el bot en Docker en la PC de José David | B | Qué es la ballena |
| 3 | | A | El bot le pregunta a la IA |

## 12. A prender la IA
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Laboratorio a oscuras, la llama duerme | A | Aquí vive la IA |
| 2 | | B | Cómo se prende |
| 3 | **B jala la palanca**, despierta la llama, sale Ollama con tev1 4b en la RTX 5050 | B grita | El gran momento |
| 4 | | llama | Con voz de robot |
| 5 | Sale el túnel ia-itil.ledkid.com | A | El bot de José David llega a la laptop de Meme por el túnel |

## 13. La IA decide el nivel
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | El 258 va de la ballena a la llama por el túnel | A | Le pasa el ticket y la lista de artículos |
| 2 | El medidor llega a 96 %, criterio E2 datos incorrectos, umbral 60 %, artículo 69 | B | Sube solo si pasa de 60 |
| 3 | La decisión vuelve, el bot deja su nota privada en GLPI, escalado automático al nivel 2 | A | Nadie lo escaló a mano |

## 14. Nivel 2, Sistemas y Aplicaciones
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | El 258 llega a Sistemas, la lista de precios de mayoreo venció el 15 de octubre | sistemas | Encontré la causa |
| 2 | Se extiende la vigencia, Finanzas anula y vuelve a emitir las 5 facturas | sistemas | Listo |
| 3 | Ventas vuelve a facturar bien, encuesta 5, lo arreglaron el mismo día | B | |

## 15. Nivel 1, la Mesa de Servicio (ticket 255)
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | La encargada de la Sucursal 1 reporta, el ticket viaja bajo tierra a GLPI, la IA da Q2 con 0.4 %, se queda en la Mesa, artículo 23 | A | Lo sencillo no sube |
| 2 | El técnico lo toma, reloj de 1 h para tomar y 8 para resolver | técnico | Yo lo tomo |
| 3 | El artículo 23 que sugirió el bot llega por la red | técnico | Ya sé qué hacer |
| 4 | La clave temporal viaja a la Sucursal 1, la encargada se alegra, resuelto sin escalar | B | Así de rápido |
| 5 | Encuesta 5, rápido | A | |

## 16. Nivel 3, Coordinación (ticket 256)
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | El kardex da Error 500, la IA E3 al 90 % lo sube a Sistemas, la vista es de SRV-BD-01 | sistemas | No es mío |
| 2 | Sistemas lo escala a Coordinación, nunca el bot | datos | La base es mía |
| 3 | Faltaba un permiso de lectura, se devolvió | B | |
| 4 | | A | Cada nivel sabe más |

## 17. Base de conocimiento
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | | A | Todo se escribe |
| 2 | Vuelan los libros hasta 95 artículos, una sección por cada una de las 42 hojas | B | |
| 3 | El bot sugiere artículo en 95 % de los incidentes y calla si no hay uno que sirva | B | Aprendí algo |

## 18. Problemas y errores conocidos
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Se clavan los tickets 268, 270 y 271, la misma falla tres días seguidos | A | Esto se repite |
| 2 | Hilos al problema 36, causa raíz con cinco porqués, la app espera 10 s y no reintenta, el certificador tarda hasta 30 | sistemas | La causa |
| 3 | Error conocido 55, el 272 lo resuelve la Mesa reenviando la factura | B | Mientras tanto ya sabemos qué hacer |

## 19. El cambio 70 pasa por el CAB
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Cambio normal 70, esperar 45 s y reintentar 3 veces | A | La corrección de fondo |
| 2 | Los dos técnicos, Aplicaciones y Datos votan a favor | sistemas | Lo propongo y lo ejecuto |
| 3 | **APROBADO** por el Responsable, ventana del domingo 11 | B grita | |
| 4 | Aplicaciones trae el Release 1.4.2, se instala en la bodega central y en cada sucursal, se cierra el problema 36 | A | |

## 20. Mejora continua
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | Suben las barras, plugin Mejora continua, 27 indicadores medidos sobre GLPI | A | Los números salen de GLPI |
| 2 | Gira la rueda PHVA | B | Planear, hacer, verificar, actuar |
| 3 | Registro CSI con 7 oportunidades | A | |

## 21. Bienvenido al equipo
| Clic | Pasa | Habla | Idea |
|---|---|---|---|
| 1 | B se pone la camisa de TI | A | Ya eres de la Mesa |
| 2 | | B | Gracias |
| 3 | El equipo baja en el elevador con sus nombres y sus roles | nadie | José David, cambios y releases. Juan Pablo, estrategia, conocimiento y mejora continua. José Manuel, incidentes y problemas |
| 4 | Se aleja la cámara, atardece, fuegos, GRACIAS | nadie | Preguntas |
