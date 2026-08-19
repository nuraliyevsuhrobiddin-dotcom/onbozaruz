import type { IncomingMessage, ServerResponse } from 'http';
import { isResendConfigured, DEFAULT_FROM_EMAIL } from './lib/resendClient';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const configured = isResendConfigured();

  res.statusCode = 200;
  res.end(JSON.stringify({
    status: 'ok',
    service: 'OnBozor Resend Email Service',
    domain: 'onbozar.uz',
    sender: DEFAULT_FROM_EMAIL,
    resendConfigured: configured,
    timestamp: new Date().toISOString(),
  }));
}
