# Brief · Cierre (frames 93–104)

Acuerdos de la entrevista de diseño previa a la primera prueba en navegador.
Fuente visual: Figma, página «Tiger trafficking — Storyboard 2».

## Secuencia

| Frames | Qué pasa | Estado | Duración |
|---|---|---|---|
| 93 | Mapa explorable, fijado durante ~150 vh de scroll. Entra subiendo con el scroll y con un fundido de 0,5 s | HOLD · EXPLORE | lo decide el lector |
| 94–99 | Estallido (estrella negro / amarillo / rojo) y tigre frontal que atraviesa la cámara; en 99 casi solo queda rojo | ANIMATE | ~1,2 s |
| 100 | Pantalla roja | ANIMATE | ~0,25 s |
| 101–103 | El tigre de perfil cruza al galope y destapa la frase; sale de la pantalla | ANIMATE | 1 s |
| 104 | Frase completa; ~0,3 s después, compartir · créditos · volver al inicio (+ menú, sin diseñar) | HOLD · READ | — |

Total: ~3 s (rebobinado al doble: ~1,5 s).

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

- **Cifras sin contrastar con las fuentes originales** (`src/data/countries.ts`, `VERIFIED = false`).
- Referencia de móvil: los diseños están a 440 px; se prueba también a 360 y 390 px.
- Menú y controles del 101 sin diseñar (marcadores de posición).
- Entrada al mapa (92 → 93) y el resto de la pieza.
- Decoración de rayas dentro del mapa: aproximada; falta el SVG original.

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
