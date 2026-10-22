import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadConfig } from "../src/config.mjs";
import { generateRadarSvg } from "../src/radar.mjs";

function input(name, fallback = "") {
  return process.env[`INPUT_${name.toUpperCase()}`]?.trim() || fallback;
}

async function main() {
  const configPath = input("config", "radar.yml");
  const output = input("output", "assets/radar.svg");
  const values = input("values");
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (error) {
    if (error.code === "ENOENT" && values) config = {};
    else throw error;
  }

  const color = input("color");
  const fillOpacity = input("fill_opacity");
  const max = input("max");
  if (values) config.areas = JSON.parse(values);
  if (color) config.color = color;
  if (fillOpacity) config.fillOpacity = fillOpacity;
  if (max) config.max = max;

  const svg = generateRadarSvg(config);
  const outputPath = path.resolve(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, svg, "utf8");

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `svg=${output}\n`, "utf8");
  }
  console.log(`Generated ${output}`);
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
