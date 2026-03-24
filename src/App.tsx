import React, { useEffect, useMemo, useState } from 'react';
import { useDex } from './useDex';
import type { BuffMode, LegendCategory, LegendMode, Options, ShinyOdds, StatKey, Generated } from './types';
import { generate, spriteFallbacks } from './generate';
import { uniq } from './utils';

const STAT_KEYS: { key: StatKey; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'Atk' },
  { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' },
  { key: 'spd', label: 'SpD' },
  { key: 'spe', label: 'Spe' },
];

const DEFAULTS: Options = {
  count: 6,

  includeMega: false,
  includeGmax: false,
  includeRegional: true,

  typeFilter: [],
  genFilter: [],
  legendCats: [],
  legendMode: 'include',

  attacker: 'any',

  statMode: 'min',
  statFilters: {},
  bst: undefined,

  randomTyping: false,

  abilityMode: 'species',
  buffMode: 'off',
  fusion: false,
  mystery: false,

  shinyOdds: 512,
};

const PASTEL_BACKGROUNDS: string[] = [
  `radial-gradient(circle at 15% 20%, rgba(255,182,193,0.22), transparent 55%), radial-gradient(circle at 85% 30%, rgba(186, 85, 211,0.20), transparent 55%), rgba(255,255,255,0.04)`,
  `radial-gradient(circle at 20% 25%, rgba(173,216,230,0.22), transparent 55%), radial-gradient(circle at 80% 30%, rgba(255,192,203,0.18), transparent 55%), rgba(255,255,255,0.04)`,
  `radial-gradient(circle at 20% 25%, rgba(152,251,152,0.18), transparent 55%), radial-gradient(circle at 80% 30%, rgba(221,160,221,0.20), transparent 55%), rgba(255,255,255,0.04)`,
  `radial-gradient(circle at 20% 25%, rgba(255,250,205,0.20), transparent 55%), radial-gradient(circle at 80% 30%, rgba(176,196,222,0.20), transparent 55%), rgba(255,255,255,0.04)`,
  `radial-gradient(circle at 20% 25%, rgba(255,228,196,0.20), transparent 55%), radial-gradient(circle at 80% 30%, rgba(216,191,216,0.20), transparent 55%), rgba(255,255,255,0.04)`,
  `radial-gradient(circle at 20% 25%, rgba(240,230,255,0.22), transparent 55%), radial-gradient(circle at 80% 30%, rgba(255,182,193,0.18), transparent 55%), rgba(255,255,255,0.04)`,
];

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

function TypeBadge({ type }: { type: string }) {
  const tone = TYPE_COLORS[type.toLowerCase()] ?? '#B8A0D8';
  return <span className="badge typeBadge" style={{ ['--type-color' as any]: tone }}>{type}</span>;
}

function DropdownMulti({
  title,
  subtitle,
  selectedCount,
  rightChip,
  children,
}: {
  title: string;
  subtitle?: string;
  selectedCount: number;
  rightChip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="dd">
      <summary className="ddSummary">
        <div className="ddSummaryLeft">
          <div className="ddTitle">{title}</div>
          {subtitle && <div className="ddSub">{subtitle}</div>}
        </div>
        <div className="ddSummaryRight">
          {rightChip}
          <span className={selectedCount ? "ddCount on" : "ddCount"}>{selectedCount || 'All'}</span>
          <span className="ddCaret" aria-hidden="true">▾</span>
        </div>
      </summary>
      <div className="ddBody">{children}</div>
    </details>
  );
}



function SpriteImg({ p, shiny, className }: { p: any; shiny: boolean; className?: string }) {
  const urls = useMemo(() => spriteFallbacks(p, shiny), [p, shiny]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [p, shiny]);

  return (
    <img
      className={className}
      src={urls[idx]}
      alt={p.name}
      onError={() => setIdx((i) => (i + 1 < urls.length ? i + 1 : i))}
    />
  );
}


