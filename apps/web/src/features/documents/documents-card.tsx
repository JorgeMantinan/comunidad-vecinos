import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CommunityRole, DocumentCategory } from '@comunidad/shared';
import { allowedDocumentContentTypes, MAX_FILE_BYTES } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { fileToBase64 } from '../../lib/file';
import {
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  useUploadDocument,
} from './api';

const categoryLabels: Record<DocumentCategory, string> = {
  contract: 'Contrato',
  invoice: 'Factura',
  minutes: 'Acta',
  report: 'Informe',
  other: 'Otro',
};

const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formSchema = z.object({
  title: z.string().trim().min(2, 'Indica un título').max(200),
  category: z.enum(['contract', 'invoice', 'minutes', 'report', 'other']),
});
type FormValues = z.infer<typeof formSchema>;

export function DocumentsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const documents = useDocuments(communityId);
  const upload = useUploadDocument(communityId);
  const download = useDownloadDocument();
  const remove = useDeleteDocument(communityId);
  const manage = role === 'owner' || role === 'admin';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', category: 'other' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!selectedFile) {
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      return;
    }
    const contentType = selectedFile.type;
    if (!allowedDocumentContentTypes.some((type) => type === contentType)) {
      setFileError('Tipo de archivo no admitido (PDF, imagen, texto o DOCX)');
      return;
    }
    setFileError(null);
    const contentBase64 = await fileToBase64(selectedFile);
    upload.mutate(
      {
        title: values.title,
        category: values.category,
        contentType: contentType as (typeof allowedDocumentContentTypes)[number],
        contentBase64,
      },
      {
        onSuccess: () => {
          form.reset();
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      },
    );
  });

  return (
    <Card title="Documentación privada">
      {documents.error ? <ErrorAlert message={documents.error.message} /> : null}
      {upload.error ? <ErrorAlert message={upload.error.message} /> : null}
      {download.error ? <ErrorAlert message={download.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {documents.isLoading ? <Spinner /> : null}
      {!documents.isLoading && (documents.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">
          Sin documentos. Se guardan en un almacén privado y cada descarga usa un enlace
          temporal.
        </p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {documents.data?.map((document) => (
          <li
            key={document.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-neutral-800">
                {document.title}
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                  {categoryLabels[document.category]}
                </span>
              </p>
              <p className="text-xs text-neutral-500">
                {formatBytes(document.sizeBytes)} ·{' '}
                {new Date(document.createdAt).toLocaleDateString('es-ES')}
                {document.uploadedByName
                  ? ` · subido por ${document.uploadedByName}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  download.mutate({
                    communityId,
                    documentId: document.id,
                  })
                }
                disabled={download.isPending}
              >
                Descargar
              </Button>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(document.id)}
                  disabled={remove.isPending}
                >
                  Borrar
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">
            Subir documento (máx. 3 MB)
          </h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Título"
                htmlFor="document-title"
                error={form.formState.errors.title?.message}
              >
                <Input id="document-title" {...form.register('title')} />
              </Field>
            </div>
            <div className="w-40">
              <Field
                label="Tipo"
                htmlFor="document-category"
                error={form.formState.errors.category?.message}
              >
                <select
                  id="document-category"
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
          <Field label="Archivo" htmlFor="document-file">
            <input
              id="document-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
            />
          </Field>
          {selectedFile && selectedFile.size > MAX_FILE_BYTES ? (
            <p className="mb-2 text-sm text-primary" role="alert">
              El archivo supera los 3 MB.
            </p>
          ) : null}
          {fileError ? (
            <p className="mb-2 text-sm text-primary" role="alert">
              {fileError}
            </p>
          ) : null}
          <Button type="submit" disabled={upload.isPending || !selectedFile}>
            {upload.isPending ? 'Subiendo…' : 'Subir'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
