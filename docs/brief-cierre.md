# Brief · Cierre (frames 93–101)

Acuerdos de la entrevista de diseño previa a la primera prueba en navegador.
Fuente visual: Figma, página «Tiger trafficking — Storyboard 2».

## Secuencia

| Frames | Qué pasa | Estado | Duración |
|---|---|---|---|
| 93 | Mapa explorable, fijado durante ~150 vh de scroll | HOLD · EXPLORE | lo decide el lector |
| 94–97 | El tigre frontal corre hacia cámara (se acerca, no se escala) y se desvanece | ANIMATE | ~3 s |
| — | Pantalla roja | ANIMATE | ~1 s |
| 98–100 | El tigre de perfil cruza de izquierda a derecha y destapa la frase desde detrás | ANIMATE | ~2 s |
| 101 | Frase completa; ~0,5 s después, compartir · créditos · volver al inicio (+ menú, sin diseñar) | HOLD · READ | — |

## Disparo y scroll

- Un único umbral al final del mapa lanza los ~6 s seguidos. La animación va por tiempo; el scroll no mueve fotogramas.
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

- **Cifras sin contrastar con las fuentes originales** (`src/data/countries.ts`, `VERIFIED = false`).
- PDF del storyboard: no recibido.
- Menú y controles del 101 sin diseñar (marcadores de posición).
- Entrada al mapa (92 → 93) y el resto de la pieza.
- Decoración de rayas dentro del mapa: aproximada; falta el SVG original.

## Criterios para evaluar la primera prueba

1. Explorar el mapa (clic, hover; en móvil tocar y arrastrar en horizontal) nunca dispara el salto.
2. El salto se dispara al cruzar el umbral, a ~150 vh del inicio del mapa.
3. Un flick fuerte o la inercia del trackpad no se saltan nada; la secuencia se ve completa (~6 s) y la página no parece congelada.
4. La frase nunca se ve a medias en reposo; está completa cuando la cola sale por la derecha; los controles aparecen ~0,5 s después.
5. Subiendo desde el 101: rebobinado de ~3 s hasta el mapa tal como estaba; al cambiar de sentido a mitad, se invierte sin tirones y no oscila con un scroll mínimo.
6. Bajar de nuevo repite el salto completo.
7. En móvil (440 px de referencia), el gesto vertical sobre el mapa siempre hace scroll de la página.
8. Con «reducir movimiento» no aparece ningún tigre en movimiento, solo fundidos.
9. Un lector de pantalla encuentra la frase en cualquier momento.
10. 60 fps en un portátil medio y en un móvil de gama media.
11. Subjetivo: ¿parece que el tigre corre?
