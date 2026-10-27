import { readFile } from "node:fs/promises";
import { assertRecord, finiteNumber } from "./validation.mjs";

export async function loadConfig(filePath) {
  const source = await readFile(filePath, "utf8");
  const config = JSON.parse(source);
  assertRecord(config, "config");
  return config;
}

export function applyOverrides(config, overrides) {
  assertRecord(config, "config");
  const result = { ...config };
  if (overrides.values !== undefined) {
    result.areas = JSON.parse(overrides.values);
    assertRecord(result.areas, "values");
  }
  if (overrides.color !== undefined) result.color = overrides.color;
  if (overrides.fillOpacity !== undefined) {
    result.fillOpacity = finiteNumber(overrides.fillOpacity, "fillOpacity", true);
  }
  if (overrides.max !== undefined) result.max = finiteNumber(overrides.max, "max", true);
  if (overrides.format !== undefined) result.format = overrides.format;
  for (const key of ["size", "labelFontSize", "titleFontSize"]) {
    if (overrides[key] !== undefined) result[key] = finiteNumber(overrides[key], key, true);
  }
  return result;
}
