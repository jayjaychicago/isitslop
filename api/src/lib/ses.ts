import { AwsClient } from 'aws4fetch';
import type { Env } from './env.ts';

export function emailEnabled(env: Env): boolean {
  return !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION && env.SES_FROM);
}

export async function sendEmail(env: Env, to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  if (!emailEnabled(env)) return false;
  const aws = new AwsClient({ accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY!, region: env.AWS_REGION!, service: 'ses' });
  const r = await aws.fetch(`https://email.${env.AWS_REGION}.amazonaws.com/v2/email/outbound-emails`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      FromEmailAddress: env.SES_FROM,
      Destination: { ToAddresses: [to] },
      ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    }),
  });
  if (!r.ok) console.error('ses error', r.status, await r.text());
  return r.ok;
}
