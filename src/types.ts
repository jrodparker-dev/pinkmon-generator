export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export type BaseStats = Record<StatKey, number>;

export type PSDexEntry = {
  num: number;
  name: string;
  types: string[];
  abilities?: Record<string, string>;
  baseStats?: BaseStats;
  baseSpecies?: string;
  forme?: string;
  otherFormes?: string[];
  cosmeticFormes?: string[];
  tags?: string[];
  tier?: string;
  gen?: number;
};

export type DexMap = Record<string, PSDexEntry>;

export type Pokemon = {
  id: string; // PS id key in pokedex.json (no dashes in many formes)
  spriteId: string; // sprite filename id (usually dashed), derived from name
  baseSpriteId: string; // base species sprite filename id (used as fallback)
  num: number;
  name: string;
  types: string[];
  baseStats?: BaseStats;
  abilities?: string[]; // ability names
  tags?: string[];
};

export type AttackerPref = 'any' | 'physical' | 'special';

export type ShinyOdds = 4096 | 2048 | 512 | 128;

export type AbilityMode = 'off' | 'species' | 'random';

export type StatMode = 'min' | 'max';

export type LegendCategory = 'legendary' | 'sublegendary' | 'mythical' | 'paradox';

export type Options = {
  count: number;

  // Form-category toggles
  includeMega: boolean;
  includeGmax: boolean;
  includeRegional: boolean;

  // Filters
  typeFilter: string[];      // must include all selected type(s)
  genFilter: number[];       // allowed gens
  legendCats: LegendCategory[]; // if empty => include all (including non-legends)

  attacker: AttackerPref;

  statMode: StatMode;
  statFilters: Partial<BaseStats>;
  bst?: number;

  randomTyping: boolean;

  // Extras
  abilityMode: AbilityMode;
  includeBuff: boolean;
  fusion: boolean;
  mystery: boolean;

  shinyOdds: ShinyOdds;
};

export type Generated = {
  key: string;
  pokemon: Pokemon;
  isShiny: boolean;

  // Display overrides (do not mutate the base Pokemon object)
  displayTypes?: string[];

  ability?: string;
  buff?: string;
  isFusion?: boolean;
  revealed?: boolean; // for mystery
};
