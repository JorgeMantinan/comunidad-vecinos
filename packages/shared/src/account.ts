import { z } from 'zod';

/**
 * Baja de la cuenta: la contraseña vuelve a autenticar a la persona y
 * la frase de confirmación evita borrados accidentales.
 */
export const deleteAccountInputSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm: z.string().refine((value) => value === 'ELIMINAR', {
    message: 'Escribe ELIMINAR para confirmar la baja',
  }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;

/** Resultado de la baja: qué se ha eliminado junto a la cuenta. */
export const deleteAccountResultSchema = z.object({
  deleted: z.literal(true),
  removedMemberships: z.number().int().nonnegative(),
  deletedCommunities: z.number().int().nonnegative(),
});
export type DeleteAccountResult = z.infer<typeof deleteAccountResultSchema>;

const isoDateTime = z.iso.datetime();

/**
 * Exportación personal (derecho de acceso y portabilidad): solo datos de
 * la persona que pide la descarga, nunca los de otros miembros.
 */
export const personalExportSchema = z.object({
  format: z.literal('comunidad-vecinos/export-personal-v1'),
  exportedAt: isoDateTime,
  profile: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    createdAt: isoDateTime,
  }),
  communities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string().nullable(),
      role: z.string(),
      joinedAt: isoDateTime,
    }),
  ),
  ownedUnits: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      portal: z.string().nullable(),
      number: z.string(),
    }),
  ),
  invitationsSent: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      email: z.string(),
      role: z.string(),
      createdAt: isoDateTime,
      expiresAt: isoDateTime,
      acceptedAt: isoDateTime.nullable(),
      revokedAt: isoDateTime.nullable(),
    }),
  ),
  announcements: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      title: z.string(),
      body: z.string(),
      publishedAt: isoDateTime,
    }),
  ),
  suggestions: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      title: z.string(),
      body: z.string(),
      status: z.string(),
      createdAt: isoDateTime,
    }),
  ),
  incidents: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      createdAt: isoDateTime,
    }),
  ),
  assignedTasks: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      title: z.string(),
      status: z.string(),
      dueOn: z.string().nullable(),
      createdAt: isoDateTime,
    }),
  ),
  pollVotes: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      question: z.string(),
      option: z.string(),
      votedAt: isoDateTime,
    }),
  ),
  uploadedDocuments: z.array(
    z.object({
      communityId: z.string(),
      communityName: z.string(),
      title: z.string(),
      category: z.string(),
      sizeBytes: z.number().int(),
      createdAt: isoDateTime,
    }),
  ),
  auditEvents: z.array(
    z.object({
      communityId: z.string(),
      action: z.string(),
      createdAt: isoDateTime,
    }),
  ),
});
export type PersonalExport = z.infer<typeof personalExportSchema>;
