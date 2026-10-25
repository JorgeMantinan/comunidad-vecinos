import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { LegalIndexPage, PrivacyPage, RightsPage } from './legal';

const renderPage = (page: ReactElement) => render(<MemoryRouter>{page}</MemoryRouter>);

const hrefOf = (name: RegExp): string | null =>
  screen.getByRole('link', { name }).getAttribute('href');

describe('Avisos legales', () => {
  afterEach(cleanup);

  it('lista los tres avisos con su destino', () => {
    renderPage(<LegalIndexPage />);
    expect(hrefOf(/Política de privacidad/)).toBe('/legal/privacidad');
    expect(hrefOf(/Tus derechos/)).toBe('/legal/derechos');
    expect(hrefOf(/Cookies/)).toBe('/legal/cookies');
  });

  it('explica qué datos se tratan y enlaza al índice', () => {
    renderPage(<PrivacyPage />);
    expect(
      screen.getByRole('heading', { name: 'Política de privacidad' }),
    ).toBeTruthy();
    expect(screen.getByText(/No hay perfiles automáticos/)).toBeTruthy();
    expect(hrefOf(/Volver a avisos legales/)).toBe('/legal');
  });

  it('detalla los derechos ARSUL y la vía de reclamación', () => {
    renderPage(<RightsPage />);
    expect(screen.getByRole('heading', { name: 'Tus derechos' })).toBeTruthy();
    expect(screen.getByText(/Portabilidad/)).toBeTruthy();
    expect(hrefOf(/www\.aepd\.es/)).toBe('https://www.aepd.es');
  });
});
