/**
 * Iconos en SVG con trazo (sin relleno). Heredan `currentColor`, se
 * escalan con `className` y quedan igual en todas las plataformas: los
 * caracteres «←»/«→» cambian de aspecto según la fuente del sistema.
 */
interface IconProps {
  className?: string;
}

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

/** Flecha a la izquierda: «volver» en los enlaces de cabecera. */
export function ArrowLeftIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

/** Flecha a la derecha: rangos (fechas) y avance. */
export function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Flecha hacia arriba: «volver arriba» en páginas largas. */
export function ArrowUpIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
