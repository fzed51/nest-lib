export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value >= 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().at(0) || "f";
    return ["1", "t", "y", "o"].includes(normalized);
  }
  return false;
}   