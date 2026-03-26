#!/usr/bin/env node
import 'dotenv/config';
// ============================================================
// AI R&D Council — Daily Autonomous Reports
// ============================================================
// Generates and delivers 4 independent daily reports:
//
// 1. 📡 Scout Reeves — AI Intelligence Report (top 10 GitHub/Claude repos)
// 2. 💎 Rena Okoro — Cost Optimization Report (savings, breakeven, audit)
// 3. 👻 Ghost — Raw Materials Sourcing Report (CONFIDENTIAL)
// 4. ⚗️ Dominic Voss — The Brew Sheet (CONFIDENTIAL, cross-refs Ghost)
//
// Usage:
//   node daily-reports.mjs                    # Run all reports
//   node daily-reports.mjs --report scout     # Run one specific report
//   node daily-reports.mjs --report ghost
//   node daily-reports.mjs --report brewer
//   node daily-reports.mjs --report cost
//   node daily-reports.mjs --dry-run          # Generate but don't email
// ============================================================

import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { CONFIG } from './config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey });

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);
const reportArg = getArg('--report') || 'all';
const dryRun = hasFlag('--dry-run');

const today = new Date().toISOString().split('T')[0];
const dateHuman = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Helpers ──────────────────────────────────────────────────
async function callAI(systemPrompt, userPrompt, model = 'gpt-4o', maxTokens = 4000) {
  const isO = model.startsWith('o');
  const params = {
    model,
    messages: isO
      ? [{ role: 'user', content: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
      : [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  };
  if (isO) params.max_completion_tokens = maxTokens;
  else { params.max_tokens = maxTokens; params.temperature = 0.7; }

  const res = await openai.chat.completions.create(params);
  return res.choices[0].message.content;
}

function loadAgentFile(filename) {
  try { return readFileSync(join(__dirname, 'agents', filename), 'utf-8'); } catch { return ''; }
}

function getLatestReport(prefix) {
  const dir = join(__dirname, 'reports');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.includes(prefix)).sort().reverse();
  if (!files.length) return null;
  try { return readFileSync(join(dir, files[0]), 'utf-8'); } catch { return null; }
}

function saveReport(filename, content) {
  const dir = join(__dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content);
  console.log(`  💾 Saved: council/reports/${filename}`);
}

async function sendReportEmail(subject, body, recipients) {
  if (!CONFIG.smtp.user || !CONFIG.smtp.pass) {
    console.log('  ⚠️  SMTP not configured — skipping email');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtp.host, port: CONFIG.smtp.port, secure: CONFIG.smtp.port === 465,
    auth: { user: CONFIG.smtp.user, pass: CONFIG.smtp.pass },
  });
  for (const r of recipients) {
    try {
      await transporter.sendMail({
        from: `"AI R&D Council" <${CONFIG.smtp.user}>`,
        to: `"${r.name}" <${r.email}>`,
        subject, text: body,
        html: `<pre style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;white-space:pre-wrap;max-width:900px">${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`,
      });
      console.log(`  📧 Sent to ${r.name} (${r.email})`);
    } catch (e) { console.error(`  ❌ Email failed for ${r.name}:`, e.message); }
  }
}

async function sendNtfy(title, message, priority = 'default') {
  const { server, topic } = CONFIG.ntfy;
  // Strip emojis from headers (ntfy requires ASCII-safe headers)
  const safeTitle = title.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]/gu, '').trim();
  try {
    await fetch(`${server}/${topic}`, {
      method: 'POST',
      headers: { 'Title': safeTitle, 'Priority': priority, 'Tags': 'clipboard,bell' },
      body: message,
    });
    console.log(`  🔔 ntfy push sent`);
  } catch (e) { console.error(`  ❌ ntfy failed:`, e.message); }
}

// ── REPORT 1: Scout Reeves — AI Intelligence ────────────────
async function runScoutReport() {
  console.log('\n📡 Generating Scout Reeves AI Intelligence Report...');
  const agentDef = loadAgentFile('22-scout-reeves-monitor.md');

  const report = await callAI(
    `${agentDef}\n\nYou are generating your daily AI Intelligence Report. Follow your report template exactly.`,
    `Generate the daily AI Intelligence Report for ${dateHuman}.

Scan for the most relevant new developments in the Claude/Anthropic ecosystem, AI agent frameworks, MCP servers, and tools relevant to a business running:
- React Native + Expo mobile app (FBF fitness coaching)
- Next.js web platform (TAD travel agency)
- Supabase backend
- Claude API for AI coaching and multi-agent orchestration
- OpenAI API for multi-model diversity
- Custom AI R&D Council system with 25 agent members

Focus on:
1. New Claude/Anthropic releases or changes
2. New MCP servers on GitHub
3. New AI agent frameworks or tools
4. New repos for React Native + AI, Supabase + AI, fitness AI, travel AI
5. Any trending AI repos with >100 stars in the last week
6. Notable AI community discussions or techniques

Generate exactly 10 ranked discoveries with URLs (use real GitHub search patterns and well-known repos). Include the full report template with all sections.`,
    'gpt-4o', 4000
  );

  saveReport(`${today}-ai-intel.md`, report);
  if (!dryRun) {
    await sendReportEmail(`📡 AI Intelligence Report — ${dateHuman}`, report, CONFIG.recipients);
    await sendNtfy('📡 AI Intel Report Ready', 'Daily top 10 AI discoveries in your email.', 'default');
  }
  return report;
}

