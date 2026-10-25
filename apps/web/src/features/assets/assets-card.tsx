import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { AssetCategory, AssetStatus, CommunityRole } from '@comunidad/shared';
import { createAssetInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from './api';

const categoryLabels: Record<AssetCategory, string> = {
  elevator: 'Ascensor',
  plumbing: 'Fontanería',
  electrical: 'Electricidad',
  heating: 'Calefacción',
  common_area: 'Zona común',
  other: 'Otro',
};

const statusLabels: Record<AssetStatus, string> = {
  operational: 'Operativo',
  maintenance: 'En mantenimiento',
  broken: 'Averiado',
};

const statusBadge: Record<AssetStatus, string> = {
  operational: 'bg-success text-on-success',
  maintenance: 'bg-warning text-on-warning',
  broken: 'bg-danger text-on-danger',
};

export function AssetsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const assets = useAssets(communityId);
  const create = useCreateAsset(communityId);
  const update = useUpdateAsset(communityId);
  const remove = useDeleteAsset(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm({
    resolver: zodResolver(createAssetInputSchema),
    defaultValues: {
      name: '',
      category: 'other' as AssetCategory,
      location: '',
      warrantyUntil: '',
      notes: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        name: values.name,
        category: values.category,
        location: values.location || null,
        warrantyUntil: values.warrantyUntil || null,
        notes: values.notes || null,
      },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Card title="Inventario de elementos comunes">
      {assets.error ? <ErrorAlert message={assets.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {update.error ? <ErrorAlert message={update.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {assets.isLoading ? <Spinner /> : null}
      {!assets.isLoading && (assets.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted">
          Sin elementos inventariados (ascensores, instalaciones…).
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {assets.data?.map((asset) => (
          <li key={asset.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-body">{asset.name}</p>
                <p className="text-muted">
                  {categoryLabels[asset.category]}
                  {asset.location ? ` · ${asset.location}` : ''}
                  {asset.warrantyUntil
                    ? ` · garantía hasta ${new Date(asset.warrantyUntil).toLocaleDateString('es-ES')}`
                    : ''}
                </p>
                {asset.notes ? (
                  <p className="text-xs text-subtle">{asset.notes}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[asset.status]}`}
                >
                  {statusLabels[asset.status]}
                </span>
                {manage ? (
                  <select
                    value={asset.status}
                    aria-label={`Estado de ${asset.name}`}
                    onChange={(event) =>
                      update.mutate({
                        assetId: asset.id,
                        changes: {
                          status: event.target.value as AssetStatus,
                        },
                      })
                    }
                    className="rounded-lg border border-accent bg-card px-2 py-1 text-xs"
                  >
                    {(Object.entries(statusLabels) as Array<[AssetStatus, string]>).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                ) : null}
                {manage ? (
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(asset.id)}
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
          <h3 className="mb-2 text-sm font-semibold text-primary">Añadir elemento</h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Nombre"
                htmlFor="asset-name"
                error={form.formState.errors.name?.message}
              >
                <Input id="asset-name" {...form.register('name')} />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Categoría"
                htmlFor="asset-category"
                error={form.formState.errors.category?.message}
              >
                <select
                  id="asset-category"
                  className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm"
                  {...form.register('category')}
                >
                  {(
                    Object.entries(categoryLabels) as Array<[AssetCategory, string]>
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
                label="Ubicación"
                htmlFor="asset-location"
                error={form.formState.errors.location?.message}
              >
                <Input
                  id="asset-location"
                  placeholder="Portal 1"
                  {...form.register('location')}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Garantía hasta"
                htmlFor="asset-warranty"
                error={form.formState.errors.warrantyUntil?.message}
              >
                <Input
                  id="asset-warranty"
                  type="date"
                  {...form.register('warrantyUntil')}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Añadiendo…' : 'Añadir elemento'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
