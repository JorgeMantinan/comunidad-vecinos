import { z } from 'zod';
import { communityIdSchema } from './communities';
import { documentCategorySchema } from './documents';

/**
 * Plantilla de documento: modelo de texto (convocatoria, acta…). Su
 * generación crea un `.txt` en el almacén privado.
 */
export const createTemplateInputSchema = z.object({
  name: z.string().trim().min(2, 'Indica un nombre').max(150),
  category: documentCategorySchema,
  content: z.string().trim().min(1, 'El modelo no puede estar vacío').max(50_000),
});
export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

export const updateTemplateInputSchema = createTemplateInputSchema.partial();
export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;

export const documentTemplateSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  name: z.string(),
  category: documentCategorySchema,
  content: z.string(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type DocumentTemplateView = z.infer<typeof documentTemplateSchema>;

/** Título opcional al generar un documento desde la plantilla. */
export const generateDocumentInputSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
});
