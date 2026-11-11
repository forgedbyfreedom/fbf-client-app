import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../lib/theme';

/**
 * Renders the coach's markdown-style replies as a clean report: section headings,
 * marker cards with a HIGH/LOW pill, labelled rows, bullets and numbered actions.
 * Handles only the small subset the coach uses (## / ### / - / 1. / **bold** / _italic_).
 */

type Block =
  | { t: 'h2'; text: string }
  | { t: 'marker'; name: string; value: string; flag: string; rows: { label: string | null; text: string }[] }
  | { t: 'p'; text: string }
  | { t: 'bullet'; text: string }
  | { t: 'num'; n: string; text: string }
  | { t: 'note'; text: string };

function parse(src: string): Block[] {
  const out: Block[] = [];
  let marker: Extract<Block, { t: 'marker' }> | null = null;
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#{1,2}\s+(.*)$/))) {
      marker = null;
      out.push({ t: 'h2', text: m[1].replace(/\*+/g, '') });
    } else if ((m = line.match(/^#{3,}\s+(.*)$/))) {
      const parts = m[1].replace(/\*+/g, '').split('|').map((x) => x.trim());
      const flag = (parts[2] || '').toUpperCase();
      marker = { t: 'marker', name: parts[0], value: parts[1] || '', flag: flag.includes('HIGH') ? 'HIGH' : flag.includes('LOW') ? 'LOW' : flag, rows: [] };
      out.push(marker);
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      const lab = m[1].match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/);
      if (marker) marker.rows.push(lab ? { label: lab[1].replace(/:$/, ''), text: lab[2] } : { label: null, text: m[1] });
      else out.push({ t: 'bullet', text: m[1] });
    } else if ((m = line.match(/^(\d+)[.)]\s+(.*)$/))) {
      marker = null;
      out.push({ t: 'num', n: m[1], text: m[2] });
    } else if (/^_.*_$/.test(line)) {
      out.push({ t: 'note', text: line.replace(/^_|_$/g, '') });
    } else {
      if (!marker) out.push({ t: 'p', text: line });
      else marker.rows.push({ label: null, text: line });
    }
  }
  return out;
}

/** **bold** inline. */
function Inline({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p.replace(/\*+/g, '')
        )
      )}
    </Text>
  );
}

const flagColor = (f: string) => (f === 'HIGH' ? colors.red : f === 'LOW' ? colors.blue : colors.textTertiary);

export function AnalysisView({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return (
              <View key={i} style={[styles.h2Wrap, i === 0 && { marginTop: 0 }]}>
                <Text style={styles.h2}>{b.text.toUpperCase()}</Text>
                <View style={styles.rule} />
              </View>
            );
          case 'marker':
            return (
              <View key={i} style={[styles.card, { borderLeftColor: flagColor(b.flag) }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{b.name}</Text>
                    {b.value ? <Text style={styles.value}>{b.value}</Text> : null}
                  </View>
                  {b.flag ? (
                    <View style={[styles.pill, { borderColor: flagColor(b.flag) }]}>
                      <Text style={[styles.pillText, { color: flagColor(b.flag) }]}>{b.flag}</Text>
                    </View>
                  ) : null}
                </View>
                {b.rows.map((r, j) => (
                  <View key={j} style={styles.row}>
                    {r.label ? <Text style={styles.label}>{r.label.toUpperCase()}</Text> : null}
                    <Inline text={r.text} style={styles.body} />
                  </View>
                ))}
              </View>
            );
          case 'bullet':
            return (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.dot}>•</Text>
                <Inline text={b.text} style={[styles.body, { flex: 1 }]} />
              </View>
            );
          case 'num':
            return (
              <View key={i} style={styles.numRow}>
                <View style={styles.numBadge}>
                  <Text style={styles.numText}>{b.n}</Text>
                </View>
                <Inline text={b.text} style={[styles.body, { flex: 1 }]} />
              </View>
            );
          case 'note':
            return (
              <Text key={i} style={styles.note}>
                {b.text}
              </Text>
            );
          default:
            return <Inline key={i} text={b.text} style={styles.body} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h2Wrap: { marginTop: spacing.sm, gap: 6 },
  h2: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1.4 },
  rule: { height: 1, backgroundColor: colors.border },
  card: { backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderRadius: 12, padding: spacing.md, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '700' },
  value: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  row: { gap: 2 },
  label: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  body: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 22 },
  bold: { fontWeight: '700' },
  bulletRow: { flexDirection: 'row', gap: 8 },
  dot: { color: colors.accentText, fontSize: fontSize.md, lineHeight: 22 },
  numRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  numBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { color: colors.onAccent, fontWeight: '800', fontSize: 12 },
  note: { color: colors.textTertiary, fontSize: fontSize.sm, fontStyle: 'italic' },
});
