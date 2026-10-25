import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/** Botón con las variantes de la paleta corporativa. */
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-soft',
    secondary: 'bg-accent-soft text-primary border border-accent hover:bg-accent',
    danger: 'bg-white text-primary border border-primary-soft hover:bg-accent-soft',
    ghost: 'text-primary hover:bg-accent-soft',
  } as const;
  return (
    <button
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-accent-soft bg-white p-5 shadow-sm ${className}`}
    >
      {title ? (
        <h2 className="mb-4 text-lg font-semibold text-primary">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-neutral-700"
    >
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft ${className}`}
      {...rest}
    />
  );
}

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-primary" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const roleLabels = {
  owner: 'Presidente',
  admin: 'Administración',
  member: 'Propietario',
  resident: 'Residente',
} as const;

export function RoleBadge({ role }: { role: keyof typeof roleLabels }) {
  return (
    <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-primary">
      {roleLabels[role]}
    </span>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      className="mb-4 rounded-lg border border-primary-soft bg-accent-soft px-4 py-3 text-sm text-primary"
      role="alert"
    >
      {message}
    </div>
  );
}

export function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary"
      role="status"
      aria-label="Cargando"
    />
  );
}
