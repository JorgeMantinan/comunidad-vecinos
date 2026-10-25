import type { InvitableRole } from '@comunidad/shared';
import type { EmailPort } from '../../lib/email';

export interface InvitationEmailInput {
  to: string;
  communityName: string;
  role: InvitableRole;
  token: string;
  expiresAt: Date;
  webBaseUrl: string;
}

const roleLabels: Record<InvitableRole, string> = {
  admin: 'administración',
  member: 'propietario',
  resident: 'residente',
};

/**
 * Construye y envía el correo de invitación. El enlace apunta a la web
 * con el token de uso único; el correo nunca contiene credenciales.
 */
export async function sendInvitationEmail(
  email: EmailPort,
  input: InvitationEmailInput,
): Promise<void> {
  const acceptUrl = `${input.webBaseUrl.replace(/\/$/, '')}/invite/${input.token}`;
  const expires = input.expiresAt.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
  });

  await email.send({
    to: input.to,
    subject: `Te han invitado a ${input.communityName} en Mantivecinos`,
    text: [
      `Hola,`,
      ``,
      `Te han invitado a la comunidad "${input.communityName}" con el rol de ${roleLabels[input.role]}.`,
      ``,
      `Acepta la invitación desde este enlace (caduca el ${expires}):`,
      acceptUrl,
      ``,
      `Si no esperabas esta invitación, puedes ignorar este correo.`,
    ].join('\n'),
    html: [
      `<p>Hola,</p>`,
      `<p>Te han invitado a la comunidad <strong>${input.communityName}</strong> con el rol de <strong>${roleLabels[input.role]}</strong>.</p>`,
      `<p><a href="${acceptUrl}">Aceptar la invitación</a> (caduca el ${expires}).</p>`,
      `<p>Si no esperabas esta invitación, puedes ignorar este correo.</p>`,
    ].join('\n'),
  });
}
