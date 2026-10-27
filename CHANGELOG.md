# Unreleased fixes

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

22 tests pass locally on Node.js 24.22.1. This includes CLI and Action subprocess tests, symlinks, escaped paths, malformed input, layout bounds, and extreme numeric scales. Default SVG generation matches the original asset byte for byte. Local npm installation and installation from an npm-packed tarball both generate that same SVG. Workflow/Action YAML and SVG XML parse successfully.

The GitHub-hosted workflow, repository write permissions, and bot push must still be verified in the target repository. Node.js 20 and 22 are configured in CI but were not available for local execution. No release tag or remote repository has been published by this update.