// ── REPORT 2: Rena Okoro — Cost Optimization ────────────────
async function runCostReport() {
  console.log('\n💎 Generating Rena Okoro Cost Optimization Report...');
  const agentDef = loadAgentFile('23-rena-okoro-cost.md');

  const report = await callAI(
    `${agentDef}\n\nYou are generating your daily Cost Optimization Report. Follow your report template exactly.`,
    `Generate the daily Cost Optimization Report for ${dateHuman}.

Current known infrastructure:
- OpenAI API: Multiple models (gpt-4o, gpt-4.1, gpt-4o-mini, gpt-4.1-mini, gpt-4.1-nano, o4-mini)
- AI R&D Council runs 4 sessions/day (2 FBF + 2 TAD) with 25 AI members each
- Supabase: Database, auth, realtime, storage for both FBF and TAD
- Vercel: Hosting for FBF dashboard and TAD platform
- Twilio: SMS notifications
- Stripe: Payment processing (TAD)
- ElevenLabs: Voice AI (FBF)
- Duffel: Flight search API (TAD)
- Apple Developer + Google Play: App distribution
- Domain registrations, email services

IMPORTANT CONTEXT — Bryan is actively evaluating moving to a HYBRID local/cloud AI system:
- He has very high AI API costs right now running 26-member council + 5 daily reports + FBF AI Coach + TAD multi-agent system
- He is considering a used system with an RTX 3090 GPU (24GB VRAM) for local inference
- FBF has a RAG setup for client data and coaching knowledge
- TAD (Wendy's travel network) has a RAG setup for destination/booking knowledge
- Both RAG systems currently run on cloud APIs (Anthropic + OpenAI)
- He wants to know: feasibility of hybrid (local for bulk tasks, cloud for complex reasoning), cost savings, breakeven, what can run locally vs what needs cloud

Analyze:
1. Estimate current monthly AI API costs for the 26-member council (4 sessions/day + 5 daily reports + FBF AI Coach + TAD agents)
2. Identify the top 3 cost savings opportunities with specific dollar amounts
3. **RTX 3090 Hybrid Analysis**: Calculate what an RTX 3090 (24GB VRAM, ~$700-900 used) can run locally:
   - Which models fit in 24GB VRAM (Llama 3.1 70B Q4, Qwen 2.5 72B Q4, Mistral-Large Q4, smaller models at higher quant)
   - Inference speed estimates (tokens/sec)
   - What percentage of current API calls could move to local (council sessions, daily reports, simple RAG queries)
   - What MUST stay on cloud APIs (complex reasoning, tool use, vision)
   - Full breakeven calculation: hardware cost vs monthly API savings
4. **RAG Infrastructure Evaluation**: Evaluate moving FBF and TAD RAG to local:
   - Local embedding generation (BGE, E5 models on GPU) vs cloud embedding API costs
   - pgvector (already on Supabase) vs local vector store
   - Hybrid retrieval: local embedding + local reranking + cloud LLM for generation
5. Compare Mac Studio M4 Ultra ($7K) vs used RTX 3090 system ($1-2K) vs cloud-only
6. Provide specific recommendation with breakeven timeline

Generate the full report template with all sections.`,
    'gpt-4.1', 5000
  );

  saveReport(`${today}-cost-optimization.md`, report);
  if (!dryRun) {
    await sendReportEmail(`💎 Cost Optimization Report — ${dateHuman}`, report, CONFIG.recipients);
    await sendNtfy('💎 Cost Report Ready', 'Daily cost optimization report in your email.', 'default');
  }
  return report;
}

