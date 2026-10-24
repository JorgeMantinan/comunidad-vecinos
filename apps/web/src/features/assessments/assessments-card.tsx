import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CommunityRole } from '@comunidad/shared';
import { createAssessmentInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import {
  useAssessmentDetail,
  useAssessments,
  useCreateAssessment,
  useDeleteAssessment,
  usePayCharge,
} from './api';

export function AssessmentsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const assessments = useAssessments(communityId);
  const create = useCreateAssessment(communityId);
  const remove = useDeleteAssessment(communityId);
  const manage = role === 'owner' || role === 'admin';
  const [openId, setOpenId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(createAssessmentInputSchema),
    defaultValues: { concept: '', totalAmount: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, {
      onSuccess: (detail) => {
        form.reset();
        setOpenId(detail.id);
      },
    });
  });

  return (
    <Card title="Derramas">
      {assessments.error ? <ErrorAlert message={assessments.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {assessments.isLoading ? <Spinner /> : null}
      {!assessments.isLoading && (assessments.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">
          No hay derramas. Necesitas unidades registradas para repartir el importe.
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {assessments.data?.map((assessment) => (
          <li key={assessment.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenId((current) =>
                    current === assessment.id ? null : assessment.id,
                  )
                }
                className="text-left hover:bg-accent-soft/40"
                aria-expanded={openId === assessment.id}
              >
                <p className="font-medium text-primary">{assessment.concept}</p>
                <p className="text-neutral-600">
                  {formatEuro(assessment.totalAmount)} ·{' '}
                  {new Date(assessment.createdAt).toLocaleDateString('es-ES')}
                </p>
              </button>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(assessment.id)}
                  disabled={remove.isPending}
                >
                  Eliminar
                </Button>
              ) : null}
            </div>
            {openId === assessment.id ? (
              <AssessmentCharges
                communityId={communityId}
                assessmentId={assessment.id}
                manage={manage}
              />
            ) : null}
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Nueva derrama</h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Concepto"
                htmlFor="assessment-concept"
                error={form.formState.errors.concept?.message}
              >
                <Input id="assessment-concept" {...form.register('concept')} />
              </Field>
            </div>
            <div className="w-40">
              <Field
                label="Importe total (€)"
                htmlFor="assessment-total"
                error={form.formState.errors.totalAmount?.message}
              >
                <Input
                  id="assessment-total"
                  inputMode="decimal"
                  placeholder="1200.00"
                  {...form.register('totalAmount')}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Repartiendo…' : 'Crear derrama'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

function AssessmentCharges({
  communityId,
  assessmentId,
  manage,
}: {
  communityId: string;
  assessmentId: string;
  manage: boolean;
}) {
  const detail = useAssessmentDetail(communityId, assessmentId);
  const pay = usePayCharge(communityId);

  if (detail.isLoading) {
    return (
      <div className="mt-2">
        <Spinner />
      </div>
    );
  }
  if (detail.error) {
    return <ErrorAlert message={detail.error.message} />;
  }

  const paidTotal = (detail.data?.charges ?? [])
    .filter((charge) => charge.status === 'paid')
    .reduce((sum, charge) => sum + Math.round(Number(charge.amount) * 100), 0);
  const totalCents = Math.round(Number(detail.data?.totalAmount ?? '0') * 100);

  return (
    <div className="mt-3 rounded-lg bg-accent-soft/40 p-3">
      {pay.error ? <ErrorAlert message={pay.error.message} /> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="py-1">Unidad</th>
            <th className="py-1 text-right">Cuota</th>
            <th className="py-1">Estado</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {detail.data?.charges.map((charge) => (
            <tr key={charge.id} className="border-t border-accent-soft">
              <td className="py-1.5 font-medium text-neutral-800">
                {charge.unitPortal ? `${charge.unitPortal} · ` : ''}
                {charge.unitNumber}
              </td>
              <td className="py-1.5 text-right">{formatEuro(charge.amount)}</td>
              <td className="py-1.5">
                {charge.status === 'paid' ? (
                  <span className="text-xs text-green-700">Pagada</span>
                ) : (
                  <span className="text-xs text-primary">Pendiente</span>
                )}
              </td>
              <td className="py-1.5 text-right">
                {manage && charge.status === 'pending' ? (
                  <Button
                    onClick={() => pay.mutate({ assessmentId, chargeId: charge.id })}
                    disabled={pay.isPending}
                  >
                    Cobrar
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-600">
        Cobrado {formatEuro((paidTotal / 100).toFixed(2))} de{' '}
        {formatEuro(detail.data?.totalAmount ?? '0.00')} (
        {Math.round((paidTotal / Math.max(totalCents, 1)) * 100)}%)
      </p>
    </div>
  );
}
