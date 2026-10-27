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

test("rejects invalid config and category container types", () => {
  for (const config of [null, true, 42, "123", []]) {
    assert.throws(() => normalizeConfig(config), /config must be a JSON object/);
  }
  for (const areas of [undefined, null, true, 42, "123", [1, 2, 3]]) {
    assert.throws(() => normalizeConfig({ ...sample, areas }), /areas must be a JSON object/);
  }
  for (const areas of [{ A: 1, B: 2 }, Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`Area${i}`, 1]))]) {
    assert.throws(() => normalizeConfig({ ...sample, areas }), /categories/);
  }
});

test("rejects implicit conversion of category scores and numeric config fields", () => {
  for (const value of [null, true, false, "3", "", [], {}, NaN, Infinity]) {
    assert.throws(() => normalizeConfig({ ...sample, areas: { A: value, B: 2, C: 3 } }), /finite number/);
    for (const field of ["max", "rings", "fillOpacity", "width", "height", "radius"]) {
      assert.throws(() => normalizeConfig({ ...sample, [field]: value }), /finite number/);
    }
  }
});

test("rejects invalid ranges, fractional rings, and unsafe dimensions", () => {
  for (const patch of [
    { max: 0 }, { max: -1 }, { rings: 0 }, { rings: 11 }, { rings: 1.5 },
    { fillOpacity: -0.1 }, { fillOpacity: 1.1 }, { width: 239 }, { height: 239 },
    { width: 1200.5 }, { height: 600.5 }, { width: 1e308 }, { height: 1e308 },
    { radius: 0 }, { radius: -1 }, { radius: 1e308 }, { color: "red" }, { theme: "other" },
  ]) {
    assert.throws(() => normalizeConfig({ ...sample, ...patch }));
  }
});

test("rejects empty text and characters that cannot be represented in XML", () => {
  for (const title of [null, 12, "", " ", "Invalid\u0000", "Invalid\uD800"]) {
    assert.throws(() => generateRadarSvg({ ...sample, title }), /title/);
  }
  for (const label of ["", " ", "Invalid\u0001", "Invalid\uDFFF"]) {
    assert.throws(() => generateRadarSvg({ ...sample, areas: { [label]: 1, B: 2, C: 3 } }), /category label/);
  }
});

test("rejects charts and text that do not fit the image", () => {
  const areas = { A: 1, B: 2, C: 3, D: 4 };
  assert.throws(() => generateRadarSvg({ areas, width: 240 }), /radius.*fit/);
  assert.throws(() => generateRadarSvg({ areas, width: 500 }), /width is too small for category/);
  assert.throws(() => generateRadarSvg({ areas, height: 500 }), /height is too small/);
  assert.throws(() => generateRadarSvg({ areas, title: "W".repeat(100) }), /width is too small for the title/);
  assert.throws(() => generateRadarSvg({ areas: { A: 1, ["W".repeat(100)]: 2, C: 3 } }), /width is too small for category/);
  assert.match(generateRadarSvg({ areas, title: "Skills", width: 400, height: 400, radius: 120 }), /viewBox="0 0 400 400"/);
});

test("keeps coordinates finite for very large and very small valid scales", () => {
  for (const max of [1e308, Number.MAX_VALUE, Number.MIN_VALUE]) {
    const svg = generateRadarSvg({ max, areas: { A: max, B: 0, C: max } });
    assert.doesNotMatch(svg, /Infinity|NaN/);
    // A maximum score must still reach the top of the outer grid.
    assert.match(svg, /<circle class="dot" cx="600\.0" cy="111\.8"/);
  }
});

test("square preset uses equal sides and larger typography with legacy wide dimensions", () => {
  const input = { ...sample, format: "square", width: 1200, height: 600 };
  const config = normalizeConfig(input);
  assert.equal(config.width, 900);
  assert.equal(config.height, 900);
  assert.equal(config.radius, 240);
  assert.equal(config.labelFontSize, 24);
  assert.equal(config.titleFontSize, 32);
  const svg = generateRadarSvg(input);
  assert.match(svg, /viewBox="0 0 900 900" width="900" height="900"/);
  assert.match(svg, /\.label\{font:400 24px/);
  assert.match(svg, /\.chart-title\{font:500 32px/);
  assert.equal((svg.match(/<circle class="dot"/g) ?? []).length, 8);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test("supports explicit canvas size, radius, and typography in square format", () => {
  const svg = generateRadarSvg({ ...sample, format: "square", size: 1000, radius: 250, labelFontSize: 28, titleFontSize: 36 });
  assert.match(svg, /viewBox="0 0 1000 1000"/);
  assert.match(svg, /\.label\{font:400 28px/);
  assert.match(svg, /\.chart-title\{font:500 36px/);
});

test("supports larger labels in wide format independently of the square preset", () => {
  const svg = generateRadarSvg({ ...sample, labelFontSize: 28, titleFontSize: 32 });
  assert.match(svg, /viewBox="0 0 1200 600"/);
  assert.match(svg, /\.label\{font:400 28px/);
});

test("rejects invalid formats, square sizes, and typography", () => {
  for (const format of [null, true, "circle", "", 10]) {
    assert.throws(() => normalizeConfig({ ...sample, format }), /format must be wide or square/);
  }
  for (const size of [null, "900", NaN, Infinity, 0, -1, 239, 900.5, 1e308]) {
    assert.throws(() => normalizeConfig({ ...sample, format: "square", size }), /size/);
  }
  for (const field of ["labelFontSize", "titleFontSize"]) {
    for (const value of [null, "24", 0, -1, Infinity, NaN]) {
      assert.throws(() => normalizeConfig({ ...sample, [field]: value }), /finite number|greater than 0/);
    }
  }
  assert.throws(() => generateRadarSvg({ ...sample, format: "square", labelFontSize: 80 }), /width is too small/);
});
