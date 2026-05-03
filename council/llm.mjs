// ============================================================
// LLM Provider Adapter
// ============================================================
// Dispatches inference to Ollama (free, local) or OpenAI (paid,
// cloud) based on LLM_PROVIDER env var.
//
// Ollama uses its OpenAI-compatible /v1/chat/completions endpoint,
// so the wire format is identical for both providers.
// ============================================================

const PROVIDER = () => process.env.LLM_PROVIDER || 'ollama';
// OLLAMA_BASE_URL: API endpoint URL we POST to.
// Named distinctly from `OLLAMA_HOST` (which the Ollama installer sets to the
// daemon's bind address, e.g. "0.0.0.0:11434") so the two don't collide.
const OLLAMA_BASE_URL = () => process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'qwen2.5:32b';

const CALL_TIMEOUT_MS = 90_000;
const RETRY_BACKOFF_MS = 5_000;

async function callOllama({ system, user, temperature, maxTokens }) {
  const url = `${OLLAMA_BASE_URL()}/v1/chat/completions`;
  const body = {
    model: OLLAMA_MODEL(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);

  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Ollama returned empty content');

    return {
      content,
      model: data.model || OLLAMA_MODEL(),
      latencyMs: Date.now() - start,
      usage: data.usage,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI({ system, user, temperature, maxTokens }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const start = Date.now();
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  });
  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty content');
  return {
    content,
    model: res.model,
    latencyMs: Date.now() - start,
    usage: res.usage,
  };
}

export async function callModel({ system, user, temperature = 0.9, maxTokens = 2000 }) {
  const provider = PROVIDER();
  const fn = provider === 'openai' ? callOpenAI : callOllama;

  try {
    return await fn({ system, user, temperature, maxTokens });
  } catch (firstErr) {
    await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
    try {
      return await fn({ system, user, temperature, maxTokens });
    } catch (secondErr) {
      throw new Error(`${provider} call failed twice: ${secondErr.message}`);
    }
  }
}