// ── REPORT 3: Ghost — Raw Materials Sourcing ────────────────
async function runGhostReport() {
  console.log('\n👻 Generating Ghost Raw Materials Sourcing Report...');
  const agentDef = loadAgentFile('25-ghost-procurement.md');

  const report = await callAI(
    `${agentDef}\n\nYou are generating your daily Raw Materials Sourcing Report. Follow your report template exactly. This report is CONFIDENTIAL — Bryan Antonelli, Wendy Antonelli, and Jon Hobgood ONLY.`,
    `Generate the daily Raw Materials Sourcing Report for ${dateHuman}.

Cover these compound categories with realistic market intelligence:

STEROIDS (raw powders):
- Testosterone Enanthate, Cypionate, Propionate
- Nandrolone Decanoate (Deca), NPP
- Trenbolone Acetate, Enanthate
- Boldenone Undecylenate (EQ)
- Oxandrolone (Anavar), Stanozolol (Winstrol)
- Masteron (Drostanolone Propionate/Enanthate)

PEPTIDES (lyophilized):
- Semaglutide, Tirzepatide
- BPC-157, TB-500
- Ipamorelin, CJC-1295 (with and without DAC)
- MK-677 (Ibutamoren)
- Tesamorelin
- Selank, Semax

ANCILLARIES:
- Anastrozole, Exemestane, Tamoxifen, Clomiphene, hCG

SUPPLIES:
- MCT Oil, Benzyl Alcohol, Benzyl Benzoate
- 0.22μm PVDF filters, sterile vials, crimps
- BAC water

For each compound, provide Ghost Score assessments and source tier ratings. Include the full report template with market summary table, top 5 deals, quality alerts, and recommendations.`,
    'gpt-4o', 4000
  );

  saveReport(`${today}-ghost-sourcing.md`, report);
  if (!dryRun) {
    await sendReportEmail(`👻 CONFIDENTIAL: Raw Materials Sourcing — ${dateHuman}`, report, CONFIG.ghostRecipients);
    await sendNtfy('👻 Ghost Sourcing Report', 'Daily raw materials report sent to Bryan + JB.', 'high');
  }
  return report;
}

// ── REPORT 4: Dominic Voss — The Brew Sheet ─────────────────
async function runBrewerReport() {
  console.log('\n⚗️  Generating Dominic Voss Brew Sheet...');
  const agentDef = loadAgentFile('24-dominic-voss-brewer.md');

  // Cross-reference Ghost's latest report
  const ghostReport = getLatestReport('ghost-sourcing');
  const ghostContext = ghostReport
    ? `\n\nGHOST'S LATEST SOURCING REPORT (cross-reference this for sources and pricing):\n${ghostReport.substring(0, 3000)}`
    : '\n\n(Ghost report not yet available today — use standard source references)';

  const report = await callAI(
    `${agentDef}\n\nYou are generating your daily Brew Sheet report. Follow your Daily Report template exactly. This report is CONFIDENTIAL — Bryan Antonelli and Jon Hobgood ONLY.${ghostContext}`,
    `Generate today's Brew Sheet for ${dateHuman}.

Requirements:
1. Feature ONE complete recipe of the day with full step-by-step instructions, exact measurements, supply list with costs, and QC notes. Rotate through different compounds each day. Today, feature a recipe that would be useful and educational.

2. Cross-reference Ghost's sourcing data (if available above) to populate source names, Ghost Scores, and pricing in the supply list.

3. Include the Master Recipe Book catalog table showing all standard compounds with recipe status.

4. Include the Complete Supply List — everything needed for the full catalog.

5. Include a Tip of the Day — one practical brewing technique or safety reminder.

6. Flag any quality alerts from Ghost's report that affect recipes.

Generate the full Brew Sheet template with all sections. Be extremely precise with measurements, temperatures, and procedures. This is a working reference document — accuracy is non-negotiable.`,
    'gpt-4o', 4000
  );

  saveReport(`${today}-brew-sheet.md`, report);
  if (!dryRun) {
    await sendReportEmail(`⚗️ CONFIDENTIAL: The Brew Sheet — ${dateHuman}`, report, CONFIG.brewerRecipients);
    await sendNtfy('⚗️ Brew Sheet Ready', 'Daily recipe + supply list sent to Bryan + JB.', 'high');
  }
  return report;
}

