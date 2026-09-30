# LBABoard

Tablero de básquet gratuito: una ventana de **mesa de control** para quien lleva el partido y una ventana de
**tablero** para mostrar en la TV o el proyector. Marcador, reloj de juego, reloj de posesión (24/14), cuartos
y tiempos extra, y faltas de equipo (reglas FIBA).

No hay que instalar nada ni saber programar: es un solo archivo que se abre con el navegador y funciona sin
internet.

## Usarlo online

Abrí **https://rorolopetegui.github.io/LBABoard/** en Chrome, Edge o Firefox y listo. Una vez cargada, la página
sigue funcionando aunque se corte internet. El partido queda guardado solo en tu navegador.

## Descargarlo (para usarlo sin internet)

1. En esta página, tocá el botón verde **Code** y después **Download ZIP**.
2. Descomprimí el ZIP (clic derecho → *Extraer todo…*).
3. Adentro de la carpeta, abrí **`LBABoard.html`** con doble clic. Se abre en tu navegador (Chrome, Edge o
   Firefox).

¿Solo querés el archivo? Abrí [`LBABoard.html`](LBABoard.html) acá en GitHub y tocá el botón de descarga
(la flecha hacia abajo, *Download raw file*). Podés copiarlo a un pendrive o pasarlo por WhatsApp: con ese
archivo alcanza.

## Usarlo

1. Con la página abierta (el link o `LBABoard.html`) ves la **mesa de control**. Tocá **Abrir tablero**: aparece una segunda ventana
   con el tablero. (Si el navegador avisa que bloqueó una ventana emergente, tocá *Permitir*.)
2. Arrastrá la ventana del tablero a la TV o al proyector (pantalla extendida) y hacé doble clic sobre ella
   para verla en pantalla completa.
3. Manejá el partido desde la mesa de control, con los botones o con el teclado:

| Tecla | Acción | Tecla | Acción |
|---|---|---|---|
| `Espacio` | iniciar / detener el partido | `C` | pausar / reanudar solo la posesión |
| `Z` | posesión a 24 | `X` | posesión a 14 |
| `Q` `W` `E` | local +1 / +2 / +3 | `U` `I` `O` | visita +1 / +2 / +3 |
| `A` | local −1 punto | `J` | visita −1 punto |
| `S` / `D` | falta local +1 / −1 | `K` / `L` | falta visita +1 / −1 |

Para terminar, cerrá las dos ventanas: no queda nada abierto ni corriendo. Si se cierra o recarga una ventana
a mitad de partido, no se pierde nada: el marcador y los relojes siguen donde estaban. **Nuevo partido** lo
pone todo en cero (mantiene los nombres y colores de los equipos).

### Sincronizarlo con el reloj de la cancha

Para transmitir un partido cuyo reloj oficial está en la cancha:

- **Corregir el tiempo:** tocá el lápiz **✎** al lado del reloj del partido (o del de posesión), escribí el tiempo
  (`4:30`, `45` o `12.5`) y tocá **OK** o Enter. Funciona también con el reloj corriendo: sigue desde el valor
  nuevo.
- **Velocidad de los relojes** (abajo en la mesa de control): si el reloj de la cancha adelanta, subila con
  **+**; si atrasa, bajala con **−** (de a 0,5 %). Por ejemplo, si en un minuto la cancha marca 3 segundos de más,
  poné 105 %. **Normal** la vuelve a 100 %. El tablero usa la misma velocidad.

### Reglas (FIBA)

- **Reloj corrido:** cuando la posesión llega a 0 suena la chicharra y se detiene solo la posesión; el reloj del
  partido sigue corriendo hasta que lo detengas. **Detener** para los dos relojes; **Pausar posesión** (o `C`)
  para solo el de posesión.
- El reloj de posesión se apaga cuando queda menos tiempo de partido que de posesión.
- En el último minuto el reloj del partido muestra décimas.
- Las faltas de equipo se ponen en rojo desde la 4.ª (la siguiente da tiros libres) y vuelven a 0 en cada
  cuarto; en el tiempo extra siguen contando las del 4.º cuarto.
- La chicharra se puede silenciar con **Sonido**. Los minutos por cuarto y por tiempo extra se eligen abajo en
  la mesa de control.

## Para programadores

Hecho con React + TypeScript + Vite; el build es un único HTML con todo adentro. Requiere Node 24 (`.nvmrc`).

```bash
npm ci
npm run dev        # servidor de desarrollo
npm test           # tests
npm run release    # genera el build y actualiza LBABoard.html (hay que commitearlo)
```

El CI (`.github/workflows/ci.yml`) corre tests, lint y build en cada cambio en `main`, y falla si `LBABoard.html`
no coincide con el código, y publica el build en GitHub Pages (*Settings → Pages → Source: GitHub Actions*).
La especificación completa está en [`docs/SPEC.md`](docs/SPEC.md).
