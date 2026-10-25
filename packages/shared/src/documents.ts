import { z } from 'zod';
import { communityIdSchema } from './communities';

export const documentCategorySchema = z.enum([
  'contract',
  'invoice',
  'minutes',
  'report',
  'other',
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

/** Tipos admitidos en la documentación privada. */
export const allowedDocumentContentTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Fotografías de incidencias: solo imagen. */
export const allowedPhotoContentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Límite de archivo (3 MB decodificados; el body serverless admite 4.5 MB). */
export const MAX_FILE_BYTES = 3 * 1024 * 1024;

const contentBase64Schema = z
  .string()
  .min(1, 'El archivo está vacío')
  .max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 1024, 'El archivo supera 3 MB');

export const uploadDocumentInputSchema = z.object({
  title: z.string().trim().min(2, 'Indica un título').max(200),
  category: documentCategorySchema,
  contentType: z.enum(allowedDocumentContentTypes),
  contentBase64: contentBase64Schema,
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

export const uploadPhotoInputSchema = z.object({
  contentType: z.enum(allowedPhotoContentTypes),
  contentBase64: contentBase64Schema,
});
export type UploadPhotoInput = z.infer<typeof uploadPhotoInputSchema>;

export const documentSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  category: documentCategorySchema,
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  uploadedByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type DocumentView = z.infer<typeof documentSchema>;

/** Respuesta de descarga: URL firmada de corta duración. */
export const signedDownloadSchema = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int().positive(),
});

export const incidentPhotoSchema = z.object({
  id: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  uploadedByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type IncidentPhotoView = z.infer<typeof incidentPhotoSchema>;
