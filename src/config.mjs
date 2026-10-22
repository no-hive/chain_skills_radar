import { readFile } from "node:fs/promises";
import path from "node:path";

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
    }
    if (character === "#" && quote === null && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (!value) return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

export function parseSimpleYaml(source) {
  const config = {};
  let section = null;

  for (const [lineIndex, originalLine] of source.split(/\r?\n/).entries()) {
    const line = stripComment(originalLine).replace(/\s+$/, "");
    if (!line.trim()) continue;

    const indentation = line.match(/^\s*/)[0].length;
    const match = line.trim().match(/^([^:]+):(?:\s*(.*))?$/);
    if (!match) throw new Error(`Invalid YAML at line ${lineIndex + 1}`);

    const key = match[1].trim();
    const rawValue = match[2] ?? "";

    if (indentation === 0) {
      if (!rawValue.trim()) {
        section = key;
        config[section] = {};
      } else {
        section = null;
        config[key] = parseScalar(rawValue);
      }
      continue;
    }

    if (!section || typeof config[section] !== "object") {
      throw new Error(`Unexpected indentation at line ${lineIndex + 1}`);
    }
    config[section][key] = parseScalar(rawValue);
  }

  return config;
}

export async function loadConfig(filePath) {
  const source = await readFile(filePath, "utf8");
  return path.extname(filePath).toLowerCase() === ".json"
    ? JSON.parse(source)
    : parseSimpleYaml(source);
}
