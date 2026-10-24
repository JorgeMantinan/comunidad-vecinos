import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createCommunityInputSchema } from '@comunidad/shared';
import { z } from 'zod';
import {
  Button,
  Card,
  ErrorAlert,
  Field,
  Input,
  RoleBadge,
  Spinner,
} from '../components/ui';
import {
  useCommunities,
  useCreateCommunity,
  usePendingInvitations,
} from '../lib/api';

const createSchema = createCommunityInputSchema.extend({
  address: z.string().trim().max(300).optional(),
});
type CreateValues = z.infer<typeof createSchema>;

export function DashboardPage() {
  const communities = useCommunities();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card title="Mis comunidades">
          {communities.isLoading ? <Spinner /> : null}
          {communities.error ? (
            <ErrorAlert message={communities.error.message} />
          ) : null}
          {communities.data && communities.data.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Todavía no perteneces a ninguna comunidad. Crea una nueva o
              espera a que te inviten.
            </p>
          ) : null}
          <ul className="divide-y divide-accent-soft">
            {communities.data?.map((community) => (
              <li key={community.id}>
                <Link
                  to={`/communities/${community.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent-soft/40"
                >
                  <div>
                    <p className="font-medium text-primary">{community.name}</p>
                    <p className="text-sm text-neutral-600">
                      {community.address ?? 'Sin dirección registrada'}
                    </p>
                  </div>
                  <RoleBadge role={community.role} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <PendingInvitations />
      </div>

      <CreateCommunityCard />
    </div>
  );
}

function CreateCommunityCard() {
  const navigate = useNavigate();
  const createCommunity = useCreateCommunity();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    createCommunity.mutate(values, {
      onSuccess: (community) => navigate(`/communities/${community.id}`),
    });
  });

  return (
    <Card title="Crear comunidad">
      {createCommunity.error ? (
        <ErrorAlert message={createCommunity.error.message} />
      ) : null}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Nombre"
          htmlFor="community-name"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="community-name"
            placeholder="Comunidad Calle Mayor 12"
            {...form.register('name')}
          />
        </Field>
        <Field
          label="Dirección"
          htmlFor="community-address"
          error={form.formState.errors.address?.message}
        >
          <Input
            id="community-address"
            placeholder="Calle Mayor 12, Madrid"
            {...form.register('address')}
          />
        </Field>
        <Button type="submit" disabled={createCommunity.isPending}>
          {createCommunity.isPending ? 'Creando…' : 'Crear comunidad'}
        </Button>
      </form>
    </Card>
  );
}

function PendingInvitations() {
  const pending = usePendingInvitations();

  if (!pending.data || pending.data.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Card title="Invitaciones pendientes">
        <ul className="divide-y divide-accent-soft">
          {pending.data.map((invitation) => (
            <li key={invitation.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-800">
                    {invitation.communityName}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Invitado por {invitation.invitedByName} como{' '}
                    <RoleBadge role={invitation.role} />
                  </p>
                </div>
                <RoleBadge role={invitation.role} />
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Para unirte, abre el enlace de invitación que te compartió{' '}
                {invitation.invitedByName} (caduca el{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}).
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
