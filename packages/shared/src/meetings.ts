import { z } from 'zod';
import { communityIdSchema } from './communities';
import { taskStatusSchema } from './tasks';

export const meetingStatusSchema = z.enum(['planned', 'finished', 'cancelled']);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;

export const agreementStatusSchema = z.enum(['proposed', 'approved', 'rejected']);
export type AgreementStatus = z.infer<typeof agreementStatusSchema>;

export const createMeetingInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(150),
  scheduledFor: z.iso.datetime('Fecha y hora de la reunión inválidas'),
  location: z.string().trim().max(200).optional(),
});
export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;

export const updateMeetingInputSchema = z.object({
  title: createMeetingInputSchema.shape.title.optional(),
  scheduledFor: createMeetingInputSchema.shape.scheduledFor.optional(),
  location: z.string().trim().max(200).nullable().optional(),
  status: meetingStatusSchema.optional(),
  /** Acta: al finalizar la reunión se guarda su texto. */
  minutes: z.string().trim().max(50_000).nullable().optional(),
});
export type UpdateMeetingInput = z.infer<typeof updateMeetingInputSchema>;

export const agendaItemSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
});
export type AgendaItemView = z.infer<typeof agendaItemSchema>;

export const createAgendaItemInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
});
export type CreateAgendaItemInput = z.infer<typeof createAgendaItemInputSchema>;

export const updateAgendaItemInputSchema = createAgendaItemInputSchema.partial();
export type UpdateAgendaItemInput = z.infer<typeof updateAgendaItemInputSchema>;

export const agreementSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  title: z.string(),
  body: z.string(),
  status: agreementStatusSchema,
  createdAt: z.iso.datetime(),
  /** Tarea derivada del acuerdo, si existe (seguimiento). */
  linkedTask: z
    .object({ id: z.string(), title: z.string(), status: taskStatusSchema })
    .nullable(),
});
export type AgreementView = z.infer<typeof agreementSchema>;

export const createAgreementInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(5000),
});
export type CreateAgreementInput = z.infer<typeof createAgreementInputSchema>;

export const updateAgreementStatusInputSchema = z.object({
  status: agreementStatusSchema,
});

export const meetingSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  scheduledFor: z.iso.datetime(),
  location: z.string().nullable(),
  status: meetingStatusSchema,
  minutes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type MeetingView = z.infer<typeof meetingSchema>;

export const meetingDetailSchema = meetingSchema.extend({
  agenda: z.array(agendaItemSchema),
  agreements: z.array(agreementSchema),
});
export type MeetingDetailView = z.infer<typeof meetingDetailSchema>;
