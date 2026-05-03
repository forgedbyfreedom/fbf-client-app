# FBF Podcast Generator — Design Spec

**Date:** 2026-05-03
**Author:** Bryan Antonelli (with Claude)
**Status:** Approved for implementation planning (autonomous-mode authorized)

---

## 1. Goal

Generate FBF-branded 3-host podcast scripts as PDFs on a 3×/week schedule (Mon/Wed/Fri at 10:30), via local Ollama. Each script matches the established EP001/EP002 brand, voice, and 3-host format ([COACH] / [ANVIL] / [ONYX]) and is auto-published to disk for later use in audio/video production.

Topics cover hot fitness/PED/bodybuilding subjects with weekly emphasis on clinical trials and investigational drugs (myostatin inhibitors, novel GLP-1s, hypertrophy compounds, recovery, sleep, sexual health, alternatives to mental health meds).

## 2. Non-goals

- No audio generation (TTS) in v1 — PDF script only.
- No video assembly in v1 — no title cards, no waveform, no captions.
- No YouTube upload pipeline in v1.
- No web UI / dashboard.
- No multi-language support.
- No real-time research feed integration (PubMed / ClinicalTrials.gov scraping is a v2 idea, not in this spec).
- No replacement of EP001 / EP002 — they stay as reference. New episodes start at EP003.

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Deliverable | PDF script only | Fastest path to a useful artifact; audio/video are downstream layers we can add later. |
| Topic source | Manual queue (`podcast/topics.md`) | Editorial control. Auto-discovery is a separate v2 project. |
| Cadence | 3×/week (Mon/Wed/Fri 10:30) | User pick. 10:30 sequences after the 09:00 council so GPU isn't double-booked. |
| Episode types | Deep-dive (Mon) / Clinical trials (Wed) / Recap (Fri) | Three distinct templates and lengths. |
| Lengths | Mon: 30–45 min (~4,500–6,750 words); Wed: 20–30 min+; Fri: ~10 min (~1,300–1,800 words) | User pick; Wed flexes longer if the trial story warrants. |
| Review/approval | **Auto-publish** to `final/` (autonomous mode) | User unattended. A heuristic auto-quality gate gates publication. Failed scripts go to `killed/`. |
| Friday-recap dependency | Strict: both Mon's and Wed's episodes for the week must have completed successfully | If either failed/killed/missing → skip recap, fire ntfy alert. |
| LLM | `qwen2.5:32b` via the existing `llm.mjs` adapter | Same workhorse as council; already pulled, proven. |
| Generation strategy | Outline → Segments → Polish (3-pass) | Single-shot is unreliable past ~3K tokens; multi-pass gives controllable quality and per-segment recovery. |
| Project location | `podcast/` sibling of `council/` in the same `fbf-client-app` repo | Reuses `llm.mjs`, `preflight.mjs`, env setup. Doesn't entangle with council code paths. |
| Episode numbering | Auto-increment from `EP003` based on `episode-numbers.json`; killed episodes do NOT consume a number | EP001/EP002 already exist as PDFs; continue the sequence. |
| PDF rendering | Puppeteer + HTML+CSS template (`templates/episode.html`) | Pixel-faithful to EP001/EP002 brand; pure Node, no external dependency. |
| Phonetic glossary | `podcast/phonetics.md`, human-maintained, injected into system prompt | Existing scripts use respellings ("Reh-ta-true-tide"); LLM needs a reference. |
| Brand assets | `podcast/assets/title-banner.jpg` (already placed: image1.jpeg), `podcast/assets/subject.png` (auto-cropped from image0.png at build time) | User-supplied. Title banner on every page-1; subject art on every page-1. |

## 4. Architecture

### 4.1 File layout

