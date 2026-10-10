export function parseHex(value) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].toLowerCase();
  return '#' + (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex);
}
