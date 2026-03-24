import type { BaseStats, BuffMode, Generated, Options, Pokemon, StatKey } from './types';
import {
  attackerMatches,
  genFromNum,
  legendCatsMatch,
  mashName,
  statsMatch,
  pickN,
  randomOf,
  typesMatch,
  uniq,
} from './utils';


const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
type BuffMode =
  | 'off'
  | 'custom-move'
  | 'chosen-ability'
  | 'plus-one-stat'
  | 'plus-two-stats'
  | 'new-typing'
  | 'double-lowest-stat'
  | 'match-highest-stat';

function copyBaseStats(stats?: BaseStats): BaseStats | undefined {
  return stats ? { ...stats } : undefined;
}

function fusionStatsFromParents(a: Pokemon, b: Pokemon): BaseStats | undefined {
  if (!a.baseStats && !b.baseStats) return undefined;

  const fromA = new Set(pickN(STAT_KEYS, 3));
  const stats = {} as BaseStats;

  for (const key of STAT_KEYS) {
    const primary = fromA.has(key) ? a : b;
    const secondary = fromA.has(key) ? b : a;
    const value = primary.baseStats?.[key] ?? secondary.baseStats?.[key] ?? 0;
    stats[key] = value;
  }

  return stats;
}

function applyBuff(mode: BuffMode, mon: Pokemon, abilityPool: string[]): Pick<Generated, 'buff' | 'displayStats' | 'buffedStatKeys' | 'ability' | 'displayTypes'> {
  const displayStats = copyBaseStats(mon.baseStats);

  if (mode === 'off') {
    return { buff: undefined, displayStats, buffedStatKeys: [] };
  }

  if (mode === 'custom-move') {
    return { buff: 'Custom Move', displayStats, buffedStatKeys: [] };
  }

  if (mode === 'chosen-ability') {
    return {
      buff: 'Chosen Ability',
      ability: abilityPool.length ? randomOf(abilityPool) : undefined,
      displayStats,
      buffedStatKeys: [],
    };
  }

  if (mode === 'new-typing') {
    return { buff: 'New Typing', displayStats, buffedStatKeys: [] };
  }

  if (!displayStats) {
    const labels: Record<Exclude<BuffMode, 'off'>, string> = {
      'custom-move': 'Custom Move',
      'chosen-ability': 'Chosen Ability',
      'plus-one-stat': '+10 to one stat',
      'plus-two-stats': '+10 to two stats',
      'new-typing': 'New Typing',
      'double-lowest-stat': 'Double its lowest stat',
      'match-highest-stat': 'Change 1 stat to match its highest stat',
    };
    return { buff: labels[mode], displayStats: undefined, buffedStatKeys: [] };
  }

  if (mode === 'plus-one-stat') {
    const amt = randomOf([10, 15, 20, 25, 30, 35, 40]);
    const stat = randomOf(STAT_KEYS);
    displayStats[stat] += amt;
    return { buff: `+${amt} to one stat`, displayStats, buffedStatKeys: [stat] };
  }

  if (mode === 'plus-two-stats') {
    const amt = randomOf([10, 15, 20]);
    const [a, b] = pickN(STAT_KEYS, 2);
    displayStats[a] += amt;
    displayStats[b] += amt;
    return { buff: `+${amt} to two stats`, displayStats, buffedStatKeys: [a, b] };
  }

  if (mode === 'double-lowest-stat') {
    const min = Math.min(...STAT_KEYS.map((k) => displayStats[k]));
    const lowest = STAT_KEYS.filter((k) => displayStats[k] === min);
    const key = randomOf(lowest);
    displayStats[key] = displayStats[key] * 2;
    return { buff: 'Double its lowest stat', displayStats, buffedStatKeys: [key] };
  }

  const max = Math.max(...STAT_KEYS.map((k) => displayStats[k]));
  const highest = STAT_KEYS.filter((k) => displayStats[k] === max);
  const candidates = STAT_KEYS.filter((k) => !highest.includes(k));
  const target = randomOf(candidates.length ? candidates : STAT_KEYS);
  displayStats[target] = max;
  return { buff: 'Change 1 stat to match its highest stat', displayStats, buffedStatKeys: [target] };
}

const RANDOM_BUFF_MODES: Exclude<BuffMode, 'off'>[] = [
  'custom-move',
  'chosen-ability',
  'plus-one-stat',
  'plus-two-stats',
  'new-typing',
  'double-lowest-stat',
  'match-highest-stat',
];

