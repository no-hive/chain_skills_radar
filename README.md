# ChainSkillsRadar

Generate a lightweight, responsive onchain-skills radar SVG for a GitHub README. Categories remain fully customizable, values use a configurable scale, and the card supports dark mode without JavaScript or external fonts.

![Example radar](./assets/radar.svg)

## Configure

Create `radar.yml`:

```yaml
title: "ChainSkillsRadar"
max: 10
rings: 4
color: "#6366f1"
fillOpacity: 0.3

areas:
  DeFi: 5
  PayFi: 3
  Assets: 1
  DePIN: 2
  Privacy: 4
  Identity: 3
  Funding: 4
  DAOs: 8
```

The order under `areas` is the clockwise order of the radar axes, starting at the top. Use between 3 and 16 categories. Colors must be three- or six-digit hex values.

## Generate locally

Node.js 20 or newer is required. The project has no runtime dependencies.

```bash
npm run generate
```

Or run the CLI directly:

```bash
node src/cli.mjs generate \
  --config radar.yml \
  --output assets/radar.svg
```

Values and appearance can also be overridden from the command line:

```bash
node src/cli.mjs generate \
  --config radar.yml \
  --values '{"DeFi":5,"PayFi":3,"Assets":1,"DePIN":2,"Privacy":4,"Identity":3,"Funding":4,"DAOs":8}' \
  --color '#14b8a6' \
  --fill-opacity 0.3 \
  --output assets/radar.svg
```

Embed the generated file in a README:

```md
![My radar](./assets/radar.svg)
```

## Connect it to your repository

1. Publish this project as `chain-skills-radar` and create a `v1` tag.
2. Add `radar.yml` to the repository where you want the card.
3. Add the workflow below as `.github/workflows/update-chain-skills-radar.yml`.
4. Add `![My onchain skills](./assets/radar.svg)` to that repository's README.

The workflow regenerates and commits the SVG whenever `radar.yml` changes:

```yaml
name: Update ChainSkillsRadar

on:
  workflow_dispatch:
  push:
    paths:
      - "radar.yml"

permissions:
  contents: write

jobs:
  radar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate radar
        uses: YOUR_GITHUB_USER/chain-skills-radar@v1
        with:
          config: radar.yml
          output: assets/radar.svg
          color: "#6366f1"
          fill_opacity: "0.3"

      - name: Commit generated SVG
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/radar.svg
          git diff --cached --quiet || git commit -m "chore: update radar SVG"
          git push
```

Instead of editing `radar.yml`, callers can pass all values as JSON:

```yaml
- uses: YOUR_GITHUB_USER/chain-skills-radar@v1
  with:
    values: '{"DeFi":5,"PayFi":3,"Assets":1,"DePIN":2,"Privacy":4,"Identity":3,"Funding":4,"DAOs":8}'
    color: "#6366f1"
    fill_opacity: "0.3"
    output: assets/radar.svg
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `config` | `radar.yml` | YAML or JSON configuration path |
| `output` | `assets/radar.svg` | Generated SVG path |
| `values` | — | JSON object that replaces `areas` |
| `color` | config value | Three- or six-digit hex color |
| `fill_opacity` | config value | Number from `0` to `1` |
| `max` | config value | Maximum radar scale value |

## Development

```bash
npm test
npm run generate
```

## License

MIT
