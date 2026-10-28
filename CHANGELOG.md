# Unreleased fixes

- Add optional `compact: true` to crop excess bottom space so the bottom margin matches the top margin above the title, without scaling the chart or text. Enable it in the square example; exact-square output remains available with `compact: false`.

- Halve the top margin above the title and the title-to-chart gap, retaining the canvas dimensions and moving the freed space below the chart.
- Update the square example and previews to the requested 1100 × 1100 layout with 36 px labels and a 40 px title.

- Add an optional `square` layout (900 × 900), 24 px labels, and a 32 px title; preserve the existing wide layout by default.
- Add configurable `labelFontSize` and `titleFontSize`, plus CLI and Action overrides for layout, square size, and typography.
- Include a complete square example and light/dark SVG and PNG previews.

- Fix CLI execution through npm symlinks and paths containing spaces, `#`, or `%`; importing the module remains side-effect free.
- Reject CLI options with missing values instead of silently ignoring them.
- Share override handling between CLI and GitHub Action; preserve zero opacity and numeric command-line inputs.
- Require object-shaped configs and categories, numeric JSON scores, integer ring counts, safe image dimensions, and valid XML text.
- Reject layouts whose chart, title, or labels do not fit. The radius remains fixed; callers can reduce it for smaller images. Text widths are estimated conservatively because fonts are viewer-dependent.
- Normalize score/max before multiplying by radius, preventing coordinate overflow for very large finite scores.
- Reject line breaks in Action output paths and escape workflow error messages.
- Move the Action runtime to Node.js 24 and update checkout/setup-node to v7.
- Run CI on every push and pull request with Node.js 20/22/24. Keep test jobs read-only; allow SVG commits only on the default branch after successful tests.
- Replace the undocumented publisher/tag assumption with a complete local Action setup and explicit release instructions.

## Validation

31 tests pass locally on Node.js 24.22.1. This includes CLI and Action subprocess tests, symlinks, escaped paths, malformed input, layout bounds, extreme numeric scales, square presets, and font/layout overrides in CLI and Action. The generated assets and CLI/Action reference comparisons are updated for the tighter title spacing. Local npm installation and installation from an npm-packed tarball were verified in the preceding update. Workflow/Action YAML and SVG XML parse successfully.

The GitHub-hosted workflow, repository write permissions, and bot push must still be verified in the target repository. Node.js 20 and 22 are configured in CI but were not available for local execution. No release tag or remote repository has been published by this update.
