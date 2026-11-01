/**
 * Pulls the protocol sections (cycle / compounds / peptides / medical /
 * supplements) out of a coach-written program text, verbatim.
 *
 * WordPress does not yet return structured `current_peds` / `current_peptides`,
 * but coaches write that information into the approved program text. Rather
 * than guess at doses with a parser, we surface those sections exactly as the
 * coach wrote them, so nothing in a client's protocol is ever lost or altered.
 */

export interface ProtocolSection {
  title: string;
  kind: 'cycle' | 'peptides' | 'medical' | 'supplements';
  body: string;
}

const clean = (line: string) => line.replace(/^[#*=_\s]+|[#*=_:\s]+$/g, '').trim();

// A heading is a short line, usually upper-case or markdown, optionally ending in ':'.
const isHeading = (line: string) => {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^\*\*.+\*\*:?$/.test(t)) return true;
  if (/:$/.test(t) && t.split(/\s+/).length <= 6) return true;
  const letters = t.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
};

const kindOf = (heading: string): ProtocolSection['kind'] | null => {
  const h = heading.toLowerCase();
  if (/\b(cycle|ped|peds|compound|compounds|aas|hormone|trt|blast|cruise|pct)\b/.test(h)) return 'cycle';
  if (/\bpeptide/.test(h)) return 'peptides';
  if (/\b(medical|medication|prescri|clinician|rx)\b/.test(h)) return 'medical';
  if (/\bsupplement/.test(h)) return 'supplements';
  return null;
};

const topLevelRe = /^(day\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|training|workout|program|nutrition|meal|macro|daily targets?|cardio|check[- ]?in|notes?|progression|client|weekly|shopping|baseline|assessment|goals?|overview)\b/i;

export function extractProtocolSections(text: string | null | undefined): ProtocolSection[] {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const out: ProtocolSection[] = [];
  let current: { title: string; kind: ProtocolSection['kind']; lines: string[] } | null = null;

  const flush = () => {
    if (current) {
      const body = current.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (body) out.push({ title: current.title, kind: current.kind, body });
    }
    current = null;
  };

  for (const raw of lines) {
    if (isHeading(raw)) {
      const title = clean(raw);
      const kind = kindOf(title);
      if (kind) {
        flush();
        current = { title, kind, lines: [] };
        continue;
      }
      // Another top-level program section ends the protocol section; any
      // other heading (e.g. "Weeks 1–4:") is a sub-heading inside it.
      if (topLevelRe.test(title)) {
        flush();
        continue;
      }
    }
    if (current) current.lines.push(raw.trimEnd());
  }
  flush();
  return out;
}
