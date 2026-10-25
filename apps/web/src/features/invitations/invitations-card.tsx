import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createInvitationInputSchema } from '@comunidad/shared';
import { type z } from 'zod';
import { Button, Card, ErrorAlert, Field, Input } from '../../components/ui';
import {
  useCreateInvitation,
  useInvitations,
  useRevokeInvitation,
} from '../../lib/api';

const inviteSchema = createInvitationInputSchema;
type InviteValues = z.infer<typeof inviteSchema>;

export function InvitationsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: string;
}) {
  const canInvite = role === 'owner' || role === 'admin';
  const invitations = useInvitations(canInvite ? communityId : undefined);
  const createInvitation = useCreateInvitation(communityId);
  const revokeInvitation = useRevokeInvitation(communityId);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  });

  if (!canInvite) {
    return null;
  }

  const onSubmit = form.handleSubmit((values) => {
    createInvitation.mutate(values, {
      onSuccess: (data) => {
        setLastLink(`${window.location.origin}/invite/${data.token}`);
        form.reset();
      },
    });
  });

  return (
    <Card title="Invitaciones">
      {createInvitation.error ? (
        <ErrorAlert message={createInvitation.error.message} />
      ) : null}
      {revokeInvitation.error ? (
        <ErrorAlert message={revokeInvitation.error.message} />
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <Field
            label="Email del invitado"
            htmlFor="invite-email"
            error={form.formState.errors.email?.message}
          >
            <Input id="invite-email" type="email" {...form.register('email')} />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Rol inicial" htmlFor="invite-role">
            <select
              id="invite-role"
              className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm"
              {...form.register('role')}
            >
              <option value="member">Propietario</option>
              <option value="resident">Residente</option>
              <option value="admin">Administración</option>
            </select>
          </Field>
        </div>
        <div className="flex items-end pb-4">
          <Button type="submit" disabled={createInvitation.isPending}>
            Invitar
          </Button>
        </div>
      </form>

      {lastLink ? (
        <div className="mb-4 rounded-lg bg-accent-soft p-3 text-sm">
          <p className="mb-1 font-medium text-primary">
            Enlace de invitación (se muestra una sola vez)
          </p>
          <input
            readOnly
            value={lastLink}
            className="w-full rounded border border-accent bg-white px-2 py-1 text-xs"
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Enlace de invitación"
          />
          <p className="mt-1 text-neutral-600">
            Compártelo con el invitado. Por seguridad solo se guarda su hash.
          </p>
        </div>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {invitations.data?.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <div>
              <p className="font-medium text-neutral-800">{invitation.email}</p>
              <p className="text-neutral-500">
                Caduca el {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-neutral-500">
                {invitation.status}
              </span>
              {invitation.status === 'pending' ? (
                <Button
                  variant="danger"
                  onClick={() => revokeInvitation.mutate(invitation.id)}
                  disabled={revokeInvitation.isPending}
                >
                  Revocar
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
