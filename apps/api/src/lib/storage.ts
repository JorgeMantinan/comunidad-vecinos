import {
  del,
  issueSignedToken,
  list as listBlobs,
  presignUrl,
  put,
} from '@vercel/blob';
import { serviceUnavailable } from './errors';

/**
 * Puerto de almacenamiento de objetos. Los binarios nunca viven en la
 * base de datos; las descargas siempre pasan por URLs firmadas de
 * corta duración (ver `docs/privacy-and-retention.md`).
 */
export interface StoragePort {
  put: (
    key: string,
    body: Buffer,
    contentType: string,
  ) => Promise<{ key: string; size: number }>;
  getSignedUrl: (key: string, validForMs?: number) => Promise<string>;
  delete: (key: string) => Promise<void>;
  /** Claves de un prefijo (para rotar copias de seguridad). */
  list: (prefix: string) => Promise<Array<{ key: string; uploadedAt: string }>>;
}

/** Validez de las URLs de descarga: 10 minutos. */
export const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

/** true si hay credenciales de Blob (token estático u OIDC en Vercel). */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ??
    process.env.VERCEL_OIDC_TOKEN ??
    process.env.BLOB_STORE_ID,
  );
}

/** Adaptador de Vercel Blob (almacén privado `mantivecinos`). */
export function createBlobStorage(): StoragePort {
  // El adaptador exige credenciales; los servicios no conocen el entorno.
  const requireConfig = (): void => {
    if (!isStorageConfigured()) {
      throw serviceUnavailable(
        'Almacenamiento no configurado: falta BLOB_READ_WRITE_TOKEN',
      );
    }
  };

  return {
    async put(key, body, contentType) {
      requireConfig();
      const blob = await put(key, body, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return { key: blob.pathname, size: body.byteLength };
    },

    async getSignedUrl(key, validForMs = SIGNED_URL_TTL_MS) {
      requireConfig();
      const validUntil = Date.now() + validForMs;
      const token = await issueSignedToken({
        pathname: key,
        operations: ['get'],
        validUntil,
      });
      const { presignedUrl } = await presignUrl(token, {
        operation: 'get',
        pathname: key,
        validUntil,
        access: 'private',
      });
      return presignedUrl;
    },

    async delete(key) {
      requireConfig();
      await del(key);
    },

    async list(prefix) {
      requireConfig();
      const { blobs } = await listBlobs({ prefix, limit: 1000 });
      return blobs.map((blob) => ({
        key: blob.pathname,
        uploadedAt: blob.uploadedAt.toISOString(),
      }));
    },
  };
}

/**
 * Almacenamiento en memoria para tests: sin red y con aserciones
 * sobre lo guardado/borrado.
 */
export class InMemoryStorage implements StoragePort {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  private readonly stamps = new Map<string, string>();

  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; size: number }> {
    if (this.objects.has(key)) {
      throw new Error(`Clave ya existente: ${key}`);
    }
    this.objects.set(key, { body, contentType });
    this.stamps.set(key, new Date().toISOString());
    return { key, size: body.byteLength };
  }

  async getSignedUrl(key: string, validForMs = SIGNED_URL_TTL_MS): Promise<string> {
    if (!this.objects.has(key)) {
      throw new Error(`Clave no encontrada: ${key}`);
    }
    return `https://storage.test/signed/${encodeURIComponent(key)}?expires=${Date.now() + validForMs}`;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.stamps.delete(key);
  }

  async list(prefix: string): Promise<Array<{ key: string; uploadedAt: string }>> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .map((key) => ({
        key,
        uploadedAt: this.stamps.get(key) ?? new Date(0).toISOString(),
      }));
  }
}