// ── REPORT 5: Human Performance Council — Compound Intelligence ──
async function runHPCReport() {
  console.log('\n💪 Generating Human Performance Council Intelligence Brief...');
  const agentDef = loadAgentFile('26-human-performance-council.md');

  // Cross-reference Ghost's latest sourcing data
  const ghostReport = getLatestReport('ghost-sourcing');
  const ghostContext = ghostReport
    ? `\n\nGHOST'S LATEST SOURCING REPORT (cross-reference for what is SOURCEABLE NOW with Ghost Scores):\n${ghostReport.substring(0, 4000)}`
    : '\n\n(Ghost report not yet available today — use general sourcing knowledge)';

  const report = await callAI(
    `${agentDef}\n\nYou are the Human Performance Council generating your daily Intelligence Brief. This report is CONFIDENTIAL — Bryan and Wendy Antonelli ONLY.\n\nYou are a board of 7 specialists (Bodybuilding, Nutrition, Peptides/PEDs, Performance Psychology, Clinical Research, Compounding Chemistry, Procurement) converging into one unified report.\n\nFollow your report template EXACTLY.${ghostContext}`,
    `Generate the Human Performance Council Daily Intelligence Brief for ${dateHuman}.

CRITICAL REQUIREMENTS:

1. 🔴 PRIORITY: SOURCEABLE NOW section — For EACH of these 7 goals, provide the BEST currently sourceable compound stack with full protocol:
   - RECOMP (simultaneous fat loss + muscle gain — this is FBF's bread and butter)
   - CONTEST PREP (maximum definition during deep cut)
   - HYPERTROPHY (maximizing muscle growth)
   - MASSIVE HYPERTROPHY (pushing absolute limits, enhanced protocols)
   - FAT LOSS (primary goal: lose body fat)
   - ATHLETIC PERFORMANCE (strength, power, endurance)
   - BJJ PERFORMANCE (grappling-specific: joints, cardio, recovery, weight class management)

   Each goal stack must include: compounds + doses + frequency + duration, sourcing from Ghost, training alignment, nutrition alignment, evidence grade, monitoring requirements.

2. 🔬 DEEP R&D section — Scan for the LATEST developments in:
   - Myostatin inhibitors (Bimagrumab, Follistatin, ACE-031, apitegromab, ANY new targets)
   - Novel GLP-1/multi-agonists (Retatrutide, Survodutide, Orforglipron, CagriSema, Amycretin)
   - Novel muscle growth pathways (SARM developments, mTOR modulators, Wnt activators, gene therapy)
   - Recovery/longevity (senolytics, NAD+, rapamycin)
   - ANY other emerging compounds relevant to body composition or performance

   For each compound: mechanism, phase, latest data, timeline to availability, potential impact.

3. 📊 Compound Watchlist table — Master tracker of ALL compounds being monitored with current status.

4. 🎯 Today's Top Discovery — Single most actionable finding.

5. ⚠️ Safety Alerts — Any new adverse event data or interaction warnings.

6. 📋 Action Items — 3 specific things Bryan and Wendy should do based on today's findings.

Be EXTREMELY thorough. This is the deep R&D arm of FBF. Leave no stone unturned.`,
    'gpt-4o', 5000
  );

  saveReport(`${today}-hpc-brief.md`, report);
  if (!dryRun) {
    await sendReportEmail(`💪 CONFIDENTIAL: Human Performance Council Brief — ${dateHuman}`, report, CONFIG.recipients);
    await sendNtfy('HPC Brief Ready', 'Daily compound research + protocol brief in your email.', 'high');
  }
  return report;
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('\n📊 ═══════════════════════════════════════════════════');
  console.log('📊 AI R&D COUNCIL — Daily Autonomous Reports');
  console.log(`📊 ${dateHuman}`);
  console.log('📊 ═══════════════════════════════════════════════════\n');

  const reports = {
    scout: runScoutReport,
    cost: runCostReport,
    ghost: runGhostReport,
    brewer: runBrewerReport,
    hpc: runHPCReport,
  };

  // HPC only runs on Fridays (day 5) unless explicitly requested via --report hpc
  const isFriday = new Date().getDay() === 5;
  let toRun;
  if (reportArg === 'all') {
    toRun = Object.keys(reports).filter(k => k !== 'hpc' || isFriday);
    if (!isFriday) console.log('  ℹ️  HPC runs Fridays only (use --report hpc to force)\n');
  } else {
    toRun = [reportArg];
  }

  for (const key of toRun) {
    if (!reports[key]) {
      console.error(`❌ Unknown report: ${key}. Available: ${Object.keys(reports).join(', ')}`);
      continue;
    }
    try {
      await reports[key]();
      console.log(`  ✅ ${key} report complete\n`);
    } catch (err) {
      console.error(`  ❌ ${key} report failed:`, err.message);
    }
  }

  // Run Ghost before Brewer so brewer can cross-reference
  // (handled by running in order above — ghost before brewer)

  console.log('\n📊 ═══════════════════════════════════════════════════');
  console.log(`📊 Reports complete: ${toRun.length} generated`);
  console.log('📊 ═══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
