import { paletteGreen, palettePink, paletteNeutral } from "./palettes";

export function getPaletteByUser(userId) {
  const id = String(userId);

  if (id === "1282471582") return paletteGreen;
  if (id === "5592032215") return palettePink;

  return paletteNeutral;
}