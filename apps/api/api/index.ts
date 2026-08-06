export default async function handler(req: unknown, res: any): Promise<void> {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, time: Date.now() }));
}
