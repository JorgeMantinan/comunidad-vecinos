import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { CommunityRole } from '@comunidad/shared';
import { createProfessionalInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useCreateProfessional, useDeleteProfessional, useProfessionals } from './api';

export function ProfessionalsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const professionals = useProfessionals(communityId);
  const create = useCreateProfessional(communityId);
  const remove = useDeleteProfessional(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm({
    resolver: zodResolver(createProfessionalInputSchema),
    defaultValues: {
      name: '',
      trade: '',
      phone: '',
      email: '',
      notes: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        ...values,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
      },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Card title="Profesionales recomendados">
      {professionals.error ? (
        <ErrorAlert message={professionals.error.message} />
      ) : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {professionals.isLoading ? <Spinner /> : null}
      {!professionals.isLoading && (professionals.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">Sin profesionales recomendados.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {professionals.data?.map((professional) => (
          <li
            key={professional.id}
            className="flex items-start justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-neutral-800">
                {professional.name}
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                  {professional.trade}
                </span>
              </p>
              <p className="text-neutral-600">
                {professional.phone ?? professional.email ?? ''}
              </p>
              {professional.notes ? (
                <p className="text-xs text-neutral-500">{professional.notes}</p>
              ) : null}
              {professional.recommendedByName ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Recomendado por {professional.recommendedByName}
                </p>
              ) : null}
            </div>
            {manage ? (
              <Button
                variant="danger"
                onClick={() => remove.mutate(professional.id)}
                disabled={remove.isPending}
              >
                Borrar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-neutral-500">
        Recomendación vecinal: sin publicidad patrocinada.
      </p>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">
            Añadir profesional
          </h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Nombre"
                htmlFor="professional-name"
                error={form.formState.errors.name?.message}
              >
                <Input id="professional-name" {...form.register('name')} />
              </Field>
            </div>
            <div className="w-48">
              <Field
                label="Oficio"
                htmlFor="professional-trade"
                error={form.formState.errors.trade?.message}
              >
                <Input
                  id="professional-trade"
                  placeholder="Fontanería"
                  {...form.register('trade')}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Teléfono"
                htmlFor="professional-phone"
                error={form.formState.errors.phone?.message}
              >
                <Input
                  id="professional-phone"
                  placeholder="600 000 000"
                  {...form.register('phone')}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Añadiendo…' : 'Añadir'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
