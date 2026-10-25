import { z } from 'zod';
import { communityIdSchema } from './communities';
import { decimalAmountSchema } from './expenses';

export const sponsorshipStatusSchema = z.enum(['pending', 'active', 'ended']);
export type SponsorshipStatus = z.infer<typeof sponsorshipStatusSchema>;

export const createSponsorshipInputSchema = z.object({
  businessName: z.string().trim().min(2, 'Indica el nombre').max(150),
  // Solo http(s): bloquea `javascript:` y demás esquemas peligrosos.
  website: z
    .url('URL inválida')
    .refine(
      (value) => value.startsWith('http://') || value.startsWith('https://'),
      'La web debe empezar por http:// o https://',
    )
    .nullish()
    .or(z.literal('')),
  contactEmail: z.email('Email inválido').nullish().or(z.literal('')),
  /**
   * Zona del anunciante (ciudad o barrio). El servidor la compara con la
   * dirección de la finca para mostrar la publicidad por cercanía; no es
   * geolocalización ni comparte datos de vecinos con el anunciante.
   */
  zone: z.string().trim().max(120, 'Zona demasiado larga').nullish().or(z.literal('')),
  monthlyAmount: decimalAmountSchema.nullish().or(z.literal('')),
  notes: z.string().trim().max(1000).nullish(),
  /** Comunidades donde se muestra la publicidad. */
  communityIds: z.array(communityIdSchema).min(1, 'Asigna al menos una comunidad'),
});
export type CreateSponsorshipInput = z.infer<typeof createSponsorshipInputSchema>;

export const updateSponsorshipInputSchema = createSponsorshipInputSchema
  .partial()
  .extend({ status: sponsorshipStatusSchema.optional() });
export type UpdateSponsorshipInput = z.infer<typeof updateSponsorshipInputSchema>;

/** Vista completa para la gestión de la plataforma. */
export const sponsorshipSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  website: z.string().nullable(),
  contactEmail: z.string().nullable(),
  zone: z.string().nullable(),
  monthlyAmount: decimalAmountSchema.nullable(),
  status: sponsorshipStatusSchema,
  notes: z.string().nullable(),
  communityIds: z.array(communityIdSchema),
  createdAt: z.iso.datetime(),
});
export type SponsorshipView = z.infer<typeof sponsorshipSchema>;

/**
 * Vista pública para la comunidad: solo lo imprescindible. Jamás se
 * expone el importe, el contacto ni dato alguno de vecinos (el
 * patrocinador no es usuario de la plataforma).
 */
export const communitySponsorSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  website: z.string().nullable(),
  /** Marcador obligatorio: la interfaz debe mostrarlo como publicidad. */
  advertising: z.literal(true),
});
export type CommunitySponsor = z.infer<typeof communitySponsorSchema>;
