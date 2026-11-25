# Brief · Cierre (frames 92–104)

Acuerdos de la entrevista de diseño previa a la primera prueba en navegador.
Fuente visual: Figma, página «Tiger trafficking — Storyboard 2».

## Secuencia

| Frames | Qué pasa | Estado | Duración |
|---|---|---|---|
| 92 → 92_C | El texto del capítulo sube y sale sobre el fondo rojo fijo; «07.» se queda | scroll | ~90 vh |
| 92_D → 93 | El mapa aparece con un fundido de 0,5 s en su sitio; «07.» se va | ANIMATE | 0,5 s |
| 93 | Mapa explorable (tierra negra, sin rayas), fijado durante ~150 vh de scroll | HOLD · EXPLORE | lo decide el lector |
| 94–95 | El estallido nace centrado en la página y crece a saltos (~0,6 s) | ANIMATE | 0,6 s |
| 95 (quieto) | El estallido se queda completamente quieto 1 s; en su centro rojo aparece el tigre frontal y crece | ANIMATE | 1 s |
| 96–99 | Corte: desaparece el estallido; el tigre se abalanza hacia el lector (sin mover las patas) y vibra toda la pantalla | ANIMATE | ~0,7 s |
| 100 | Pantalla roja | ANIMATE | 0,5 s |
| 101–103 | El tigre de perfil entra de un salto en parábola, se posa en el centro y sale con otro salto; el cuerpo se inclina con la trayectoria; destapa la frase | ANIMATE | ~2,3 s |
| 104 | Frase completa; ~0,3 s después, Play again · Share | HOLD · READ | — |

Total: ~5,4 s (rebobinado al doble: ~2,7 s).

Tipografía de la frase: 82 px a 1440×900 (antes 100 px, −18 %), escala con el ancho y el alto de la ventana; 66 px a 440 px de ancho en móvil (antes 80 px).

## Disparo y scroll

- Un único umbral al final del mapa lanza los ~3 s seguidos. La animación va por tiempo; el scroll no mueve fotogramas.
- Scroll rápido hacia delante: escena fijada, la animación siempre termina y luego se libera. Sin bloqueo de scroll.
- Hacia atrás: rebobinado como un vídeo (los tigres corren hacia atrás) al doble de velocidad (~3 s). Primero se van los controles y luego el tigre vuelve a tapar la frase.
- Cambio de sentido a mitad: se invierte en el acto, con un margen de ~90 px de scroll para que no tartamudee.
- Cada vez que se cruza el umbral hacia abajo, el salto se ve completo.
- Al volver, el mapa conserva el país seleccionado, el encuadre y la tarjeta abierta.

## Mapa

- Escritorio: la rueda siempre mueve la página; países con hover y clic.
- Móvil: arrastre solo horizontal; el gesto vertical mueve la página. Se toca un país para abrir la tarjeta (se cierra con ✕). Leyenda como panel inferior plegable (93-map_1 / 93-map_2).
- Pista «Scroll down» (componente del frame 1, con la errata corregida): aparece al terminar la entrada del mapa y se oculta mientras el lector interactúa.
- Tabletas: horizontal = escritorio; vertical = móvil.

## Otros

- Tigres: recortable articulado (SVG por capas con pivotes) animado en ciclo de carrera.
- La frase es texto real en el HTML desde el principio; solo cambia su visibilidad (recorte).
- «Reducir movimiento»: fundidos (mapa → rojo → frase), sin tigres en movimiento.
- Tipografía de titulares: Archivo (peso 900, anchura 75 %), libre, en lugar de Helvetica Neue Condensed Black.

## Pendiente

- Cifras: `src/data/tiger-map-countries.csv`. Personas encarceladas: TRAFFIC 2000 – junio 2022 (la columna del storyboard 2000–2021 no tiene fuente primaria).
- Referencia de móvil: los diseños están a 440 px; se prueba también a 360 y 390 px.
- Menú: los enlaces de capítulo apuntan a anclas que aún no existen; «About the data», «Dashboard» y contacto pendientes.
- El resto de la pieza.
- Estilo de animación: primera versión «cómic» según la referencia (vídeo, 1:19–1:20): 12 dibujos por segundo, formas que vibran, esquirlas y estrellas, cortes secos. Pendiente de valorar.

## Criterios para evaluar la primera prueba

1. Explorar el mapa (clic, hover; en móvil tocar y arrastrar en horizontal) nunca dispara el salto.
2. El salto se dispara al cruzar el umbral, a ~150 vh del inicio del mapa.
3. Un flick fuerte o la inercia del trackpad no se saltan nada; la secuencia se ve completa (~3 s) y la página no parece congelada.
4. La frase nunca se ve a medias en reposo; está completa cuando la cola sale por la derecha; los controles aparecen ~0,3 s después.
5. Subiendo desde el 101: rebobinado de ~1,5 s hasta el mapa tal como estaba; al cambiar de sentido a mitad, se invierte sin tirones y no oscila con un scroll mínimo.
6. Bajar de nuevo repite el salto completo.
7. En móvil (440 px de referencia), el gesto vertical sobre el mapa siempre hace scroll de la página.
8. Con «reducir movimiento» no aparece ningún tigre en movimiento, solo fundidos.
9. Un lector de pantalla encuentra la frase en cualquier momento.
10. 60 fps en un portátil medio y en un móvil de gama media.
11. Subjetivo: ¿parece que el tigre corre?
