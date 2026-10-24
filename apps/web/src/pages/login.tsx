import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../components/ui';
import { useLogin, useSession } from '../lib/auth';

const loginSchema = z.object({
  email: z.email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const { data: session, isLoading: sessionLoading } = useSession();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Espera a que la sesión quede refrescada antes de navegar.
      await login.mutateAsync(values);
      navigate('/', { replace: true });
    } catch {
      // El error queda registrado en login.error y se muestra abajo.
    }
  });

  // Quien ya tiene sesión no debe ver el formulario de acceso.
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
    <CenteredCard title="Iniciar sesión">
      {login.error ? <ErrorAlert message={login.error.message} /> : null}
      <form onSubmit={onSubmit} noValidate>
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
            autoComplete="current-password"
            {...form.register('password')}
          />
        </Field>
        <Button type="submit" disabled={login.isPending} className="w-full">
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-600">
        ¿Aún no tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-primary">
          Regístrate
        </Link>
      </p>
    </CenteredCard>
  );
}

function CenteredCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <Card title={title}>{children}</Card>
    </div>
  );
}