```
C:\Users\Antonelli\fbf-client-app\
├── council\                       (untouched by this project)
│   ├── llm.mjs                    ← REUSED
│   ├── preflight.mjs              ← REUSED
│   └── ...
└── podcast\                       (NEW)
    ├── run.mjs                    Entry point; CLI args; dispatches to a mode
    ├── modes\
    │   ├── deep-dive.mjs          Mon mode (30–45 min)
    │   ├── clinical-trials.mjs    Wed mode (20–30 min+)
    │   └── recap.mjs              Fri mode (~10 min, reads from final/)
    ├── pipeline\
    │   ├── outline.mjs            Pass 1: structured outline JSON
    │   ├── segments.mjs           Pass 2: writes one segment at a time
    │   ├── polish.mjs             Pass 3: stitch + smooth + verify phonetics
    │   ├── quality-gate.mjs       Auto-quality heuristic check (blocks bad output)
    │   ├── render-pdf.mjs         Puppeteer → branded PDF
    │   ├── crop-subject.mjs       One-time: strip iPhone status bar from raw subject
    │   └── topic-queue.mjs        Read/write topics.md (pop, mark done, mark killed)
    ├── prompts\
    │   ├── system-base.md         Shared system prompt: brand voice, host personalities
    │   ├── outline-deep-dive.md
    │   ├── outline-clinical.md
    │   ├── outline-recap.md
    │   ├── segment.md
    │   └── polish.md
    ├── templates\
    │   └── episode.html           Handlebars template; orange/black brand
    ├── assets\
    │   ├── title-banner.jpg       (placed during design)
    │   ├── subject-raw.png        (placed during design — needs status-bar crop)
    │   └── subject.png            (generated by crop-subject.mjs at install time)
    ├── topics.md                  Manual topic queue (human-edited)
    ├── phonetics.md               Pronunciation glossary
    ├── episode-numbers.json       { lastUsed: 2 } (starts at 2 since EP002 exists)
    ├── setup-tasks.ps1            Registers 3 Windows scheduled tasks
    ├── final\                     Successful episodes auto-land here
    │   └── 2026-05-04-EP003-<slug>\
    │       ├── EP003.pdf
    │       ├── EP003.script.md
    │       └── EP003.meta.json
    ├── killed\                    Quality-gate-rejected episodes land here
    └── .work\                     Per-episode working dirs for resume support
        └── EP003\
            ├── outline.json
            ├── segment-0.md ... segment-N.md
            ├── raw-script.md
            ├── final-script.md
            └── stage.log
```

### 4.2 Module contracts

**`run.mjs`** — CLI entry point
- Args: `--mode <deep-dive|clinical-trials|recap>`, `--topic "<override>"`, `--resume <EPNNN>`, `--smoke`
- Calls `preflight()` from `council/preflight.mjs`
- Loads system prompt + phonetics
- Dispatches to the chosen mode module
- Exit codes: 0 = success, 1 = preflight failure, 2 = quality gate rejection, 3 = mid-pipeline failure (resumable)

**`modes/deep-dive.mjs`** — `runDeepDive({topic, episodeNumber, dryRun}) → {pdfPath, ...}`
- Calls outline → segments → polish → quality-gate → render-pdf
- Length target: 4,500–6,750 words
- Segment count target: 8–10

**`modes/clinical-trials.mjs`** — same shape, different prompt
- Length target: 3,000+ words (no upper cap)
- Segment count target: 6–8
- ONYX role weighted heaviest (study citations)

**`modes/recap.mjs`** — `runRecap({episodeNumber}) → {pdfPath, ...}`
- Reads this week's Mon and Wed episodes from `final/`
- If either missing → exit 0 with skip-ntfy
- Otherwise feeds both `script.md` files into outline pass
- Length target: 1,300–1,800 words
- Segment count target: 3–4

**`pipeline/outline.mjs`** — `outline({type, topic, phonetics, sourceMaterial}) → {title, segments: [{theme, hosts, keyPoints[]}]}`
- Single LLM call (~30s)
- Returns structured JSON; saved to `.work/<EPID>/outline.json`

