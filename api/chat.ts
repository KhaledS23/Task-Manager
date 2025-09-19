import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.3, stream = true } = req.body ?? {};
    if (!Array.isArray(messages)) {
      res.status(400).end('messages[] required');
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).end('Missing OPENAI_API_KEY');
      return;
    }

    const ctrl = new AbortController();
    req.on('close', () => ctrl.abort());

    const oai = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
      signal: ctrl.signal,
    });

    if (!oai.ok || !oai.body) {
      const text = await oai.text().catch(() => '');
      res.status(oai.status || 500).end(text || 'Upstream error');
      return;
    }

    const reader = oai.body.getReader();
    const decoder = new TextDecoder();

    const send = (line: string) => {
      res.write(line);
    };

    send(': ok\n\n');

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        send(chunk);
      }
      send('event: done\ndata: [DONE]\n\n');
    } catch (err: any) {
      send(`event: error\ndata: ${JSON.stringify({ message: err?.message || 'stream error' })}\n\n`);
    } finally {
      res.end();
    }
  } catch (err: any) {
    res.status(500).end(err?.message || 'Server error');
  }
}
