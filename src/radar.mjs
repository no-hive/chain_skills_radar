const DEFAULTS = {
  title: "ChainSkillsRadar",
  max: 10,
  rings: 4,
  color: "#6366f1",
  fillOpacity: 0.3,
  theme: "auto",
  width: 1200,
  height: 600,
  radius: 214,
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function finiteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} must be a finite number`);
  return number;
}

function validateHexColor(color) {
  if (!/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(color)) {
    throw new Error("color must be a 3- or 6-digit hex value, such as #6366f1");
  }
  return color.toLowerCase();
}

function point(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

function formatPoint([x, y]) {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function polygonPoints(count, cx, cy, radius) {
  return Array.from({ length: count }, (_, index) =>
    point(cx, cy, radius, -Math.PI / 2 + (index * Math.PI * 2) / count),
  );
}

export function normalizeConfig(input) {
  const config = { ...DEFAULTS, ...input };
  const entries = Object.entries(config.areas ?? {});
  if (entries.length < 3) throw new Error("areas must contain at least 3 categories");
  if (entries.length > 16) throw new Error("areas supports at most 16 categories");

  config.max = finiteNumber(config.max, "max");
  if (config.max <= 0) throw new Error("max must be greater than 0");

  config.rings = Math.round(finiteNumber(config.rings, "rings"));
  if (config.rings < 1 || config.rings > 10) throw new Error("rings must be between 1 and 10");

  config.fillOpacity = finiteNumber(config.fillOpacity, "fillOpacity");
  if (config.fillOpacity < 0 || config.fillOpacity > 1) {
    throw new Error("fillOpacity must be between 0 and 1");
  }

  config.width = finiteNumber(config.width, "width");
  config.height = finiteNumber(config.height, "height");
  config.radius = finiteNumber(config.radius, "radius");
  if (config.width < 240 || config.height < 240 || config.radius <= 0) {
    throw new Error("width, height, and radius must be positive and large enough to render");
  }

  config.color = validateHexColor(String(config.color));
  config.theme = String(config.theme).toLowerCase();
  if (!["auto", "light", "dark"].includes(config.theme)) {
    throw new Error("theme must be auto, light, or dark");
  }
  config.areas = entries.map(([label, rawValue]) => {
    const value = finiteNumber(rawValue, `areas.${label}`);
    if (value < 0 || value > config.max) {
      throw new Error(`areas.${label} must be between 0 and ${config.max}`);
    }
    return { label, value };
  });

  return config;
}

export function generateRadarSvg(input) {
  const config = normalizeConfig(input);
  const { width, height, radius, max, rings, color, fillOpacity, theme, areas } = config;
  const cx = width / 2;
  const titleFontSize = 24;
  const labelFontSize = 15.5;
  const titleHeight = titleFontSize * 1.2;
  const labelRadius = radius + 28;
  const chartHalfHeight = labelRadius + labelFontSize * 0.6;
  const verticalGap = (height - titleHeight - chartHalfHeight * 2) / 3;
  if (verticalGap < 8) {
    throw new Error("height is too small for the selected radius and labels");
  }
  const titleY = verticalGap + titleFontSize;
  const cy = verticalGap * 2 + titleHeight + chartHalfHeight;
  const count = areas.length;

  const grid = Array.from({ length: rings }, (_, index) => {
    const ringRadius = (radius * (index + 1)) / rings;
    const className = index === rings - 1 ? "outer" : "grid";
    return `<polygon class="${className}" points="${polygonPoints(count, cx, cy, ringRadius)
      .map(formatPoint)
      .join(" ")}"/>`;
  }).join("\n");

  const axes = polygonPoints(count, cx, cy, radius)
    .map(([x, y]) => `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`)
    .join("\n");

  const dataPoints = areas.map(({ value }, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return point(cx, cy, (radius * value) / max, angle);
  });

  const dots = dataPoints
    .map(([x, y]) => `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>`)
    .join("\n");

  const labels = areas
    .map(({ label }, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      const [x, y] = point(cx, cy, labelRadius, angle);
      const cosine = Math.cos(angle);
      const anchor = cosine > 0.25 ? "start" : cosine < -0.25 ? "end" : "middle";
      return `<text class="label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(label)}</text>`;
    })
    .join("\n");

  const title = escapeXml(config.title);
  const darkTheme = ".background{fill:#0d1117}.grid,.outer,.axis,.data{stroke:#f0f6fc}.dot,.label,.chart-title{fill:#f0f6fc}";
  const lightTheme = ".background{fill:#fff}.grid,.outer,.axis,.data{stroke:#000}.dot,.label,.chart-title{fill:#000}";
  const themeStyles =
    theme === "dark"
      ? darkTheme
      : theme === "light"
        ? lightTheme
        : `${lightTheme}\n  @media(prefers-color-scheme:dark){${darkTheme}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${title}">
<title>${title}</title>
<style>
  .grid{fill:none;stroke-width:1;stroke-dasharray:2 4}
  .outer,.axis{fill:none;stroke-width:1}
  .data{fill:${color};fill-opacity:${fillOpacity};stroke-width:2.5;stroke-linejoin:round}
  .label{font:400 15.5px Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.1px}
  .chart-title{font:500 24px Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.1px}
  ${themeStyles}
</style>
<rect class="background" width="${width}" height="${height}"/>
<text class="chart-title" x="${cx}" y="${titleY.toFixed(1)}" text-anchor="middle">${title}</text>
${grid}
${axes}
<polygon class="data" points="${dataPoints.map(formatPoint).join(" ")}"/>
${dots}
${labels}
</svg>
`;
}
