import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.info('[email-notifier] RESEND_API_KEY not set — skipping email to', payload.to, '|', payload.subject);
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'Skolr <no-reply@skolr.app>';
  const { error } = await resend.emails.send({ from, ...payload });
  if (error) {
    console.error('[email-notifier] Failed to send email:', error);
  }
}
