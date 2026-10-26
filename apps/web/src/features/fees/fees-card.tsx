import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CommunityRole, FeeFrequency, FeeTarget } from '@comunidad/shared';
import { createFeeTariffInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { unitKindLabels } from '../units/kinds';
import {
  useCreateFeeTariff,
  useDeleteFeeTariff,
  useFeeCharges,
  useFeeTariffs,
  useGenerateFeeCharges,
  useSetFeeChargeStatus,
} from './api';

const frequencyLabels: Record<FeeFrequency, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

function targetLabel(target: FeeTarget): string {
  return target === 'all' ? 'Todas las unidades' : unitKindLabels[target];
}

/** Periodo en curso (AAAA-MM) para el selector. */
function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatEuro(value: string): string {
  return `${Number(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/**
 * Cuotas ordinarias y tasas por anexo (garaje, trastero…). El reparto de
 * una **derrama** por coeficiente es otra pantalla (derramas); aquí el
 * importe es fijo por unidad y periodo.
 */
export function FeesCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const manage = role === 'owner' || role === 'admin';
  const [period, setPeriod] = useState(currentPeriod);

  const tariffs = useFeeTariffs(communityId);
  const charges = useFeeCharges(communityId, period);
  const create = useCreateFeeTariff(communityId);
  const remove = useDeleteFeeTariff(communityId);
  const generate = useGenerateFeeCharges(communityId);
  const setStatus = useSetFeeChargeStatus(communityId);

  const form = useForm({
    resolver: zodResolver(createFeeTariffInputSchema),
    defaultValues: {
      concept: '',
      amount: '',
      target: 'all' as FeeTarget,
      frequency: 'monthly' as FeeFrequency,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, { onSuccess: () => form.reset() });
  });

  const rows = charges.data ?? [];
  const totalPending = rows
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <Card title="Cuotas y tasas (garaje, trastero…)">
      {charges.error ? <ErrorAlert message={charges.error.message} /> : null}
      {tariffs.error ? <ErrorAlert message={tariffs.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {generate.error ? <ErrorAlert message={generate.error.message} /> : null}
      {setStatus.error ? <ErrorAlert message={setStatus.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {/* Periodo y generación */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Periodo" htmlFor="fee-period">
          <Input
            id="fee-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
          />
        </Field>
        {manage ? (
          <Button
            onClick={() => generate.mutate({ period })}
            disabled={generate.isPending}
          >
            {generate.isPending ? 'Generando…' : `Generar cuotas de ${period}`}
          </Button>
        ) : null}
      </div>
      {generate.data ? (
        <p className="mt-2 text-sm text-muted" role="status">
          {generate.data.generated > 0
            ? `${generate.data.generated} cuotas generadas en ${generate.data.period}.`
            : `Ya estaban registradas las ${generate.data.alreadyRegistered} cuotas de ${generate.data.period}.`}
        </p>
      ) : null}

      {/* Cobros del periodo */}
      {charges.isLoading ? <Spinner /> : null}
      {rows.length === 0 && !charges.isLoading ? (
        <p className="mt-3 text-sm text-muted">
          Sin cuotas en {period}. {manage ? 'Pulsa «Generar» para crearlas.' : ''}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <>
          <ul className="mt-2 divide-y divide-accent-soft">
            {rows.map((charge) => (
              <li
                key={charge.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-body">{charge.unitNumber}</span>
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                    {unitKindLabels[charge.unitKind]}
                  </span>
                  <span className="ml-2 text-muted">{charge.concept}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium text-body">
                    {formatEuro(charge.amount)}
                  </span>
                  <span
                    className={
                      charge.status === 'paid'
                        ? 'rounded-full bg-success px-2 py-0.5 text-xs text-on-success'
                        : 'rounded-full bg-warning px-2 py-0.5 text-xs text-on-warning'
                    }
                  >
                    {charge.status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </span>
                  {manage ? (
                    <Button
                      variant={charge.status === 'paid' ? 'ghost' : 'primary'}
                      onClick={() =>
                        setStatus.mutate({
                          chargeId: charge.id,
                          changes: {
                            status: charge.status === 'paid' ? 'pending' : 'paid',
                          },
                        })
                      }
                      disabled={setStatus.isPending}
                    >
                      {charge.status === 'paid' ? 'Deshacer' : 'Cobrar'}
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Pendiente en {period}:{' '}
            <strong className="text-primary">{formatEuro(String(totalPending))}</strong>
          </p>
        </>
      ) : null}

      {/* Tarifas */}
      <section className="mt-5 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">Tarifas definidas</h3>
        {tariffs.isLoading ? <Spinner /> : null}
        {(tariffs.data ?? []).length === 0 && !tariffs.isLoading ? (
          <p className="text-sm text-muted">
            Sin tarifas todavía: añade una cuota ordinaria o una tasa por anexo.
          </p>
        ) : null}
        <ul className="divide-y divide-accent-soft">
          {tariffs.data?.map((tariff) => (
            <li
              key={tariff.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span>
                <span className="font-medium text-body">{tariff.concept}</span>
                <span className="ml-2 text-muted">
                  {formatEuro(tariff.amount)} · {targetLabel(tariff.target)} ·{' '}
                  {frequencyLabels[tariff.frequency]}
                  {!tariff.active ? ' · inactiva' : ''}
                </span>
              </span>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(tariff.id)}
                  disabled={remove.isPending}
                >
                  Borrar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {manage ? (
          <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold text-primary">Nueva tarifa</h3>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-52 flex-1">
                <Field
                  label="Concepto"
                  htmlFor="tariff-concept"
                  error={form.formState.errors.concept?.message}
                >
                  <Input
                    id="tariff-concept"
                    placeholder="Cuota ordinaria"
                    {...form.register('concept')}
                  />
                </Field>
              </div>
              <div className="w-36">
                <Field
                  label="Importe (€)"
                  htmlFor="tariff-amount"
                  error={form.formState.errors.amount?.message}
                >
                  <Input
                    id="tariff-amount"
                    inputMode="decimal"
                    placeholder="85.00"
                    {...form.register('amount')}
                  />
                </Field>
              </div>
              <div className="w-44">
                <Field label="Aplica a" htmlFor="tariff-target">
                  <select
                    id="tariff-target"
                    className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                    {...form.register('target')}
                  >
                    <option value="all">Todas las unidades</option>
                    {Object.entries(unitKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="w-40">
                <Field label="Periodicidad" htmlFor="tariff-frequency">
                  <select
                    id="tariff-frequency"
                    className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                    {...form.register('frequency')}
                  >
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </Field>
              </div>
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Añadiendo…' : 'Añadir tarifa'}
            </Button>
          </form>
        ) : null}
      </section>
    </Card>
  );
}
