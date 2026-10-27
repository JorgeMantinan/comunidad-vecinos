import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('exige AUTH_SECRET en producción', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://web.vercel.app' }),
    ).toThrow(/AUTH_SECRET/);
  });

  it('usa un secreto de desarrollo con aviso fuera de producción', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.authSecret).toBeTruthy();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('lee DATABASE_URL, puerto y orígenes CORS', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://usuario:clave@host/base',
      PORT: '4000',
      CORS_ORIGIN: 'https://a.vercel.app, https://b.vercel.app',
    });

    expect(config.databaseUrl).toBe('postgresql://usuario:clave@host/base');
    expect(config.port).toBe(4000);
    expect(config.corsOrigins).toEqual([
      'https://a.vercel.app',
      'https://b.vercel.app',
    ]);
  });

  it('rechaza valores inválidos con un mensaje legible', () => {
    expect(() => loadConfig({ NODE_ENV: 'test', PORT: 'no-numero' })).toThrow(
      /Configuración inválida/,
    );
  });

  it('las variables vacías cuentan como no definidas', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      BETTER_AUTH_URL: '',
    });

    expect(config.google).toBeUndefined();
    expect(config.authBaseUrl).toBeUndefined();
  });

  it('lee las credenciales de Google y la URL pública de Better Auth', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'id-de-google',
      GOOGLE_CLIENT_SECRET: 'secreto-de-google',
      BETTER_AUTH_URL: 'https://mantivecinos.vercel.app',
    });

    expect(config.google).toEqual({
      clientId: 'id-de-google',
      clientSecret: 'secreto-de-google',
    });
    expect(config.authBaseUrl).toBe('https://mantivecinos.vercel.app');
  });
});
