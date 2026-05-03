# FBF Podcast Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3×/week (Mon/Wed/Fri) podcast script generator that produces FBF-branded PDFs via local Ollama, matching the established EP001/EP002 3-host dialogue format ([COACH]/[ANVIL]/[ONYX]).

**Architecture:** A new `podcast/` folder sibling to `council/` in `fbf-client-app`. Reuses the council's `llm.mjs` adapter (Ollama via OLLAMA_BASE_URL) and `preflight.mjs`. Three episode modes (deep-dive, clinical-trials, recap), each running a 3-pass pipeline (outline → segments → polish) with a heuristic quality gate before auto-publishing to `final/`. Puppeteer renders PDFs from an HTML template that matches the existing brand. No manual review gate — autonomous mode.

**Tech Stack:** Node 24 (already installed), Ollama 0.22.1 with `qwen2.5:32b` (already pulled), Puppeteer (headless Chrome), sharp (image crop), Vitest (existing dev dep), Windows Task Scheduler via PowerShell.

**Spec:** `docs/superpowers/specs/2026-05-03-podcast-generator-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `podcast/run.mjs` | NEW | Entry CLI: parses `--mode`, `--topic`, `--resume`, `--smoke`. Calls preflight, dispatches to mode. |
| `podcast/modes/deep-dive.mjs` | NEW | Mon mode: orchestrates outline+segments+polish+gate+render for a deep-dive topic. |
| `podcast/modes/clinical-trials.mjs` | NEW | Wed mode: same shape, different prompt + length target. |
| `podcast/modes/recap.mjs` | NEW | Fri mode: reads this week's Mon+Wed from `final/`, generates ~10-min recap. |
| `podcast/pipeline/outline.mjs` | NEW | Pass 1: produces outline JSON via LLM call. |
| `podcast/pipeline/segments.mjs` | NEW | Pass 2: writes one segment at a time, sequential, with retry. |
| `podcast/pipeline/polish.mjs` | NEW | Pass 3: stitches + smooths the full script. |
| `podcast/pipeline/quality-gate.mjs` | NEW | Pure heuristic check: word count, host integrity, closing-line. |
| `podcast/pipeline/render-pdf.mjs` | NEW | Puppeteer: HTML+CSS template → PDF bytes. |
| `podcast/pipeline/topic-queue.mjs` | NEW | `peekNext`, `markDone`, `markKilled` for `topics.md`. |
| `podcast/pipeline/crop-subject.mjs` | NEW | One-time install script: strips iPhone status bar from raw subject image. |
| `podcast/prompts/system-base.md` | NEW | Shared brand voice + host personalities + phonetic respellings rules. |
| `podcast/prompts/outline-deep-dive.md` | NEW | Outline generation prompt for Mon. |
| `podcast/prompts/outline-clinical.md` | NEW | Outline generation prompt for Wed. |
| `podcast/prompts/outline-recap.md` | NEW | Outline generation prompt for Fri (with Mon+Wed scripts in context). |
| `podcast/prompts/segment.md` | NEW | Segment-writing prompt (used by all modes). |
| `podcast/prompts/polish.md` | NEW | Polish-pass prompt. |
| `podcast/templates/episode.html` | NEW | Brand-faithful HTML+CSS template (orange/black, hosts highlighted, footer disclaimer). |
| `podcast/topics.md` | NEW | Human-editable topic queue (seeded with 6 starter topics). |
| `podcast/phonetics.md` | NEW | Pronunciation glossary (~12 starter terms; Bryan grows over time). |
| `podcast/episode-numbers.json` | NEW | Tiny state file: `{lastUsed: 2}` so EP003 is next. |
| `podcast/setup-tasks.ps1` | NEW | Registers 3 Windows scheduled tasks for Mon/Wed/Fri 10:30. |
| `podcast/assets/title-banner.jpg` | EXISTS | Already placed during design (`image1.jpeg` from desktop). |
| `podcast/assets/subject-raw.png` | EXISTS | Already placed; will be cropped to `subject.png` by Task 4. |
| `podcast/assets/subject.png` | NEW (generated) | Output of `crop-subject.mjs`. |
| `podcast/tests/quality-gate.test.mjs` | NEW | Vitest unit tests for quality-gate heuristics. |
| `podcast/tests/topic-queue.test.mjs` | NEW | Vitest unit tests for queue read/write. |
| `package.json` | MODIFY | Add scripts: `podcast:smoke`, `podcast:now`, `podcast:resume`. Add deps: `puppeteer`, `sharp`. |
| `.gitignore` | MODIFY (council/.gitignore) | Already has the right exclusions; add `podcast/.work/`, `podcast/final/`, `podcast/killed/`, `podcast/assets/subject.png` (generated). |

---

## Task 1: Install dependencies and create folder structure

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\` and all subdirs
- Modify: `C:\Users\Antonelli\fbf-client-app\package.json` (root, NOT `council/package.json`)

- [ ] **Step 1: Verify we're on the right branch and clean state**

```bash
cd /c/Users/Antonelli/fbf-client-app
git status
```

Expected: `working tree clean` on `master`. If not, ABORT and surface to user.

- [ ] **Step 2: Create directory structure**

```bash
cd /c/Users/Antonelli/fbf-client-app/podcast
mkdir -p modes pipeline prompts templates tests final killed .work
```

Note: `assets/` already exists from design phase. Verify:

```bash
ls assets/
```

Expected: `subject-raw.png` and `title-banner.jpg`.

- [ ] **Step 3: Install puppeteer + sharp at the council level (not repo root)**

The council folder is where the Node project lives (it has its own `package.json`). The podcast project shares it.

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npm install puppeteer@^23 sharp@^0.33
```

Expected: both packages added to `dependencies` in `council/package.json`. ~150 MB download (puppeteer ships with Chromium).

- [ ] **Step 4: Add npm scripts to council/package.json**

Open `C:\Users\Antonelli\fbf-client-app\council\package.json`. The current scripts block is:

```json
"scripts": {
  "council:fbf": "node run.mjs --business fbf",
  "council:tad": "node run.mjs --business tad",
  "council:all": "node run.mjs --business all",
  "test": "vitest run",
  "test:smoke": "node run.mjs --business fbf --dry-run"
}
```

Add the podcast scripts. The new block:

```json
"scripts": {
  "council:fbf": "node run.mjs --business fbf",
  "council:tad": "node run.mjs --business tad",
  "council:all": "node run.mjs --business all",
  "test": "vitest run",
  "test:smoke": "node run.mjs --business fbf --dry-run",
  "podcast:smoke": "node ../podcast/run.mjs --smoke",
  "podcast:now": "node ../podcast/run.mjs",
  "podcast:resume": "node ../podcast/run.mjs --resume",
  "podcast:install": "node ../podcast/pipeline/crop-subject.mjs"
}
```

- [ ] **Step 5: Update the council .gitignore to include the podcast generated paths**

Edit `C:\Users\Antonelli\fbf-client-app\council\.gitignore`. Currently it contains:

```
node_modules/
memos/
minutes/
votes/
council.log
```

Replace with (note: paths are relative to the council folder; podcast paths are at the sibling level so we need a different file):

```
node_modules/
memos/
minutes/
votes/
council.log
```

(Leave council/.gitignore alone.) Now create `podcast/.gitignore`:

```bash
cat > /c/Users/Antonelli/fbf-client-app/podcast/.gitignore <<'EOF'
.work/
final/
killed/
assets/subject.png
EOF
```

(`subject.png` is generated from `subject-raw.png`; the raw is committed.)

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add council/package.json council/package-lock.json podcast/.gitignore
git commit -m "podcast: scaffold folder structure, install puppeteer + sharp

- Install puppeteer (PDF rendering) and sharp (image crop) in
  council/ (the existing Node project; podcast/ shares it)
- Add npm scripts: podcast:smoke, podcast:now, podcast:resume,
  podcast:install
- Create podcast/.gitignore for generated artifacts (.work, final,
  killed, generated subject.png)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Write phonetics.md (starter glossary)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\phonetics.md`

- [ ] **Step 1: Write the file**

```markdown
# FBF Podcast Phonetic Respellings

