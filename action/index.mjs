import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { applyOverrides, loadConfig } from "../src/config.mjs";
import { generateRadarSvg } from "../src/radar.mjs";

function input(name, fallback = "") {
  return process.env[`INPUT_${name.toUpperCase()}`]?.trim() || fallback;
}

async function main() {
  const configPath = input("config", "radar.json");
  const output = input("output", "assets/radar.svg");
  if (/[\r\n]/.test(output)) throw new Error("output must be a single-line path");
  const values = input("values");
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (error) {
    if (error.code === "ENOENT" && values) config = {};
    else throw error;
  }

  config = applyOverrides(config, {
    values: values || undefined,
    color: input("color") || undefined,
    fillOpacity: input("fill_opacity") || undefined,
    max: input("max") || undefined,
    format: input("format") || undefined,
    compact: input("compact") || undefined,
    size: input("size") || undefined,
    labelFontSize: input("label_font_size") || undefined,
    titleFontSize: input("title_font_size") || undefined,
  });

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
  const message = error.message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  console.error(`::error::${message}`);
  process.exitCode = 1;
});
