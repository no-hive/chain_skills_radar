import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.mjs";
import { generateRadarSvg, normalizeConfig } from "../src/radar.mjs";

const sample = {
  title: "Smart Contract Areas",
  max: 10,
  rings: 4,
  color: "#6366f1",
  fillOpacity: 0.3,
  areas: {
    DeFi: 5,
    PayFi: 3,
    Assets: 1,
    DePIN: 2,
    Privacy: 4,
    Identity: 3,
    Funding: 4,
    DAOs: 8,
  },
};

test("loads the JSON configuration", async () => {
  const parsed = await loadConfig(new URL("../radar.json", import.meta.url));
  assert.equal(parsed.theme, "auto");
  assert.deepEqual(parsed.areas, sample.areas);
});

test("generates a standalone SVG with labels, color, and dots", () => {
  const svg = generateRadarSvg(sample);
  assert.match(svg, /^<svg/);
  assert.match(svg, /viewBox="0 0 1200 600"/);
  assert.match(svg, /fill:#6366f1;fill-opacity:0\.3/);
  assert.match(svg, /@media\(prefers-color-scheme:dark\)/);
  assert.match(svg, /class="chart-title"[^>]*>Smart Contract Areas<\/text>/);
  assert.match(svg, />Funding<\/text>/);
  assert.equal((svg.match(/<circle class="dot"/g) ?? []).length, 8);
});

test("supports fixed light and dark themes", () => {
  const light = generateRadarSvg({ ...sample, theme: "light" });
  const dark = generateRadarSvg({ ...sample, theme: "dark" });
  assert.doesNotMatch(light, /prefers-color-scheme/);
  assert.match(light, /\.background\{fill:#fff\}/);
  assert.doesNotMatch(dark, /prefers-color-scheme/);
  assert.match(dark, /\.background\{fill:#0d1117\}/);
});

test("uses compact equal vertical spacing around the title and radar", () => {
  const svg = generateRadarSvg(sample);
  assert.match(svg, /class="chart-title" x="600" y="46\.9"/);
  assert.match(svg, /class="label" x="600\.0" y="83\.8"/);
  assert.match(svg, /class="label" x="600\.0" y="567\.8"/);
});

test("rejects values outside the scale", () => {
  assert.throws(
    () => normalizeConfig({ ...sample, areas: { A: 1, B: 2, C: 11 } }),
    /must be between 0 and 10/,
  );
});

test("escapes category labels", () => {
  const svg = generateRadarSvg({
    ...sample,
    title: "Skills & Protocols",
    areas: { "A&B": 1, B: 2, C: 3 },
  });
  assert.match(svg, />A&amp;B<\/text>/);
  assert.match(svg, />Skills &amp; Protocols<\/text>/);
});
