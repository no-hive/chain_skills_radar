import assert from "node:assert/strict";
import test from "node:test";
import { parseSimpleYaml } from "../src/config.mjs";
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

test("parses the supported YAML configuration", () => {
  const parsed = parseSimpleYaml(`color: "#6366f1"\nfillOpacity: 0.3\nareas:\n  DeFi: 5\n  DAOs: 8\n`);
  assert.equal(parsed.color, "#6366f1");
  assert.equal(parsed.fillOpacity, 0.3);
  assert.deepEqual(parsed.areas, { DeFi: 5, DAOs: 8 });
});

test("generates a standalone SVG with labels, color, and dots", () => {
  const svg = generateRadarSvg(sample);
  assert.match(svg, /^<svg/);
  assert.match(svg, /fill:#6366f1;fill-opacity:0\.3/);
  assert.match(svg, />Funding<\/text>/);
  assert.equal((svg.match(/<circle class="dot"/g) ?? []).length, 8);
});

test("rejects values outside the scale", () => {
  assert.throws(
    () => normalizeConfig({ ...sample, areas: { A: 1, B: 2, C: 11 } }),
    /must be between 0 and 10/,
  );
});

test("escapes category labels", () => {
  const svg = generateRadarSvg({ ...sample, areas: { "A&B": 1, B: 2, C: 3 } });
  assert.match(svg, />A&amp;B<\/text>/);
});
