# ChainSkillsRadar

Add an onchain-skills radar to your GitHub README.

## 1. Create `radar.json`

Add this file to the root of your repository:

```json
{
  "title": "ChainSkillsRadar",
  "max": 10,
  "rings": 4,
  "color": "#6366f1",
  "fillOpacity": 0.3,
  "theme": "auto",
  "width": 1200,
  "height": 600,
  "areas": {
    "DeFi": 5,
    "PayFi": 3,
    "Assets": 1,
    "DePIN": 2,
    "Privacy": 4,
    "Identity": 3,
    "Funding": 4,
    "DAOs": 8
  }
}
```

The `title` value is shown above the radar. Use `"theme": "auto"` to follow the GitHub theme automatically. You can also use `"light"` or `"dark"` to lock the image to one theme. Change the title, category names, values, color, and opacity as needed. Values must be between `0` and `max`.

## 2. Create the workflow

Create `.github/workflows/chain-skills-radar.yml`:

```yaml
name: Update ChainSkillsRadar

on:
  workflow_dispatch:
  push:
    paths:
      - "radar.json"

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate radar
        uses: YOUR_GITHUB_USER/chain-skills-radar@v3
        with:
          config: radar.json
          output: assets/radar.svg

      - name: Commit radar
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/radar.svg
          git diff --cached --quiet || git commit -m "chore: update skills radar"
          git push
```

Replace `YOUR_GITHUB_USER` with the GitHub username or organization that publishes ChainSkillsRadar.

## 3. Add the image to your README

```md
![My onchain skills](./assets/radar.svg)
```

## 4. Push the changes

Commit and push `radar.json`, the workflow, and your README. GitHub Actions will generate `assets/radar.svg` and add it to the repository automatically.

Whenever you change `radar.json`, the image will be regenerated.
