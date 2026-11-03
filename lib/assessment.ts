/**
 * Body assessment that goes with every body scan: tape measurements plus
 * Jackson-Pollock 7-site skinfolds. The server re-validates everything and
 * calculates the official numbers; the math here is only the live preview.
 * Field keys and ranges match FBFHub_Assessments in the Coach Hub plugin.
 */
export interface SiteDef {
  key: string;
  label: string;
  min: number;
  max: number;
  how: string;
}

export const TAPE_SITES: SiteDef[] = [
  { key: 'neck_in', label: 'Neck', min: 8, max: 30, how: 'Just below the Adam’s apple, tape level all the way round.' },
  { key: 'chest_in', label: 'Chest', min: 20, max: 70, how: 'Across the nipples, arms relaxed, at the end of a normal breath out.' },
  { key: 'waist_in', label: 'Waist (navel)', min: 18, max: 70, how: 'Through the belly button, relaxed — don’t suck in.' },
  { key: 'hips_in', label: 'Hips', min: 20, max: 75, how: 'Widest point of the glutes, feet together.' },
  { key: 'arm_in', label: 'Arm (flexed)', min: 6, max: 30, how: 'Right arm, biceps flexed, around the peak.' },
  { key: 'thigh_in', label: 'Thigh', min: 10, max: 45, how: 'Right leg, just below the glute fold, standing relaxed.' },
  { key: 'calf_in', label: 'Calf', min: 8, max: 30, how: 'Right leg, widest point, standing relaxed.' },
];

export const SKINFOLD_SITES: SiteDef[] = [
  { key: 'chest', label: 'Chest', min: 2, max: 80, how: 'Diagonal fold halfway between the front of the armpit and the nipple (women: one third of the way from the armpit).' },
  { key: 'midaxillary', label: 'Midaxillary', min: 2, max: 80, how: 'Vertical fold on the side of the ribcage, in line with the middle of the armpit, level with the bottom of the breastbone.' },
  { key: 'triceps', label: 'Triceps', min: 2, max: 80, how: 'Vertical fold on the back of the upper arm, halfway between the shoulder tip and the elbow, arm hanging relaxed.' },
  { key: 'subscapular', label: 'Subscapular', min: 2, max: 80, how: 'Diagonal fold (pointing down and out) just below the bottom tip of the shoulder blade.' },
  { key: 'abdomen', label: 'Abdomen', min: 2, max: 80, how: 'Vertical fold about 1 inch (2 cm) to the right of the belly button.' },
  { key: 'suprailiac', label: 'Suprailiac', min: 2, max: 80, how: 'Diagonal fold just above the top front of the hip bone, following its natural line.' },
  { key: 'thigh', label: 'Thigh', min: 2, max: 80, how: 'Vertical fold on the front of the thigh, halfway between the hip crease and the top of the kneecap.' },
];

export const CALIPER_TIPS = [
  'Right side of the body, standing relaxed, skin dry — before training.',
  'Pinch the fold with thumb and finger, put the caliper jaws 1 cm away, read after 2 seconds.',
  'Take each site twice and enter the average. If the two differ by more than 2 mm, take a third.',
  'Have someone help with the back sites (triceps, subscapular) if you can.',
];

/** JP7 body density → Siri body fat %. Mirrors the server. */
export function jp7(sex: 'male' | 'female', age: number, sumMm: number): number | null {
  if (!age || !sumMm) return null;
  const s = sumMm;
  const bd =
    sex === 'male'
      ? 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age
      : 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
  if (bd <= 0) return null;
  const bf = 495 / bd - 450;
  return Math.round(Math.max(2, Math.min(60, bf)) * 10) / 10;
}

export const parseNum = (s: string | undefined) => {
  if (!s) return undefined;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Which sites are missing or out of range. */
export function invalidSites(defs: SiteDef[], values: Record<string, string>): string[] {
  return defs.filter((d) => {
    const n = parseNum(values[d.key]);
    return n === undefined || n < d.min || n > d.max;
  }).map((d) => d.key);
}
