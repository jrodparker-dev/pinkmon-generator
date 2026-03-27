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
  prevo?: string;
  evos?: string[];
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
  prevo?: string;
  evos?: string[];
};

export type AttackerPref = 'any' | 'physical' | 'special';
export type EvolutionStage = 'fully-evolved' | 'evolved-once' | 'unevolved';

export type ShinyOdds = 4096 | 2048 | 512 | 128;

export type AbilityMode = 'off' | 'species' | 'random';
export type BuffKind =
  | 'custom-move'
  | 'chosen-ability'
  | 'plus-one-stat'
  | 'plus-two-stats'
  | 'new-typing'
  | 'double-lowest-stat'
  | 'match-highest-stat';

export type StatMode = 'min' | 'max';

export type LegendCategory = 'legendary' | 'sublegendary' | 'mythical' | 'paradox' | 'ultrabeast';
export type LegendMode = 'include' | 'exclude' | 'limit';

export type Options = {
  count: number;

  // Form-category toggles
  includeMega: boolean;
  includeGmax: boolean;
  includeRegional: boolean;

  // Filters
  typeFilter: string[];      // matches any selected type(s)
  genFilter: number[];       // allowed gens
  legendCats: LegendCategory[];
  legendMode: LegendMode;

  attacker: AttackerPref;

  statMode: StatMode;
  statFilters: Partial<BaseStats>;
  bst?: number;

  randomTyping: boolean;
  evolutionStages: EvolutionStage[];

  // Extras
  abilityMode: AbilityMode;
  includeBuff: boolean;
  buffKinds: BuffKind[];
  plusOneAmounts: number[];
  plusTwoAmounts: number[];
  fusion: boolean;
  mystery: boolean;
  pokeballPicker: boolean;

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
  displayStats?: BaseStats;
  buffedStatKeys?: StatKey[];
  fusionParents?: [Pokemon, Pokemon];
  isFusion?: boolean;
  revealed?: boolean; // for mystery
};
