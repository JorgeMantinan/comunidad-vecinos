import { z } from 'zod';
import { communityIdSchema } from './communities';

export const incidentStatusSchema = z.enum(['open', 'in_progress', 'resolved']);
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;

export const createIncidentInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(150),
  description: z.string().trim().min(1, 'Describe la incidencia').max(5000),
});
export type CreateIncidentInput = z.infer<typeof createIncidentInputSchema>;

export const updateIncidentInputSchema = z.object({
  title: createIncidentInputSchema.shape.title.optional(),
  description: createIncidentInputSchema.shape.description.optional(),
  status: incidentStatusSchema.optional(),
});
export type UpdateIncidentInput = z.infer<typeof updateIncidentInputSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  description: z.string(),
  status: incidentStatusSchema,
  reportedByName: z.string().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type IncidentView = z.infer<typeof incidentSchema>;
