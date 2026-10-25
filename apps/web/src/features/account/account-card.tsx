import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, ErrorAlert, Field, Input } from '../../components/ui';
import { useDeleteAccount, usePersonalExport } from './api';

/**
 * Formulario local en texto plano: la confirmación «ELIMINAR» se
 * comprueba aquí para no bloquear la escritura del campo y vuelve a
 * validarla el servidor con el contrato compartido.
 */
const deleteFormSchema = z.object({
  password: z.string().min(1, 'Escribe tu contraseña'),
  confirm: z.string(),
});
type DeleteValues = z.infer<typeof deleteFormSchema>;

/**
 * Zona de privacidad de la cuenta: descarga de los propios datos y
 * baja. Las dos operaciones resuelven el usuario en el servidor a
 * partir de la sesión; aquí solo se pide confirmación.
 */
export function AccountCard() {
  const navigate = useNavigate();
  const exportData = usePersonalExport();
  const remove = useDeleteAccount();
  const form = useForm<DeleteValues>({
    resolver: zodResolver(deleteFormSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = (values: DeleteValues) => {
    if (values.confirm !== 'ELIMINAR') {
      form.setError('confirm', {
        message: 'Escribe ELIMINAR para confirmar la baja',
      });
      return;
    }
    remove.mutate(values, {
      onSuccess: () => navigate('/login'),
    });
  };

  return (
    <Card title="Tu cuenta y tus datos">
      <p className="text-sm text-neutral-600">
        Puedes descargar todo lo que guardamos sobre ti: tu perfil, tus comunidades, lo
        que has publicado y los documentos que has subido.
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          {exportData.isPending ? 'Preparando…' : 'Descargar mis datos (JSON)'}
        </Button>
        {exportData.error ? (
          <div className="mt-3">
            <ErrorAlert message={exportData.error.message} />
          </div>
        ) : null}
      </div>

      <hr className="my-5 border-accent-soft" />

      <p className="text-sm font-medium text-primary">Darme de baja</p>
      <p className="mt-1 text-sm text-neutral-600">
        Se elimina tu cuenta y las comunidades en las que eres el único miembro. Los
        registros económicos y las actas de las comunidades con más vecinos se conservan
        (obligación legal) y quedan sin tu nombre.{' '}
        <strong>
          Si eres presidente de una comunidad con otros miembros, transfiere antes la
          presidencia.
        </strong>
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <Field
          label="Contraseña"
          htmlFor="delete-password"
          error={form.formState.errors.password?.message}
        >
          <Input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        </Field>
        <Field
          label="Escribe ELIMINAR para confirmar"
          htmlFor="delete-confirm"
          error={form.formState.errors.confirm?.message}
        >
          <Input
            id="delete-confirm"
            placeholder="ELIMINAR"
            {...form.register('confirm')}
          />
        </Field>
        {remove.error ? <ErrorAlert message={remove.error.message} /> : null}
        <Button type="submit" variant="danger" disabled={remove.isPending}>
          {remove.isPending ? 'Eliminando…' : 'Darme de baja'}
        </Button>
      </form>
    </Card>
  );
}
