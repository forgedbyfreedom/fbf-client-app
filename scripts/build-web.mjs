// Builds the installable web app (PWA) into ./dist.
// Uses the same EXPO_PUBLIC_* values as the production iOS build (eas.json),
// so web and native talk to the same backends. Values already set in the
// environment (e.g. on Vercel) win.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const prodEnv = eas?.build?.production?.env ?? {};
const env = { ...process.env };
for (const [k, v] of Object.entries(prodEnv)) {
  if (k.startsWith('EXPO_PUBLIC_') && !env[k]) env[k] = v;
}
execSync('npx expo export --platform web --output-dir dist --clear', { stdio: 'inherit', env });