export default function App() {
  const { loading, error, pokemon, types, gens } = useDex();

  const [opts, setOpts] = useState<Options>(DEFAULTS);
  const [results, setResults] = useState<Generated[]>([]);
  const [cardSkins, setCardSkins] = useState<string[]>([]);

  const canGenerate = !loading && !error && pokemon.length > 0;

  const selectedTypes = useMemo(() => new Set(opts.typeFilter.map(t => t.toLowerCase())), [opts.typeFilter]);
  const selectedGens = useMemo(() => new Set(opts.genFilter), [opts.genFilter]);

  function toggleType(t: string) {
    setOpts(o => {
      const cur = new Set(o.typeFilter);
      if (cur.has(t)) cur.delete(t); else cur.add(t);
      return { ...o, typeFilter: Array.from(cur) };
    });
  }

  function toggleGen(g: number) {
    setOpts(o => {
      const cur = new Set(o.genFilter);
      if (cur.has(g)) cur.delete(g); else cur.add(g);
      return { ...o, genFilter: Array.from(cur).sort((a, b) => a - b) };
    });
  }

  function setStatFilter(k: StatKey, v: string) {
    const n = v === '' ? undefined : Number(v);
    setOpts(o => {
      const next = { ...o.statFilters };
      if (n === undefined || Number.isNaN(n)) delete (next as any)[k];
      else (next as any)[k] = Math.max(0, Math.min(255, n));
      return { ...o, statFilters: next };
    });
  }

  function setBST(v: string) {
    const n = v === '' ? undefined : Number(v);
    setOpts(o => ({ ...o, bst: (n === undefined || Number.isNaN(n)) ? undefined : Math.max(0, Math.min(1530, n)) }));
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function onGenerate() {
    const out = generate(pokemon, opts);
    setResults(out);

    // shuffle pastel skins each time you generate
    const palette = shuffle(PASTEL_BACKGROUNDS);
    const skins: string[] = [];
    for (let i = 0; i < out.length; i++) skins.push(palette[i % palette.length]);
    setCardSkins(skins);
  }

  function reveal(key: string) {
    setResults(rs => rs.map(r => (r.key === key ? { ...r, revealed: true } : r)));
  }

  const selectedTypeChips = useMemo(() => opts.typeFilter.slice().sort((a, b) => a.localeCompare(b)), [opts.typeFilter]);

  return (
    <div className="app">
      <div className="stars" aria-hidden="true" />
      <header className="header">
        <div className="titleRow">
          <div className="logo">★</div>
          <div>
            <h1>Pinkmon Generator</h1>
            <p className="subtitle">Cute random Pokémon with filters, abilities, buffs, mystery & fusion ✨</p>
          </div>
        </div>
        <div className="headerActions">
          <button className="btn btnPrimary" onClick={onGenerate} disabled={!canGenerate}>
            Generate ✨
          </button>
          <button className="btn btnGhost" onClick={() => { setOpts(DEFAULTS); setResults([]); }}>
            Reset
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="card controls">
          <h2>Setup</h2>

          {loading && <div className="hint">Loading Showdown dex…</div>}
          {error && <div className="error">Dex load failed: {error}</div>}

          <div className="row topRow">
            <label className="field">
              <span>How many?</span>
              <select
                value={String(opts.count)}
                onChange={(e) => setOpts(o => ({ ...o, count: Number(e.target.value) }))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Attacker</span>
              <select value={opts.attacker} onChange={(e) => setOpts(o => ({ ...o, attacker: e.target.value as any }))}>
                <option value="any">Any</option>
                <option value="physical">Physical (Atk ≥ SpA)</option>
                <option value="special">Special (SpA &gt; Atk)</option>
              </select>
            </label>

            <label className="field">
              <span>Shiny odds</span>
              <select
                value={String(opts.shinyOdds)}
                onChange={(e) => setOpts(o => ({ ...o, shinyOdds: Number(e.target.value) as ShinyOdds }))}
              >
                <option value="4096">1 / 4096</option>
                <option value="2048">1 / 2048</option>
                <option value="512">1 / 512</option>
                <option value="128">1 / 128</option>
              </select>
            </label>
          </div>

          <div className="setupGrid">
            <div className="setupCol">
              <DropdownMulti
                title="Generations"
                subtitle=""
                selectedCount={opts.genFilter.length}
              >
                <div className="ddTools">
                  <button type="button" className="tinyBtn" onClick={() => setOpts(o => ({ ...o, genFilter: [1,2,3,4,5,6,7,8,9] }))}>All</button>
                  <button type="button" className="tinyBtn" onClick={() => setOpts(o => ({ ...o, genFilter: [] }))}>None</button>
                </div>
                <div className="ddList">
                  {gens.map((g) => (
                    <label key={g} className="ddItem">
                      <input type="checkbox" checked={selectedGens.has(g)} onChange={() => toggleGen(g)} disabled={!canGenerate} />
                      <span>Gen {g}</span>
                    </label>
                  ))}
                </div>
                <div className="hint">Leaving this at <b>All</b> keeps every gen in the pool.</div>
              </DropdownMulti>

              <DropdownMulti
                title="Types"
                subtitle=""
                selectedCount={opts.typeFilter.length}
              >
                <div className="ddTools">
                  <button type="button" className="tinyBtn" onClick={() => setOpts(o => ({ ...o, typeFilter: types }))}>All</button>
                  <button type="button" className="tinyBtn" onClick={() => setOpts(o => ({ ...o, typeFilter: [] }))}>None</button>
                </div>
                <div className="ddList ddList2">
                  {types.map((t) => (
                    <label key={t} className="ddItem">
                      <input type="checkbox" checked={selectedTypes.has(t.toLowerCase())} onChange={() => toggleType(t)} disabled={!canGenerate} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
                {selectedTypeChips.length > 0 && (
                  <div className="hint">Matching: {selectedTypeChips.map(t => <Badge key={t}>{t}</Badge>)}</div>
                )}
              </DropdownMulti>
            </div>

            <div className="setupCol">
              <DropdownMulti
                title="Forms"
                subtitle=""
                selectedCount={[opts.includeRegional, opts.includeMega, opts.includeGmax].filter(Boolean).length}
              >
                <label className="check"><input type="checkbox" checked={opts.includeRegional} onChange={(e) => setOpts(o => ({ ...o, includeRegional: e.target.checked }))} /><span>Regional (Alola/Galar/Hisui/Paldea)</span></label>
                <label className="check"><input type="checkbox" checked={opts.includeMega} onChange={(e) => setOpts(o => ({ ...o, includeMega: e.target.checked }))} /><span>Mega forms</span></label>
                <label className="check"><input type="checkbox" checked={opts.includeGmax} onChange={(e) => setOpts(o => ({ ...o, includeGmax: e.target.checked }))} /><span>Gigantamax (Gmax)</span></label>
              </DropdownMulti>

              <DropdownMulti
                title="Legends"
                subtitle=""
                selectedCount={opts.legendCats.length}
                rightChip={<span className="miniPill">{opts.legendMode === 'include' ? 'Include' : opts.legendMode === 'exclude' ? 'Exclude' : 'Limit to'}</span>}
              >
                <div className="ddTools">
                  {(['include', 'exclude', 'limit'] as LegendMode[]).map((mode) => (
                    <button
                      key={mode}
                      className="tinyBtn"
                      type="button"
                      onClick={() => setOpts(o => ({ ...o, legendMode: mode }))}
                    >
                      {mode === 'limit' ? 'Limit To' : mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="ddTools">
                  <button
                    className="tinyBtn"
                    type="button"
                    onClick={() => setOpts(o => ({ ...o, legendCats: ['legendary','sublegendary','mythical','paradox','ultrabeast'] }))}
                  >
                    Select all
                  </button>
                  <button className="tinyBtn" type="button" onClick={() => setOpts(o => ({...o, legendCats: []}))}>Clear</button>
                </div>
                {[
                  ['legendary','Legendaries'],
                  ['sublegendary','Sub-legendaries'],
                  ['mythical','Mythicals'],
                  ['paradox','Paradox'],
                  ['ultrabeast','Ultra Beasts'],
                ].map(([key,label]) => (
                  <label key={key} className="check">
                    <input
                      type="checkbox"
                      checked={opts.legendCats.includes(key as LegendCategory)}
                      onChange={(e) => setOpts(o => {
                        const set = new Set(o.legendCats);
                        if (e.target.checked) set.add(key as LegendCategory);
                        else set.delete(key as LegendCategory);
                        const next = Array.from(set) as LegendCategory[];
                        return {...o, legendCats: next};
                      })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
                <div className="hint">{opts.legendMode === 'include' ? 'Include adds selected categories to the normal pool.' : opts.legendMode === 'exclude' ? 'Exclude removes selected categories from the pool.' : 'Limit To shows only selected categories.'}</div>
              </DropdownMulti>
            </div>
          </div>

          <div className="row">
            <label className="field">
              <span className="label">Ability</span>
              <select className="select" value={opts.abilityMode} onChange={(e) => setOpts(o => ({ ...o, abilityMode: e.target.value as any }))}>
                <option value="off">Off</option>
                <option value="species">Species ability</option>
                <option value="random">Random ability</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Buff</span>
              <select
                className="select"
                value={opts.buffMode}
                onChange={(e) => setOpts(o => ({ ...o, buffMode: e.target.value as BuffMode }))}
              >
                <option value="off">Off</option>
                <option value="custom-move">Custom Move</option>
                <option value="chosen-ability">Chosen Ability</option>
                <option value="plus-one-stat">(+10/15/20/25/30/35/40) to one stat</option>
                <option value="plus-two-stats">(+10/15/20) to two stats</option>
                <option value="new-typing">New Typing</option>
                <option value="double-lowest-stat">Double its lowest stat</option>
                <option value="match-highest-stat">Change 1 stat to match its highest stat</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={opts.randomTyping} onChange={(e) => setOpts(o => ({ ...o, randomTyping: e.target.checked }))} />
              <span>Random typing</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={opts.fusion} onChange={(e) => setOpts(o => ({ ...o, fusion: e.target.checked }))} />
              <span>Fusion</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={opts.mystery} onChange={(e) => setOpts(o => ({ ...o, mystery: e.target.checked }))} />
              <span>Mystery reveal</span>
            </label>
          </div>

          <div className="subcard">
            <div className="subhead">
              <h3>Stat filters</h3>
              <div className="subheadBtns">
                <select
                  className="miniSelect"
                  value={opts.statMode}
                  onChange={(e) => setOpts(o => ({ ...o, statMode: e.target.value as any }))}
                  title="Min or Max stats"
                >
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
              </div>
            </div>

            <div className="bstRow">
              <label className="statField">
                <span>BST</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="—"
                  value={opts.bst ?? ''}
                  onChange={(e) => setBST(e.target.value)}
                />
              </label>
            </div>

            <div className="statsGrid">
              {STAT_KEYS.map(({ key, label }) => (
                <label key={key} className="statField">
                  <span>{label}</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="—"
                    value={(opts.statFilters as any)[key] ?? ''}
                    onChange={(e) => setStatFilter(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="hint">Stats/abilities come from Pokémon Showdown’s public dex feed.</div>
          </div>
        </section>

        <section className="card results">
          <h2>Results</h2>

          {!results.length && (
            <div className="empty">
              <div className="emptyBall">◓</div>
              <div>Hit <b>Generate</b> to roll your team ✨</div>
            </div>
          )}

          <div className={"resultGrid" + (results.length >= 6 ? " n6 compact" : results.length >= 4 ? " n4 cozy" : results.length ? " n" + results.length : "")}>
            {results.map((r, i) => {
              const p = r.pokemon;
              const isFusion = Boolean(r.isFusion);

              return (
                <div key={r.key} className={isFusion ? 'resultCard fusion' : 'resultCard'} style={{ background: cardSkins[i] ?? PASTEL_BACKGROUNDS[i % PASTEL_BACKGROUNDS.length] }}>
                  <div className="spriteWrap">
                    {r.revealed ? (
                      isFusion ? (
                        r.fusionParents ? (
                          <div className="fusionSpriteRow" aria-label={`Fusion of ${r.fusionParents[0].name} and ${r.fusionParents[1].name}`}>
                            <SpriteImg p={r.fusionParents[0]} shiny={false} className="sprite fusionSprite" />
                            <span className="fusionPlus" aria-hidden="true">＋</span>
                            <SpriteImg p={r.fusionParents[1]} shiny={false} className="sprite fusionSprite" />
                          </div>
                        ) : (
                          <img className="sprite" src={`${import.meta.env.BASE_URL}fusion.svg`} alt="Fusion" loading="lazy" />
                        )
                      ) : (
                        <SpriteImg p={p} shiny={r.isShiny} className="sprite" />
                      )
                    ) : (
                      <button className="mysteryCover" onClick={() => reveal(r.key)} title="Click to reveal!">
                        <span className="mysteryBall">◒</span>
                        <span>Reveal</span>
                      </button>
                    )}

                    {r.revealed && r.isShiny && <div className="cornerTag shiny">Shiny ✨</div>}
                    {r.revealed && isFusion && <div className="cornerTag fusionTag">Fusion 💜</div>}
                  </div>

                  <div className="meta">
                    <div className="nameRow">
                      <div className="name">{r.revealed ? p.name : '???'}</div>
                      {r.revealed && p.num > 0 && <div className="dex">#{p.num}</div>}
                    </div>

                    {r.revealed && (
                      <div className="typeRow">
                        {(r.displayTypes ?? p.types).map((t) => <TypeBadge key={t} type={t} />)}
                      </div>
                    )}

                    {r.revealed && opts.abilityMode !== 'off' && (
                      <div className="line">
                        <span className="lineLabel">Ability</span>
                        <span className="lineValue">{r.ability ?? '—'}</span>
                      </div>
                    )}

                    {r.revealed && opts.buffMode !== 'off' && (
                      <div className="line">
                        <span className="lineLabel">Buff</span>
                        <span className="lineValue">{r.buff ?? '—'}</span>
                      </div>
                    )}

                    {r.revealed && p.baseStats && (
                      <div className="statsMini">
                        {STAT_KEYS.map(({ key, label }) => (
                          <div key={key} className="statChip">
                            <span className="statLabel">{label}</span>
                            <span className={r.buffedStatKeys?.includes(key) ? 'statVal statValBuffed' : 'statVal'}>
                              {(r.displayStats ?? p.baseStats)?.[key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="footerNote">
            Sprites & data © Pokémon Showdown / Pokémon. This tool fetches public dex data from Showdown at runtime.
          </div>
        </section>
      </main>
    </div>
  );
}
