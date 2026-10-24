import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { CommunityRole } from '@comunidad/shared';
import { createUnitInputSchema } from '@comunidad/shared';
import type { CreateUnitInput } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useCreateUnit, useDeleteUnit, useUnits } from './api';

type FormValues = CreateUnitInput;

export function UnitsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const units = useUnits(communityId);
  const create = useCreateUnit(communityId);
  const remove = useDeleteUnit(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm<FormValues>({
    resolver: zodResolver(createUnitInputSchema),
    defaultValues: { portal: '', number: '', coefficient: '1' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, { onSuccess: () => form.reset() });
  });

  return (
    <Card title="Unidades (viviendas y locales)">
      {units.error ? <ErrorAlert message={units.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {units.isLoading ? <Spinner /> : null}
      {units.data && units.data.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Sin unidades registradas: añádelas para poder repartir derramas.
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {units.data?.map((unit) => (
          <li key={unit.id} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium text-neutral-800">
              {unit.portal ? `${unit.portal} · ` : ''}
              {unit.number}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-neutral-600">Coeficiente {unit.coefficient}</span>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(unit.id)}
                  disabled={remove.isPending}
                >
                  Borrar
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Añadir unidad</h3>
          <div className="flex flex-wrap gap-3">
            <div className="w-28">
              <Field
                label="Portal"
                htmlFor="unit-portal"
                error={form.formState.errors.portal?.message}
              >
                <Input id="unit-portal" placeholder="1" {...form.register('portal')} />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="Número"
                htmlFor="unit-number"
                error={form.formState.errors.number?.message}
              >
                <Input
                  id="unit-number"
                  placeholder="1ºA"
                  {...form.register('number')}
                />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="Coeficiente"
                htmlFor="unit-coefficient"
                error={form.formState.errors.coefficient?.message}
              >
                <Input
                  id="unit-coefficient"
                  inputMode="decimal"
                  {...form.register('coefficient')}
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
