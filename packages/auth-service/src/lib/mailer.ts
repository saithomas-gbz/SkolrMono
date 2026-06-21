import nodemailer from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

let smtpTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransport() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return smtpTransport;
}

/**
 * Provider configurable via `MAIL_PROVIDER` ('smtp' ou 'console', défaut 'console').
 * 'console' loggue l'email au lieu de l'envoyer — pratique en dev/test sans serveur SMTP.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const from = process.env.MAIL_FROM ?? 'no-reply@skolr.local';
  const provider = (process.env.MAIL_PROVIDER ?? 'console').toLowerCase();

  if (provider === 'smtp') {
    await getSmtpTransport().sendMail({ from, ...message });
    return;
  }

  console.log(`[mailer:console] from=${from} to=${message.to} subject="${message.subject}"\n${message.html}`);
}
