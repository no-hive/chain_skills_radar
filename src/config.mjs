import { readFile } from "node:fs/promises";

export async function loadConfig(filePath) {
  const source = await readFile(filePath, "utf8");
  return JSON.parse(source);
}
