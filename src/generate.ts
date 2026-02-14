import type { Generated, Options, Pokemon } from './types';
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

const BUFFS = [
  '✨ +10% power',
  '🌟 +1 priority (first move)',
  '💖 Heals 10% each turn',
  '🫧 Takes 15% less damage',
  '⚡ Speed boost on entry',
  '🛡️ +1 Def on hit (1/turn)',
];

function isAllowedByGens(p: Pokemon, allowed: number[]): boolean {
  if (!allowed.length) return true;
  return allowed.includes(genFromNum(p.num));
}

function isRegionalId(id: string): boolean {
  return id.includes('alola') || id.includes('galar') || id.includes('hisui') || id.includes('paldea');
}

function isMegaId(id: string): boolean {
  return id.includes('mega');
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
    if (isMegaId(p.id) && !options.includeMega) return false;
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
    pool = pool.filter((p) => legendCatsMatch(p, options.legendCats));
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
      const banned = new Set(p.types.map(t => t.toLowerCase()));
      const candidates = allTypes.filter(t => !banned.has(t.toLowerCase()));
      if (candidates.length) {
        displayTypes = [randomOf(candidates)];
      }
    }

    let ability: string | undefined;
    if (options.abilityMode === 'species') {
      ability = p.abilities?.length ? randomOf(p.abilities) : undefined;
    } else if (options.abilityMode === 'random') {
      ability = globalAbilityPool.length ? randomOf(globalAbilityPool) : undefined;
    }

    const buff = options.includeBuff ? randomOf(BUFFS) : undefined;

    return {
      key: crypto.randomUUID(),
      pokemon: p,
      isShiny,
      displayTypes,
      ability,
      buff,
      revealed: options.mystery ? false : true,
    };
  });

  if (options.fusion && results.length >= 2) {
    const mons = results.map((r) => r.pokemon);
    const a = randomOf(mons);
    const b = randomOf(mons.filter((x) => x !== a));

    const typesPool = uniq(mons.flatMap((m) => m.types));
    const fusionTypes = pickN(typesPool, Math.min(2, typesPool.length));

    const fusion: Pokemon = {
      id: 'fusion',
      spriteId: 'fusion',
      baseSpriteId: 'fusion',
      num: 0,
      name: mashName(a.name, b.name),
      types: fusionTypes.length ? fusionTypes : ['Fairy'],
      baseStats: undefined,
      abilities: options.abilityMode !== 'off' ? uniq(mons.flatMap((m) => m.abilities ?? [])) : undefined,
      tags: ['Fusion'],
    };

    const fusionAbility =
      options.abilityMode !== 'off' && fusion.abilities?.length ? randomOf(fusion.abilities) : undefined;
    const fusionBuff = options.includeBuff ? randomOf(BUFFS) : undefined;

    results.push({
      key: crypto.randomUUID(),
      pokemon: fusion,
      isShiny: false,
      ability: fusionAbility,
      buff: fusionBuff,
      isFusion: true,
      revealed: options.mystery ? false : true,
    });
  }

  return results;
}
