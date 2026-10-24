# Sistema de diseño y marca

## Paleta corporativa

| Token               | Hex        | Uso                                                        |
| ------------------- | ---------- | ---------------------------------------------------------- |
| `--color-primary`   | `#A30B37`  | Acciones principales, enlaces, cabeceras, énfasis de marca |
| `--color-primary-soft` | `#BD6B73` | Hover, bordes suaves, variantes tonales del primario       |
| `--color-accent`    | `#BBB6DF`  | Acento secundario: badges, gráficos, elementos destacados  |
| `--color-accent-soft` | `#C6C8EE` | Fondos suaves, selección, alertas informativas             |
| `--color-surface`   | `#FCFCFF`  | Fondo base de la aplicación                                |

## Escala semántica derivada

La aplicación usa variables CSS semánticas, de modo que el mismo token
puede adaptarse a modo claro/oscuro sin tocar los componentes:

| Token semántico   | Uso                                              |
| ----------------- | ------------------------------------------------ |
| `--background`    | Fondo general (`#FCFCFF`)                        |
| `--foreground`    | Texto principal                                  |
| `--primary`       | Acciones primarias (`#A30B37`)                   |
| `--primary-foreground` | Texto sobre primario (blanco)               |
| `--accent`        | Acentos y elementos destacados (`#BBB6DF`)       |
| `--muted`         | Fondos neutros y elementos secundarios           |
| `--destructive`   | Errores y acciones destructivas                  |
| `--border`        | Bordes de componentes                            |

## Reglas de uso

1.  El carmín `#A30B37` se reserva para acciones y jerarquía principal;
    no debe usarse en superficies grandes ni en texto corrido.
2.  El lila `#BBB6DF` es decorativo/informativo: nunca comunica por sí
    solo estado crítico (usar siempre icono o texto acompañante).
3.  Todo par texto/fondo debe cumplir contraste WCAG AA (4.5:1 en texto
    normal). Verificar especialmente `#A30B37` sobre `#FCFCFF` y texto
    oscuro sobre `#C6C8EE`.
4.  Los estados (error, éxito, aviso, información) se comunican con
    icono + texto, no solo con color.
