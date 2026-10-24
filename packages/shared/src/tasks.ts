import { z } from 'zod';
import { communityIdSchema } from './communities';

export const taskStatusSchema = z.enum(['todo', 'doing', 'done']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(2000).optional(),
  dueOn: z.iso.date().nullish(),
  assigneeId: z.string().min(1).nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = createTaskInputSchema.partial().extend({
  status: taskStatusSchema.optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const taskSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  dueOn: z.iso.date().nullable(),
  status: taskStatusSchema,
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type TaskView = z.infer<typeof taskSchema>;
