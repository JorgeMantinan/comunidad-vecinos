import { z } from 'zod';
import { communityIdSchema } from './communities';

export const createAnnouncementInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(150),
  body: z.string().trim().min(1, 'El aviso no puede estar vacío').max(5000),
  /** Caducidad opcional (ISO 8601). */
  expiresAt: z.iso.datetime().nullish(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementInputSchema>;

export const updateAnnouncementInputSchema = createAnnouncementInputSchema.partial();
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementInputSchema>;

export const announcementSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  body: z.string(),
  authorName: z.string().nullable(),
  publishedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
});
export type AnnouncementView = z.infer<typeof announcementSchema>;
