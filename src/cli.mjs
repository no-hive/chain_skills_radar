#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadConfig } from "./config.mjs";
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
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-h" || argument === "--help") options.help = true;
    else if (argument === "-c" || argument === "--config") options.config = args[++index];
    else if (argument === "-o" || argument === "--output") options.output = args[++index];
    else if (argument === "--values") options.values = args[++index];
    else if (argument === "--color") options.color = args[++index];
    else if (argument === "--fill-opacity") options.fillOpacity = args[++index];
    else if (argument === "--max") options.max = args[++index];
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
  if (options.values) config.areas = JSON.parse(options.values);
  if (options.color) config.color = options.color;
  if (options.fillOpacity !== undefined) config.fillOpacity = options.fillOpacity;
  if (options.max !== undefined) config.max = options.max;

  const svg = generateRadarSvg(config);
  const outputPath = path.resolve(options.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, svg, "utf8");
  console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(`chain-skills-radar: ${error.message}`);
    process.exitCode = 1;
  });
}
