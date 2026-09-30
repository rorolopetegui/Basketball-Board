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
| `Espacio` | iniciar / detener el partido | `C` | pausar / reanudar solo la posesión |
| `Z` | posesión a 24 | `X` | posesión a 14 |
| `Q` `W` `E` | local +1 / +2 / +3 | `U` `I` `O` | visita +1 / +2 / +3 |
| `A` | local −1 punto | `J` | visita −1 punto |
| `S` / `D` | falta local +1 / −1 | `K` / `L` | falta visita +1 / −1 |

Si se cierra o recarga la ventana a mitad de partido, no se pierde nada: el marcador y los relojes siguen
donde estaban.

Detalles de reglas (FIBA): el reloj de posesión se apaga solo cuando queda menos tiempo de juego que de posesión;
cuando la posesión llega a 0 suena la chicharra (se puede silenciar con **Sonido**) y se detiene solo la
posesión: el reloj del partido sigue corriendo hasta que lo detengas (reloj corrido). **Detener** para los dos
relojes; **Pausar posesión** (o `C`) para solo el de posesión. Las faltas de equipo se ponen en rojo desde la 4.ª (la siguiente da tiros libres) y se reinician
en cada cuarto, salvo en el tiempo extra, que sigue contando las del 4.º cuarto.

## Publicarlo en internet (opcional, gratis)

- **GitHub Pages:** en el repositorio activá *Settings → Pages → Source: GitHub Actions*. El workflow
  `.github/workflows/ci.yml` prueba cada cambio en `main` y, con Pages activado, lo publica.
- **Vercel:** importá el repositorio; detecta Vite solo (build `npm run build`, carpeta `dist`).

## Desarrollo

Requiere Node 24 (`.nvmrc`).

```bash
npm ci
npm run dev        # servidor de desarrollo
npm test           # tests
npm run build      # genera dist/index.html (un solo archivo con todo adentro)
```

La especificación completa está en [`docs/SPEC.md`](docs/SPEC.md).
