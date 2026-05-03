import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('callModel — Ollama path', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'qwen2.5:32b';
    globalThis.fetch = vi.fn();
  });

  it('POSTs to /v1/chat/completions with system+user messages', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello world' } }],
        model: 'qwen2.5:32b',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });

    const { callModel } = await import('./llm.mjs');
    const result = await callModel({ system: 'You are X.', user: 'Say hi.' });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('qwen2.5:32b');
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are X.' },
      { role: 'user', content: 'Say hi.' },
    ]);
    expect(result.content).toBe('hello world');
    expect(result.model).toBe('qwen2.5:32b');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('retries once on network error then succeeds', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'recovered' } }], model: 'qwen2.5:32b' }),
      });

    const { callModel } = await import('./llm.mjs');
    const result = await callModel({ system: 's', user: 'u' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('recovered');
  }, 10000);

  it('throws after second failure', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'));

    const { callModel } = await import('./llm.mjs');
    await expect(callModel({ system: 's', user: 'u' })).rejects.toThrow(/fail 2/);
  }, 10000);

  it('throws if response has no content', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const { callModel } = await import('./llm.mjs');
    await expect(callModel({ system: 's', user: 'u' })).rejects.toThrow(/empty/i);
  }, 10000);
});
