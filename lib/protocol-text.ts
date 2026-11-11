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

export interface ProtocolItem {
  /** Stable key shared with the daily check-off store, e.g. `ped_Test Propionate`. */
  key: string;
  name: string;
  /** Everything after the name, as the coach wrote it, e.g. "300 mg/week". */
  dose: string;
  route: string;
  type: 'ped' | 'peptide' | 'medical';
  section: string;
}

const ROUTE_RE = /\b(subq|sub-q|subcutaneous|im|intramuscular|oral|topical|sublingual)\b[^)]*/i;

/**
 * Turns "Name: dose" lines inside cycle / peptide / medical sections into
 * individual items so each can be viewed and ticked on its own. Lines without a
 * "Name: detail" shape are left to the verbatim text, never guessed at.
 */
export function extractProtocolItems(sections: ProtocolSection[] | null | undefined): ProtocolItem[] {
  const out: ProtocolItem[] = [];
  const seen = new Set<string>();
  for (const s of sections ?? []) {
    if (s.kind === 'supplements') continue;
    const type: ProtocolItem['type'] = s.kind === 'cycle' ? 'ped' : s.kind === 'peptides' ? 'peptide' : 'medical';
    for (const raw of s.body.split(/\r?\n/)) {
      const line = raw.replace(/^[\s\-*•\d.)]+/, '').replace(/\*\*/g, '').trim();
      const i = line.indexOf(':');
      if (i < 1 || i > 60) continue;
      const name = line.slice(0, i).trim();
      const dose = line.slice(i + 1).trim();
      if (!name || !dose) continue;
      const key = `${type}_${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = ROUTE_RE.exec(dose);
      out.push({ key, name, dose, route: r ? r[0].replace(/[()]/g, '').trim() : '', type, section: s.title });
    }
  }
  return out;
}
