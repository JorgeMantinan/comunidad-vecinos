import { useEffect, useState } from 'react';
import { ArrowUpIcon } from './icons';

/** A partir de cuánto píxeles de scroll aparece el botón. */
const THRESHOLD = 600;

/**
 * «Volver arriba» para páginas largas (secciones con varias tarjetas).
 * Aparece solo al haber scroll real y respeta la preferencia del
 * sistema de reducir movimiento.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      title="Volver arriba"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
      }
      className="fixed bottom-24 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent bg-card text-primary shadow-lg transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:right-6"
    >
      <ArrowUpIcon className="h-5 w-5" />
    </button>
  );
}
