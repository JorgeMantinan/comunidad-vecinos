import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it('arranca en claro y cambia a oscuro guardando la elección', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /Oscuro/ });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Claro/ })).toBeTruthy();
  });

  it('vuelve al claro y lo recuerda', () => {
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: /Claro/ }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('theme')).toBe('light');
  });
});
