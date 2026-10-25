import { describe, expect, it } from 'vitest';
import { zoneMatches } from './zone';

describe('zoneMatches (publicidad por cercanía)', () => {
  it('empareja la ciudad aunque cambien mayúsculas y acentos', () => {
    expect(zoneMatches('Valencia', 'Avenida de las Acacias 27, 46010 Valencia')).toBe(
      true,
    );
    expect(zoneMatches('VALENCIA', 'Avenida de las Acacias 27, valencia')).toBe(true);
    expect(zoneMatches('sevilla', 'Camino del Pinar 4, Sevilla')).toBe(true);
  });

  it('acepta varias zonas separadas por coma y empareja cualquiera', () => {
    const zone = 'Madrid, Sevilla';
    expect(zoneMatches(zone, 'Calle Mayor 12, 28013 Madrid')).toBe(true);
    expect(zoneMatches(zone, 'Camino del Pinar 4, Sevilla')).toBe(true);
    expect(zoneMatches(zone, 'Avenida de las Acacias 27, Valencia')).toBe(false);
  });

  it('no empareja partes demasiado cortas ni sin zona o dirección', () => {
    expect(zoneMatches('la, Madrid', 'Calle Mayor 12, Madrid')).toBe(true);
    // «la» se ignora por corta: solo cuenta Madrid.
    expect(zoneMatches('la', 'Calle de la Palma 3, Madrid')).toBe(false);
    expect(zoneMatches(null, 'Calle Mayor 12, Madrid')).toBe(false);
    expect(zoneMatches('Madrid', null)).toBe(false);
    expect(zoneMatches('', 'Calle Mayor 12, Madrid')).toBe(false);
  });

  it('no hace coincidencias difusas: distinta grafía no empareja', () => {
    // Documenta el límite: sin geocodificador, «Ruzafa» != «Rusafa».
    expect(zoneMatches('Ruzafa', 'Carrer de Sueca 10, Rusafa Valencia')).toBe(false);
  });
});
