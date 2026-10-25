# Sistema de diseño y marca

## Paleta corporativa

Los tokens viven en `apps/web/src/styles.css` (Tailwind v4, `@theme`) y
son los únicos colores que usan los componentes: nunca se escriben
hexadecimales ni colores por defecto de Tailwind en los `.tsx`.

### Modo claro (por defecto)

| Token                | Hex       | Uso                                                         |
| --------------------- | --------- | ----------------------------------------------------------- |
| `--color-primary`     | `#8B0A2C` | Acciones principales, enlaces, cabeceras, énfasis de marca  |
| `--color-primary-soft`| `#AB4155` | Hover del botón primario y bordes suaves                    |
| `--color-accent`      | `#A8A1E0` | Acento secundario: bordes, gráficos, elementos destacados   |
| `--color-accent-soft` | `#DEDCF7` | Fondos suaves, selección, botones secundarios               |
| `--color-accent-strong`| `#C9C5F2`| Hover del botón secundario y de las filas                   |
| `--color-surface`     | `#EDEDF3` | Fondo base de la aplicación                                 |
| `--color-card`        | `#FFFFFF` | Tarjetas, cabecera y pie                                    |
| `--color-body`        | `#1E1519` | Texto principal                                             |
| `--color-muted`       | `#554C52` | Texto secundario                                            |
| `--color-subtle`      | `#6F6670` | Texto tenue (notas al pie de las tarjetas)                  |
| `--color-chip`        | `#E4E3EE` | Badges neutros                                              |
| `--color-on-primary`  | `#FFFFFF` | Texto sobre el primario                                     |

### Modo oscuro (`html.dark`)

| Token                | Hex       |
| -------------------- | --------- |
| `--color-primary`    | `#F97A97` |
| `--color-primary-soft`| `#FFA8BD` |
| `--color-accent`     | `#6F67B8` |
| `--color-accent-soft`| `#332C4D` |
| `--color-accent-strong`| `#262040`|
| `--color-surface`    | `#121016` |
| `--color-card`       | `#1C1922` |
| `--color-body`       | `#ECE8F2` |
| `--color-muted`      | `#B0A8BE` |
| `--color-subtle`     | `#8B8499` |
| `--color-chip`       | `#2E2A3A` |
| `--color-on-primary` | `#2A0209` |

### Estados (claro → oscuro)

| Token | Claro | Oscuro |
| ----- | ----- | ------ |
| `--color-success` / `--color-on-success` | `#DCFCF7` / `#166534` | `#12321F` / `#86EFAC` |
| `--color-warning` / `--color-on-warning` | `#FEF3C7` / `#92400E` | `#3A2C0D` / `#FCD34D` |
| `--color-danger` / `--color-on-danger`   | `#FEE2E2` / `#991B1B` | `#3A161C` / `#FCA5A5` |

## Cómo cambia el tema

-  `index.html` aplica el tema **antes del primer pintado** (sin
   parpadeo): lee `localStorage.theme` y, si no hay elección previa,
   respeta `prefers-color-scheme`.
-  El botón 🌙/☀️ de la cabecera alterna `html.dark` y guarda la
   elección en `localStorage`.
-  Como todo el estilo sale de los tokens, **no se usan clases
   `dark:`**: al cambiar `html.dark` cambian los colores de toda la
   interfaz a la vez.

## Reglas de uso

1.  El carmín `#8B0A2C` se reserva para acciones y jerarquía principal;
    no debe usarse en superficies grandes ni en texto corrido.
2.  El lila es decorativo/informativo: nunca comunica por sí solo
    estado crítico (usar siempre icono o texto acompañante).
3.  Todo par texto/fondo debe cumplir contraste **WCAG AA (4,5:1)** en
    **los dos temas**. Los pares de la paleta anterior están verificados
    (el mínimo es 4,84:1, texto tenue sobre tarjeta en oscuro).
4.  Los estados (error, éxito, aviso, información) se comunican con
    icono + texto, no solo con color.
5.  Prohibido usar hexadecimales o colores por defecto de Tailwind
    (`bg-white`, `text-neutral-*`, `bg-green-100`…) en componentes: se
    sustituyen por el token equivalente.
