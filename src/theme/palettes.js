export const emeraldRosePalette = {
  name: 'emeraldRose',
  bg: '#071b17',
  bgSoft: '#0b2721',
  surface: '#0f3d32',
  surfaceAlt: '#145244',
  primary: '#10b981',
  primarySoft: '#6ee7b7',
  accent: '#f4a7c5',
  accentSoft: '#f7c9dc',
  text: '#f7fffc',
  textMuted: '#b8d0c8',
  border: '#1d5b4d',
  danger: '#f87171',
  warning: '#fbbf24',
  shadow: '0 12px 40px rgba(0,0,0,.28)'
}

export const azurePalette = {
  name: 'azure',
  bg: '#081522',
  bgSoft: '#0e1e31',
  surface: '#10253c',
  surfaceAlt: '#15314f',
  primary: '#3b82f6',
  primarySoft: '#93c5fd',
  accent: '#67e8f9',
  accentSoft: '#bae6fd',
  text: '#f8fbff',
  textMuted: '#b4c7d9',
  border: '#224163',
  danger: '#f87171',
  warning: '#fbbf24',
  shadow: '0 12px 40px rgba(0,0,0,.28)'
}

const premiumUsers = new Set(['1282471582', '5592032215'])

export function resolvePalette(userId) {
  return premiumUsers.has(String(userId)) ? emeraldRosePalette : azurePalette
}
