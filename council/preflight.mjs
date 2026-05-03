// ============================================================
// Preflight — verify Ollama daemon and model availability
// ============================================================
// Runs before the council session loop. If the daemon isn't
// responding, attempts to start `ollama serve` as a detached
// child process. If the workhorse model isn't pulled, throws
// with a directive to pull it.
// ============================================================

import { spawn } from 'child_process';

const BASE_URL = () => process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = () => process.env.OLLAMA_MODEL || 'qwen2.5:32b';
const PING_TIMEOUT_MS = 2000;
const SPAWN_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 1000;

async function pingOllama() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL()}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function startDaemon() {
  console.log('  ⚙️  Ollama not responding — attempting to start...');
  const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
  child.unref();

  const deadline = Date.now() + SPAWN_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    if (await pingOllama()) {
      console.log('  ✅ Ollama daemon up');
      return true;
    }
  }
  return false;
}

export async function preflight() {
  console.log('🛫 Preflight: checking Ollama...');

  let tags = await pingOllama();
  if (!tags) {
    if (!(await startDaemon())) {
      throw new Error(`Ollama daemon at ${BASE_URL()} did not respond within ${SPAWN_WAIT_MS / 1000}s`);
    }
    tags = await pingOllama();
    if (!tags) throw new Error('Ollama responded once but is no longer reachable');
  }

  const wantedModel = MODEL();
  const haveModel = (tags.models || []).some(m => m.name === wantedModel);
  if (!haveModel) {
    throw new Error(
      `Model "${wantedModel}" is not pulled. Run: ollama pull ${wantedModel}`
    );
  }

  console.log(`  ✅ Daemon reachable at ${BASE_URL()}`);
  console.log(`  ✅ Model ${wantedModel} available`);
}
