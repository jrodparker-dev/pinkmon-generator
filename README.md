# Pinkmon Random Generator (Vite + React)

A cute, pink/purple, bubbly Pokémon random generator with:
- type + generation filters
- legends-only (heuristic using tags when available)
- attacker preference (Atk vs SpA)
- min stat filters
- ability + buff display
- shiny odds control
- fusion placeholder
- mystery reveal mode

Data source: Pokémon Showdown public dex feed (pokedex.json). citeturn2search0turn2search3

## Install
```bash
npm install
```

## Run (dev)
```bash
npm run dev
```

## Build (production)
```bash
npm run build
```

Outputs: `dist/`

## Deploy to GitHub Pages (docs folder)
1. Build and copy dist -> docs:
```bash
npm run deploy:docs
```
2. Commit + push `docs/`
3. GitHub repo -> Settings -> Pages -> Deploy from branch -> `main` + `/docs`

### GitHub Pages base path
If your Pages URL is `https://<user>.github.io/<repo>/`, build with:
```bash
set VITE_BASE=/<repo>/ && npm run build
npm run deploy:docs
```

## Custom dex overrides (optional)
You can override Showdown data by placing a JSON file at:
`public/custom/pokedex.json`

Example:
```json
{
  "raichualola": { "tags": ["Legendary"] }
}
```
