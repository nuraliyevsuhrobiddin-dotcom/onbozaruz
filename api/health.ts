import type { IncomingMessage, ServerResponse } from 'http';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ status: 'method_not_allowed' }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    status: 'ok',
  }));
}
