import type { BaseStats, Pokemon, StatKey } from './types';

export function toID(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function genFromNum(num: number): number {
  if (num <= 151) return 1;
  if (num <= 251) return 2;
  if (num <= 386) return 3;
  if (num <= 493) return 4;
  if (num <= 649) return 5;
  if (num <= 721) return 6;
  if (num <= 809) return 7;
  if (num <= 905) return 8;
  return 9;
}

// Legend-category mapping from PS tags.
// PS uses tags like: "Legendary", "Sub-Legendary", "Mythical", "Paradox".
export function legendCatsOf(p: Pokemon): Set<'legendary'|'sublegendary'|'mythical'|'paradox'> {
  const out = new Set<'legendary'|'sublegendary'|'mythical'|'paradox'>();
  const tags = (p.tags ?? []).map(t => String(t).toLowerCase());

  if (tags.some(t => t.includes('mythical'))) out.add('mythical');
  if (tags.some(t => t.includes('sub-legendary') || t.includes('sublegendary'))) out.add('sublegendary');
  if (tags.some(t => t.includes('legendary') || (t.includes('legend') && !t.includes('sub')))) out.add('legendary');
  if (tags.some(t => t.includes('paradox'))) out.add('paradox');

  // Fallback heuristics in case tags are absent (keeps behavior non-empty but conservative)
  if (!out.size) {
    const n = p.name.toLowerCase();
    if (n.includes('tapu ')) out.add('sublegendary');
  }

  return out;
}

export function legendCatsMatch(p: Pokemon, selected: Array<'legendary'|'sublegendary'|'mythical'|'paradox'>): boolean {
  if (!selected.length) return true;
  const cats = legendCatsOf(p);
  return selected.some(c => cats.has(c));
}

export function attackerMatches(p: Pokemon, pref: 'any'|'physical'|'special'): boolean {
  if (pref === 'any') return true;
  const s = p.baseStats;
  if (!s) return true; // if missing stats, don't exclude
  if (pref === 'physical') return s.atk >= s.spa;
  return s.spa > s.atk;
}

export function statsMatch(p: Pokemon, mode: 'min'|'max', limits: Partial<BaseStats>, bstLimit?: number): boolean {
  const s = p.baseStats;
  if (!s) return true; // if missing stats, don't exclude

  const keys = Object.keys(limits) as StatKey[];
  for (const k of keys) {
    const v = limits[k];
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    if (mode === 'min' && s[k] < v) return false;
    if (mode === 'max' && s[k] > v) return false;
  }

  if (typeof bstLimit === 'number' && !Number.isNaN(bstLimit)) {
    const bst = (s.hp + s.atk + s.def + s.spa + s.spd + s.spe);
    if (mode === 'min' && bst < bstLimit) return false;
    if (mode === 'max' && bst > bstLimit) return false;
  }

  return true;
}

export function typesMatch(p: Pokemon, required: string[]): boolean {
  if (!required.length) return true;
  const got = p.types.map(t => t.toLowerCase());
  return required.every(r => got.includes(r.toLowerCase()));
}

export function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  while (copy.length && out.length < n) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

export function mashName(a: string, b: string): string {
  const A = a.replace(/[^A-Za-z]/g, '');
  const B = b.replace(/[^A-Za-z]/g, '');
  if (!A || !B) return `${a}-${b}`;
  const cutA = clamp(Math.floor(A.length * 0.55), 2, A.length);
  const cutB = clamp(Math.floor(B.length * 0.55), 2, B.length);
  return A.slice(0, cutA) + B.slice(B.length - cutB);
}
