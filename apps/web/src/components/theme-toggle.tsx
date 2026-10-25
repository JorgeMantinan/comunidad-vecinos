import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** Tema vigente: lo decide index.html antes del primer pintado. */
function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Almacenamiento no disponible (modo privado): el tema dura esta sesión.
  }
}

/**
 * Conmutador claro/oscuro. El cambio es instantáneo sobre `html.dark`
 * y queda recordado; sin elección previa se respeta el sistema.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (
        event.key === STORAGE_KEY &&
        (event.newValue === 'light' || event.newValue === 'dark')
      ) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-pressed={theme === 'dark'}
      title={next === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      className="flex items-center gap-2 rounded-lg border border-accent-soft bg-card px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent-strong"
    >
      <span aria-hidden="true">{next === 'dark' ? '🌙' : '☀️'}</span>
      {next === 'dark' ? 'Oscuro' : 'Claro'}
    </button>
  );
}
