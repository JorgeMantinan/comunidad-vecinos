/**
 * Puerto de correo transaccional. El envío nunca bloquea la operación
 * de negocio: los fallos se registran y el enlace sigue disponible en
 * la interfaz.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailPort {
  send: (message: EmailMessage) => Promise<void>;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Adaptador de Resend. Sin `RESEND_API_KEY` (desarrollo local) se omite
 * el envío con un aviso, sin romper la invitación.
 */
export function createEmailSender(): EmailPort {
  return {
    async send(message) {
      if (!isEmailConfigured()) {
        console.warn(
          `[correo] RESEND_API_KEY no configurada; se omite el envío a ${message.to}`,
        );
        return;
      }

      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Mantivecinos <onboarding@resend.dev>',
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html ?? message.text,
      });
      if (error) {
        throw new Error(`Fallo al enviar el correo: ${error.message}`);
      }
    },
  };
}

/** Registrador para tests: captura los mensajes enviados. */
export class RecordingEmail implements EmailPort {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
