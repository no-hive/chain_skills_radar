import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const project = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(project, "src/cli.mjs");
const action = path.join(project, "action/index.mjs");
const golden = await readFile(path.join(project, "assets/radar.svg"), "utf8");
const config = await readFile(path.join(project, "radar.json"), "utf8");
const scores = JSON.stringify({ A: 0, B: 5, C: 10 });

async function workspace(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "radar-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

function execute(script, args, cwd, inputs = {}) {
  const env = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !key.startsWith("INPUT_") && key !== "GITHUB_OUTPUT"));
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd, env: { ...env, ...inputs }, encoding: "utf8", timeout: 10_000,
  });
  assert.ifError(result.error);
  return result;
}

function succeeded(result) {
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function failed(result, pattern) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, pattern);
}

test("CLI generates the reference SVG and creates nested output directories", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  succeeded(execute(cli, ["generate", "--output", "nested/radar.svg"], dir));
  assert.equal(await readFile(path.join(dir, "nested/radar.svg"), "utf8"), golden);
});

test("CLI runs through a symlink whose path contains spaces and URL characters", async (t) => {
  const dir = await workspace(t);
  const binDir = path.join(dir, "CLI space # %");
  await mkdir(binDir);
  const link = path.join(binDir, "chain-skills-radar.mjs");
  try {
    await symlink(cli, link, "file");
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      t.skip("Creating symlinks requires Windows developer mode or administrator permissions");
      return;
    }
    throw error;
  }
  const help = succeeded(execute(link, ["--help"], dir));
  assert.match(help.stdout, /Usage:/);
  succeeded(execute(link, ["generate", "--values", scores], dir));
  assert.match(await readFile(path.join(dir, "assets/radar.svg"), "utf8"), />A<\/text>/);
});

test("CLI executes from a real path containing spaces and URL characters", async (t) => {
  const dir = await workspace(t);
  // Copy the source tree so import.meta.url itself contains escaped characters.
  const { cp } = await import("node:fs/promises");
  const source = path.join(dir, "project space # %", "src");
  await cp(path.join(project, "src"), source, { recursive: true });
  const result = succeeded(execute(path.join(source, "cli.mjs"), ["--help"], dir));
  assert.match(result.stdout, /Usage:/);
});

test("importing CLI does not execute it, including from stdin-style entry points", async (t) => {
  const dir = await workspace(t);
  const code = `await import(${JSON.stringify(pathToFileURL(cli).href)})`;
  const result = succeeded(execute("--input-type=module", ["--eval", code], dir));
  assert.equal(result.stdout, "");
  const stdinStyle = succeeded(execute("--input-type=module", ["--eval", `process.argv[1] = '-'; ${code}`], dir));
  assert.equal(stdinStyle.stdout, "");
});

test("CLI rejects missing option values before writing an output file", async (t) => {
  const dir = await workspace(t);
  for (const flag of ["-c", "--config", "-o", "--output", "--values", "--color", "--fill-opacity", "--max", "--format", "--size", "--label-font-size", "--title-font-size"]) {
    for (const suffix of [[], [""], ["--help"]]) {
      failed(execute(cli, ["generate", flag, ...suffix], dir), /Missing value/);
    }
  }
  await assert.rejects(readFile(path.join(dir, "assets/radar.svg")), { code: "ENOENT" });
});

test("CLI accepts numeric overrides including zero with no config file", async (t) => {
  const dir = await workspace(t);
  succeeded(execute(cli, ["generate", "--values", scores, "--color", "#abc", "--fill-opacity", "0", "--max", "20"], dir));
  const svg = await readFile(path.join(dir, "assets/radar.svg"), "utf8");
  assert.match(svg, /fill:#abc;fill-opacity:0/);
  // C has score 10 on a max of 20, hence half-radius rather than the outer grid.
  assert.match(svg, /cx="507\.3" cy="356\.5"/);
  failed(execute(cli, ["generate", "--values", scores, "--max", "-1"], dir), /max must be greater than 0/);
});

test("CLI rejects malformed config, overrides, and unknown arguments", async (t) => {
  const dir = await workspace(t);
  failed(execute(cli, ["generate"], dir), /ENOENT/);
  for (const source of ["{", "null", "[]", '"123"']) {
    await writeFile(path.join(dir, "radar.json"), source);
    failed(execute(cli, ["generate", "--values", scores], dir), /chain-skills-radar:/);
  }
  await writeFile(path.join(dir, "radar.json"), config);
  for (const values of ["{", "null", "[1,2,3]", '"123"', '{"A":null,"B":2,"C":3}']) {
    failed(execute(cli, ["generate", "--values", values], dir), /chain-skills-radar:/);
  }
  failed(execute(cli, ["generate", "--wat"], dir), /Unknown argument/);
  failed(execute(cli, ["generate", "--max", "abc"], dir), /finite number/);
  failed(execute(cli, ["generate", "--color", "red"], dir), /hex/);
});

test("Action generates the reference SVG and returns its path", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  const outputFile = path.join(dir, "github-output.txt");
  succeeded(execute(action, [], dir, { GITHUB_OUTPUT: outputFile }));
  assert.equal(await readFile(path.join(dir, "assets/radar.svg"), "utf8"), golden);
  assert.equal(await readFile(outputFile, "utf8"), "svg=assets/radar.svg\n");
});

