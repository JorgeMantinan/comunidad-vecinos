import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../components/ui';
import { useRegister, useSession } from '../lib/auth';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Introduce tu nombre'),
  email: z.email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const { data: session, isLoading: sessionLoading } = useSession();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Espera a que la sesión quede refrescada antes de navegar.
      await register.mutateAsync(values);
      navigate('/', { replace: true });
    } catch {
      // El error queda registrado en register.error y se muestra abajo.
    }
  });

  if (session) {
    return <Navigate to="/" replace />;
  }
  if (sessionLoading) {
    return (
      <div className="mx-auto flex max-w-md justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card title="Crear cuenta">
        {register.error ? <ErrorAlert message={register.error.message} /> : null}
        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Nombre"
            htmlFor="name"
            error={form.formState.errors.name?.message}
          >
            <Input id="name" autoComplete="name" {...form.register('name')} />
          </Field>
          <Field
            label="Email"
            htmlFor="email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="password"
            error={form.formState.errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
          <Button type="submit" disabled={register.isPending} className="w-full">
            {register.isPending ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
