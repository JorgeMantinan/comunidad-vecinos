import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CommunityRole, DocumentCategory } from '@comunidad/shared';
import { createTemplateInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import {
  useDeleteTemplate,
  useGenerateDocument,
  useSaveTemplate,
  useTemplates,
} from './api';

const categoryLabels: Record<DocumentCategory, string> = {
  contract: 'Contrato',
  invoice: 'Factura',
  minutes: 'Acta',
  report: 'Informe',
  other: 'Otro',
};

type FormValues = {
  name: string;
  category: DocumentCategory;
  content: string;
};

/**
 * Plantillas de documentos (modelos de texto): la generación crea un
 * `.txt` en el almacén privado. Herramienta de administración.
 */
export function TemplatesCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const manage = role === 'owner' || role === 'admin';
  const templates = useTemplates(communityId, manage);
  const save = useSaveTemplate(communityId);
  const remove = useDeleteTemplate(communityId);
  const generate = useGenerateDocument(communityId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createTemplateInputSchema),
    defaultValues: { name: '', category: 'other', content: '' },
  });

  if (!manage) {
    return null;
  }

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { templateId: editingId, values },
      {
        onSuccess: () => {
          form.reset();
          setEditingId(null);
        },
      },
    );
  });

  const startEdit = (template: {
    id: string;
    name: string;
    category: DocumentCategory;
    content: string;
  }) => {
    setEditingId(template.id);
    form.setValue('name', template.name);
    form.setValue('category', template.category);
    form.setValue('content', template.content);
  };

  return (
    <Card title="Plantillas de documentos">
      {templates.error ? <ErrorAlert message={templates.error.message} /> : null}
      {save.error ? <ErrorAlert message={save.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}
      {generate.error ? <ErrorAlert message={generate.error.message} /> : null}
      {generated ? (
        <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-primary">
          Documento «{generated}» generado en la documentación privada.
        </p>
      ) : null}

      {templates.isLoading ? <Spinner /> : null}
      {!templates.isLoading && (templates.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">
          Sin plantillas (convocatorias, actas…).
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {templates.data?.map((template) => (
          <li key={template.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-800">
                  {template.name}
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                    {categoryLabels[template.category]}
                  </span>
                </p>
                <p className="line-clamp-2 whitespace-pre-line text-xs text-neutral-500">
                  {template.content.slice(0, 160)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    generate.mutate(template.id, {
                      onSuccess: (document) => setGenerated(document.title),
                    })
                  }
                  disabled={generate.isPending}
                >
                  Generar documento
                </Button>
                <Button variant="secondary" onClick={() => startEdit(template)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(template.id)}
                  disabled={remove.isPending}
                >
                  Borrar
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">
          {editingId ? 'Editar plantilla' : 'Nueva plantilla'}
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-52 flex-1">
            <Field
              label="Nombre"
              htmlFor="template-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="template-name" {...form.register('name')} />
            </Field>
          </div>
          <div className="w-40">
            <Field
              label="Tipo"
              htmlFor="template-category"
              error={form.formState.errors.category?.message}
            >
              <select
                id="template-category"
                className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm"
                {...form.register('category')}
              >
                {(
                  Object.entries(categoryLabels) as Array<[DocumentCategory, string]>
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <Field
          label="Modelo de texto"
          htmlFor="template-content"
          error={form.formState.errors.content?.message}
        >
          <textarea
            id="template-content"
            rows={6}
            className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
            placeholder={'CONVOCATORIA\n\nPor la presente se convoca…'}
            {...form.register('content')}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? 'Guardando…'
              : editingId
                ? 'Guardar cambios'
                : 'Crear plantilla'}
          </Button>
          {editingId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                form.reset();
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
