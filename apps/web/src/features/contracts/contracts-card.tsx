import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { CommunityRole, ContractStatus } from '@comunidad/shared';
import { createContractInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import {
  useContracts,
  useCreateContract,
  useDeleteContract,
  useUpdateContract,
} from './api';

const statusLabels: Record<ContractStatus, string> = {
  active: 'Activo',
  ended: 'Finalizado',
};

export function ContractsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const contracts = useContracts(communityId);
  const create = useCreateContract(communityId);
  const update = useUpdateContract(communityId);
  const remove = useDeleteContract(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm({
    resolver: zodResolver(createContractInputSchema),
    defaultValues: {
      provider: '',
      service: '',
      amount: '',
      startOn: new Date().toISOString().slice(0, 10),
      renewalOn: '',
      notes: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        ...values,
        notes: values.notes || undefined,
      } as Parameters<typeof create.mutate>[0],
      { onSuccess: () => form.reset() },
    );
  });

  const rows = contracts.data ?? [];

  return (
    <Card title="Contratos de mantenimiento">
      {contracts.error ? <ErrorAlert message={contracts.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {update.error ? <ErrorAlert message={update.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {contracts.isLoading ? <Spinner /> : null}
      {!contracts.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted">
          No hay contratos de mantenimiento registrados.
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {rows.map((contract) => (
          <li key={contract.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-body">{contract.provider}</p>
                <p className="text-muted">
                  {contract.service} · {formatEuro(contract.amount)}/mes
                </p>
                <p className="text-xs text-subtle">
                  {new Date(contract.startOn).toLocaleDateString('es-ES')} →{' '}
                  {new Date(contract.renewalOn).toLocaleDateString('es-ES')}
                  {contract.notes ? ` · ${contract.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    contract.status === 'active'
                      ? 'rounded-full bg-success px-2 py-0.5 text-xs text-on-success'
                      : 'rounded-full bg-chip px-2 py-0.5 text-xs text-muted'
                  }
                >
                  {statusLabels[contract.status]}
                </span>
                {manage ? (
                  <Button
                    variant={contract.status === 'active' ? 'danger' : 'secondary'}
                    onClick={() =>
                      update.mutate({
                        contractId: contract.id,
                        changes: {
                          status: contract.status === 'active' ? 'ended' : 'active',
                        },
                      })
                    }
                    disabled={update.isPending}
                  >
                    {contract.status === 'active' ? 'Finalizar' : 'Reactivar'}
                  </Button>
                ) : null}
                {manage ? (
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(contract.id)}
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
          <h3 className="mb-2 text-sm font-semibold text-primary">Nuevo contrato</h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Proveedor"
                htmlFor="contract-provider"
                error={form.formState.errors.provider?.message}
              >
                <Input id="contract-provider" {...form.register('provider')} />
              </Field>
            </div>
            <div className="min-w-52 flex-1">
              <Field
                label="Servicio"
                htmlFor="contract-service"
                error={form.formState.errors.service?.message}
              >
                <Input id="contract-service" {...form.register('service')} />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="Importe (€)"
                htmlFor="contract-amount"
                error={form.formState.errors.amount?.message}
              >
                <Input
                  id="contract-amount"
                  inputMode="decimal"
                  placeholder="95.50"
                  {...form.register('amount')}
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <Field
                label="Inicio"
                htmlFor="contract-start"
                error={form.formState.errors.startOn?.message}
              >
                <Input id="contract-start" type="date" {...form.register('startOn')} />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Renovación"
                htmlFor="contract-renewal"
                error={form.formState.errors.renewalOn?.message}
              >
                <Input
                  id="contract-renewal"
                  type="date"
                  {...form.register('renewalOn')}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear contrato'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
