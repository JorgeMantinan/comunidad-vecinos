import type { EmailPort } from '../../lib/email';

export interface AnnouncementEmailInput {
  to: string;
  communityName: string;
  title: string;
  body: string;
  webBaseUrl: string;
}

/**
 * Notifica un aviso nuevo a un miembro. El enlace apunta a la
 * sección de avisos de la comunidad (sin tokens ni credenciales).
 */
export async function sendAnnouncementEmail(
  email: EmailPort,
  input: AnnouncementEmailInput,
): Promise<void> {
  const communityUrl = `${input.webBaseUrl.replace(/\/$/, '')}`;
  const excerpt = input.body.length > 300 ? `${input.body.slice(0, 300)}…` : input.body;

  await email.send({
    to: input.to,
    subject: `Nuevo aviso en ${input.communityName}: ${input.title}`,
    text: [
      `Se ha publicado un aviso nuevo en la comunidad "${input.communityName}":`,
      ``,
      input.title,
      ``,
      excerpt,
      ``,
      `Ver avisos: ${communityUrl}`,
    ].join('\n'),
    html: [
      `<p>Se ha publicado un aviso nuevo en la comunidad <strong>${input.communityName}</strong>:</p>`,
      `<p><strong>${input.title}</strong></p>`,
      `<p>${excerpt.replaceAll('\n', '<br>')}</p>`,
      `<p><a href="${communityUrl}">Ver los avisos de la comunidad</a></p>`,
    ].join('\n'),
  });
}
