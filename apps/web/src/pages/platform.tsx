import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createSponsorshipInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../components/ui';
import { ApiError } from '../lib/api-client';
import { useCommunities } from '../lib/api';
import {
  useCreateSponsorship,
  useDeleteSponsorship,
  usePlatformSponsorships,
  useUpdateSponsorship,
} from '../features/sponsorships/api';

const formSchema = createSponsorshipInputSchema.extend({
  communityIds: z.array(z.string()).min(1, 'Selecciona al menos una comunidad'),
});
type FormValues = z.infer<typeof formSchema>;

const statusLabels = {
  pending: 'Pendiente',
  active: 'Activa',
  ended: 'Finalizada',
} as const;

/**
 * Gestión de la publicidad (patrocinios) a nivel de plataforma.
 * Solo cuentas en `PLATFORM_ADMIN_EMAILS`; para el resto muestra 403.
 */
export function PlatformPage() {
  const sponsorships = usePlatformSponsorships();
  const communities = useCommunities();
  const create = useCreateSponsorship();
  const update = useUpdateSponsorship();
  const remove = useDeleteSponsorship();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      website: '',
      monthlyAmount: '',
      notes: '',
      communityIds: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        businessName: values.businessName,
        website: values.website || undefined,
        monthlyAmount: values.monthlyAmount || undefined,
        notes: values.notes || undefined,
        communityIds: values.communityIds,
      },
      { onSuccess: () => form.reset() },
    );
  });

  const forbidden =
    sponsorships.error instanceof ApiError && sponsorships.error.status === 403;

  if (forbidden) {
    return (
      <Card title="Publicidad">
        <p className="text-sm text-neutral-600">
          Tu cuenta no gestiona publicidad de plataforma (
          <code>PLATFORM_ADMIN_EMAILS</code>).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Gestión de publicidad</h1>
        <p className="text-sm text-neutral-600">
          Los patrocinios se muestran como «Publicidad» en las comunidades asignadas.
          Los anunciantes no acceden a ningún dato de la comunidad.
        </p>
      </header>

      <Card title="Patrocinios">
        {sponsorships.error && !forbidden ? (
          <ErrorAlert message={sponsorships.error.message} />
        ) : null}
        {create.error ? <ErrorAlert message={create.error.message} /> : null}
        {update.error ? <ErrorAlert message={update.error.message} /> : null}
        {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

        {sponsorships.isLoading ? <Spinner /> : null}
        {sponsorships.data && sponsorships.data.length === 0 ? (
          <p className="text-sm text-neutral-600">Sin patrocinios.</p>
        ) : null}

        <ul className="divide-y divide-accent-soft">
          {sponsorships.data?.map((sponsorship) => (
            <li
              key={sponsorship.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-neutral-800">
                  {sponsorship.businessName}
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs uppercase text-primary">
                    {statusLabels[sponsorship.status]}
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {sponsorship.communityIds.length} comunidad
                  {sponsorship.communityIds.length === 1 ? '' : 'es'}
                  {sponsorship.monthlyAmount
                    ? ` · ${sponsorship.monthlyAmount} €/mes`
                    : ''}
                  {sponsorship.contactEmail ? ` · ${sponsorship.contactEmail}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {sponsorship.status !== 'active' ? (
                  <Button
                    onClick={() =>
                      update.mutate({
                        sponsorshipId: sponsorship.id,
                        changes: { status: 'active' },
                      })
                    }
                    disabled={update.isPending}
                  >
                    Activar
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      update.mutate({
                        sponsorshipId: sponsorship.id,
                        changes: { status: 'ended' },
                      })
                    }
                    disabled={update.isPending}
                  >
                    Finalizar
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(sponsorship.id)}
                  disabled={remove.isPending}
                >
                  Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Nuevo patrocinio">
        <form onSubmit={onSubmit} noValidate>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Negocio"
                htmlFor="sponsor-name"
                error={form.formState.errors.businessName?.message}
              >
                <Input id="sponsor-name" {...form.register('businessName')} />
              </Field>
            </div>
            <div className="min-w-52 flex-1">
              <Field
                label="Web (opcional)"
                htmlFor="sponsor-website"
                error={form.formState.errors.website?.message}
              >
                <Input
                  id="sponsor-website"
                  placeholder="https://…"
                  {...form.register('website')}
                />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="€/mes (opcional)"
                htmlFor="sponsor-amount"
                error={form.formState.errors.monthlyAmount?.message}
              >
                <Input
                  id="sponsor-amount"
                  inputMode="decimal"
                  {...form.register('monthlyAmount')}
                />
              </Field>
            </div>
          </div>

          <Field
            label="Comunidades donde se muestra"
            error={form.formState.errors.communityIds?.message}
          >
            <div className="flex flex-wrap gap-3 rounded-lg border border-accent p-3">
              {communities.data?.map((community) => (
                <label
                  key={community.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={community.id}
                    {...form.register('communityIds')}
                  />
                  {community.name}
                </label>
              ))}
              {communities.data?.length === 0 ? (
                <span className="text-xs text-neutral-500">
                  No perteneces a ninguna comunidad todavía.
                </span>
              ) : null}
            </div>
          </Field>

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear patrocinio'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
