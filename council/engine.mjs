// ============================================================
// AI R&D Council — Orchestration Engine
// ============================================================
// Runs a full council session:
// 1. Pick a rotating leader who proposes a bold idea
// 2. Each member debates/challenges/builds on it
// 3. Open discussion round for rebuttals
// 4. Synthesize into an executive memo with action items
// ============================================================

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PERSONAS, COUNCIL_MEMBERS, getSessionLeader, getDebaters } from './personas.mjs';
import { CONFIG } from './config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey });

// Load detailed agent definition files (cached)
const agentFileCache = new Map();
function loadAgentFile(agentId) {
  if (agentFileCache.has(agentId)) return agentFileCache.get(agentId);
  const files = {
    revenue: '01-marcus-chen-revenue.md',
    product: '02-aria-patel-product.md',
    growth: '03-zane-torres-growth.md',
    marketing: '04-sofia-reyes-marketing.md',
    ops: '05-james-okafor-operations.md',
    industry: '06-elena-vasquez-industry.md',
    tech: '07-kai-nakamura-tech.md',
    cx: '08-maya-washington-cx.md',
    legal: '09-victoria-sterling-legal.md',
    engineering: '10-derek-hale-engineering.md',
    security: '11-cipher-knox-security.md',
    bodybuilding: '12-dr-titan-cross-bodybuilding.md',
    nutrition: '13-dr-lena-hartwell-nutrition.md',
    peptides: '14-dr-roman-petrov-peptides.md',
    performance: '15-dr-kai-mercer-performance.md',
    clinical: '16-dr-anaya-sharma-clinical.md',
    tax: '17-charles-whitfield-tax.md',
    formation: '18-alexandra-frost-formation.md',
    leadership: '19-colonel-jack-brennan-leadership.md',
    scraping: '20-nyx-calloway-scraping.md',
    claude: '21-atlas-vega-claude.md',
    monitor: '22-scout-reeves-monitor.md',
    cost: '23-rena-okoro-cost.md',
    brewer: '24-dominic-voss-brewer.md',
    hpc: '26-human-performance-council.md',
    procurement: '25-ghost-procurement.md',
  };
  try {
    const content = readFileSync(join(__dirname, 'agents', files[agentId]), 'utf-8');
    agentFileCache.set(agentId, content);
    return content;
  } catch {
    agentFileCache.set(agentId, null);
    return null;
  }
}

// Get session number from date (2 sessions per day = AM/PM)
export function getSessionIndex() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const isAM = now.getHours() < 14; // before 2pm = morning session
  return dayOfYear * 2 + (isAM ? 0 : 1);
}

