const ADMIN_IDS = ['1282471582', '5592032215']

export const paletteGreen = {
  key: 'green',
  label: 'Green',
  bg: '#061712',
  surface: '#0b241c',
  card: '#0f2e24',
  cardSoft: '#134034',

  primary: '#10b981',
  primarySoft: '#34d399',
  primaryStrong: '#059669',

  accent: '#6ee7b7',
  accentSoft: '#a7f3d0',

  text: '#ecfdf5',
  textSoft: '#bbf7d0',
  textMuted: '#6ee7b7',

  border: '#14532d',
  borderSoft: '#166534',

  success: '#22c55e',
  danger: '#ef4444',
}

export const palettePink = {
  key: 'pink',
  label: 'Pink',
  bg: '#fff5f8',
  surface: '#ffffff',
  card: '#ffffff',
  cardSoft: '#fff8fb',

  primary: '#e91e63',
  primaryHover: '#d81b60',

  accent: '#b5164f',
  accentSoft: '#8f123f',
  accentPale: '#fff0f5',

  border: '#fbc8da',
  borderSoft: '#fde2eb',
  borderStrong: '#f7a8c6',

  text: '#8f123f',
  textStrong: '#b5164f',
  textLight: '#ffffff',

  shadow: 'rgba(233, 30, 99, 0.12)',

  success: '#10b981',
  danger: '#ef4444',
}

export const paletteNeutral = {
  key: 'neutral',
  label: 'Neutral',
  bg: '#0f172a',
  surface: '#111827',
  card: '#1f2937',
  cardSoft: '#374151',

  primary: '#3b82f6',
  primarySoft: '#60a5fa',

  accent: '#38bdf8',
  accentSoft: '#7dd3fc',

  text: '#f9fafb',
  textSoft: '#9ca3af',

  border: '#374151',
  borderSoft: '#4b5563',

  success: '#22c55e',
  danger: '#ef4444',
}

export const paletteOcean = {
  key: 'ocean',
  label: 'Ocean',
  bg: '#07131f',
  surface: '#0b1d2d',
  card: '#10263a',
  cardSoft: '#153149',

  primary: '#0ea5e9',
  primarySoft: '#38bdf8',
  primaryStrong: '#0284c7',

  accent: '#67e8f9',
  accentSoft: '#a5f3fc',

  text: '#e0f2fe',
  textSoft: '#bae6fd',
  textMuted: '#7dd3fc',

  border: '#164e63',
  borderSoft: '#155e75',

  success: '#22c55e',
  danger: '#ef4444',
}

export const paletteSunset = {
  key: 'sunset',
  label: 'Sunset',
  bg: '#1f0f0a',
  surface: '#2a140d',
  card: '#341a11',
  cardSoft: '#472216',

  primary: '#f97316',
  primarySoft: '#fb923c',
  primaryStrong: '#ea580c',

  accent: '#fdba74',
  accentSoft: '#fed7aa',

  text: '#fff7ed',
  textSoft: '#fed7aa',
  textMuted: '#fdba74',

  border: '#7c2d12',
  borderSoft: '#9a3412',

  success: '#22c55e',
  danger: '#ef4444',
}

export const paletteViolet = {
  key: 'violet',
  label: 'Violet',
  bg: '#140f1f',
  surface: '#1c1530',
  card: '#241c3b',
  cardSoft: '#30264d',

  primary: '#8b5cf6',
  primarySoft: '#a78bfa',
  primaryStrong: '#7c3aed',

  accent: '#c4b5fd',
  accentSoft: '#ddd6fe',

  text: '#f5f3ff',
  textSoft: '#ddd6fe',
  textMuted: '#c4b5fd',

  border: '#4c1d95',
  borderSoft: '#5b21b6',

  success: '#22c55e',
  danger: '#ef4444',
}

export const paletteSand = {
  key: 'sand',
  label: 'Sand',
  bg: '#f8f5ef',
  surface: '#ffffff',
  card: '#fffdf9',
  cardSoft: '#f6efe5',

  primary: '#a16207',
  primarySoft: '#ca8a04',
  primaryStrong: '#854d0e',

  accent: '#d6b98c',
  accentSoft: '#ead7bc',

  text: '#3f2d1d',
  textSoft: '#7c5a3c',
  textMuted: '#a16207',

  border: '#ead7bc',
  borderSoft: '#f1e4d1',

  success: '#16a34a',
  danger: '#dc2626',
}

export const PUBLIC_PALETTES = {
  neutral: paletteNeutral,
  ocean: paletteOcean,
  sunset: paletteSunset,
  violet: paletteViolet,
  sand: paletteSand,
}

export const PRIVATE_PALETTES = {
  green: paletteGreen,
  pink: palettePink,
}

export const ALL_PALETTES = {
  ...PUBLIC_PALETTES,
  ...PRIVATE_PALETTES,
}

export function canUsePrivatePalettes(userId) {
  return ADMIN_IDS.includes(String(userId || ''))
}

export function getAvailablePalettes(userId) {
  if (canUsePrivatePalettes(userId)) return ALL_PALETTES
  return PUBLIC_PALETTES
}

export function getPaletteOptions(userId) {
  return Object.values(getAvailablePalettes(userId)).map((palette) => ({
    key: palette.key,
    label: palette.label,
  }))
}

export function getDefaultPaletteKeyForUser(userId) {
  const uid = String(userId || '')

  if (uid === '1282471582') return 'green'
  if (uid === '5592032215') return 'pink'

  return 'neutral'
}

export function getPaletteByKey(themeKey, userId) {
  const available = getAvailablePalettes(userId)
  const fallbackKey = getDefaultPaletteKeyForUser(userId)

  if (themeKey && available[themeKey]) return available[themeKey]
  return available[fallbackKey] || ALL_PALETTES[fallbackKey] || paletteNeutral
}

export function getPaletteByUser(userId) {
  return getPaletteByKey(null, userId)
}