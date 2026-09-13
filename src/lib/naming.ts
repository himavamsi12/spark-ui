export function toComponentName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return clean.map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "SparkComponent";
}
