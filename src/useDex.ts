import { useEffect, useMemo, useState } from 'react';
import type { DexMap, Pokemon } from './types';
import { genFromNum, uniq } from './utils';

const PS_POKEDEX_JSON = 'https://play.pokemonshowdown.com/data/pokedex.json';


function isBannedForm(id: string, entry: any): boolean {
  const baseSpecies = String(entry.baseSpecies || entry.name || '').toLowerCase();
  const forme = String(entry.forme || '').toLowerCase();

  // Ban Arceus/Silvally type-changing forms (keep only the base).
  if (baseSpecies === 'arceus' && id !== 'arceus') return true;
  if (baseSpecies === 'silvally' && id !== 'silvally') return true;

  // Ban annoying extra-sprite troublemakers the user asked to exclude.
  if (id.includes('totem') || forme.includes('totem')) return true;
  if (id.includes('busted') || forme.includes('busted')) return true;

  // "Crowned" (Zacian/Zamazenta) and "Ice" rider (Calyrex) forms excluded per request.
  if (id.includes('crowned') || forme.includes('crowned')) return true;
  if (baseSpecies === 'calyrex' && (id.endsWith('ice') || forme.includes('ice'))) return true;

  return false;
}

// Optional: you can drop custom dex overrides at /custom/pokedex.json (in public/)
// Format: { "<psid>": { ...fields to override... } }
async function loadCustomOverrides(): Promise<Partial<DexMap> | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}custom/pokedex.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeEntry(id: string, entry: any): Pokemon | null {
  if (!entry || typeof entry.num !== 'number' || !entry.name || !Array.isArray(entry.types)) return null;

  const abilitiesMap: Record<string, string> | undefined = entry.abilities;
  const abilities = abilitiesMap ? uniq(Object.values(abilitiesMap).filter(Boolean)) : undefined;

  const spriteId = String(entry.name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const baseSpriteId = String(entry.baseSpecies || entry.name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    id,
    spriteId,
    baseSpriteId,
    num: entry.num,
    name: entry.name,
    types: entry.types,
    baseStats: entry.baseStats,
    abilities,
    tags: entry.tags,
  };
}

export function useDex() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [dexRes, overrides] = await Promise.all([
          fetch(PS_POKEDEX_JSON, { cache: 'force-cache' }),
          loadCustomOverrides(),
        ]);

        if (!dexRes.ok) throw new Error(`Failed to fetch PS pokedex.json (${dexRes.status})`);
        const dex: DexMap = await dexRes.json();

        // Apply overrides if provided
        if (overrides) {
          for (const [k, v] of Object.entries(overrides)) {
            // @ts-ignore
            dex[k] = { ...(dex as any)[k], ...(v as any) };
          }
        }

        const list: Pokemon[] = [];
        const typeSet: string[] = [];

        for (const [id, entry] of Object.entries(dex)) {
          const p = normalizeEntry(id, entry);
          if (!p) continue;
          if (isBannedForm(id, entry)) continue;

          // Keep "real" mons only (exclude "CAP" etc) if you want later.
          // For now: keep everything with a National Dex number.
          if (p.num <= 0) continue;

          list.push(p);
          for (const t of p.types) typeSet.push(t);
        }

        list.sort((a, b) => a.num - b.num || a.name.localeCompare(b.name));
        const uniqueTypes = uniq(typeSet).sort((a, b) => a.localeCompare(b));

        if (!cancelled) {
          setPokemon(list);
          setTypes(uniqueTypes);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const gens = useMemo(() => uniq(pokemon.map(p => genFromNum(p.num))).sort((a, b) => a - b), [pokemon]);

  return { loading, error, pokemon, types, gens };
}
