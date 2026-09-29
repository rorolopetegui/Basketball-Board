# LBABoard

Tablero de básquet gratuito: una ventana de **mesa de control** para quien lleva el partido y una ventana de
**tablero** para mostrar en la TV o el proyector. Marcador, reloj de juego, reloj de posesión (24/14), cuartos
y tiempos extra, y faltas de equipo (reglas FIBA).

## Usarlo

1. Abrí `LBABoard.html` con doble clic (Chrome, Edge o Firefox). No necesita internet ni instalar nada.
2. Se abre la mesa de control. Tocá **Abrir tablero**: aparece la ventana del tablero.
3. Arrastrá el tablero a la TV (pantalla extendida) y hacé doble clic sobre él para verlo en pantalla completa.
4. Manejá el partido desde la mesa de control, con los botones o con el teclado:

| Tecla | Acción | Tecla | Acción |
|---|---|---|---|
| `Espacio` | iniciar / detener | | |
| `Z` | posesión a 24 | `X` | posesión a 14 |
| `Q` `W` `E` | local +1 / +2 / +3 | `U` `I` `O` | visita +1 / +2 / +3 |
| `A` | local −1 punto | `J` | visita −1 punto |
| `S` / `D` | falta local +1 / −1 | `K` / `L` | falta visita +1 / −1 |

Si se cierra o recarga la ventana a mitad de partido, no se pierde nada: el marcador y los relojes siguen
donde estaban.

## Desarrollo

Requiere Node 24 (`.nvmrc`).

```bash
npm ci
npm run dev        # servidor de desarrollo
npm test           # tests
npm run build      # genera dist/index.html (un solo archivo con todo adentro)
```

La especificación completa está en [`docs/SPEC.md`](docs/SPEC.md).
