import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { CommunityRole, InvoiceStatus } from '@comunidad/shared';
import { createInvoiceInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import { useCreateInvoice, useDeleteInvoice, useInvoices, usePayInvoice } from './api';

const statusLabels: Record<InvoiceStatus, string> = {
  received: 'Recibida',
  paid: 'Pagada',
};

export function InvoicesCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const invoices = useInvoices(communityId);
  const create = useCreateInvoice(communityId);
  const pay = usePayInvoice(communityId);
  const remove = useDeleteInvoice(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm({
    resolver: zodResolver(createInvoiceInputSchema),
    defaultValues: {
      number: '',
      supplier: '',
      amount: '',
      issuedOn: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      { ...values, notes: values.notes || undefined },
      { onSuccess: () => form.reset() },
    );
  });

  const rows = invoices.data ?? [];

  return (
    <Card title="Facturas de proveedores">
      {invoices.error ? <ErrorAlert message={invoices.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {pay.error ? <ErrorAlert message={pay.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {invoices.isLoading ? <Spinner /> : null}
      {!invoices.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted">No hay facturas registradas.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {rows.map((invoice) => (
          <li key={invoice.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-body">
                  {invoice.number} · {invoice.supplier}
                </p>
                <p className="text-muted">
                  Emitida el {new Date(invoice.issuedOn).toLocaleDateString('es-ES')}
                  {invoice.notes ? ` · ${invoice.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">
                  {formatEuro(invoice.amount)}
                </span>
                <span
                  className={
                    invoice.status === 'paid'
                      ? 'rounded-full bg-success px-2 py-0.5 text-xs text-on-success'
                      : 'rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary'
                  }
                >
                  {statusLabels[invoice.status]}
                </span>
                {manage && invoice.status === 'received' ? (
                  <Button
                    onClick={() => pay.mutate(invoice.id)}
                    disabled={pay.isPending}
                  >
                    Pagar
                  </Button>
                ) : null}
                {manage ? (
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(invoice.id)}
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
          <h3 className="mb-2 text-sm font-semibold text-primary">Registrar factura</h3>
          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <Field
                label="Número"
                htmlFor="invoice-number"
                error={form.formState.errors.number?.message}
              >
                <Input id="invoice-number" {...form.register('number')} />
              </Field>
            </div>
            <div className="min-w-52 flex-1">
              <Field
                label="Proveedor"
                htmlFor="invoice-supplier"
                error={form.formState.errors.supplier?.message}
              >
                <Input id="invoice-supplier" {...form.register('supplier')} />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="Importe (€)"
                htmlFor="invoice-amount"
                error={form.formState.errors.amount?.message}
              >
                <Input
                  id="invoice-amount"
                  inputMode="decimal"
                  placeholder="480.00"
                  {...form.register('amount')}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Fecha emisión"
                htmlFor="invoice-issued"
                error={form.formState.errors.issuedOn?.message}
              >
                <Input id="invoice-issued" type="date" {...form.register('issuedOn')} />
              </Field>
            </div>
          </div>
          <Field
            label="Notas (opcional)"
            htmlFor="invoice-notes"
            error={form.formState.errors.notes?.message}
          >
            <Input id="invoice-notes" {...form.register('notes')} />
          </Field>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Registrando…' : 'Registrar factura'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
