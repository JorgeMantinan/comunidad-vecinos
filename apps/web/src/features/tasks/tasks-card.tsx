import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CommunityRole, TaskRecurrence, TaskStatus } from '@comunidad/shared';
import { createTaskInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useMembers } from '../../lib/api';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from './api';

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecha',
};

const statusBadge: Record<TaskStatus, string> = {
  todo: 'bg-accent-soft text-primary',
  doing: 'bg-warning text-on-warning',
  done: 'bg-success text-on-success',
};

const recurrenceLabels: Record<TaskRecurrence, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

/** Formulario con recurrencia opcional (cadena vacía = no recurrente). */
const formSchema = z.object({
  title: createTaskInputSchema.shape.title,
  description: createTaskInputSchema.shape.description,
  dueOn: createTaskInputSchema.shape.dueOn,
  assigneeId: createTaskInputSchema.shape.assigneeId,
  recurrence: z.enum(['', 'monthly', 'quarterly', 'yearly']).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function TasksCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const tasks = useTasks(communityId);
  const members = useMembers(communityId);
  const create = useCreateTask(communityId);
  const update = useUpdateTask(communityId);
  const remove = useDeleteTask(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      dueOn: '',
      assigneeId: '',
      recurrence: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        dueOn: values.dueOn || null,
        assigneeId: values.assigneeId || null,
        recurrence: values.recurrence || null,
      },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Card title="Tareas">
      {tasks.error ? <ErrorAlert message={tasks.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {update.error ? <ErrorAlert message={update.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {tasks.isLoading ? <Spinner /> : null}
      {!tasks.isLoading && (tasks.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted">No hay tareas pendientes.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {tasks.data?.map((task) => (
          <li key={task.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-body">{task.title}</p>
                {task.agreementTitle ? (
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-xs text-on-primary">
                    Derivada de acuerdo
                  </span>
                ) : null}
                {task.recurrence ? (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-xs text-primary">
                    🔁 {recurrenceLabels[task.recurrence]}
                  </span>
                ) : null}
                {task.description ? (
                  <p className="text-muted">{task.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-subtle">
                  {task.dueOn
                    ? `Vence el ${new Date(task.dueOn).toLocaleDateString('es-ES')} · `
                    : ''}
                  {task.assigneeName ? `Responsable: ${task.assigneeName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[task.status]}`}
                >
                  {statusLabels[task.status]}
                </span>
                {manage ? (
                  <select
                    value={task.status}
                    aria-label={`Estado de ${task.title}`}
                    onChange={(event) =>
                      update.mutate({
                        taskId: task.id,
                        changes: { status: event.target.value as TaskStatus },
                      })
                    }
                    className="rounded-lg border border-accent bg-card px-2 py-1 text-xs"
                  >
                    {(Object.entries(statusLabels) as Array<[TaskStatus, string]>).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                ) : null}
                {manage ? (
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(task.id)}
                    disabled={remove.isPending}
                  >
                    Borrar
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Nueva tarea</h3>
          <Field
            label="Título"
            htmlFor="task-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="task-title" {...form.register('title')} />
          </Field>
          <Field
            label="Descripción (opcional)"
            htmlFor="task-description"
            error={form.formState.errors.description?.message}
          >
            <Input id="task-description" {...form.register('description')} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <Field
                label="Vencimiento"
                htmlFor="task-due"
                error={form.formState.errors.dueOn?.message}
              >
                <Input id="task-due" type="date" {...form.register('dueOn')} />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Repetir"
                htmlFor="task-recurrence"
                error={form.formState.errors.recurrence?.message}
              >
                <select
                  id="task-recurrence"
                  className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                  {...form.register('recurrence')}
                >
                  <option value="">No se repite</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </Field>
            </div>
            <div className="min-w-52 flex-1">
              <Field
                label="Responsable"
                htmlFor="task-assignee"
                error={form.formState.errors.assigneeId?.message}
              >
                <select
                  id="task-assignee"
                  className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                  {...form.register('assigneeId')}
                >
                  <option value="">Sin asignar</option>
                  {members.data?.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear tarea'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
