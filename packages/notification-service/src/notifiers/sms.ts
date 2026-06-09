import twilio from 'twilio';

let client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (!client) client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

export interface SmsPayload {
  to: string;
  body: string;
}

export async function sendSms(payload: SmsPayload): Promise<void> {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.info('[sms-notifier] Twilio env vars not set — skipping SMS to', payload.to, '|', payload.body.slice(0, 50));
    return;
  }
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    console.warn('[sms-notifier] TWILIO_FROM_NUMBER not set');
    return;
  }
  try {
    await twilioClient.messages.create({ to: payload.to, from, body: payload.body });
  } catch (err) {
    console.error('[sms-notifier] Failed to send SMS:', err);
  }
}