**`pipeline/segments.mjs`** — `writeSegment({outline, index, prevTail, phonetics}) → string`
- Sequential per segment (Ollama single-GPU)
- Each call gets the full outline + ~400 chars from end of previous segment for transition continuity
- 1 retry on transient error; second failure stalls the run with diagnostics
- Saved to `.work/<EPID>/segment-N.md`

**`pipeline/polish.mjs`** — `polish({fullScript, type, phonetics}) → string`
- Single LLM call over the stitched script
- Smooths transitions, ensures closing line, normalizes phonetic respellings
- Output to `.work/<EPID>/final-script.md`

**`pipeline/quality-gate.mjs`** — `check(script, type) → {pass: bool, reasons: string[]}`
- **Heuristic checks (no LLM call):**
  - Word count >= type-specific minimum (Mon: 4,000; Wed: 2,500; Fri: 1,200)
  - First non-blank line starts with `[COACH]`
  - Closing 200 chars contain "Execute or don't" (or recap variant)
  - Only the three host markers `[COACH]`, `[ANVIL]`, `[ONYX]` appear (no extra speakers)
  - Each host appears at least 3× (no host silenced)
  - No literal "TODO" / "TBD" / placeholder strings
- If any fail → script + reasons go to `killed/<EPID>/` with `quality-fail.txt` listing reasons; episode number released back; topic stays in queue.