async function callModel(modelConfig, systemPrompt, userPrompt, temperature = 0.9) {
  // o-series models use max_completion_tokens and don't support temperature/system
  const isOModel = modelConfig.model.startsWith('o');
  const params = {
    model: modelConfig.model,
    messages: isOModel
      ? [{ role: 'user', content: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
      : [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
  };
  if (isOModel) {
    params.max_completion_tokens = 2000;
  } else {
    params.max_tokens = 2000;
    params.temperature = temperature;
  }
  const response = await openai.chat.completions.create(params);
  return response.choices[0].message.content;
}

function personaSystemPrompt(persona, business) {
  const agentDef = loadAgentFile(persona.id);
  const agentContext = agentDef
    ? `\n\n═══ YOUR FULL AGENT DEFINITION ═══\n${agentDef}\n═══ END AGENT DEFINITION ═══`
    : '';

  return `You are ${persona.name}, ${persona.title} on the AI R&D Council for ${business.name}.

ROLE: ${persona.focus}
STYLE: ${persona.style}
EDGE: ${persona.challenge}
${agentContext}

You are in a strategy session with ${COUNCIL_MEMBERS.length - 1} other senior leaders. You bring your unique perspective and are not afraid to disagree. Be specific, actionable, and bold. Reference real tactics, tools, and numbers where possible.

Follow your behavioral rules, challenge patterns, and decision-making framework from your agent definition above. Stay in character at all times. Use your signature phrases naturally.

BUSINESS CONTEXT:
${business.description}

COMPETITORS: ${business.competitors.join(', ')}

SESSION RULES:
- Be concise but substantive (200-400 words max)
- Propose SPECIFIC actions, not vague platitudes
- Include estimated impact where possible (revenue, users, conversion, etc.)
- Challenge ideas you disagree with — healthy debate makes better strategy
- Reference real tools, platforms, tactics, and trends
- Think about what can be implemented THIS WEEK, not someday
- Apply your decision-making framework to evaluate proposals
- Reference your areas of deep expertise when relevant`;
}

// ── PHASE 1: Leader proposes a bold idea ──────────────────────
async function phaseProposal(leader, business, modelConfig) {
  const system = personaSystemPrompt(leader, business);
  const prompt = `You are leading today's R&D Council session for ${business.name}.

Your job: Propose ONE bold, specific idea to grow revenue or improve the business. This should be something the team hasn't tried yet — or a fresh angle on something they have.

Think about:
- What's the biggest untapped opportunity right now?
- What would you bet $10,000 on working?
- What are competitors doing that ${business.name} should steal or improve on?

Format your proposal as:
## 💡 Today's Proposal: [Title]
**The Idea:** [2-3 sentences]
**Why Now:** [Why this is timely]
**Expected Impact:** [Specific numbers/outcomes]
**Implementation:** [Key steps to execute this week]
**Investment Required:** [Time, money, resources needed]`;

  console.log(`  💡 ${leader.emoji} ${leader.name} is crafting today's proposal...`);
  return await callModel(modelConfig, system, prompt);
}

// ── PHASE 2: Each member debates the proposal ─────────────────
async function phaseDebate(debaters, proposal, leader, business) {
  console.log(`  🔥 Council members are debating ${leader.name}'s proposal...`);

  const debatePromises = debaters.map((persona, i) => {
    const modelConfig = CONFIG.models[(i + 1) % CONFIG.models.length];
    const system = personaSystemPrompt(persona, business);
    const prompt = `${leader.name} (${leader.title}) just proposed the following to the council:

---
${proposal}
---

As ${persona.name} (${persona.title}), give your honest reaction:

1. **Your Verdict:** (Support / Support with Changes / Oppose) and WHY
2. **What's Strong:** What part of this idea has real merit?
3. **What's Weak:** What could go wrong? What's missing?
4. **Your Enhancement:** How would YOU modify or build on this idea from your area of expertise?
5. **Quick Win:** What's ONE thing the team could do in the next 48 hours related to this?

Be direct. Disagree if you disagree. The best ideas survive debate.`;

    return callModel(modelConfig, system, prompt).then(response => ({
      persona,
      response,
    }));
  });

  return await Promise.all(debatePromises);
}

// ── PHASE 3: Leader responds to the debate ────────────────────
async function phaseRebuttal(leader, proposal, debates, business, modelConfig) {
  console.log(`  🎯 ${leader.name} is synthesizing the debate and responding...`);

  const debateSummary = debates.map(d =>
    `### ${d.persona.emoji} ${d.persona.name} (${d.persona.title}):\n${d.response}`
  ).join('\n\n');

  const system = personaSystemPrompt(leader, business);
  const prompt = `You proposed:
---
${proposal}
---

The council debated your proposal. Here are their responses:

${debateSummary}

Now synthesize:
1. **Revised Proposal:** Incorporate the best feedback. What's the FINAL version of your idea?
2. **Consensus Points:** What did everyone agree on?
3. **Unresolved Debates:** What disagreements remain?
4. **Final Action Plan:** 5 specific next steps with owners (assign to council member titles) and deadlines (this week)`;

  return await callModel(modelConfig, system, prompt, 0.7);
}

// ── PHASE 4: Formal vote on recommendations ──────────────────
async function phaseVote(debaters, leader, proposal, rebuttal, business) {
  console.log(`  🗳️  Council members are casting formal votes...`);

  const allMembers = [{ persona: leader }, ...debaters.map(d => ({ persona: d }))];

  const votePromises = allMembers.map((member, i) => {
    const modelConfig = CONFIG.models[i % CONFIG.models.length];
    const system = personaSystemPrompt(member.persona, business);
    const prompt = `The council session is concluding. Here was the original proposal and the leader's final synthesis:

PROPOSAL:
${proposal}

FINAL SYNTHESIS:
${rebuttal}

As ${member.persona.name} (${member.persona.title}), you must now cast your FORMAL VOTE.

Extract the key recommendations from the synthesis and vote on each one. You MUST respond in EXACTLY this JSON format (no markdown, no code fences, just raw JSON):

{
  "recommendations": [
    {
      "number": 1,
      "title": "Short title of the recommendation",
      "description": "One sentence describing what this means concretely",
      "vote": "APPROVE" | "DENY" | "DEFER",
      "reasoning": "One sentence explaining your vote"
    }
  ]
}

Extract 3-7 key recommendations. Vote APPROVE if you support it, DENY if you oppose it, DEFER if you think it needs more discussion or data before deciding.`;

    return callModel(modelConfig, system, prompt, 0.3).then(response => ({
      persona: member.persona,
      response,
    }));
  });

  const rawVotes = await Promise.all(votePromises);

  // Parse votes and tally
  const memberVotes = [];
  for (const { persona, response } of rawVotes) {
    try {
      // Strip markdown code fences if present
      const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      memberVotes.push({ persona, recommendations: parsed.recommendations });
    } catch {
      console.log(`  ⚠️  Could not parse vote from ${persona.name} — using raw response`);
      memberVotes.push({ persona, recommendations: [], rawResponse: response });
    }
  }

  // Build unified recommendation list with tallies
  const recMap = new Map();
  for (const mv of memberVotes) {
    for (const rec of mv.recommendations) {
      const key = rec.number;
      if (!recMap.has(key)) {
        recMap.set(key, {
          number: rec.number,
          title: rec.title,
          description: rec.description,
          votes: { APPROVE: 0, DENY: 0, DEFER: 0 },
          voters: [],
        });
      }
      const entry = recMap.get(key);
      const vote = (rec.vote || '').toUpperCase();
      if (entry.votes[vote] !== undefined) entry.votes[vote]++;
      entry.voters.push({ name: mv.persona.name, title: mv.persona.title, vote, reasoning: rec.reasoning });
    }
  }

  const recommendations = [...recMap.values()].sort((a, b) => a.number - b.number);

  // Identify split votes (no clear majority — highest vote < 60% of total)
  const totalVoters = COUNCIL_MEMBERS.length;
  const splitVotes = [];
  const resolvedVotes = [];

  for (const rec of recommendations) {
    const maxVote = Math.max(rec.votes.APPROVE, rec.votes.DENY, rec.votes.DEFER);
    const isSplit = maxVote / totalVoters < 0.6;
    const result = isSplit ? 'SPLIT' :
      rec.votes.APPROVE >= rec.votes.DENY && rec.votes.APPROVE >= rec.votes.DEFER ? 'APPROVE' :
      rec.votes.DENY >= rec.votes.DEFER ? 'DENY' : 'DEFER';

    const enriched = { ...rec, result, isSplit };
    if (isSplit) splitVotes.push(enriched);
    else resolvedVotes.push(enriched);
  }

  console.log(`  ✅ Votes tallied: ${resolvedVotes.length} resolved, ${splitVotes.length} split\n`);

  return { recommendations, splitVotes, resolvedVotes, memberVotes };
}

// ── PHASE 5: Generate meeting minutes ─────────────────────────
async function phaseMinutes(business, leader, proposal, debates, rebuttal, voteResults) {
  console.log(`  📋 Generating official meeting minutes...`);

  const now = new Date();
  const sessionType = now.getHours() < 14 ? 'Morning' : 'Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const debateSummary = debates.map(d =>
    `### ${d.persona.emoji} ${d.persona.name} (${d.persona.title}):\n${d.response}`
  ).join('\n\n');

  const voteTable = voteResults.recommendations.map(rec => {
    const verdict = rec.isSplit ? '⚠️ SPLIT VOTE' :
      rec.votes.APPROVE >= rec.votes.DENY && rec.votes.APPROVE >= rec.votes.DEFER ? '✅ APPROVED' :
      rec.votes.DENY >= rec.votes.DEFER ? '❌ DENIED' : '⏸️ DEFERRED';
    const voterDetails = rec.voters.map(v => `  - ${v.name} (${v.title}): ${v.vote} — ${v.reasoning}`).join('\n');
    return `**Rec #${rec.number}: ${rec.title}**\n${rec.description}\nVote: APPROVE ${rec.votes.APPROVE} / DENY ${rec.votes.DENY} / DEFER ${rec.votes.DEFER} → ${verdict}\n${voterDetails}`;
  }).join('\n\n');

  const minutes = `# 📋 OFFICIAL MEETING MINUTES
# AI R&D Council — ${business.name}

---

**Date:** ${dateStr}
**Time:** ${timeStr}
**Session:** ${sessionType}
**Session Leader:** ${leader.emoji} ${leader.name}, ${leader.title}

## Attendees
${PERSONAS.map(p => `- ${p.emoji} **${p.name}** — ${p.title}`).join('\n')}

---

## 1. Call to Order
Session called to order by ${leader.name} (${leader.title}) at ${timeStr}.

## 2. Opening Proposal
${proposal}

---

## 3. Council Debate — Full Transcript

${debateSummary}

---

## 4. Leader's Synthesis & Response
${rebuttal}

---

## 5. Formal Vote — Recommendations & Tallies

${voteTable}

---

## 6. Split Votes Requiring Owner Review
${voteResults.splitVotes.length > 0
  ? voteResults.splitVotes.map(sv =>
    `- **Rec #${sv.number}: ${sv.title}** — APPROVE ${sv.votes.APPROVE} / DENY ${sv.votes.DENY} / DEFER ${sv.votes.DEFER}\n  → Escalated to Bryan & Wendy Antonelli for discussion and re-vote next session.`
  ).join('\n')
  : '_None — all recommendations had clear majorities._'
}

---

## 7. Adjournment
Session adjourned at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.
Next session: ${now.getHours() < 14 ? 'Today 5:00 PM' : 'Tomorrow 9:00 AM'}

---

*Minutes recorded by the AI R&D Council Secretary*
*${COUNCIL_MEMBERS.length} council members present*
*${business.name} — ${dateStr}*`;

  return minutes;
}

// ── PHASE 6: Generate the executive memo ──────────────────────
async function phaseMemo(business, leader, proposal, debates, rebuttal, voteResults) {
  console.log(`  📝 Generating executive memo...`);

  const debateSummary = debates.map(d =>
    `**${d.persona.emoji} ${d.persona.name} (${d.persona.title}):**\n${d.response}`
  ).join('\n\n---\n\n');

  const now = new Date();
  const sessionType = now.getHours() < 14 ? 'Morning' : 'Evening';

  const voteSummary = voteResults.recommendations.map(rec => {
    const verdict = rec.isSplit ? '⚠️ SPLIT' :
      rec.votes.APPROVE >= rec.votes.DENY && rec.votes.APPROVE >= rec.votes.DEFER ? '✅ APPROVED' :
      rec.votes.DENY >= rec.votes.DEFER ? '❌ DENIED' : '⏸️ DEFERRED';
    return `#${rec.number}. ${rec.title} — ${verdict} (${rec.votes.APPROVE}A/${rec.votes.DENY}D/${rec.votes.DEFER}Df)`;
  }).join('\n');

  const system = `You are the council secretary. Your job is to produce a clear, actionable executive memo from today's R&D Council session. Write in a professional but energetic tone. Focus on ACTIONS, not theory.`;

  const prompt = `Compile the following R&D Council session into an executive memo.

**Business:** ${business.name}
**Date:** ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Session:** ${sessionType} Session
**Session Leader:** ${leader.emoji} ${leader.name} (${leader.title})

## ORIGINAL PROPOSAL
${proposal}

## COUNCIL DEBATE
${debateSummary}

## LEADER'S SYNTHESIS & FINAL PLAN
${rebuttal}

## VOTE RESULTS
${voteSummary}

---

Format the memo as:

# 🔥 R&D Council Memo — ${business.name}
**${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | ${sessionType} Session**
**Led by:** ${leader.emoji} ${leader.name}, ${leader.title}

## Executive Summary
[3-4 bullet points capturing the key takeaway]

## The Big Idea
[Summarize the proposal in 2-3 sentences]

## Council Debate Highlights
[Key arguments for and against, organized by theme not person]

## Consensus & Disagreements
[What the council agreed on vs. where they diverged]

## 🗳️ Vote Results
[Include the vote tally for each recommendation exactly as provided]

## 🎯 Action Items (This Week)
[Numbered list of specific, actionable next steps with priority level: 🔴 Critical / 🟡 High / 🟢 Nice-to-have]

## 💡 Quick Wins (Next 48 Hours)
[Things that can be done immediately with minimal effort]

## 📊 Metrics to Track
[How to measure success of these initiatives]

## 🔮 Next Session Preview
[What should the council discuss next time?]

---
*Generated by the AI R&D Council — ${COUNCIL_MEMBERS.length} active strategists working for ${business.name}*`;

  return await callModel(
    CONFIG.models[0],
    system,
    prompt,
    0.6,
  );
}