test("Action applies overrides without config, preserves zero opacity, and creates output directories", async (t) => {
  const dir = await workspace(t);
  succeeded(execute(action, [], dir, {
    INPUT_VALUES: scores, INPUT_COLOR: "#abc", INPUT_FILL_OPACITY: "0", INPUT_MAX: "20",
    INPUT_OUTPUT: "nested/custom.svg",
  }));
  const svg = await readFile(path.join(dir, "nested/custom.svg"), "utf8");
  assert.match(svg, /fill:#abc;fill-opacity:0/);
  assert.match(svg, /cx="507\.3" cy="356\.5"/);
});

test("Action rejects malformed data and single-line output injection", async (t) => {
  const dir = await workspace(t);
  for (const inputs of [
    { INPUT_VALUES: "[1,2,3]" }, { INPUT_VALUES: "null" },
    { INPUT_VALUES: scores, INPUT_MAX: "abc" },
    { INPUT_VALUES: scores, INPUT_FILL_OPACITY: "2" },
    { INPUT_VALUES: scores, INPUT_OUTPUT: "radar.svg\nextra=value" },
  ]) {
    failed(execute(action, [], dir, inputs), /::error::/);
  }
  await writeFile(path.join(dir, "radar.json"), "null");
  failed(execute(action, [], dir, { INPUT_VALUES: scores }), /config must be a JSON object/);
  await assert.rejects(readFile(path.join(dir, "assets/radar.svg")), { code: "ENOENT" });
});

test("CLI overrides legacy wide dimensions with a square and configurable fonts", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  succeeded(execute(cli, ["generate", "--format", "square", "--size", "1000", "--label-font-size", "28", "--title-font-size", "36"], dir));
  const svg = await readFile(path.join(dir, "assets/radar.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 1000 1000"/);
  assert.match(svg, /\.label\{font:400 28px/);
  assert.match(svg, /\.chart-title\{font:500 36px/);
  failed(execute(cli, ["generate", "--format", "circle"], dir), /format must be wide or square/);
  failed(execute(cli, ["generate", "--label-font-size", "abc"], dir), /finite number/);
});

test("Action exposes square size and typography overrides", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  succeeded(execute(action, [], dir, {
    INPUT_FORMAT: "square", INPUT_SIZE: "1000", INPUT_LABEL_FONT_SIZE: "28", INPUT_TITLE_FONT_SIZE: "36",
  }));
  const svg = await readFile(path.join(dir, "assets/radar.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 1000 1000"/);
  assert.match(svg, /\.label\{font:400 28px/);
  assert.match(svg, /\.chart-title\{font:500 36px/);
  failed(execute(action, [], dir, { INPUT_FORMAT: "square", INPUT_SIZE: "900.5" }), /size must be a safe integer/);
});

test("CLI accepts explicit compact booleans and rejects invalid values", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  succeeded(execute(cli, ["generate", "--format", "square", "--size", "1100", "--compact", "true"], dir));
  const svg = await readFile(path.join(dir, "assets/radar.svg"), "utf8");
  assert.ok(Number(svg.match(/viewBox="0 0 1100 (\d+)"/)[1]) < 1100);
  failed(execute(cli, ["generate", "--compact", "yes"], dir), /compact override must be true or false/);
});

test("Action compact override trims the image while false preserves a square", async (t) => {
  const dir = await workspace(t);
  await writeFile(path.join(dir, "radar.json"), config);
  for (const value of ["true", "false"]) {
    succeeded(execute(action, [], dir, { INPUT_FORMAT: "square", INPUT_SIZE: "1100", INPUT_COMPACT: value }));
    const svg = await readFile(path.join(dir, "assets/radar.svg"), "utf8");
    const height = Number(svg.match(/viewBox="0 0 1100 (\d+)"/)[1]);
    assert.equal(height < 1100, value === "true");
  }
});