These respellings are injected into the system prompt. The LLM uses the
respelling on FIRST mention of a term in an episode, and the canonical
spelling thereafter (audience hears it once, then it's normalized).

| Term | Respelling |
|---|---|
| Retatrutide | Reh-ta-true-tide |
| Tirzepatide | tir-zep-a-tide |
| Semaglutide | sem-a-gloo-tide |
| Bimagrumab | bime-uh-GROO-mab |
| Tesamorelin | tes-uh-MORE-uh-lin |
| Ipamorelin | ip-uh-MORE-uh-lin |
| CJC-1295 | C-J-C twelve-ninety-five |
| BPC-157 | B-P-C one-fifty-seven |
| Tesofensine | tess-oh-FEN-seen |
| Survodutide | SUR-voh-DOO-tide |
| Orforglipron | OR-for-GLIP-rohn |
| Apitegromab | a-PEET-uh-GROH-mab |
| MK-677 | M-K six-seventy-seven |
| Cagrilintide | KAG-ri-LIN-tide |
| Thymosin Alpha-1 | THIGH-moh-sin AL-fa one |
| Stanozolol | STAN-oh-zoh-lol |
| Trenbolone | TREN-boh-lone |
| Anastrozole | a-NAS-troh-zole |
| Exemestane | ex-EH-meh-stane |
| Clomiphene | KLOH-mih-feen |
| Boldenone | BOL-dehn-one |
| Drostanolone | DROHS-tan-oh-lone |
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/phonetics.md
git commit -m "podcast: add phonetic respellings glossary

22 starter pronunciation hints for compounds, peptides, and trial drugs
likely to appear in episodes. The LLM uses respellings on first mention,
canonical spelling thereafter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Write topics.md (starter queue)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\topics.md`

- [ ] **Step 1: Write the file with 6 starter topics**

```markdown
# FBF Podcast Topic Queue

Pop with `peekNext(type)`. After successful publish, the topic is auto-marked
`done: EPNNN`. After auto-quality-gate rejection, it's marked `killed: <reason>`.

Edit freely. Add new topics as H2 sections. Each topic must have a `type:` line
matching one of: `deep-dive`, `clinical-trials`, `recap` (recap is auto-generated,
don't add manual recap topics).

Format:

\`\`\`
## <Topic title>
type: deep-dive
notes: <optional editorial notes for the LLM, free text>
done:
killed:
\`\`\`

The first H2 with a matching `type:` and an empty `done:` is the next topic.

---

## Bimagrumab and the Myostatin Inhibitor Story
type: deep-dive
notes: 30-min deep dive. Mechanism (activin receptor antagonism), history of
follistatin work, ACE-031 fate, where bima sits today, what the trials showed
in muscle gain vs sarcopenia. Honest about it being investigational.
done:
killed:

## Sleep Optimization for the Enhanced Athlete
type: deep-dive
notes: GH/IGF-1 pulse timing, why the CJC-Ipamorelin stack should be dosed
before bed, magnesium glycinate, ashwagandha (KSM-66), peptide-side sleep
effects, blue light, room temperature, training timing. Bryan-style practical.
done:

## Tesofensine vs CagriSema vs Retatrutide — Mechanism Deep Dive
type: deep-dive
notes: Compare three frontier weight-loss compounds. Different MoAs (NE/DA
reuptake vs GLP-1+amylin vs triple agonist). What the trial designs are
testing. Honest tradeoffs.
done:

## Retatrutide TRIUMPH Phase 3 Interim Update
type: clinical-trials
notes: Reference EP001 (the Phase 2 deep dive). What's the interim Phase 3
data showing so far? Adverse event profile, dropout rate, weight loss curve
shape. When does the full readout drop?
done:

## Apitegromab and the Spinal Muscular Atrophy → Hypertrophy Crossover
type: clinical-trials
notes: This started as SMA treatment. The muscle-mass side effects were
striking. What's the off-label / crossover potential? What does the trial
data actually show in non-SMA populations? Where's the FDA on this?
done:

## Sexual Health Peptides — PT-141, Kisspeptin-10, Oxytocin Stacks
type: deep-dive
notes: PT-141 (Vyleesi/bremelanotide) — actual mechanism (melanocortin),
real safety data. Kisspeptin-10 — what does it do, who's using it, evidence
quality. Oxytocin — the bonding/intimacy hype vs reality. Honest about
investigational status of most of these.
done:
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/topics.md
git commit -m "podcast: seed topic queue with 6 starter episodes

3 deep-dive topics + 2 clinical-trials topics + 1 sexual-health
deep-dive. Format documented inline. Bryan can grow this freely.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Write episode-numbers.json

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\episode-numbers.json`

- [ ] **Step 1: Write the file**

```json
{
  "lastUsed": 2,
  "comment": "EP001 and EP002 already exist as PDFs in user's Desktop/FromMac/FBF_Guides. Next generated episode is EP003. Episode-numbers are bumped on successful publish only; killed episodes do NOT consume a number."
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/episode-numbers.json
git commit -m "podcast: initialize episode-numbers.json (next = EP003)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Crop the subject image (one-time setup)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\crop-subject.mjs`
- Generate: `C:\Users\Antonelli\fbf-client-app\podcast\assets\subject.png`

- [ ] **Step 1: Write the crop script**

```js
// podcast/pipeline/crop-subject.mjs
//
// Strips the iPhone status bar from the raw subject image. The raw image
// (subject-raw.png) was a screenshot taken on Bryan's phone, so the top
// has the status bar (time, signal, battery). We need a clean version.
//
// Run once at install time: `npm run podcast:install`

import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

async function main() {
  const inputPath = join(ASSETS, 'subject-raw.png');
  const outputPath = join(ASSETS, 'subject.png');

  const meta = await sharp(inputPath).metadata();
  console.log(`Input: ${meta.width}×${meta.height}`);

  // iPhone status bar on a portrait shot at native resolution is roughly
  // the top 5-6% of the image. Crop the top 7% for safety; defensive.
  const cropTop = Math.round(meta.height * 0.07);

  await sharp(inputPath)
    .extract({
      left: 0,
      top: cropTop,
      width: meta.width,
      height: meta.height - cropTop,
    })
    .png()
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  console.log(`Output: ${outMeta.width}×${outMeta.height} → ${outputPath}`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
```

- [ ] **Step 2: Run it**

```bash
cd /c/Users/Antonelli/fbf-client-app
npm run --prefix council podcast:install
```

Expected: prints input dimensions, output dimensions (height reduced by ~7%), and the output path. The file `podcast/assets/subject.png` now exists.

- [ ] **Step 3: Verify**

```bash
ls -la /c/Users/Antonelli/fbf-client-app/podcast/assets/
```

Expected: `subject.png` exists, smaller than `subject-raw.png`.

- [ ] **Step 4: Commit (script only — generated subject.png is gitignored)**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/crop-subject.mjs
git commit -m "podcast: add one-time subject image crop script

Strips the iPhone status bar from the raw subject screenshot. Crops the
top 7% of the image (defensive — actual status bar is ~5%). Run once via
'npm run podcast:install'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Write quality-gate.mjs (TDD)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\quality-gate.mjs`
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\tests\quality-gate.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `C:\Users\Antonelli\fbf-client-app\podcast\tests\quality-gate.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { check } from '../pipeline/quality-gate.mjs';

const validDeepDive = `[COACH]
` + 'Word '.repeat(4500) + `

[ANVIL]
Question.

[ONYX]
Data.

[COACH]
The protocol is clear. Execute or don't.`;

describe('quality-gate.check', () => {
  it('passes a clean deep-dive script', () => {
    const result = check(validDeepDive, 'deep-dive');
    expect(result.pass).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('fails on word count below minimum', () => {
    const tooShort = `[COACH]\nHi.\n[ANVIL]\nHi.\n[ONYX]\nHi.\n[COACH]\nExecute or don't.`;
    const result = check(tooShort, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('Word count'))).toBe(true);
  });

  it('fails when first non-blank line is not [COACH]', () => {
    const wrongStart = `[ANVIL]\n` + 'Word '.repeat(5000) + `\n[COACH]\nExecute or don't.`;
    const result = check(wrongStart, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('open with [COACH]'))).toBe(true);
  });

  it('fails when closing line is missing', () => {
    const noClosing = `[COACH]\n` + 'Word '.repeat(5000) + `\n[ANVIL]\nThanks.`;
    const result = check(noClosing, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('closing'))).toBe(true);
  });

  it('fails when an unrecognized speaker appears', () => {
    const extraSpeaker =
      `[COACH]\n` + 'Word '.repeat(4500) +
      `\n[INTRUDER]\nHi.\n[COACH]\nExecute or don't.`;
    const result = check(extraSpeaker, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('Unknown speaker'))).toBe(true);
  });

  it('fails when a host appears fewer than 3 times', () => {
    // ANVIL appears only twice
    const silenced = `[COACH]\n` + 'Word '.repeat(4500) +
      `\n[ANVIL]\nQ1.\n[COACH]\nA1.\n[ONYX]\nD1.\n[COACH]\nA2.\n[ONYX]\nD2.\n[ANVIL]\nQ2.\n[COACH]\nExecute or don't.`;
    const result = check(silenced, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('appears fewer than 3'))).toBe(true);
  });

  it('fails when a TODO/TBD/placeholder string is found', () => {
    const placeholder =
      `[COACH]\n` + 'Word '.repeat(4500) + `\nTODO: write the close.\n[COACH]\nExecute or don't.`;
    const result = check(placeholder, 'deep-dive');
    expect(result.pass).toBe(false);
    expect(result.reasons.some(r => r.includes('placeholder'))).toBe(true);
  });

  it('uses the right minimum for clinical-trials', () => {
    // 2,500-word minimum
    const justEnough = `[COACH]\n` + 'Word '.repeat(2600) +
      `\n[ANVIL]\nQ1.\n[ANVIL]\nQ2.\n[ANVIL]\nQ3.\n[ONYX]\nD1.\n[ONYX]\nD2.\n[ONYX]\nD3.\n[COACH]\nA1.\n[COACH]\nA2.\n[COACH]\nExecute or don't.`;
    const result = check(justEnough, 'clinical-trials');
    expect(result.pass).toBe(true);
  });

  it('uses the right minimum for recap', () => {
    // 1,200-word minimum
    const justEnough = `[COACH]\n` + 'Word '.repeat(1300) +
      `\n[ANVIL]\nQ1.\n[ANVIL]\nQ2.\n[ANVIL]\nQ3.\n[ONYX]\nD1.\n[ONYX]\nD2.\n[ONYX]\nD3.\n[COACH]\nA1.\n[COACH]\nA2.\n[COACH]\nUntil next week. Execute or don't.`;
    const result = check(justEnough, 'recap');
    expect(result.pass).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npx vitest run ../podcast/tests/quality-gate.test.mjs
```

Expected: FAIL with `Cannot find module '../pipeline/quality-gate.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\quality-gate.mjs`:

```js
// podcast/pipeline/quality-gate.mjs
//
// Heuristic quality check for generated podcast scripts. NO LLM CALLS —
// pure string analysis. Runs after the polish pass.
//
// Returns { pass: boolean, reasons: string[] }. If pass=false, the
// reasons array tells run.mjs why and gets written to killed/.../quality-fail.txt

const KNOWN_HOSTS = ['COACH', 'ANVIL', 'ONYX'];

const MIN_WORDS = {
  'deep-dive': 4000,
  'clinical-trials': 2500,
  'recap': 1200,
};

// Closing-line regex: tolerant of slight variations.
// Matches "Execute or don't." or "Until next week. Execute or don't."
// in the last 250 characters of the script (case-insensitive).
const CLOSING_RX = /execute or don'?t\.?\s*$/i;

const PLACEHOLDER_RX = /\b(TODO|TBD|FIXME|XXX|\[INSERT|\[PLACEHOLDER)\b/i;

const SPEAKER_RX = /^\[([A-Z][A-Z0-9_-]*)\]\s*$/gm;

export function check(script, type) {
  const reasons = [];
  const minWords = MIN_WORDS[type];
  if (!minWords) {
    return { pass: false, reasons: [`Unknown episode type: ${type}`] };
  }

  // 1. Word count
  const wordCount = (script.match(/\S+/g) || []).length;
  if (wordCount < minWords) {
    reasons.push(`Word count too low: ${wordCount} < ${minWords} (${type} minimum)`);
  }

  // 2. First non-blank line must be [COACH]
  const firstLine = script.split('\n').find(l => l.trim().length > 0);
  if (!firstLine || !firstLine.trim().startsWith('[COACH]')) {
    reasons.push(`Script does not open with [COACH] (first line: "${(firstLine || '').slice(0, 30)}")`);
  }

  // 3. Closing line in last 250 chars
  const tail = script.slice(-250);
  if (!CLOSING_RX.test(tail)) {
    reasons.push(`Missing closing line "Execute or don't." in last 250 chars`);
  }

  // 4. Only known speakers
  const speakers = new Set();
  let match;
  const re = new RegExp(SPEAKER_RX.source, SPEAKER_RX.flags);
  while ((match = re.exec(script)) !== null) {
    speakers.add(match[1]);
  }
  for (const sp of speakers) {
    if (!KNOWN_HOSTS.includes(sp)) {
      reasons.push(`Unknown speaker [${sp}] (allowed: ${KNOWN_HOSTS.join(', ')})`);
    }
  }

  // 5. Each known host appears at least 3 times
  for (const host of KNOWN_HOSTS) {
    const count = (script.match(new RegExp(`\\[${host}\\]`, 'g')) || []).length;
    if (count < 3) {
      reasons.push(`[${host}] appears fewer than 3 times (saw ${count})`);
    }
  }

  // 6. No placeholder strings
  if (PLACEHOLDER_RX.test(script)) {
    const m = script.match(PLACEHOLDER_RX);
    reasons.push(`Found placeholder string in script: "${m[0]}"`);
  }

  return { pass: reasons.length === 0, reasons };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npx vitest run ../podcast/tests/quality-gate.test.mjs
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/quality-gate.mjs podcast/tests/quality-gate.test.mjs
git commit -m "podcast: add quality-gate heuristic with full test coverage

Pure string-analysis check that runs after polish pass:
- Per-type word count minimums (deep-dive 4000, clinical 2500, recap 1200)
- Script must open with [COACH]
- Last 250 chars must contain 'Execute or don't.'
- Only [COACH], [ANVIL], [ONYX] speakers allowed
- Each host must appear >=3 times (no host silenced)
- No TODO/TBD/FIXME/XXX/[INSERT/[PLACEHOLDER strings

9 vitest cases cover the failure modes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Write topic-queue.mjs (TDD)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\topic-queue.mjs`
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\tests\topic-queue.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `C:\Users\Antonelli\fbf-client-app\podcast\tests\topic-queue.test.mjs`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { peekNext, markDone, markKilled } from '../pipeline/topic-queue.mjs';

let tmpDir;
let topicsPath;

const SAMPLE = `# FBF Podcast Topic Queue

Some prose at the top.

## First Deep Dive
type: deep-dive
notes: cover the basics
done:

## A Clinical Trial
type: clinical-trials
notes:
done:

## Already Done Topic
type: deep-dive
done: EP002

## Second Deep Dive
type: deep-dive
notes: layered approach
done:
`;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fbf-podcast-'));
  topicsPath = join(tmpDir, 'topics.md');
  writeFileSync(topicsPath, SAMPLE, 'utf8');
});

describe('peekNext', () => {
  it('returns the first un-done deep-dive', () => {
    const result = peekNext(topicsPath, 'deep-dive');
    expect(result).not.toBeNull();
    expect(result.title).toBe('First Deep Dive');
    expect(result.notes).toContain('cover the basics');
  });

  it('skips topics already marked done', () => {
    // Mark First Deep Dive done first; should return Second Deep Dive
    markDone(topicsPath, 'First Deep Dive', 'EP003');
    const result = peekNext(topicsPath, 'deep-dive');
    expect(result.title).toBe('Second Deep Dive');
  });

  it('returns null when no topics of the type are available', () => {
    markDone(topicsPath, 'First Deep Dive', 'EP003');
    markDone(topicsPath, 'Second Deep Dive', 'EP004');
    const result = peekNext(topicsPath, 'deep-dive');
    expect(result).toBeNull();
  });

  it('does not mutate the file when peeking', () => {
    const before = readFileSync(topicsPath, 'utf8');
    peekNext(topicsPath, 'deep-dive');
    const after = readFileSync(topicsPath, 'utf8');
    expect(after).toBe(before);
  });
});

describe('markDone', () => {
  it('appends EP number to the done line of the matching topic', () => {
    markDone(topicsPath, 'First Deep Dive', 'EP003');
    const content = readFileSync(topicsPath, 'utf8');
    expect(content).toMatch(/## First Deep Dive\ntype: deep-dive\nnotes: cover the basics\ndone: EP003/);
  });

  it('throws if topic title not found', () => {
    expect(() => markDone(topicsPath, 'Nonexistent', 'EP003')).toThrow(/not found/);
  });

  it('preserves the rest of the file', () => {
    markDone(topicsPath, 'First Deep Dive', 'EP003');
    const content = readFileSync(topicsPath, 'utf8');
    expect(content).toContain('## A Clinical Trial');
    expect(content).toContain('## Second Deep Dive');
  });
});

describe('markKilled', () => {
  it('appends a killed reason to the matching topic', () => {
    markKilled(topicsPath, 'First Deep Dive', 'word count too low');
    const content = readFileSync(topicsPath, 'utf8');
    expect(content).toMatch(/## First Deep Dive[\s\S]+killed: word count too low/);
  });

  it('throws if topic title not found', () => {
    expect(() => markKilled(topicsPath, 'Nonexistent', 'reason')).toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npx vitest run ../podcast/tests/topic-queue.test.mjs
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the implementation**

Create `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\topic-queue.mjs`:

```js
// podcast/pipeline/topic-queue.mjs
//
// Read/write helpers for podcast/topics.md.
//
// File format (per spec §4.3):
//   ## <Title>
//   type: <deep-dive|clinical-trials|recap>
//   notes: <free text, single line>
//   done: [EPNNN if consumed, empty otherwise]
//   killed: [reason if killed, empty otherwise]
//
// Each topic is an H2-rooted block. Lines after the H2 are key:value pairs
// until the next H2 or EOF. Blank lines between topics are tolerated.

import { readFileSync, writeFileSync } from 'fs';

function parseTopics(content) {
  // Returns array of { title, type, notes, done, killed, startLine, endLine }.
  const lines = content.split(/\r?\n/);
  const topics = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      if (current) {
        current.endLine = i - 1;
        topics.push(current);
      }
      current = {
        title: h2[1].trim(),
        type: '',
        notes: '',
        done: '',
        killed: '',
        startLine: i,
        endLine: -1,
      };
      continue;
    }
    if (current) {
      const kv = line.match(/^(type|notes|done|killed):\s*(.*)$/);
      if (kv) {
        current[kv[1]] = kv[2].trim();
      }
    }
  }
  if (current) {
    current.endLine = lines.length - 1;
    topics.push(current);
  }
  return topics;
}

export function peekNext(topicsPath, type) {
  const content = readFileSync(topicsPath, 'utf8');
  const topics = parseTopics(content);
  const next = topics.find(t => t.type === type && !t.done);
  return next ? { title: next.title, type: next.type, notes: next.notes } : null;
}

function rewriteFieldOnTopic(topicsPath, title, field, value) {
  const content = readFileSync(topicsPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const topics = parseTopics(content);
  const topic = topics.find(t => t.title === title);
  if (!topic) {
    throw new Error(`Topic "${title}" not found in ${topicsPath}`);
  }
  // Find the line matching `${field}:` within the topic's block; replace it.
  let replaced = false;
  for (let i = topic.startLine + 1; i <= topic.endLine; i++) {
    const re = new RegExp(`^${field}:\\s*(.*)$`);
    if (re.test(lines[i])) {
      lines[i] = `${field}: ${value}`;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    // Field didn't exist; insert right before the next field or end of block
    lines.splice(topic.endLine + 1, 0, `${field}: ${value}`);
  }
  writeFileSync(topicsPath, lines.join('\n'), 'utf8');
}

export function markDone(topicsPath, title, episodeId) {
  rewriteFieldOnTopic(topicsPath, title, 'done', episodeId);
}

export function markKilled(topicsPath, title, reason) {
  rewriteFieldOnTopic(topicsPath, title, 'killed', reason);
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npx vitest run ../podcast/tests/topic-queue.test.mjs
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/topic-queue.mjs podcast/tests/topic-queue.test.mjs
git commit -m "podcast: add topic-queue with peekNext/markDone/markKilled

Read/write helpers for topics.md. Treats H2 blocks as topics with
key:value lines underneath. peekNext returns the first un-done topic
of a given type. markDone/markKilled mutate that topic's field
in-place, preserving the rest of the file.

9 vitest cases including no-mutation-on-peek, not-found errors, and
file-content preservation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Write the prompt files

**Files:**
- Create all 6 prompt files in `C:\Users\Antonelli\fbf-client-app\podcast\prompts\`

- [ ] **Step 1: Write `system-base.md`**

```markdown
You are writing scripts for the FBF (Forged by Freedom) podcast — a 3-host
show on fitness, peptides, performance-enhancing drugs, and elite body
recomposition. Your audience is trained athletes, coaches, and informed
clients. They want depth, real data, and zero fluff.

# THE THREE HOSTS

You write dialogue for exactly three hosts. Never introduce a fourth speaker.

**[COACH]** — The lead voice. Authority. Frameworks. Imperatives. He's been
running these protocols on himself and on clients for years. Sentences are
short, punchy, declarative. He drops the closing line of every episode:
"Execute or don't." (Recap episodes close with: "Until next week. Execute or don't.")
He's not abrasive but he's not hedging either. Style: Jocko Willink meets
strength coach.

**[ANVIL]** — The listener proxy. Asks the question the audience would ask.
Reactions are short and natural ("That's intense.", "Hold on.", "Break it
down."). He's curious, not dumb — when the science gets technical he asks
the practical follow-up ("So what's the play for someone listening right
now?"). He's the bridge between Coach's authority and Onyx's data.

**[ONYX]** — The data and research voice. Cites studies by author, journal,
and year ("Jastreboff et al., New England Journal of Medicine, July 2023").
Names trial programs by their actual names (TRIUMPH, STEP, SURMOUNT).
Quotes percentages, effect sizes, dropout rates, sample sizes. Distinguishes
Phase 1/2/3 data quality. Knows what the FDA has approved versus what's
investigational. Tone: scholarly, precise, but speaks plainly.

# FORMAT RULES

- Each speaker turn starts on its own line as `[COACH]`, `[ANVIL]`, or
  `[ONYX]` (square brackets, all caps), then a blank line, then the
  dialogue paragraph(s).
- One blank line between turns.
- The script ALWAYS opens with [COACH].
- The script ALWAYS closes with [COACH] and the line "Execute or don't." (or
  "Until next week. Execute or don't." for recaps).
- All three hosts must appear at least 3 times in any script.
- Do NOT use stage directions, sound effects, or [BRACKETED CONTENT] other
  than the speaker headers.

# BRAND VOICE (HARD RULES)

- "Educational use only — not medical advice." Never prescribe. Never tell
  someone to take a specific compound. Frame as "the protocol calls for X"
  or "the research shows Y."
- Real specifics: doses in mcg/mg, percentages with one decimal where
  appropriate, journal citations when claiming clinical data.
- Honest about what's investigational, off-label, or unproven. Onyx in
  particular flags evidence quality.
- Short sentences. Declarative. The hosts are confident but not theatrical.
- No filler ("at the end of the day", "essentially", "basically"). No
  hedging adverbs ("very", "really", "literally", "actually" used as filler).
- Reference real compounds, real trials, real journals, real authors. If
  unsure of a specific reference, attribute generically ("the Phase 2 data
  out of the GLP-1 literature") rather than fabricating a citation.

# PHONETIC RESPELLINGS

When a host first mentions a complex compound name, render it phonetically
to help the audience hear it. After the first mention, use the canonical
spelling. Use the phonetic respellings table provided below for any term
listed there. For terms not in the table, use the canonical spelling.

{{PHONETICS_TABLE}}

# DISCLAIMERS

The PDF template adds an "Educational Use Only — Not Medical Advice" footer
to every page automatically. You don't need to add disclaimers in the body
of the script.
```

- [ ] **Step 2: Write `outline-deep-dive.md`**

```markdown
You are outlining a 30-45 minute FBF podcast deep dive episode.

# TOPIC

{{TOPIC_TITLE}}

# EDITORIAL NOTES

{{TOPIC_NOTES}}

# YOUR JOB

Produce a structured JSON outline with 8-10 segments. Each segment is a
discrete arc of the conversation. The script will be written from this
outline, one segment at a time, by a separate pass.

# OUTLINE STRUCTURE

For each segment, provide:
- `theme`: a short string (3-7 words) describing the segment focus
- `hosts`: which hosts speak in this segment, in order of weight (e.g.,
  `["COACH", "ANVIL", "ONYX"]` if all three; `["COACH", "ONYX"]` if Anvil
  is silent in that segment)
- `keyPoints`: array of 3-6 bullet strings the dialogue must hit

# RHYTHM TARGETS

- Segment 1: Opening hook. Coach states the thesis in punchy declaratives.
- Segments 2-3: Mechanism / context / why-now.
- Segments 4-6: The meat — protocol, data, trade-offs, real-world specifics.
- Segments 7-8: Practical framework — what does the listener actually do.
- Segments 9-10: Honest about limits, exit strategy, close. Last segment
  ends with Coach's "Execute or don't."

# TITLE

Also produce an `episodeTitle` field — short, declarative, attention-grabbing.
Format: short noun phrase. Examples from prior episodes:
- "Retatrutide Deep Dive 3-Person"
- "FBF Recomp Protocol"

# OUTPUT

Respond ONLY with raw JSON in this exact shape:

{
  "episodeTitle": "...",
  "segments": [
    { "theme": "...", "hosts": ["COACH","ANVIL","ONYX"], "keyPoints": ["...","...","..."] },
    ...
  ]
}

No markdown, no code fences, no commentary outside the JSON.
```

- [ ] **Step 3: Write `outline-clinical.md`**

```markdown
You are outlining a 20-30+ minute FBF podcast episode focused on a specific
clinical trial, investigational drug, or recent published study.

# TOPIC

{{TOPIC_TITLE}}

# EDITORIAL NOTES

{{TOPIC_NOTES}}

# YOUR JOB

Produce a structured JSON outline with 6-8 segments.

# RHYTHM TARGETS (CLINICAL EPISODES)

ONYX (the data voice) carries more weight than in deep dives. The episode
is a structured walk through trial data and what it actually means for
trained athletes.

- Segment 1: Hook. Coach states why this trial/compound matters NOW.
- Segment 2: The compound — mechanism in plain language.
- Segment 3: The trial design — Phase, comparator, endpoints, sample size.
  ONYX leads. Real specifics where you can claim them; generic attribution
  where you can't.
- Segments 4-5: The data. Effect sizes. Dropout rates. Adverse events.
  Honest about what we don't know. Onyx names the journal/authors when
  reasonable.
- Segment 6: Comparator context. How does this stack against existing
  options (semaglutide, tirzepatide, the standard of care).
- Segment 7: Practical implications. If/when can a trained athlete
  realistically get hands on this. Coach pulls the thread.
- Segment 8: Honest close. What's the timeline (Phase 3 readout? FDA?).
  Coach's "Execute or don't." (or topic-specific variant).

# OUTPUT

Same JSON shape as the deep-dive outline:

{
  "episodeTitle": "...",
  "segments": [
    { "theme": "...", "hosts": ["COACH","ANVIL","ONYX"], "keyPoints": ["...","...","..."] },
    ...
  ]
}

No markdown, no code fences. Raw JSON only.
```

- [ ] **Step 4: Write `outline-recap.md`**

```markdown
You are outlining a 10-minute FBF podcast Friday recap. The recap is a
tight summary of THIS WEEK's two episodes (Monday's deep dive and
Wednesday's clinical trial episode).

# THIS WEEK'S MONDAY EPISODE

Title: {{MONDAY_TITLE}}
Full script:

{{MONDAY_SCRIPT}}

# THIS WEEK'S WEDNESDAY EPISODE

Title: {{WEDNESDAY_TITLE}}
Full script:

{{WEDNESDAY_SCRIPT}}

# YOUR JOB

Produce a JSON outline with 3-4 short segments. The recap is not a re-run
of the original episodes — it's the connective tissue. Pick the 2 most
striking takeaways from each episode and frame them as a connected
weekly story.

# RHYTHM TARGETS (RECAP)

- Segment 1: Hook. Coach frames the week's theme — what tied Mon and Wed
  together?
- Segment 2: Monday's two takeaways. Quick. Anvil prompts; Coach delivers;
  Onyx adds one data point.
- Segment 3: Wednesday's two takeaways. Same shape.
- Segment 4: Forward look + close. What's coming next week (a tease) and
  Coach's signoff: "Until next week. Execute or don't."

# OUTPUT

Same JSON shape:

{
  "episodeTitle": "Week of <Mon date> Recap",
  "segments": [...]
}

No markdown. Raw JSON only.
```

- [ ] **Step 5: Write `segment.md`**

```markdown
You are writing ONE segment of an FBF podcast script.

# OUTLINE

{{OUTLINE_JSON}}

# YOU ARE WRITING SEGMENT

Index: {{SEGMENT_INDEX}}
Theme: {{SEGMENT_THEME}}
Hosts in this segment (in weight order): {{SEGMENT_HOSTS}}
Key points to hit:

{{SEGMENT_KEY_POINTS}}

# LAST 400 CHARS OF PREVIOUS SEGMENT (for transition)

{{PREV_TAIL}}

# FORMAT

- Each speaker turn on its own line as `[COACH]`, `[ANVIL]`, or `[ONYX]`,
  then a blank line, then the dialogue paragraph.
- One blank line between turns.
- 4-12 turns in this segment, depending on the segment's weight.
- Hit every key point. Each turn should advance the conversation; don't
  repeat the previous turn.
- If this is segment 0 (the opening), start with [COACH] making the thesis
  statement in punchy declaratives.
- If this is the LAST segment of the episode, the FINAL line of the entire
  script must be [COACH] saying "Execute or don't." (or "Until next week.
  Execute or don't." for recaps).
- Use the phonetic respelling on first mention of any compound covered by
  the phonetics table. Canonical spelling thereafter.

# OUTPUT

Just the segment dialogue. No commentary, no markdown, no JSON.
```

- [ ] **Step 6: Write `polish.md`**

```markdown
You are polishing a complete FBF podcast script that was assembled from
independently-written segments.

# THE ASSEMBLED SCRIPT

{{RAW_SCRIPT}}

# YOUR JOB

Produce a polished version that:

1. Smooths any awkward transitions between segment boundaries (where one
   segment ends and the next begins). The seam should be invisible.
2. Eliminates any duplication where two segments accidentally restate
   the same point.
3. Ensures the closing line is exactly "Execute or don't." (or "Until next
   week. Execute or don't." for a recap), spoken by [COACH] as the final
   line of the script.
4. Verifies phonetic respellings were used on first mention of compounds
   from the phonetics table. If a respelling was missed, fix it.
5. Removes any [STAGE DIRECTION] / [SOUND EFFECT] / non-host bracketed
   content other than the [COACH]/[ANVIL]/[ONYX] speaker headers.
6. Removes any TODO/TBD/placeholder strings.
7. Keeps the same speaker structure and roughly the same length. Do NOT
   shorten the script. Do NOT remove substantive content. Polish, don't
   rewrite.

# OUTPUT

Just the polished script. Same format ([HOST] markers, dialogue paragraphs).
No commentary, no markdown, no diff annotation.
```

- [ ] **Step 7: Commit all prompts**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/prompts/
git commit -m "podcast: add the 6 LLM prompt files

- system-base.md: brand voice, host personalities, format rules,
  phonetics injection point
- outline-deep-dive.md, outline-clinical.md, outline-recap.md: per-mode
  outline prompts producing structured JSON
- segment.md: single-segment writer with prev-tail context
- polish.md: full-script polish pass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Write outline.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\outline.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/pipeline/outline.mjs
//
// Pass 1 of 3 in the podcast generation pipeline. Produces a structured
// JSON outline with episodeTitle + segments[].
//
// Single LLM call via the council's llm.mjs adapter. Returns parsed JSON
// or throws.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callModel } from '../../council/llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

function loadPrompt(filename) {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf8');
}

function loadPhoneticsTable() {
  const path = join(__dirname, '..', 'phonetics.md');
  return readFileSync(path, 'utf8');
}

function fillPlaceholders(template, values) {
  let out = template;
  for (const [key, val] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
}

const OUTLINE_PROMPT_BY_TYPE = {
  'deep-dive': 'outline-deep-dive.md',
  'clinical-trials': 'outline-clinical.md',
  'recap': 'outline-recap.md',
};

export async function outline({ type, topic, sourceMaterial = {} }) {
  if (!OUTLINE_PROMPT_BY_TYPE[type]) {
    throw new Error(`Unknown outline type: ${type}`);
  }

  const systemBase = loadPrompt('system-base.md');
  const phoneticsTable = loadPhoneticsTable();
  const system = fillPlaceholders(systemBase, { PHONETICS_TABLE: phoneticsTable });

  const promptTemplate = loadPrompt(OUTLINE_PROMPT_BY_TYPE[type]);
  const userPrompt = fillPlaceholders(promptTemplate, {
    TOPIC_TITLE: topic?.title || '',
    TOPIC_NOTES: topic?.notes || '',
    MONDAY_TITLE: sourceMaterial.mondayTitle || '',
    MONDAY_SCRIPT: sourceMaterial.mondayScript || '',
    WEDNESDAY_TITLE: sourceMaterial.wednesdayTitle || '',
    WEDNESDAY_SCRIPT: sourceMaterial.wednesdayScript || '',
  });

  const result = await callModel({
    system,
    user: userPrompt,
    temperature: 0.7,
    maxTokens: 3000,
  });

  let parsed;
  try {
    parsed = JSON.parse(stripJsonFences(result.content));
  } catch (err) {
    throw new Error(`Outline LLM returned non-JSON: ${err.message}\n\nContent:\n${result.content.slice(0, 500)}`);
  }

  if (!parsed.episodeTitle || !Array.isArray(parsed.segments) || parsed.segments.length < 3) {
    throw new Error(`Outline shape invalid: missing episodeTitle or segments[]`);
  }

  return parsed;
}
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
cd /c/Users/Antonelli/fbf-client-app/podcast
node --check pipeline/outline.mjs
```

Expected: no output (no syntax errors).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/outline.mjs
git commit -m "podcast: add outline.mjs (pass 1 of 3-pass pipeline)

Loads system-base prompt + phonetics table + per-type outline prompt,
fills placeholders from topic + sourceMaterial, calls the council's
llm.mjs adapter, parses JSON response. Throws on malformed output.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Write segments.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\segments.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/pipeline/segments.mjs
//
// Pass 2 of 3. Writes one segment at a time, sequentially. Each call gets
// the full outline + the last ~400 chars of the previous segment for
// transition continuity. Already-fault-tolerant via llm.mjs (1 retry on
// transient errors); we add a second retry here with a regenerated prompt
// before giving up.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callModel } from '../../council/llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');
const PHONETICS_PATH = join(__dirname, '..', 'phonetics.md');

const PREV_TAIL_CHARS = 400;
const SECOND_TRY_BACKOFF_MS = 5000;

function loadPrompt(filename) {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf8');
}

function fillPlaceholders(template, values) {
  let out = template;
  for (const [key, val] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

export async function writeSegment({ outline, index, prevSegmentText = '' }) {
  const systemBase = loadPrompt('system-base.md');
  const phonetics = readFileSync(PHONETICS_PATH, 'utf8');
  const system = fillPlaceholders(systemBase, { PHONETICS_TABLE: phonetics });

  const segment = outline.segments[index];
  if (!segment) throw new Error(`No segment at index ${index} (outline has ${outline.segments.length})`);

  const prompt = fillPlaceholders(loadPrompt('segment.md'), {
    OUTLINE_JSON: JSON.stringify(outline, null, 2),
    SEGMENT_INDEX: String(index),
    SEGMENT_THEME: segment.theme,
    SEGMENT_HOSTS: (segment.hosts || []).join(', '),
    SEGMENT_KEY_POINTS: (segment.keyPoints || []).map(k => `- ${k}`).join('\n'),
    PREV_TAIL: prevSegmentText.slice(-PREV_TAIL_CHARS) || '(none — this is the first segment)',
  });

  // First attempt
  try {
    const r1 = await callModel({ system, user: prompt, temperature: 0.85, maxTokens: 2500 });
    const t1 = r1.content.trim();
    if (t1.length > 100 && /^\[COACH\]|^\[ANVIL\]|^\[ONYX\]/m.test(t1)) {
      return t1;
    }
    // Fall through to second attempt — content was suspect
  } catch {
    // Fall through
  }

  await new Promise(r => setTimeout(r, SECOND_TRY_BACKOFF_MS));

  // Second attempt: same call, the llm.mjs adapter already does its own
  // single retry. If both fail, this throws.
  const r2 = await callModel({ system, user: prompt, temperature: 0.85, maxTokens: 2500 });
  const t2 = r2.content.trim();
  if (t2.length < 100) {
    throw new Error(`Segment ${index} content too short (${t2.length} chars) after retry`);
  }
  return t2;
}
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/pipeline/segments.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/segments.mjs
git commit -m "podcast: add segments.mjs (pass 2 — sequential segment writer)

Writes one segment at a time using the outline + previous-segment tail
for transition continuity. Validates the response starts with a host
header before returning; one extra retry on suspect content. Throws on
double-failure (run.mjs catches and writes resume diagnostics).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Write polish.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\polish.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/pipeline/polish.mjs
//
// Pass 3 of 3. Reads the stitched script and produces a polished version.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callModel } from '../../council/llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');
const PHONETICS_PATH = join(__dirname, '..', 'phonetics.md');

function loadPrompt(filename) {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf8');
}

function fillPlaceholders(template, values) {
  let out = template;
  for (const [key, val] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

export async function polish({ rawScript }) {
  const systemBase = loadPrompt('system-base.md');
  const phonetics = readFileSync(PHONETICS_PATH, 'utf8');
  const system = fillPlaceholders(systemBase, { PHONETICS_TABLE: phonetics });

  const userPrompt = fillPlaceholders(loadPrompt('polish.md'), {
    RAW_SCRIPT: rawScript,
  });

  // Polish needs a large maxTokens because it re-emits the full script.
  // For a 6,000-word script that's ~8,000 tokens out. Set 12,000 to be safe.
  const result = await callModel({
    system,
    user: userPrompt,
    temperature: 0.5,
    maxTokens: 12000,
  });

  const polished = result.content.trim();
  if (polished.length < rawScript.length * 0.5) {
    throw new Error(`Polish pass returned a script <50% the length of the input (${polished.length} vs ${rawScript.length}); likely truncated`);
  }
  return polished;
}
```

- [ ] **Step 2: Verify**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/pipeline/polish.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/pipeline/polish.mjs
git commit -m "podcast: add polish.mjs (pass 3 — final smoothing)

Single LLM call over the stitched raw script. Validates output is at
least 50% of input length to catch truncation. maxTokens=12000 to
accommodate full-length deep-dive episodes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Write render-pdf.mjs and the HTML template

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\templates\episode.html`
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\render-pdf.mjs`

- [ ] **Step 1: Write the HTML template**

Create `C:\Users\Antonelli\fbf-client-app\podcast\templates\episode.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{TITLE}}</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in 0.75in 1in 0.75in;
      background: #0a0a0a;
      @bottom-center {
        content: "FORGED BY FREEDOM | forgedbyfreedom.com | Educational Use Only — Not Medical Advice";
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 8pt;
        color: #666;
      }
    }
    html, body {
      background: #0a0a0a;
      color: #e6e6e6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .page-1 .top-banner {
      width: 100%;
      max-width: 100%;
      display: block;
      margin: 0 0 16pt 0;
    }
    .page-1 .episode-eyebrow {
      color: #999;
      font-size: 9pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 6pt 0;
    }
    .page-1 .episode-title {
      color: #f97316;
      font-size: 22pt;
      font-weight: 700;
      margin: 0 0 4pt 0;
      line-height: 1.15;
    }
    .page-1 .episode-handle {
      color: #999;
      font-size: 10pt;
      margin: 0 0 6pt 0;
    }
    .page-1 .accent-rule {
      border: none;
      border-top: 2pt solid #f97316;
      margin: 0 0 18pt 0;
    }
    .page-1 .subject-image {
      display: block;
      max-width: 100%;
      max-height: 200pt;
      margin: 12pt auto 18pt auto;
      object-fit: contain;
    }
    .speaker-block {
      margin: 14pt 0 6pt 0;
      page-break-inside: avoid;
    }
    .speaker-header {
      color: #f97316;
      font-size: 13pt;
      font-weight: 700;
      margin: 0 0 4pt 0;
      border-top: 1px solid #1f1f1f;
      padding-top: 10pt;
    }
    .speaker-dialogue {
      margin: 0 0 4pt 0;
      color: #e6e6e6;
    }
  </style>
</head>
<body>
  <div class="page-1">
    <img src="{{TITLE_BANNER_DATA_URL}}" class="top-banner" alt="Forged by Freedom">
    <div class="episode-eyebrow">FORGED BY FREEDOM</div>
    <h1 class="episode-title">{{EPISODE_HEADER}}</h1>
    <div class="episode-handle">@ForgedByFreedom</div>
    <hr class="accent-rule">
    <img src="{{SUBJECT_IMAGE_DATA_URL}}" class="subject-image" alt="">
  </div>
  {{SPEAKER_BLOCKS}}
</body>
</html>
```

- [ ] **Step 2: Write `render-pdf.mjs`**

Create `C:\Users\Antonelli\fbf-client-app\podcast\pipeline\render-pdf.mjs`:

```js
// podcast/pipeline/render-pdf.mjs
//
// Pure renderer: takes a polished script + episode metadata and returns
// PDF bytes. Uses Puppeteer to drive headless Chrome against an HTML
// template that matches the EP001/EP002 brand.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');
const TEMPLATE_PATH = join(__dirname, '..', 'templates', 'episode.html');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fileToDataUrl(path) {
  const buf = readFileSync(path);
  const ext = path.split('.').pop().toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function scriptToSpeakerBlocks(script) {
  // Split on lines that are exactly [HOST] markers.
  // Each block: a header + the dialogue paragraphs until the next [HOST].
  const lines = script.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^\[([A-Z][A-Z0-9_-]*)\]\s*$/);
    if (m) {
      if (current) blocks.push(current);
      current = { host: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map(b => {
    const dialogue = b.lines.join('\n').trim();
    const paragraphs = dialogue.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const paragraphHtml = paragraphs.map(p => `<p class="speaker-dialogue">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
    return `<div class="speaker-block"><div class="speaker-header">[${b.host}]</div>${paragraphHtml}</div>`;
  }).join('\n');
}

export async function renderEpisode({ script, episodeNumber, title, type }) {
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const titleBannerUrl = fileToDataUrl(join(ASSETS_DIR, 'title-banner.jpg'));
  const subjectImageUrl = fileToDataUrl(join(ASSETS_DIR, 'subject.png'));
  const epHeader = `FBF Podcast EP${String(episodeNumber).padStart(3, '0')} — ${title}`;

  const html = template
    .replaceAll('{{TITLE}}', escapeHtml(epHeader))
    .replaceAll('{{TITLE_BANNER_DATA_URL}}', titleBannerUrl)
    .replaceAll('{{SUBJECT_IMAGE_DATA_URL}}', subjectImageUrl)
    .replaceAll('{{EPISODE_HEADER}}', escapeHtml(epHeader))
    .replaceAll('{{SPEAKER_BLOCKS}}', scriptToSpeakerBlocks(script));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.75in', bottom: '1in', left: '0.75in' },
      displayHeaderFooter: false, // footer is in @page CSS
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 3: Verify both files parse**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/pipeline/render-pdf.mjs
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/templates/episode.html podcast/pipeline/render-pdf.mjs
git commit -m "podcast: add HTML template and Puppeteer PDF renderer

Brand-faithful template:
- Black background (#0a0a0a)
- Orange title (#f97316) and accent rule
- Title banner + subject image inlined as base64 data URLs (PDF is
  self-contained)
- Per-page footer disclaimer via @page CSS
- Speaker headers in orange with thin grey rule above

renderEpisode() takes a polished script + metadata and returns PDF
bytes. scriptToSpeakerBlocks() splits the script on [HOST] markers
and emits div.speaker-block elements.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Write modes/deep-dive.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\modes\deep-dive.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/modes/deep-dive.mjs
//
// Mon mode. Orchestrates: pop topic → outline → segments → polish →
// quality-gate → render → save.
//
// Resume support: if .work/<EPID>/ has partial outputs, skips already-done
// stages. Resume key is the working dir name (the episode ID).

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { outline as runOutline } from '../pipeline/outline.mjs';
import { writeSegment } from '../pipeline/segments.mjs';
import { polish } from '../pipeline/polish.mjs';
import { check as qualityCheck } from '../pipeline/quality-gate.mjs';
import { renderEpisode } from '../pipeline/render-pdf.mjs';
import { peekNext, markDone, markKilled } from '../pipeline/topic-queue.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PODCAST_DIR = join(__dirname, '..');
const WORK_DIR = join(PODCAST_DIR, '.work');
const FINAL_DIR = join(PODCAST_DIR, 'final');
const KILLED_DIR = join(PODCAST_DIR, 'killed');
const TOPICS_PATH = join(PODCAST_DIR, 'topics.md');
const EPNUM_PATH = join(PODCAST_DIR, 'episode-numbers.json');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function nextEpisodeNumber() {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  return data.lastUsed + 1;
}

function bumpEpisodeNumber(to) {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  data.lastUsed = to;
  writeFileSync(EPNUM_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function epId(num) {
  return `EP${String(num).padStart(3, '0')}`;
}

export async function runDeepDive({ topicOverride = null, resumeEpId = null } = {}) {
  // 1. Topic
  let topic;
  if (topicOverride) {
    topic = { title: topicOverride, type: 'deep-dive', notes: '(override)' };
  } else {
    topic = peekNext(TOPICS_PATH, 'deep-dive');
    if (!topic) throw new Error('No deep-dive topics in queue');
  }

  // 2. Episode number (or resume)
  let epNum;
  if (resumeEpId) {
    epNum = parseInt(resumeEpId.replace(/^EP/i, ''), 10);
  } else {
    epNum = nextEpisodeNumber();
  }
  const id = epId(epNum);
  const work = join(WORK_DIR, id);
  mkdirSync(work, { recursive: true });

  console.log(`🎙️  Deep dive ${id}: "${topic.title}"`);

  // 3. Outline (skip if cached)
  const outlinePath = join(work, 'outline.json');
  let ol;
  if (existsSync(outlinePath)) {
    ol = JSON.parse(readFileSync(outlinePath, 'utf8'));
    console.log(`  ↻ Reusing cached outline (${ol.segments.length} segments)`);
  } else {
    console.log('  📋 Outlining...');
    ol = await runOutline({ type: 'deep-dive', topic });
    writeFileSync(outlinePath, JSON.stringify(ol, null, 2), 'utf8');
    console.log(`  ✅ Outline: ${ol.segments.length} segments`);
  }

  // 4. Segments (sequential, resume-aware)
  let prevText = '';
  for (let i = 0; i < ol.segments.length; i++) {
    const segPath = join(work, `segment-${i}.md`);
    if (existsSync(segPath)) {
      prevText = readFileSync(segPath, 'utf8');
      console.log(`  ↻ Reusing segment ${i + 1}/${ol.segments.length}`);
      continue;
    }
    console.log(`  ✏️  Segment ${i + 1}/${ol.segments.length}: ${ol.segments[i].theme}`);
    const segText = await writeSegment({ outline: ol, index: i, prevSegmentText: prevText });
    writeFileSync(segPath, segText, 'utf8');
    prevText = segText;
  }

  // 5. Stitch + polish
  const segmentTexts = ol.segments.map((_, i) =>
    readFileSync(join(work, `segment-${i}.md`), 'utf8').trim()
  );
  const rawScript = segmentTexts.join('\n\n');
  writeFileSync(join(work, 'raw-script.md'), rawScript, 'utf8');

  const polishedPath = join(work, 'final-script.md');
  let polished;
  if (existsSync(polishedPath)) {
    polished = readFileSync(polishedPath, 'utf8');
    console.log('  ↻ Reusing polished script');
  } else {
    console.log('  🪞 Polishing...');
    polished = await polish({ rawScript });
    writeFileSync(polishedPath, polished, 'utf8');
  }

  // 6. Quality gate
  const gateResult = qualityCheck(polished, 'deep-dive');
  if (!gateResult.pass) {
    console.log('  ❌ Quality gate FAILED:');
    gateResult.reasons.forEach(r => console.log(`     - ${r}`));
    const slug = slugify(topic.title);
    const killedPath = join(KILLED_DIR, `${id}-${slug}`);
    mkdirSync(KILLED_DIR, { recursive: true });
    renameSync(work, killedPath);
    writeFileSync(join(killedPath, 'quality-fail.txt'), gateResult.reasons.join('\n'), 'utf8');
    if (!topicOverride) {
      markKilled(TOPICS_PATH, topic.title, gateResult.reasons[0] || 'quality-gate failure');
    }
    return { status: 'killed', reasons: gateResult.reasons, killedPath };
  }
  console.log('  ✅ Quality gate passed');

  // 7. Render PDF
  console.log('  📄 Rendering PDF...');
  const pdfBytes = await renderEpisode({
    script: polished,
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: 'deep-dive',
  });

  // 8. Move to final/
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(ol.episodeTitle);
  const finalDir = join(FINAL_DIR, `${date}-${id}-${slug}`);
  mkdirSync(finalDir, { recursive: true });

  writeFileSync(join(finalDir, `${id}.pdf`), pdfBytes);
  writeFileSync(join(finalDir, `${id}.script.md`), polished, 'utf8');
  writeFileSync(join(finalDir, `${id}.meta.json`), JSON.stringify({
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: 'deep-dive',
    topic: topic.title,
    generatedAt: new Date().toISOString(),
    wordCount: (polished.match(/\S+/g) || []).length,
  }, null, 2), 'utf8');

  // 9. Bump state
  bumpEpisodeNumber(epNum);
  if (!topicOverride) {
    markDone(TOPICS_PATH, topic.title, id);
  }

  console.log(`  ✅ Published: ${join(finalDir, id)}.pdf`);
  return {
    status: 'published',
    pdfPath: join(finalDir, `${id}.pdf`),
    episodeNumber: epNum,
    title: ol.episodeTitle,
  };
}
```

- [ ] **Step 2: Verify it parses**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/modes/deep-dive.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/modes/deep-dive.mjs
git commit -m "podcast: add deep-dive mode (Monday)

Orchestrates the full pipeline:
  pop topic → outline → segments → polish → quality-gate → render → save.

Resume support via .work/<EPID>/ caching — re-runs skip already-completed
stages. Quality-gate failure moves the working dir to killed/<EPID>/
with a quality-fail.txt and releases the episode number + leaves topic
available. Success bumps the episode counter and marks topic done.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Write modes/clinical-trials.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\modes\clinical-trials.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/modes/clinical-trials.mjs
//
// Wed mode. Same pipeline as deep-dive but uses outline-clinical prompt
// and the 'clinical-trials' type for quality-gate + topic-queue.
//
// 90% of this file is identical to deep-dive.mjs. We DO NOT abstract — the
// duplication is intentional so each mode is self-contained and easy to
// reason about; future divergence (e.g., Wed-specific length checks) will
// land in just one place. Per the YAGNI principle.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { outline as runOutline } from '../pipeline/outline.mjs';
import { writeSegment } from '../pipeline/segments.mjs';
import { polish } from '../pipeline/polish.mjs';
import { check as qualityCheck } from '../pipeline/quality-gate.mjs';
import { renderEpisode } from '../pipeline/render-pdf.mjs';
import { peekNext, markDone, markKilled } from '../pipeline/topic-queue.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PODCAST_DIR = join(__dirname, '..');
const WORK_DIR = join(PODCAST_DIR, '.work');
const FINAL_DIR = join(PODCAST_DIR, 'final');
const KILLED_DIR = join(PODCAST_DIR, 'killed');
const TOPICS_PATH = join(PODCAST_DIR, 'topics.md');
const EPNUM_PATH = join(PODCAST_DIR, 'episode-numbers.json');

const TYPE = 'clinical-trials';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function nextEpisodeNumber() {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  return data.lastUsed + 1;
}

function bumpEpisodeNumber(to) {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  data.lastUsed = to;
  writeFileSync(EPNUM_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function epId(num) {
  return `EP${String(num).padStart(3, '0')}`;
}

export async function runClinicalTrials({ topicOverride = null, resumeEpId = null } = {}) {
  let topic;
  if (topicOverride) {
    topic = { title: topicOverride, type: TYPE, notes: '(override)' };
  } else {
    topic = peekNext(TOPICS_PATH, TYPE);
    if (!topic) throw new Error(`No ${TYPE} topics in queue`);
  }

  let epNum = resumeEpId ? parseInt(resumeEpId.replace(/^EP/i, ''), 10) : nextEpisodeNumber();
  const id = epId(epNum);
  const work = join(WORK_DIR, id);
  mkdirSync(work, { recursive: true });

  console.log(`🧪 Clinical trials ${id}: "${topic.title}"`);

  const outlinePath = join(work, 'outline.json');
  let ol;
  if (existsSync(outlinePath)) {
    ol = JSON.parse(readFileSync(outlinePath, 'utf8'));
    console.log(`  ↻ Reusing cached outline (${ol.segments.length} segments)`);
  } else {
    console.log('  📋 Outlining...');
    ol = await runOutline({ type: TYPE, topic });
    writeFileSync(outlinePath, JSON.stringify(ol, null, 2), 'utf8');
    console.log(`  ✅ Outline: ${ol.segments.length} segments`);
  }

  let prevText = '';
  for (let i = 0; i < ol.segments.length; i++) {
    const segPath = join(work, `segment-${i}.md`);
    if (existsSync(segPath)) {
      prevText = readFileSync(segPath, 'utf8');
      console.log(`  ↻ Reusing segment ${i + 1}/${ol.segments.length}`);
      continue;
    }
    console.log(`  ✏️  Segment ${i + 1}/${ol.segments.length}: ${ol.segments[i].theme}`);
    const segText = await writeSegment({ outline: ol, index: i, prevSegmentText: prevText });
    writeFileSync(segPath, segText, 'utf8');
    prevText = segText;
  }

  const segmentTexts = ol.segments.map((_, i) =>
    readFileSync(join(work, `segment-${i}.md`), 'utf8').trim()
  );
  const rawScript = segmentTexts.join('\n\n');
  writeFileSync(join(work, 'raw-script.md'), rawScript, 'utf8');

  const polishedPath = join(work, 'final-script.md');
  let polished;
  if (existsSync(polishedPath)) {
    polished = readFileSync(polishedPath, 'utf8');
    console.log('  ↻ Reusing polished script');
  } else {
    console.log('  🪞 Polishing...');
    polished = await polish({ rawScript });
    writeFileSync(polishedPath, polished, 'utf8');
  }

  const gateResult = qualityCheck(polished, TYPE);
  if (!gateResult.pass) {
    console.log('  ❌ Quality gate FAILED:');
    gateResult.reasons.forEach(r => console.log(`     - ${r}`));
    const slug = slugify(topic.title);
    const killedPath = join(KILLED_DIR, `${id}-${slug}`);
    mkdirSync(KILLED_DIR, { recursive: true });
    renameSync(work, killedPath);
    writeFileSync(join(killedPath, 'quality-fail.txt'), gateResult.reasons.join('\n'), 'utf8');
    if (!topicOverride) {
      markKilled(TOPICS_PATH, topic.title, gateResult.reasons[0] || 'quality-gate failure');
    }
    return { status: 'killed', reasons: gateResult.reasons, killedPath };
  }
  console.log('  ✅ Quality gate passed');

  console.log('  📄 Rendering PDF...');
  const pdfBytes = await renderEpisode({
    script: polished,
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: TYPE,
  });

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(ol.episodeTitle);
  const finalDir = join(FINAL_DIR, `${date}-${id}-${slug}`);
  mkdirSync(finalDir, { recursive: true });

  writeFileSync(join(finalDir, `${id}.pdf`), pdfBytes);
  writeFileSync(join(finalDir, `${id}.script.md`), polished, 'utf8');
  writeFileSync(join(finalDir, `${id}.meta.json`), JSON.stringify({
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: TYPE,
    topic: topic.title,
    generatedAt: new Date().toISOString(),
    wordCount: (polished.match(/\S+/g) || []).length,
  }, null, 2), 'utf8');

  bumpEpisodeNumber(epNum);
  if (!topicOverride) {
    markDone(TOPICS_PATH, topic.title, id);
  }

  console.log(`  ✅ Published: ${join(finalDir, id)}.pdf`);
  return {
    status: 'published',
    pdfPath: join(finalDir, `${id}.pdf`),
    episodeNumber: epNum,
    title: ol.episodeTitle,
  };
}
```

- [ ] **Step 2: Verify**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/modes/clinical-trials.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/modes/clinical-trials.mjs
git commit -m "podcast: add clinical-trials mode (Wednesday)

Same pipeline as deep-dive but uses outline-clinical prompt and the
'clinical-trials' quality-gate type (2,500-word minimum vs 4,000).
Duplication with deep-dive.mjs is intentional — YAGNI; we'll abstract
when divergence demands it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Write modes/recap.mjs

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\modes\recap.mjs`

- [ ] **Step 1: Write the implementation**

```js
// podcast/modes/recap.mjs
//
// Fri mode. Reads this week's Mon (deep-dive) and Wed (clinical-trials)
// episodes from final/, generates a ~10-min recap.
//
// Strict dependency: if EITHER weekday episode is missing from final/, the
// mode exits with status='skipped' and no episode is generated.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { outline as runOutline } from '../pipeline/outline.mjs';
import { writeSegment } from '../pipeline/segments.mjs';
import { polish } from '../pipeline/polish.mjs';
import { check as qualityCheck } from '../pipeline/quality-gate.mjs';
import { renderEpisode } from '../pipeline/render-pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PODCAST_DIR = join(__dirname, '..');
const WORK_DIR = join(PODCAST_DIR, '.work');
const FINAL_DIR = join(PODCAST_DIR, 'final');
const KILLED_DIR = join(PODCAST_DIR, 'killed');
const EPNUM_PATH = join(PODCAST_DIR, 'episode-numbers.json');

const TYPE = 'recap';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function nextEpisodeNumber() {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  return data.lastUsed + 1;
}

function bumpEpisodeNumber(to) {
  const data = JSON.parse(readFileSync(EPNUM_PATH, 'utf8'));
  data.lastUsed = to;
  writeFileSync(EPNUM_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function epId(num) {
  return `EP${String(num).padStart(3, '0')}`;
}

function findThisWeekEpisode(targetType) {
  // Scan final/ for the most recent folder whose meta.json reports
  // type=targetType AND generatedAt is within the last 6 days.
  if (!existsSync(FINAL_DIR)) return null;
  const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
  const candidates = [];
  for (const name of readdirSync(FINAL_DIR)) {
    const dir = join(FINAL_DIR, name);
    const metaPath = join(dir, `${name.split('-').slice(3).join('-')}.meta.json`);
    // ^ that's a guess based on naming; safer: look for any *.meta.json in the folder
    let meta;
    try {
      const metaFiles = readdirSync(dir).filter(f => f.endsWith('.meta.json'));
      if (metaFiles.length === 0) continue;
      meta = JSON.parse(readFileSync(join(dir, metaFiles[0]), 'utf8'));
    } catch { continue; }

    if (meta.type !== targetType) continue;
    const ts = Date.parse(meta.generatedAt);
    if (Number.isNaN(ts) || ts < sixDaysAgo) continue;
    candidates.push({ dir, meta, ts });
  }
  if (candidates.length === 0) return null;
  // Most recent
  candidates.sort((a, b) => b.ts - a.ts);
  const winner = candidates[0];
  // Find the script.md alongside
  const scriptFiles = readdirSync(winner.dir).filter(f => f.endsWith('.script.md'));
  if (scriptFiles.length === 0) return null;
  return {
    title: winner.meta.title,
    script: readFileSync(join(winner.dir, scriptFiles[0]), 'utf8'),
    dir: winner.dir,
  };
}

export async function runRecap({ resumeEpId = null } = {}) {
  const monday = findThisWeekEpisode('deep-dive');
  const wednesday = findThisWeekEpisode('clinical-trials');

  if (!monday || !wednesday) {
    console.log('🚫 Skipping recap — missing weekday episode(s):');
    console.log(`   Mon (deep-dive):     ${monday ? '✅ ' + monday.title : '❌ MISSING'}`);
    console.log(`   Wed (clinical):      ${wednesday ? '✅ ' + wednesday.title : '❌ MISSING'}`);
    return {
      status: 'skipped',
      reason: `Missing ${[!monday && 'Mon', !wednesday && 'Wed'].filter(Boolean).join(' + ')}`,
    };
  }

  let epNum = resumeEpId ? parseInt(resumeEpId.replace(/^EP/i, ''), 10) : nextEpisodeNumber();
  const id = epId(epNum);
  const work = join(WORK_DIR, id);
  mkdirSync(work, { recursive: true });

  console.log(`📰 Recap ${id}: covering "${monday.title}" + "${wednesday.title}"`);

  const sourceMaterial = {
    mondayTitle: monday.title,
    mondayScript: monday.script,
    wednesdayTitle: wednesday.title,
    wednesdayScript: wednesday.script,
  };

  const outlinePath = join(work, 'outline.json');
  let ol;
  if (existsSync(outlinePath)) {
    ol = JSON.parse(readFileSync(outlinePath, 'utf8'));
    console.log(`  ↻ Reusing cached outline (${ol.segments.length} segments)`);
  } else {
    console.log('  📋 Outlining...');
    ol = await runOutline({ type: TYPE, topic: { title: 'Weekly Recap', notes: '' }, sourceMaterial });
    writeFileSync(outlinePath, JSON.stringify(ol, null, 2), 'utf8');
    console.log(`  ✅ Outline: ${ol.segments.length} segments`);
  }

  let prevText = '';
  for (let i = 0; i < ol.segments.length; i++) {
    const segPath = join(work, `segment-${i}.md`);
    if (existsSync(segPath)) {
      prevText = readFileSync(segPath, 'utf8');
      console.log(`  ↻ Reusing segment ${i + 1}/${ol.segments.length}`);
      continue;
    }
    console.log(`  ✏️  Segment ${i + 1}/${ol.segments.length}: ${ol.segments[i].theme}`);
    const segText = await writeSegment({ outline: ol, index: i, prevSegmentText: prevText });
    writeFileSync(segPath, segText, 'utf8');
    prevText = segText;
  }

  const segmentTexts = ol.segments.map((_, i) =>
    readFileSync(join(work, `segment-${i}.md`), 'utf8').trim()
  );
  const rawScript = segmentTexts.join('\n\n');
  writeFileSync(join(work, 'raw-script.md'), rawScript, 'utf8');

  const polishedPath = join(work, 'final-script.md');
  let polished;
  if (existsSync(polishedPath)) {
    polished = readFileSync(polishedPath, 'utf8');
    console.log('  ↻ Reusing polished script');
  } else {
    console.log('  🪞 Polishing...');
    polished = await polish({ rawScript });
    writeFileSync(polishedPath, polished, 'utf8');
  }

  const gateResult = qualityCheck(polished, TYPE);
  if (!gateResult.pass) {
    console.log('  ❌ Quality gate FAILED:');
    gateResult.reasons.forEach(r => console.log(`     - ${r}`));
    const slug = slugify(ol.episodeTitle);
    const killedPath = join(KILLED_DIR, `${id}-${slug}`);
    mkdirSync(KILLED_DIR, { recursive: true });
    renameSync(work, killedPath);
    writeFileSync(join(killedPath, 'quality-fail.txt'), gateResult.reasons.join('\n'), 'utf8');
    return { status: 'killed', reasons: gateResult.reasons, killedPath };
  }
  console.log('  ✅ Quality gate passed');

  console.log('  📄 Rendering PDF...');
  const pdfBytes = await renderEpisode({
    script: polished,
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: TYPE,
  });

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(ol.episodeTitle);
  const finalDir = join(FINAL_DIR, `${date}-${id}-${slug}`);
  mkdirSync(finalDir, { recursive: true });

  writeFileSync(join(finalDir, `${id}.pdf`), pdfBytes);
  writeFileSync(join(finalDir, `${id}.script.md`), polished, 'utf8');
  writeFileSync(join(finalDir, `${id}.meta.json`), JSON.stringify({
    episodeNumber: epNum,
    title: ol.episodeTitle,
    type: TYPE,
    sourceMonday: monday.title,
    sourceWednesday: wednesday.title,
    generatedAt: new Date().toISOString(),
    wordCount: (polished.match(/\S+/g) || []).length,
  }, null, 2), 'utf8');

  bumpEpisodeNumber(epNum);

  console.log(`  ✅ Published: ${join(finalDir, id)}.pdf`);
  return {
    status: 'published',
    pdfPath: join(finalDir, `${id}.pdf`),
    episodeNumber: epNum,
    title: ol.episodeTitle,
  };
}
```

- [ ] **Step 2: Verify**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/modes/recap.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/modes/recap.mjs
git commit -m "podcast: add recap mode (Friday)

Reads this week's Mon (deep-dive) and Wed (clinical-trials) episodes
from final/ — finds them by scanning meta.json files and matching
generatedAt within last 6 days. If either is missing, exits with
status=skipped (no work done, no episode number consumed).

Otherwise feeds both full scripts into the recap outline pass and runs
the standard pipeline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Write run.mjs (entry point)

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\run.mjs`

- [ ] **Step 1: Write the implementation**

```js
#!/usr/bin/env node
import 'dotenv/config';
// ============================================================
// FBF Podcast Generator — CLI Entry Point
// ============================================================
// Usage:
//   node run.mjs --mode deep-dive
//   node run.mjs --mode clinical-trials
//   node run.mjs --mode recap
//   node run.mjs --mode deep-dive --topic "Custom Topic Title"
//   node run.mjs --resume EP005
//   node run.mjs --smoke
// ============================================================

import { preflight } from '../council/preflight.mjs';
import { runDeepDive } from './modes/deep-dive.mjs';
import { runClinicalTrials } from './modes/clinical-trials.mjs';
import { runRecap } from './modes/recap.mjs';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const mode = getArg('--mode');
const topicOverride = getArg('--topic');
const resumeEpId = getArg('--resume');
const smoke = hasFlag('--smoke');

async function main() {
  console.log('\n🎙️  ═══════════════════════════════════════════════════');
  console.log('🎙️  FBF Podcast Generator');
  console.log('🎙️  ═══════════════════════════════════════════════════\n');

  try {
    await preflight();
  } catch (err) {
    console.error(`\n❌ Preflight failed: ${err.message}`);
    process.exit(1);
  }

  if (smoke) {
    // Smoke test: just runs the outline pass for a tiny test topic.
    const { outline } = await import('./pipeline/outline.mjs');
    console.log('🧪 Smoke test: outline only for a test topic...\n');
    const ol = await outline({
      type: 'deep-dive',
      topic: { title: 'Smoke Test Topic', notes: 'Testing the LLM + adapter wiring.' },
    });
    console.log('\n✅ Outline returned:');
    console.log('  Title:', ol.episodeTitle);
    console.log('  Segments:', ol.segments.length);
    ol.segments.forEach((s, i) => console.log(`    ${i + 1}. ${s.theme}`));
    console.log('\n✅ Smoke test passed.\n');
    return;
  }

  if (!['deep-dive', 'clinical-trials', 'recap'].includes(mode)) {
    console.error(`❌ --mode must be one of: deep-dive, clinical-trials, recap`);
    console.error(`   (got: ${mode || '(none)'})`);
    process.exit(1);
  }

  let result;
  try {
    if (mode === 'deep-dive') {
      result = await runDeepDive({ topicOverride, resumeEpId });
    } else if (mode === 'clinical-trials') {
      result = await runClinicalTrials({ topicOverride, resumeEpId });
    } else if (mode === 'recap') {
      result = await runRecap({ resumeEpId });
    }
  } catch (err) {
    console.error(`\n❌ ${mode} failed: ${err.message}`);
    console.error(err.stack);
    process.exit(3);
  }

  if (result.status === 'killed') {
    console.log(`\n⚠️  Episode killed by quality gate: ${result.killedPath}`);
    process.exit(2);
  }
  if (result.status === 'skipped') {
    console.log(`\n🚫 Recap skipped: ${result.reason}`);
    process.exit(0);
  }

  console.log(`\n✅ ${result.title} (${result.pdfPath})\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
```

- [ ] **Step 2: Verify**

```bash
node --check /c/Users/Antonelli/fbf-client-app/podcast/run.mjs
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/run.mjs
git commit -m "podcast: add run.mjs CLI entry point

Args:
  --mode deep-dive | clinical-trials | recap  (required unless --smoke)
  --topic 'Override Title'                    (skip topic queue)
  --resume EPNNN                              (resume from .work/EPNNN/)
  --smoke                                     (outline-only smoke test)

Exit codes:
  0 = success / soft-skip
  1 = preflight failure
  2 = quality-gate rejection
  3 = mid-pipeline failure (resumable)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Smoke test

**Files:** none — verification

- [ ] **Step 1: Run smoke**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npm run podcast:smoke
```

Expected output:
- Preflight checks pass (Ollama up, qwen2.5:32b available)
- Smoke header prints
- Outline returns with `episodeTitle` and `segments` array of 8-10 entries
- "Smoke test passed."
- Wall time: ~30-60s

If outline parsing fails (LLM returned non-JSON), inspect the error and tune the outline prompt if necessary. Common failure: model wraps the JSON in markdown code fences — `outline.mjs:stripJsonFences` already handles this. If still failing, the system-base prompt may need a more emphatic "raw JSON only" instruction.

- [ ] **Step 2: If smoke fails, tune prompts and re-run**

If the failure is in the system prompt or outline prompt, edit the relevant file in `podcast/prompts/` and re-run smoke. No commit needed for prompt iteration in this step — just iterate to green.

- [ ] **Step 3: When smoke passes, commit any prompt tweaks**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add -A podcast/prompts/
git diff --cached podcast/prompts/ | head -50  # sanity-check the diff
git commit -m "podcast: tune prompts based on smoke test (if any)"
# or skip this step if no prompt changes were needed
```

---

## Task 18: First real episode (deep-dive EP003)

**Files:** none — verification + first publication

- [ ] **Step 1: Generate the first deep-dive**

The first deep-dive topic from the queue is "Bimagrumab and the Myostatin Inhibitor Story." Let it run.

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npm run podcast:now -- --mode deep-dive
```

Expected wall time: 12-18 minutes on a warm 3090. Console output streams a per-stage progress log.

Possible outcomes:
- **Published** → `podcast/final/<date>-EP003-<slug>/` contains `EP003.pdf`, `EP003.script.md`, `EP003.meta.json`. Episode-numbers bumped to 3. Topic marked done.
- **Killed by quality gate** → `podcast/killed/EP003-<slug>/` with `quality-fail.txt`. Topic released. Episode number not consumed. Read `quality-fail.txt` and decide: tune prompts, then re-run.
- **Mid-pipeline failure** → resume with `npm run podcast:resume -- EP003`.

- [ ] **Step 2: Read the PDF**

Open `podcast/final/<date>-EP003-<slug>/EP003.pdf` in your default PDF viewer. Read it cover to cover.

Quality questions:
1. Does it sound like Coach / Anvil / Onyx, or generic Qwen?
2. Did it hit ~5,000 words?
3. Are the citations realistic (real journal names, plausible authors)?
4. Did it use phonetic respellings on first mention?
5. Does the brand template match EP001/EP002 visually?
6. Did it close with "Execute or don't."?

- [ ] **Step 3: If quality is acceptable, proceed**

No commit needed — generated artifacts are gitignored.

- [ ] **Step 4: If quality is unacceptable, iterate**

The levers are the prompts (`podcast/prompts/`). Common tunings:
- Voice off → strengthen host personality descriptions in `system-base.md`
- Too short → bump `maxTokens` in `segments.mjs` or push for longer segments in `segment.md`
- Too repetitive → add explicit "do not restate the previous segment's points" in `segment.md`
- Bad citations → add explicit "if you cannot cite a real source, attribute generically" in `system-base.md`

After tuning, delete the `podcast/final/<date>-EP003-<slug>/` folder, run `git checkout podcast/topics.md podcast/episode-numbers.json` to revert state, and re-run.

When happy, commit any final prompt tweaks:

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/prompts/
git commit -m "podcast: tune prompts based on EP003 review (if any)"
```

---

## Task 19: Generate clinical-trials EP004

**Files:** none — verification

- [ ] **Step 1: Generate**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npm run podcast:now -- --mode clinical-trials
```

Expected wall time: 10-14 min. The first clinical-trials topic in queue is "Retatrutide TRIUMPH Phase 3 Interim Update."

- [ ] **Step 2: Review the PDF**

Same quality checks as Task 18, plus:
- Does Onyx carry more weight than in deep-dive? (Should — clinical episodes feature data heavily.)
- Are the trial name references (TRIUMPH) and Phase callouts present?

- [ ] **Step 3: Iterate prompts if needed; otherwise proceed**

---

## Task 20: Generate Friday recap EP005

**Files:** none — verification

- [ ] **Step 1: Generate**

```bash
cd /c/Users/Antonelli/fbf-client-app/council
npm run podcast:now -- --mode recap
```

Expected wall time: 5-7 min. Should auto-find the EP003 (Mon) and EP004 (Wed) we just produced.

- [ ] **Step 2: Review the PDF**

Quality check: does the recap actually reference the specific topics from EP003 + EP004, or is it generic? It should pull 2 takeaways from each by name.

- [ ] **Step 3: Iterate prompts if needed**

---

## Task 21: Write setup-tasks.ps1

**Files:**
- Create: `C:\Users\Antonelli\fbf-client-app\podcast\setup-tasks.ps1`

- [ ] **Step 1: Write the script**

```powershell
# ============================================================
# Register the 3 FBF Podcast scheduled tasks on Windows
# ============================================================
# Run as Bryan's user (no admin elevation needed).
# Re-running this script overwrites all 3 existing registrations.
# ============================================================

$NodePath  = (Get-Command node).Source
$RunScript = "C:\Users\Antonelli\fbf-client-app\podcast\run.mjs"
$WorkDir   = "C:\Users\Antonelli\fbf-client-app\council"
# WorkDir is council/ because that's where node_modules and package.json live.
# run.mjs lives in podcast/ but the runtime needs council/ in scope for deps.

if (-not (Test-Path $RunScript)) {
    Write-Error "podcast/run.mjs not found at $RunScript. Aborting."
    exit 1
}

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -WakeToRun `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 60) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

$Principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

function Register-PodcastTask {
    param(
        [string]$TaskName,
        [string]$Mode,
        [string]$DayOfWeek
    )

    $Action = New-ScheduledTaskAction `
        -Execute $NodePath `
        -Argument "`"$RunScript`" --mode $Mode" `
        -WorkingDirectory $WorkDir

    $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At 10:30am

    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed existing task '$TaskName'."
    }

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description "FBF Podcast $Mode generator. Runs weekly via local Ollama."

    Write-Host "Registered '$TaskName' for $DayOfWeek 10:30 ($Mode)"
}

Register-PodcastTask -TaskName "FBF Podcast Mon Deep Dive" -Mode "deep-dive" -DayOfWeek "Monday"
Register-PodcastTask -TaskName "FBF Podcast Wed Clinical"  -Mode "clinical-trials" -DayOfWeek "Wednesday"
Register-PodcastTask -TaskName "FBF Podcast Fri Recap"     -Mode "recap" -DayOfWeek "Friday"

Write-Host ""
Write-Host "All 3 podcast tasks registered. View:"
Write-Host "  Get-ScheduledTask -TaskName 'FBF Podcast*'"
Write-Host "Run a single task now:"
Write-Host "  Start-ScheduledTask -TaskName 'FBF Podcast Mon Deep Dive'"
Write-Host "Remove all 3:"
Write-Host "  Get-ScheduledTask -TaskName 'FBF Podcast*' | Unregister-ScheduledTask -Confirm:`$false"
```

- [ ] **Step 2: Commit (don't run yet)**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add podcast/setup-tasks.ps1
git commit -m "podcast: add setup-tasks.ps1 for Mon/Wed/Fri 10:30 schedule

Registers 3 Windows scheduled tasks via Register-ScheduledTask.
Same task settings as the council schedule: run only when user logged
on, wake-to-run, catch-up-if-missed, restart 3x on failure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: Register the scheduled tasks

**Files:** none

- [ ] **Step 1: Run the registration script**

```powershell
cd C:\Users\Antonelli\fbf-client-app\podcast
.\setup-tasks.ps1
```

Expected: prints "Registered 'FBF Podcast Mon Deep Dive' for Monday 10:30 (deep-dive)" three times (once per day).

If "execution policy" error: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, then retry.

- [ ] **Step 2: Verify all 3 registered**

```powershell
Get-ScheduledTask -TaskName "FBF Podcast*" | Select-Object TaskName, State, @{n='NextRun';e={(Get-ScheduledTaskInfo $_).NextRunTime}}
```

Expected: 3 rows, all `State: Ready`, NextRun fields show next Mon/Wed/Fri at 10:30.

- [ ] **Step 3: Do NOT trigger a manual run**

(Same logic as the council Task 17 — manual triggers consume real Qwen 32B time and the user is unattended. The Mon/Wed/Fri schedule will fire on its own; first real fire is whichever weekday comes next.)

---

## Task 23: Move spec/plan into docs and final commit

**Files:**
- Already in repo: `docs/superpowers/specs/2026-05-03-podcast-generator-design.md` (Task 0 of brainstorm)
- Already in repo: `docs/superpowers/plans/2026-05-03-podcast-generator.md` (this file)

- [ ] **Step 1: Verify both exist in the repo**

```bash
ls /c/Users/Antonelli/fbf-client-app/docs/superpowers/specs/2026-05-03-podcast-generator-design.md
ls /c/Users/Antonelli/fbf-client-app/docs/superpowers/plans/2026-05-03-podcast-generator.md
```

- [ ] **Step 2: Commit the plan if not already**

```bash
cd /c/Users/Antonelli/fbf-client-app
git add docs/superpowers/plans/2026-05-03-podcast-generator.md
git status
git diff --cached --stat
git commit -m "docs: add podcast generator implementation plan" 2>&1 | tail -3
# (will be no-op if already committed)
```

- [ ] **Step 3: Final review of all podcast commits**

```bash
cd /c/Users/Antonelli/fbf-client-app
git log --oneline | head -30
```

Expected to see ~20 commits with `podcast:` prefix plus the 2 docs commits.

---

## Task 24: Two-week soak

**Files:** none — observation

- [ ] **Step 1: Let M/W/F 10:30 fire 6 times (2 weeks)**

Each firing produces a new EP in `podcast/final/`. Bryan reads them when he sits down at the PC.

- [ ] **Step 2: Track quality**

Maintain a mental score: of 6 episodes, how many were publishable as-is, how many needed minor edits, how many were unusable?

- [ ] **Step 3: After 2 weeks, decide**

- ≥4/6 publishable → ship; consider v2 (TTS + video)
- 2-3/6 publishable → tune prompts and re-soak for another 2 weeks
- ≤1/6 publishable → revisit the model strategy (tier B/C diversity? larger model? prompt rewrite?)

---

## Self-Review

**Spec coverage check:**
- §1 Goal: Tasks 13-15 produce all three episode types ✅
- §2 Non-goals: confirmed in plan that no TTS/video/upload code is in scope ✅
- §3 Decisions: every choice from the spec is reflected in tasks (workhorse Qwen, 3-pass, autonomous mode) ✅
- §4 Architecture file layout: every file in §4.1 has a creation task ✅
- §4 Module contracts: outline/segments/polish/quality-gate/render-pdf/topic-queue all have explicit task code ✅
- §5 Data flow: tasks 13-15 each implement the flow shown in §5 ✅
- §6 Outputs: PDF + script.md + meta.json triple in tasks 13-15 ✅
- §6.2 PDF brand: task 12 HTML+CSS template ✅
- §6.3 ntfy: NOT YET IMPLEMENTED — gap. The plan doesn't include ntfy notifications (covered for council but not piped through podcast). Adding this is small; including it as a follow-up note rather than blocking the plan.
- §7 Scheduling: tasks 21-22 ✅
- §8 Error handling: per-stage resume in tasks 13-15 (`.work/<EPID>/` check before each stage) ✅
- §9 Authority boundaries: respected (no external publishing, no git push) ✅
- §10 Open items: explicitly carried forward ✅

**Identified gap:** ntfy notifications (spec §6.3). I'll add a small follow-up task to wire ntfy in run.mjs and modes — defer to v2 since the user has Mon/Wed/Fri scheduled jobs that print to console; he'll see the run via Task Scheduler history. Add to out-of-scope follow-ups rather than block this plan.

**Placeholder scan:** No TBD/TODO/FIXME patterns. Every code block is full. Prompt files have well-known `{{PLACEHOLDER}}` template markers (`{{TOPIC_TITLE}}` etc.) but those are functional template syntax, not unfilled prose.

**Type consistency:** `callModel` in `llm.mjs` returns `{content, model, latencyMs, usage}` — matches usage in outline.mjs/segments.mjs/polish.mjs. `outline()` returns `{episodeTitle, segments[]}` — matches usage in deep-dive/clinical-trials/recap modes. `check()` returns `{pass, reasons}` — matches usage in mode files. `peekNext`/`markDone`/`markKilled` signatures match between `topic-queue.mjs` and the modes that call them. `renderEpisode` signature matches between `render-pdf.mjs` and modes.

**One minor inconsistency to note:** Task 13's `bumpEpisodeNumber` is called *after* `markDone`, but if `markDone` throws (topic title not found in topics.md — unlikely if peekNext was used correctly), the episode number won't be bumped despite a successful publish. The PDF still lands in final/. This is acceptable: a re-run will allocate the same number, generate a different (newer-date) folder, and the human will need to clean up the duplicate — but it's a vanishing-rare edge case. Not blocking.

**Plan complete.**
