import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackToTop } from './back-to-top';

describe('BackToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('no aparece mientras no haya scroll', () => {
    render(<BackToTop />);
    expect(screen.queryByRole('button', { name: 'Volver arriba' })).toBeNull();
  });

  it('aparece al pasar el umbral y vuelve arriba al pulsarlo', () => {
    render(<BackToTop />);

    Object.defineProperty(window, 'scrollY', {
      value: 800,
      configurable: true,
      writable: true,
    });
    fireEvent(window, new Event('scroll'));

    const button = screen.getByRole('button', { name: 'Volver arriba' });
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('usa scroll instantáneo si el sistema pide reducir el movimiento', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({ matches: query.includes('reduce') }),
      configurable: true,
      writable: true,
    });

    render(<BackToTop />);
    Object.defineProperty(window, 'scrollY', {
      value: 1200,
      configurable: true,
      writable: true,
    });
    fireEvent(window, new Event('scroll'));
    fireEvent.click(screen.getByRole('button', { name: 'Volver arriba' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
