// Serverless proxy for Anthropic API — keeps the API key server-side.
// The model, token budget, and payload shape are pinned (see chat-config.js)
// so the open endpoint can't be repurposed as a general-purpose LLM proxy.
import {
  CHAT_MODEL, CHAT_MAX_TOKENS, CHAT_THINKING,
  MAX_MESSAGES, MAX_CONTENT_CHARS, MAX_SYSTEM_CHARS,
} from '../chat-config.js';

export const config = { supportsResponseStreaming: true };

function validate(body) {
  if (!body || typeof body !== 'object') return 'invalid body';
  const { system, messages } = body;
  if (typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS) {
    return 'invalid system prompt';
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return 'invalid messages';
  }
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return 'invalid message role';
    if (typeof m.content !== 'string' || m.content.length > MAX_CONTENT_CHARS) {
      return 'invalid message content';
    }
  }
  if (messages[0].role !== 'user') return 'first message must be from user';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const validationError = validate(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { system, messages } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: CHAT_MAX_TOKENS,
        thinking: CHAT_THINKING,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let message = `Upstream error (${response.status})`;
      try {
        message = JSON.parse(errBody)?.error?.message || message;
      } catch { /* keep generic message */ }
      return res.status(response.status).json({ error: { message } });
    }

    // Stream the SSE response through
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    // If the upstream died mid-stream our headers are already sent —
    // res.json() would throw ERR_HTTP_HEADERS_SENT; just terminate.
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    } else {
      res.end();
    }
  }
}
