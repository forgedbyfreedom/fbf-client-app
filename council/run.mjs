#!/usr/bin/env node
import 'dotenv/config';
// ============================================================
// AI R&D Council — Runner
// ============================================================
// Usage:
//   node run.mjs --business fbf          # Run FBF ecosystem council
//   node run.mjs --business tad          # Run TAD/TNT ecosystem council
//   node run.mjs --business all          # Run all businesses
//   node run.mjs --business fbf --dry-run # Run without delivery
//   node run.mjs --business all --save   # Save memos to file
// ============================================================

import { runSession } from './engine.mjs';
import { deliverMemo } from './deliver.mjs';
import { BUSINESSES } from './businesses.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const businessArg = getArg('--business') || 'all';
const dryRun = hasFlag('--dry-run');
const save = hasFlag('--save') || true; // always save by default

async function main() {
  console.log('\n🏛️  ═══════════════════════════════════════════════════');
  console.log('🏛️  AI R&D COUNCIL — Autonomous Strategy Session');
  console.log('🏛️  ═══════════════════════════════════════════════════\n');

  const businessKeys = businessArg === 'all'
    ? Object.keys(BUSINESSES)
    : [businessArg];

  const results = [];

  for (const key of businessKeys) {
    const business = BUSINESSES[key];
    if (!business) {
      console.error(`❌ Unknown business: ${key}`);
      console.error(`   Available: ${Object.keys(BUSINESSES).join(', ')}`);
      process.exit(1);
    }

    try {
      const result = await runSession(business);
      results.push(result);

      // Save hard copies: memo + meeting minutes + vote record
      if (save) {
        const date = new Date().toISOString().split('T')[0];
        const session = result.sessionType.toLowerCase();

        // Save executive memo
        const memosDir = join(__dirname, 'memos');
        mkdirSync(memosDir, { recursive: true });
        const memoFile = `${date}-${key}-${session}-memo.md`;
        writeFileSync(join(memosDir, memoFile), result.memo);
        console.log(`  💾 Memo saved: council/memos/${memoFile}`);

        // Save official meeting minutes (hard copy)
        const minutesDir = join(__dirname, 'minutes');
        mkdirSync(minutesDir, { recursive: true });
        const minutesFile = `${date}-${key}-${session}-minutes.md`;
        writeFileSync(join(minutesDir, minutesFile), result.minutes);
        console.log(`  💾 Minutes saved: council/minutes/${minutesFile}`);

        // Save vote record as JSON
        const votesDir = join(__dirname, 'votes');
        mkdirSync(votesDir, { recursive: true });
        const votesFile = `${date}-${key}-${session}-votes.json`;
        writeFileSync(join(votesDir, votesFile), JSON.stringify(result.voteResults, null, 2));
        console.log(`  💾 Votes saved: council/votes/${votesFile}`);

        // Log split votes prominently
        if (result.voteResults.splitVotes.length > 0) {
          console.log(`  ⚠️  ${result.voteResults.splitVotes.length} SPLIT VOTE(S) — requires Bryan & Wendy discussion`);
          for (const sv of result.voteResults.splitVotes) {
            console.log(`     → #${sv.number}: ${sv.title} (${sv.votes.APPROVE}A/${sv.votes.DENY}D/${sv.votes.DEFER}Df)`);
          }
        }
      }

      // Deliver unless dry run
      if (!dryRun) {
        await deliverMemo(result);
      } else {
        console.log('  🏜️ Dry run — skipping delivery');
        console.log('\n  ── MEMO PREVIEW ──────────────────────────────────');
        console.log(result.memo.substring(0, 1500) + '\n  [... truncated for preview ...]');
        console.log('  ─────────────────────────────────────────────────\n');
      }
    } catch (err) {
      console.error(`\n❌ Council session failed for ${business.name}:`, err.message);
      if (err.message.includes('API key')) {
        console.error('   → Make sure OPENAI_API_KEY is set in your environment');
      }
      console.error(err.stack);
    }
  }

  console.log('\n🏛️  ═══════════════════════════════════════════════════');
  console.log(`🏛️  Sessions complete: ${results.length}/${businessKeys.length}`);
  console.log('🏛️  ═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
