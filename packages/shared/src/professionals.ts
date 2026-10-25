import { z } from 'zod';
import { communityIdSchema } from './communities';

/**
 * Profesional recomendado por la comunidad (recomendación vecinal).
 * Los patrocinios identificados llegarán en la Fase 5 como entidad
 * separada: nunca deben mezclarse con estas recomendaciones.
 */
export const createProfessionalInputSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre').max(150),
  trade: z.string().trim().min(2, 'Indica el oficio o especialidad').max(120),
  phone: z.string().trim().max(30).nullish(),
  email: z.email('Email inválido').nullish().or(z.literal('')),
  notes: z.string().trim().max(2000).nullish(),
});
export type CreateProfessionalInput = z.infer<typeof createProfessionalInputSchema>;

export const updateProfessionalInputSchema = createProfessionalInputSchema.partial();
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalInputSchema>;

export const professionalSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  name: z.string(),
  trade: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type ProfessionalView = z.infer<typeof professionalSchema>;
