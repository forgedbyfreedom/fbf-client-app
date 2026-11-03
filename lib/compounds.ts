// Catalog behind the Compound Log. Logging only: nothing here is a dose
// recommendation, and the app never suggests amounts. Defaults only pre-pick
// the unit and route so entering a compound takes a few taps.
//
// House rules (CLAUDE.md): no nasal delivery for peptides, no pricing of any kind.

export type CompoundRoute = 'IM injection' | 'SubQ injection' | 'Oral' | 'Topical' | 'Sublingual';
export type CompoundUnit = 'mg' | 'mcg' | 'IU' | 'mL' | 'g' | 'units';

export interface CompoundDef {
  name: string;
  route: CompoundRoute;
  unit: CompoundUnit;
}

export interface CompoundGroup {
  key: string;
  label: string;
  compounds: CompoundDef[];
}

const im = (name: string, unit: CompoundUnit = 'mg'): CompoundDef => ({ name, route: 'IM injection', unit });
const sq = (name: string, unit: CompoundUnit = 'mcg'): CompoundDef => ({ name, route: 'SubQ injection', unit });
const oral = (name: string, unit: CompoundUnit = 'mg'): CompoundDef => ({ name, route: 'Oral', unit });

export const COMPOUND_GROUPS: CompoundGroup[] = [
  {
    key: 'testosterone',
    label: 'Testosterone',
    compounds: [
      im('Test Cypionate (Test C)'),
      im('Test Enanthate (Test E)'),
      im('Test Propionate (Test P)'),
      im('Sustanon 250'),
      oral('Testosterone Undecanoate (oral)'),
      { name: 'Testosterone Gel / Cream', route: 'Topical', unit: 'mg' },
    ],
  },
  {
    key: 'anabolics',
    label: 'Other Anabolics',
    compounds: [
      im('Nandrolone Decanoate (Deca)'),
      im('Nandrolone Phenylpropionate (NPP)'),
      im('Boldenone Undecylenate (EQ)'),
      im('Trenbolone Acetate (Tren A)'),
      im('Trenbolone Enanthate (Tren E)'),
      im('Trestolone (MENT)'),
      im('Drostanolone Propionate (Mast P)'),
      im('Drostanolone Enanthate (Mast E)'),
      im('Primobolan Depot (Primo)'),
      im('DHB (Dihydroboldenone)'),
      oral('Oxandrolone (Anavar)'),
      oral('Oxymetholone (Anadrol)'),
      oral('Methandrostenolone (Dbol)'),
      oral('Stanozolol (Winstrol, oral)'),
      im('Stanozolol (Winstrol, injectable)'),
      oral('Turinabol (Tbol)'),
      oral('Superdrol'),
      oral('Halotestin'),
      oral('Proviron (Mesterolone)'),
    ],
  },
  {
    key: 'gh',
    label: 'Growth Hormone',
    compounds: [
      sq('HGH (Somatropin, generic)', 'IU'),
      sq('Omnitrope', 'IU'),
      sq('Norditropin', 'IU'),
      sq('Humatrope', 'IU'),
      sq('Genotropin', 'IU'),
      sq('Serostim', 'IU'),
      sq('IGF-1 LR3', 'mcg'),
      sq('Ipamorelin'),
      sq('CJC-1295 (no DAC)'),
      sq('CJC-1295 (with DAC)'),
      sq('Sermorelin'),
      sq('Tesamorelin', 'mg'),
      sq('GHRP-2'),
      sq('GHRP-6'),
      oral('MK-677 (Ibutamoren)'),
    ],
  },
  {
    key: 'fatburners',
    label: 'Fat Burners',
    compounds: [
      sq('Retatrutide', 'mg'),
      sq('Tirzepatide (Mounjaro / Zepbound)', 'mg'),
      sq('Semaglutide (Ozempic / Wegovy)', 'mg'),
      sq('Liraglutide (Saxenda / Victoza)', 'mg'),
      sq('Cagrilintide', 'mg'),
      sq('AOD-9604'),
      oral('Tesofensine', 'mg'),
      oral('Clenbuterol', 'mcg'),
      oral('Albuterol / Salbutamol', 'mg'),
      oral('T3 (Cytomel / Liothyronine)', 'mcg'),
      oral('T4 (Synthroid / Levothyroxine)', 'mcg'),
      oral('Yohimbine'),
      oral('Ephedrine'),
      oral('Caffeine'),
      oral('Synephrine'),
      oral('DNP'),
      oral('BAM15'),
      oral('5-Amino-1MQ'),
      oral('Berberine'),
      oral('Metformin'),
      oral('L-Carnitine', 'g'),
      oral('Green Tea Extract (EGCG)'),
    ],
  },
  {
    key: 'peptides',
    label: 'Peptides',
    compounds: [
      sq('BPC-157'),
      sq('TB-500', 'mg'),
      sq('GHK-Cu', 'mg'),
      sq('Thymosin Alpha 1', 'mg'),
      sq('Epithalon', 'mg'),
      sq('MOTS-c', 'mg'),
      sq('Selank'),
      sq('Semax'),
      sq('PT-141', 'mg'),
      sq('Melanotan II'),
      sq('Kisspeptin'),
    ],
  },
  {
    key: 'support',
    label: 'Ancillaries & PCT',
    compounds: [
      oral('Anastrozole (Arimidex)'),
      oral('Exemestane (Aromasin)'),
      oral('Letrozole (Femara)'),
      oral('Tamoxifen (Nolvadex)'),
      oral('Clomiphene (Clomid)'),
      oral('Enclomiphene'),
      oral('Raloxifene'),
      sq('HCG', 'IU'),
      oral('Cabergoline (Caber)', 'mcg'),
      oral('Pramipexole (Prami)', 'mg'),
      oral('Finasteride', 'mg'),
      oral('Telmisartan', 'mg'),
      oral('TUDCA'),
      oral('NAC'),
    ],
  },
  {
    key: 'other',
    label: 'Other',
    compounds: [
      { name: 'Insulin (rapid-acting)', route: 'SubQ injection', unit: 'IU' },
      { name: 'Insulin (long-acting)', route: 'SubQ injection', unit: 'IU' },
    ],
  },
];

