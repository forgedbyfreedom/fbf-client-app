#!/bin/bash
# ============================================================
# AI R&D Council — Cron Setup
# ============================================================
# Installs crontab entries:
#   6:00 AM — Daily autonomous reports (Scout, Cost, Ghost, Brewer)
#   9:03 AM — Morning council session (FBF + TAD, 25 members)
#   5:03 PM — Evening council session (FBF + TAD, 25 members)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH="$(which node)"

# The cron commands
DAILY_REPORTS="0 6 * * * cd $SCRIPT_DIR && $NODE_PATH daily-reports.mjs >> $SCRIPT_DIR/reports.log 2>&1"
MORNING="3 9 * * * cd $SCRIPT_DIR && $NODE_PATH run.mjs --business all --save >> $SCRIPT_DIR/council.log 2>&1"
EVENING="3 17 * * * cd $SCRIPT_DIR && $NODE_PATH run.mjs --business all --save >> $SCRIPT_DIR/council.log 2>&1"

# Remove any existing council cron entries
EXISTING=$(crontab -l 2>/dev/null || echo "")
CLEANED=$(echo "$EXISTING" | grep -v "council/run.mjs" | grep -v "council/daily-reports.mjs")

# Install all three
(echo "$CLEANED"; echo "$DAILY_REPORTS"; echo "$MORNING"; echo "$EVENING") | crontab -

echo "✅ All cron jobs installed:"
echo ""
echo "  📊 6:00 AM daily  → 4 autonomous reports (Scout, Cost, Ghost, Brew Sheet)"
echo "  🌅 9:03 AM daily  → FBF + TAD morning council (25 members)"
echo "  🌆 5:03 PM daily  → FBF + TAD evening council (25 members)"
echo ""
echo "Daily reports go to:"
echo "  📡 Scout (AI Intel)     → Bryan + Wendy"
echo "  💎 Rena (Cost)          → Bryan + Wendy"
echo "  👻 Ghost (Sourcing)     → Bryan + Wendy + JB (CONFIDENTIAL)"
echo "  ⚗️  Dominic (Brew Sheet) → Bryan + JB (CONFIDENTIAL)"
echo ""
echo "Verify with: crontab -l"
echo "Logs at: $SCRIPT_DIR/council.log + $SCRIPT_DIR/reports.log"
echo ""
echo "To remove all: crontab -l | grep -v 'council/' | crontab -"
