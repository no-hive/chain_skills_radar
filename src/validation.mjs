export function assertRecord(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object`);
  }
}

export function finiteNumber(value, name, coerce = false) {
  const number = coerce && typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : value;
  if (typeof number !== "number" || !Number.isFinite(number)) {
    throw new Error(`${name} must be a finite number`);
  }
  return number;
}

export function validateText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
  // XML 1.0 cannot represent control characters or unpaired surrogates.
  if (/[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u.test(value)) {
    throw new Error(`${name} contains characters that are not valid in XML`);
  }
  return value;
}