**`pipeline/render-pdf.mjs`** — `renderEpisode({script, episodeNumber, title, type, mode}) → pdfBytes`
- Pure: takes script + metadata, returns PDF bytes
- Uses Puppeteer headless Chrome with the HTML template
- Embeds title banner + subject image inline as base64 (works regardless of file:// resolution)

**`pipeline/topic-queue.mjs`**
- `peekNext(type) → {topic, raw} | null` — returns next un-done topic for a type
- `markDone(topic, episodeNumber)` — appends `done: EP003` to that topic's frontmatter
- `markKilled(topic, reason)` — appends `killed: <reason>`
- Human edits the file freely; functions are line-aware

### 4.3 Topic queue format (`topics.md`)

```markdown
## Retatrutide TRIUMPH Phase 3 Update
type: clinical-trials
notes: Cover the new interim data; compare to Phase 2 numbers from EP001.
done:

## Bimagrumab and the Myostatin Story
type: deep-dive
notes: 30-min deep dive; mechanism, history of follistatin work, current status of bima.
done:

## Sleep Optimization for the Enhanced Athlete
type: deep-dive
notes: GH/IGF-1 pulse timing, magnesium glycinate, ashwagandha, peptide-side effects.
done:

## Tesofensine vs CagriSema vs Reta — Head-to-Head Mechanisms
type: deep-dive
done: EP003
killed:
```

`peekNext(type)` returns the first H2 with matching `type:` and no `done:` value. Atomic file-rewrite for the mark step.

### 4.4 Phonetic glossary format (`phonetics.md`)

```markdown
# FBF Podcast Phonetic Respellings

These respellings are injected into the system prompt. The LLM is instructed
to use the respelling on first mention of a term, and the canonical name
thereafter (the audience hears it once, then it's normalized).

| Term | Respelling |
|---|---|
| Retatrutide | Reh-ta-true-tide |
| Tirzepatide | tir-zep-a-tide |
| Semaglutide | sem-a-gloo-tide |
| Bimagrumab | bime-uh-GROO-mab |
| Tesamorelin | tes-uh-MORE-uh-lin |
| Ipamorelin | ip-uh-MORE-uh-lin |
| CJC-1295 | CJC twelve-ninety-five |
| BPC-157 | BPC one-fifty-seven |
| Tesofensine | tess-oh-FEN-seen |
| Survodutide | SUR-voh-DOO-tide |
| Orforglipron | OR-for-GLIP-rohn |
| Apitegromab | a-PEET-uh-GROH-mab |
```

User maintains over time; new terms added as episodes call for them.

## 5. Data flow (per Mon/Wed run)

```
1. Preflight                 ← Ollama + qwen2.5:32b ready
2. Pop topic                 ← topics.md → peekNext(type) (do NOT mark consumed)
3. Allocate episode number   ← episode-numbers.json → next = lastUsed + 1
4. Outline                   ← LLM call → .work/<EPID>/outline.json
5. Write segments            ← Sequential, one per outline segment
                               Saved as .work/<EPID>/segment-N.md
6. Stitch                    ← Concatenate segments → raw-script.md
7. Polish                    ← LLM call → final-script.md
8. Quality gate              ← Heuristic check; if fail → 9-killed
9-success. Render PDF        ← Puppeteer → final/<date>-EPID-<slug>/EPID.pdf
                                Save script.md + meta.json alongside
                                Mark topic done; bump episode number
                                ntfy push: "EP003 published: <title>"
9-killed.   Move .work to    ← killed/<EPID>/ with quality-fail.txt
                                Episode number NOT consumed
                                Topic stays available
                                ntfy push (priority=high): "EP003 quality-rejected: <reasons>"
```

Estimated wall time per long episode: **12–18 minutes** on a warm 3090.

### 5.1 Friday recap-specific flow

```
1. Preflight
2. Identify this week's Monday and Wednesday folders in final/
   (look for date in last 7 days matching mode=deep-dive and mode=clinical-trials)
3. If either is missing → ntfy "no recap — Mon/Wed not finalized" → exit 0
4. Read both script.md files in full
5. Allocate EPID
6. Outline (recap-specific prompt; both scripts as source material)
7. Write segments (3–4 short segments)
8. Polish
9. Quality gate (recap minimum word count: 1,200)
10. Render PDF → final/<date>-EPID-recap-week-XX/EPID.pdf
11. ntfy
```

## 6. Outputs

### 6.1 Per-episode artifacts

```
podcast/final/2026-05-04-EP003-retatrutide-triumph-update/
  ├── EP003.pdf                ← Branded PDF (the deliverable)
  ├── EP003.script.md          ← Plain text mirror (greppable, diffable)
  └── EP003.meta.json          ← {topic, type, model, latencies, tokens, outline, generated_at}
```

### 6.2 PDF brand template

Match EP001/EP002 exactly:
- Black background `#0a0a0a`
- Page 1 hero: title-banner.jpg full-bleed at top (~30% page height); episode number + title in orange `#f97316`; subject.png centered below title block
- Pages 2+: thin orange rule, no banner; episode header repeats as a small wordmark
- Body: each speaker block headed by `[HOST]` in orange (sized large for COACH/ANVIL, slightly smaller for ONYX where it appears inline mid-block — match EP002 hierarchy); body text white-on-dark, 14pt sans
- Per-page footer (every page): `FORGED BY FREEDOM | forgedbyfreedom.com | Educational Use Only — Not Medical Advice`
- @ForgedByFreedom subtitle below page-1 hero

Title banner and subject image are referenced inline via base64-embedded data URLs so PDF is self-contained.

### 6.3 ntfy notifications

Same topic as council (`fbf-council-bryan-79889dfd43f8`).

| Event | Title | Priority | Body |
|---|---|---|---|
| Episode published | `📜 EP003 published` | default | `<title> · <word count> words · <wall time>` + file:// link |
| Quality-gate fail | `⚠ EP003 quality-rejected` | high | First 2 reasons from quality gate + path to killed folder |
| Friday skip | `🚫 Friday recap skipped` | high | "Mon: <status>; Wed: <status>" |
| Pipeline stall | `⛔ EP003 stalled at <stage>` | high | Resume command: `npm run podcast:resume EP003` |

## 7. Scheduling

Three Windows Task Scheduler entries registered by `setup-tasks.ps1`:

| Name | Day | Time | Command |
|---|---|---|---|
| `FBF Podcast Mon` | Mon | 10:30 | `node podcast/run.mjs --mode deep-dive` |
| `FBF Podcast Wed` | Wed | 10:30 | `node podcast/run.mjs --mode clinical-trials` |
| `FBF Podcast Fri` | Fri | 10:30 | `node podcast/run.mjs --mode recap` |

All three with the same settings: run only when user logged on, wake to run, catch-up if missed, restart on failure 3× × 5 min, stop after 60 min.

10:30 chosen so it lands AFTER the 09:00 council session has finished (~09:45). No GPU contention.

Plus on-demand: `npm run podcast:now -- --mode <type>` and `npm run podcast:resume -- <EPID>`.

## 8. Error handling

### 8.1 Per-stage resume

`.work/<EPID>/` is the resume database. Each completed stage writes a file. `--resume EPID` skips stages whose output exists and runs from the next missing one.

### 8.2 Per-segment retry

`segments.mjs` retries once on transient error (5s backoff). Second failure → write `segment-N.error.txt`, exit code 3, ntfy `priority=high` "EP003 stalled at segment N".

### 8.3 Quality-gate auto-rejection

Failed quality check → move `.work/<EPID>/` to `killed/<EPID>/` with `quality-fail.txt` listing reasons. Episode number released. Topic stays in queue. ntfy alert. Run is "successful" from process perspective (exit 2 — informational), but no episode lands in `final/`.

### 8.4 Friday-skip

Soft skip — exit 0, ntfy informational, no error.

## 9. Authority boundaries (autonomous mode)

User has authorized unattended operation. Within this scope I will:
- Generate, save, ntfy-notify, and auto-publish episodes to `final/`.
- Auto-reject failed-quality episodes to `killed/`.
- Make local commits.

I will NOT, even under autonomous mode:
- `git push origin` — commits stay local until user explicitly authorizes a push.
- Publish to YouTube, Spotify, or any external platform.
- Modify state outside `C:\Users\Antonelli\fbf-client-app\`.
- Spend money (no paid APIs, no app-store actions).

## 10. Open items / risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Qwen 32B output drifts off-brand at 5K+ words | Medium | Multi-pass design (§3) + polish pass + quality gate. Iterate on prompts after EP003. |
| Auto-quality gate is too lax (bad scripts pass) | Medium | First 2 weeks of episodes will surface this; tune the heuristics or add an LLM-as-judge pass. |
| Auto-quality gate is too strict (good scripts killed) | Low | killed/ folder preserves them; user can manually move to final/. |
| Friday recap reads scripts out of context | Medium | Polish pass receives full Mon+Wed; should infer connections. Manual override flag if needed. |
| Phonetic glossary drift | Low | LLM uses respelling on first mention only (per glossary instruction); user grows the file over time. |
| Episode number collision (concurrent runs) | Low | Mode entries scheduled on different days; `episode-numbers.json` reads-bumps-writes atomically. |
| GPU contention with council 09:00 run | Low | 10:30 start gives 45-min cushion. Council can extend to ~09:45 in worst case. |
| Subject image looks wrong cropped | Low | crop-subject.mjs has a defensive crop (top 5% strip removal); user can override `subject.png` directly. |

## 11. Out-of-scope follow-ups

- v2: TTS audio generation (Piper or XTTS-v2 on the 3090)
- v2: Video assembly (title cards, waveform, captions) for YouTube upload
- v2: YouTube Data API direct publish
- v2: PubMed / ClinicalTrials.gov auto-discovery for clinical-trials mode topics
- v2: LLM-as-judge quality gate (replace heuristic with semantic check)
- v2: Multi-host model diversity (Qwen for COACH, llama-8b for ANVIL, gpt-oss for ONYX) — only if voice diversity feels off in the heuristic version
- v2: Manual review web UI (if autonomous mode produces too many bad episodes)

---

**Repo:** `C:\Users\Antonelli\fbf-client-app\` (existing clone)

**Implementation plan to be authored next via `superpowers:writing-plans` skill.**
