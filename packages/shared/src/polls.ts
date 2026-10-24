import { z } from 'zod';
import { communityIdSchema } from './communities';

export const pollStatusSchema = z.enum(['open', 'closed']);
export type PollStatus = z.infer<typeof pollStatusSchema>;

export const createPollInputSchema = z
  .object({
    question: z.string().trim().min(3, 'Formula la pregunta').max(300),
    options: z
      .array(z.string().trim().min(1).max(200))
      .min(2, 'Las encuestas necesitan al menos 2 opciones')
      .max(10),
    closesOn: z.iso.datetime().nullish(),
  })
  .refine((input) => new Set(input.options).size === input.options.length, {
    message: 'Las opciones deben ser distintas',
  });
export type CreatePollInput = z.infer<typeof createPollInputSchema>;

export const votePollInputSchema = z.object({
  optionId: z.string().min(1),
});

export const pollOptionResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  position: z.number().int(),
  votes: z.number().int().min(0),
});
export type PollOptionResult = z.infer<typeof pollOptionResultSchema>;

export const pollSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  question: z.string(),
  status: pollStatusSchema,
  closesOn: z.iso.datetime().nullable(),
  totalVotes: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});
export type PollView = z.infer<typeof pollSchema>;

export const pollDetailSchema = pollSchema.extend({
  options: z.array(pollOptionResultSchema),
  /** Opción elegida por el usuario actual (null si no ha votado). */
  myVoteOptionId: z.string().nullable(),
});
export type PollDetailView = z.infer<typeof pollDetailSchema>;

/**
 * Las encuestas son informales: nunca constituyen un acuerdo
 * vinculante de la comunidad (regla de negocio del roadmap).
 */
export const POLL_NON_BINDING_NOTE =
  'Encuesta informal: su resultado no constituye un acuerdo vinculante.';
