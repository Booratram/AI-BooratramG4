const http = require('node:http');

const port = Number(process.env.AI_STUB_PORT || '4011');

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function createEmbedding(input) {
  const source = typeof input === 'string' ? input : JSON.stringify(input);
  const seed = Array.from(source).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  const vector = new Array(1536).fill(0).map((_, index) => {
    const value = ((seed + index * 17) % 2000) / 1000 - 1;
    return Number(value.toFixed(6));
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

const server = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  const body = rawBody ? JSON.parse(rawBody) : {};

  if (request.method === 'POST' && request.url === '/chat/completions') {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userMessage = [...messages].reverse().find((message) => message.role === 'user');
    const content = `Stub response: ${userMessage?.content ?? 'no prompt'}`;

    return json(response, 200, {
      choices: [
        {
          finish_reason: 'stop',
          message: { content },
        },
      ],
      usage: {
        prompt_tokens: 42,
        completion_tokens: 21,
      },
    });
  }

  if (request.method === 'POST' && request.url === '/v1/embeddings') {
    return json(response, 200, {
      data: [
        {
          embedding: createEmbedding(body.input),
        },
      ],
    });
  }

  if (request.method === 'GET' && request.url === '/health') {
    return json(response, 200, { status: 'ok' });
  }

  return json(response, 404, { error: { message: 'Not found' } });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[ai-stub] listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
