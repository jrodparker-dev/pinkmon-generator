import type { BaseStats, LegendCategory, Pokemon, StatKey } from './types';

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

const LEGENDARY_NUMS = new Set<number>([
  144, 145, 146, 150, 243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 382, 383, 384, 483, 484,
  487, 488, 638, 639, 640, 643, 644, 645, 716, 717, 718, 785, 786, 787, 788, 789, 790, 791, 792,
  800, 888, 889, 890, 1001, 1002, 1003, 1004, 1017, 1018,
]);

const SUBLEGENDARY_NUMS = new Set<number>([
  480, 481, 482, 485, 486, 641, 642, 645, 772, 773, 785, 786, 787, 788, 793, 794, 795, 796, 797,
  798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 888, 889, 891, 892, 894, 895, 896,
  897, 898, 1009, 1010, 1020, 1021, 1022, 1023,
]);

const MYTHICAL_NUMS = new Set<number>([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807,
  808, 809, 893, 1024, 1025,
]);

const PARADOX_NUMS = new Set<number>([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021,
  1022, 1023,
]);

const ULTRA_BEAST_NUMS = new Set<number>([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);

const SUBLEGENDARY_IDS = new Set<string>(['heatran', 'kubfu', 'urshifu', 'urshifurapidstrike']);

function tagSetOf(p: Pokemon): Set<string> {
  return new Set((p.tags ?? []).map((t) => String(t).toLowerCase()));
}

export function legendCatsOf(p: Pokemon): Set<LegendCategory> {
  const out = new Set<LegendCategory>();
  const tags = tagSetOf(p);
  const id = toID(p.id);
  const name = p.name.toLowerCase();

  if (tags.has('mythical') || MYTHICAL_NUMS.has(p.num)) out.add('mythical');
  if (
    tags.has('sub-legendary') ||
    tags.has('sublegendary') ||
    SUBLEGENDARY_NUMS.has(p.num) ||
    SUBLEGENDARY_IDS.has(id)
  ) out.add('sublegendary');
  if (
    tags.has('legendary') ||
    LEGENDARY_NUMS.has(p.num) ||
    (name.includes('tapu ') && !out.has('sublegendary'))
  ) out.add('legendary');
  if (tags.has('paradox') || PARADOX_NUMS.has(p.num)) out.add('paradox');
  if (tags.has('ultra beast') || tags.has('ultrabeast') || ULTRA_BEAST_NUMS.has(p.num)) out.add('ultrabeast');

  return out;
}

export function legendCatsMatch(p: Pokemon, selected: LegendCategory[]): boolean {
  if (!selected.length) return true;
  const cats = legendCatsOf(p);
  return selected.some(c => cats.has(c));
}

export function isLegendaryOrSublegendary(p: Pokemon): boolean {
  const cats = legendCatsOf(p);
  return cats.has('legendary') || cats.has('sublegendary');
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
  const got = new Set(p.types.map(t => t.toLowerCase()));
  return required.some(r => got.has(r.toLowerCase()));
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