function isAllowedByGens(p: Pokemon, allowed: number[]): boolean {
  if (!allowed.length) return true;
  return allowed.includes(genFromNum(p.num));
}

function isRegionalId(id: string): boolean {
  return id.includes('alola') || id.includes('galar') || id.includes('hisui') || id.includes('paldea');
}

function isMegaForm(p: Pokemon): boolean {
  const name = p.name.toLowerCase();
  return name.includes('-mega') || name.startsWith('mega ');
}

function isGmaxId(id: string): boolean {
  return id.includes('gmax') || id.includes('gigantamax');
}

/**
 * Generate sprite-id variants by progressively removing hyphens.
 * Examples:
 * - tapu-fini -> tapufini
 * - basculin-white-striped -> basculin-whitestriped -> basculinwhitestriped
 * - necrozma-dusk-mane -> necrozma-duskmane -> necrozmaduskmane
 */
function spriteIdVariants(id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const q: string[] = [id];

  while (q.length) {
    const cur = q.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    out.push(cur);

    const dashIdxs: number[] = [];
    for (let i = 0; i < cur.length; i++) if (cur[i] === '-') dashIdxs.push(i);

    for (const i of dashIdxs) {
      const next = cur.slice(0, i) + cur.slice(i + 1);
      if (!seen.has(next)) q.push(next);
    }
  }

  return out;
}

export function spriteFallbacks(p: Pokemon, shiny: boolean): string[] {
  const folders: Array<[string, 'gif' | 'png']> = shiny
    ? [
        ['gen5ani-shiny', 'gif'],
        ['ani-shiny', 'gif'],
        ['gen5-shiny', 'png'],
        ['dex-shiny', 'png'],
      ]
    : [
        ['gen5ani', 'gif'],
        ['ani', 'gif'],
        ['gen5', 'png'],
        ['dex', 'png'],
      ];

  // Try form spriteId, then progressively de-hyphenated variants.
  // Finally, always fall back to base species variants.
  const candidates = uniq([
    ...spriteIdVariants(p.spriteId),
    ...spriteIdVariants(p.baseSpriteId),
  ]);

  const urls: string[] = [];
  for (const id of candidates) {
    for (const [folder, ext] of folders) {
      urls.push(`https://play.pokemonshowdown.com/sprites/${folder}/${id}.${ext}`);
    }
  }

  return urls;
}