export const COMPOUND_UNITS: CompoundUnit[] = ['mg', 'mcg', 'IU', 'mL', 'g', 'units'];

export const COMPOUND_ROUTES: CompoundRoute[] = ['IM injection', 'SubQ injection', 'Oral', 'Topical', 'Sublingual'];

export const COMPOUND_FREQUENCIES = [
  'Daily',
  'Twice daily',
  'Every other day',
  '3x / week',
  '2x / week',
  'Weekly',
  'Every 2 weeks',
  'Pre-workout',
  'As needed',
  'One time',
] as const;

/** Which group a saved compound belongs to (for grouping the log). */
export function groupOf(compound: string): CompoundGroup | undefined {
  const target = compound.trim().toLowerCase();
  return COMPOUND_GROUPS.find((g) => g.compounds.some((c) => c.name.toLowerCase() === target));
}

export function findCompound(name: string): CompoundDef | undefined {
  const target = name.trim().toLowerCase();
  for (const g of COMPOUND_GROUPS) {
    const hit = g.compounds.find((c) => c.name.toLowerCase() === target);
    if (hit) return hit;
  }
  return undefined;
}

/** Splits a stored dose string like "250 mg" or "2.5IU" into amount + unit. */
export function parseDose(dose: string): { amount: string; unit: CompoundUnit | null } {
  const m = /^\s*([0-9]*\.?[0-9]+)\s*(mg|mcg|µg|ug|iu|ml|g|units?)?\b/i.exec(dose || '');
  if (!m) return { amount: (dose || '').trim(), unit: null };
  const raw = (m[2] || '').toLowerCase();
  const unit: CompoundUnit | null =
    raw === 'mg' ? 'mg'
    : raw === 'mcg' || raw === 'µg' || raw === 'ug' ? 'mcg'
    : raw === 'iu' ? 'IU'
    : raw === 'ml' ? 'mL'
    : raw === 'g' ? 'g'
    : raw.startsWith('unit') ? 'units'
    : null;
  return { amount: m[1], unit };
}

export function formatDose(amount: string, unit: CompoundUnit): string {
  const a = amount.trim();
  return a ? `${a} ${unit}` : '';
}