// ── MAIN: Run a full council session ──────────────────────────
export async function runSession(business, sessionIndex = null) {
  const idx = sessionIndex ?? getSessionIndex();
  const leader = getSessionLeader(idx);
  const debaters = getDebaters(leader.id);
  const leaderModel = CONFIG.models[idx % CONFIG.models.length];

  const now = new Date();
  const sessionType = now.getHours() < 14 ? 'Morning' : 'Evening';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏛️  AI R&D COUNCIL — ${business.name.toUpperCase()}`);
  console.log(`📅 ${now.toLocaleDateString()} | ${sessionType} Session`);
  console.log(`👑 Session Leader: ${leader.emoji} ${leader.name} (${leader.title})`);
  console.log(`🤖 Model: ${leaderModel.model}`);
  console.log(`👥 ${debaters.length} debaters ready`);
  console.log(`${'='.repeat(60)}\n`);

  // Phase 1: Proposal
  const proposal = await phaseProposal(leader, business, leaderModel);
  console.log(`  ✅ Proposal received\n`);

  // Phase 2: Debate (all members in parallel)
  const debates = await phaseDebate(debaters, proposal, leader, business);
  console.log(`  ✅ All ${debates.length} members have responded\n`);

  // Phase 3: Leader synthesizes
  const rebuttal = await phaseRebuttal(leader, proposal, debates, business, leaderModel);
  console.log(`  ✅ Synthesis complete\n`);

  // Phase 4: Formal vote on recommendations
  const voteResults = await phaseVote(debaters, leader, proposal, rebuttal, business);

  // Phase 5: Generate official meeting minutes (hard copy)
  const minutes = await phaseMinutes(business, leader, proposal, debates, rebuttal, voteResults);
  console.log(`  ✅ Meeting minutes generated\n`);

  // Phase 6: Generate executive memo
  const memo = await phaseMemo(business, leader, proposal, debates, rebuttal, voteResults);
  console.log(`  ✅ Memo generated\n`);

  return {
    business: business.name,
    sessionType,
    date: now.toISOString(),
    leader: `${leader.name} (${leader.title})`,
    proposal,
    debates: debates.map(d => ({ name: d.persona.name, title: d.persona.title, response: d.response })),
    rebuttal,
    voteResults,
    minutes,
    memo,
  };
}