export function generate(pokemon: Pokemon[], options: Options): Generated[] {
  let pool = pokemon.slice();

  // Hard exclusions are handled in useDex(). Here we only handle the user's
  // include/exclude toggles for the supported form categories.
  pool = pool.filter((p) => {
    if (isGmaxId(p.id) && !options.includeGmax) return false;
    if (isMegaForm(p) && !options.includeMega) return false;
    if (isRegionalId(p.id) && !options.includeRegional) return false;
    return true;
  });

  if (options.typeFilter.length) {
    pool = pool.filter((p) => typesMatch(p, options.typeFilter));
  }

  if (options.genFilter.length) {
    pool = pool.filter((p) => isAllowedByGens(p, options.genFilter));
  }

  if (options.legendCats.length) {
    if (options.legendMode === 'include') {
      const selectedPool = pool.filter((p) => legendCatsMatch(p, options.legendCats));
      const nonLegendPool = pool.filter((p) => !legendCatsMatch(p, ['legendary', 'sublegendary', 'mythical', 'paradox', 'ultrabeast']));
      pool = uniq([...nonLegendPool, ...selectedPool]);
    } else if (options.legendMode === 'exclude') {
      pool = pool.filter((p) => !legendCatsMatch(p, options.legendCats));
    } else {
      pool = pool.filter((p) => legendCatsMatch(p, options.legendCats));
    }
  } else if (options.legendMode === 'limit') {
    pool = pool.filter((p) => !legendCatsMatch(p, ['legendary', 'sublegendary', 'mythical', 'paradox', 'ultrabeast']));
  }

  if (options.attacker !== 'any') {
    pool = pool.filter((p) => attackerMatches(p, options.attacker));
  }

  if (Object.keys(options.statFilters).length || typeof options.bst === 'number') {
    pool = pool.filter((p) => statsMatch(p, options.statMode, options.statFilters, options.bst));
  }

  if (!pool.length) return [];

  const picked = pickN(pool, options.count);

  const allTypes = uniq(pokemon.flatMap((p) => p.types));

  const globalAbilityPool = uniq(
    pokemon
      .flatMap((p) => p.abilities ?? [])
      .filter((a) => a && a.toLowerCase() !== 'no ability')
  );

  const results: Generated[] = picked.map((p) => {
    const isShiny = Math.floor(Math.random() * options.shinyOdds) === 0;

    let displayTypes: string[] | undefined;
    if (options.randomTyping && p.id !== 'fusion' && allTypes.length) {
      const typeCount = Math.random() < 0.5 ? 1 : 2;
      displayTypes = pickN(allTypes, Math.min(typeCount, allTypes.length));
    }

    let ability: string | undefined;
    if (options.abilityMode === 'species') {
      ability = p.abilities?.length ? randomOf(p.abilities) : undefined;
    } else if (options.abilityMode === 'random') {
      ability = globalAbilityPool.length ? randomOf(globalAbilityPool) : undefined;
    }

    const rolledBuff = options.includeBuff ? randomOf(RANDOM_BUFF_MODES) : 'off';
    const buffResult = applyBuff(rolledBuff, p, globalAbilityPool);
    if (rolledBuff === 'new-typing' && allTypes.length) {
      buffResult.displayTypes = pickN(allTypes, Math.random() < 0.5 ? 1 : 2);
    }
    if (!displayTypes && buffResult.displayTypes) {
      displayTypes = buffResult.displayTypes;
    }
    ability = buffResult.ability ?? ability;

    return {
      key: crypto.randomUUID(),
      pokemon: p,
      isShiny,
      displayTypes,
      ability,
      buff: buffResult.buff,
      displayStats: buffResult.displayStats,
      buffedStatKeys: buffResult.buffedStatKeys,
      revealed: options.mystery ? false : true,
    };
  });

  if (options.fusion && results.length >= 2) {
    const mons = results.map((r) => r.pokemon);
    const a = randomOf(mons);
    const b = randomOf(mons.filter((x) => x !== a));

    const fusionTypes = uniq([
      randomOf(a.types),
      randomOf(b.types),
    ]);

    const fusion: Pokemon = {
      id: 'fusion',
      spriteId: 'fusion',
      baseSpriteId: 'fusion',
      num: 0,
      name: mashName(a.name, b.name),
      types: fusionTypes.length ? fusionTypes : ['Fairy'],
      baseStats: fusionStatsFromParents(a, b),
      abilities: options.abilityMode !== 'off' ? uniq(mons.flatMap((m) => m.abilities ?? [])) : undefined,
      tags: ['Fusion'],
    };

    const parentAbilities = uniq([...(a.abilities ?? []), ...(b.abilities ?? [])]);
    const randomNewAbilities = globalAbilityPool.filter((ab) => !parentAbilities.includes(ab));
    const randomAbilityPool = randomNewAbilities.length ? randomNewAbilities : globalAbilityPool;

    const fusionAbility = options.abilityMode === 'off'
      ? undefined
      : (Math.random() < 0.5
          ? (parentAbilities.length ? randomOf(parentAbilities) : (randomAbilityPool.length ? randomOf(randomAbilityPool) : undefined))
          : (randomAbilityPool.length ? randomOf(randomAbilityPool) : (parentAbilities.length ? randomOf(parentAbilities) : undefined)));
    const fusionBuffMode = options.includeBuff ? randomOf(RANDOM_BUFF_MODES) : 'off';
    const fusionBuffResult = applyBuff(fusionBuffMode, fusion, globalAbilityPool);
    if (fusionBuffMode === 'new-typing' && allTypes.length) {
      fusionBuffResult.displayTypes = pickN(allTypes, Math.random() < 0.5 ? 1 : 2);
    }

    results.push({
      key: crypto.randomUUID(),
      pokemon: fusion,
      isShiny: false,
      ability: fusionBuffResult.ability ?? fusionAbility,
      buff: fusionBuffResult.buff,
      displayTypes: fusionBuffResult.displayTypes,
      displayStats: fusionBuffResult.displayStats,
      buffedStatKeys: fusionBuffResult.buffedStatKeys,
      fusionParents: [a, b],
      isFusion: true,
      revealed: options.mystery ? false : true,
    });
  }

  return results;
}
