import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type z } from 'zod';
import type { CommunityRole, ExpenseCategory, ExpenseStatus } from '@comunidad/shared';
import { createExpenseInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import {
  formatEuro,
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  usePayExpense,
} from './api';

const categoryLabels: Record<ExpenseCategory, string> = {
  community: 'Comunidad',
  administration: 'Administración',
  repair: 'Reparaciones',
  supply: 'Suministros',
  other: 'Otros',
};

const statusLabels: Record<ExpenseStatus, string> = {
  registered: 'Registrado',
  paid: 'Pagado',
};

const formSchema = createExpenseInputSchema;
type FormValues = z.infer<typeof formSchema>;

export function ExpensesCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const expenses = useExpenses(communityId);
  const create = useCreateExpense(communityId);
  const pay = usePayExpense(communityId);
  const remove = useDeleteExpense(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      concept: '',
      amount: '',
      category: 'community',
      incurredOn: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, { onSuccess: () => form.reset() });
  });

  const rows = expenses.data ?? [];
  const totalRegistered = rows
    .filter((row) => row.status === 'registered')
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const totalPaid = rows
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <Card title="Gastos">
      {expenses.error ? <ErrorAlert message={expenses.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {pay.error ? <ErrorAlert message={pay.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {expenses.isLoading ? <Spinner /> : null}

      {rows.length > 0 ? (
        <>
          <div className="mb-3 flex gap-4 text-sm">
            <span className="text-muted">
              Pendiente:{' '}
              <strong className="text-primary">
                {formatEuro(String(totalRegistered))}
              </strong>
            </span>
            <span className="text-muted">
              Pagado:{' '}
              <strong className="text-primary">{formatEuro(String(totalPaid))}</strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-accent-soft text-left text-subtle">
                  <th className="py-2">Concepto</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Categoría</th>
                  <th className="py-2 text-right">Importe</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((expense) => (
                  <tr key={expense.id} className="border-b border-accent-soft/60">
                    <td className="py-2 font-medium text-body">{expense.concept}</td>
                    <td className="py-2 text-muted">
                      {new Date(expense.incurredOn).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-2 text-muted">
                      {categoryLabels[expense.category]}
                    </td>
                    <td className="py-2 text-right">{formatEuro(expense.amount)}</td>
                    <td className="py-2">
                      <span
                        className={
                          expense.status === 'paid'
                            ? 'rounded-full bg-success px-2 py-0.5 text-xs text-on-success'
                            : 'rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary'
                        }
                      >
                        {statusLabels[expense.status]}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {manage && expense.status === 'registered' ? (
                        <Button
                          onClick={() => pay.mutate(expense.id)}
                          disabled={pay.isPending}
                          className="mr-2"
                        >
                          Marcar pagado
                        </Button>
                      ) : null}
                      {manage ? (
                        <Button
                          variant="danger"
                          onClick={() => remove.mutate(expense.id)}
                          disabled={remove.isPending}
                        >
                          Borrar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        !expenses.isLoading && (
          <p className="text-sm text-muted">No hay gastos registrados.</p>
        )
      )}

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Registrar gasto</h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-56 flex-1">
              <Field
                label="Concepto"
                htmlFor="expense-concept"
                error={form.formState.errors.concept?.message}
              >
                <Input id="expense-concept" {...form.register('concept')} />
              </Field>
            </div>
            <div className="w-36">
              <Field
                label="Importe (€)"
                htmlFor="expense-amount"
                error={form.formState.errors.amount?.message}
              >
                <Input
                  id="expense-amount"
                  inputMode="decimal"
                  placeholder="125.40"
                  {...form.register('amount')}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Categoría"
                htmlFor="expense-category"
                error={form.formState.errors.category?.message}
              >
                <select
                  id="expense-category"
                  className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                  {...form.register('category')}
                >
                  {(
                    Object.entries(categoryLabels) as Array<[ExpenseCategory, string]>
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Fecha"
                htmlFor="expense-date"
                error={form.formState.errors.incurredOn?.message}
              >
                <Input id="expense-date" type="date" {...form.register('incurredOn')} />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Registrando…' : 'Registrar'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
