#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { applyOverrides, loadConfig } from "./config.mjs";
import { generateRadarSvg } from "./radar.mjs";

function help() {
  console.log(`chain-skills-radar

Usage:
  chain-skills-radar generate [options]

Options:
  -c, --config <path>          JSON config (default: radar.json)
  -o, --output <path>          SVG output path (default: assets/radar.svg)
      --values <json>          Override areas with a JSON object
      --color <hex>            Override the fill color
      --fill-opacity <number>  Override fill opacity from 0 to 1
      --max <number>           Override the maximum scale value
  -h, --help                   Show this help
`);
}

function parseArguments(argv) {
  const args = argv[0] === "generate" ? argv.slice(1) : argv;
  const options = { config: "radar.json", output: "assets/radar.svg" };
  const flags = new Map([
    ["-c", "config"], ["--config", "config"],
    ["-o", "output"], ["--output", "output"],
    ["--values", "values"], ["--color", "color"],
    ["--fill-opacity", "fillOpacity"], ["--max", "max"],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-h" || argument === "--help") options.help = true;
    else if (flags.has(argument)) {
      const value = args[index + 1];
      if (value === undefined || value.trim() === "" || /^--?[a-z]/i.test(value)) {
        throw new Error(`Missing value for ${argument}`);
      }
      options[flags.get(argument)] = value;
      index += 1;
    }
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) return help();

  let config;
  try {
    config = await loadConfig(options.config);
  } catch (error) {
    if (error.code === "ENOENT" && options.values) config = {};
    else throw error;
  }
  config = applyOverrides(config, options);

  const svg = generateRadarSvg(config);
  const outputPath = path.resolve(options.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, svg, "utf8");
  console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  run().catch((error) => {
    console.error(`chain-skills-radar: ${error.message}`);
    process.exitCode = 1;
  });
}
