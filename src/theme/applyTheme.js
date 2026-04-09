export function applyTheme(palette) {
  const root = document.documentElement

  const theme = {
    bg: palette.bg || '#0f172a',
    bgSoft: palette.bgSoft || palette.cardSoft || palette.surface || '#111827',

    surface: palette.surface || palette.card || '#1f2937',
    surfaceAlt: palette.surfaceAlt || palette.cardSoft || palette.surface || '#374151',

    card: palette.card || palette.surface || '#1f2937',
    cardSoft: palette.cardSoft || palette.surfaceAlt || palette.surface || '#374151',

    primary: palette.primary || '#3b82f6',
    primarySoft: palette.primarySoft || palette.primary || '#60a5fa',
    primaryStrong: palette.primaryStrong || palette.primaryHover || palette.primary || '#2563eb',

    accent: palette.accent || palette.primary || '#38bdf8',
    accentSoft: palette.accentSoft || palette.accent || '#7dd3fc',
    accentPale: palette.accentPale || palette.accentSoft || palette.accent || '#bae6fd',

    text: palette.text || '#f9fafb',
    textSoft: palette.textSoft || palette.textMuted || '#cbd5e1',
    textMuted: palette.textMuted || palette.textSoft || '#94a3b8',
    textStrong: palette.textStrong || palette.text || '#ffffff',
    textLight: palette.textLight || '#ffffff',

    border: palette.border || '#374151',
    borderSoft: palette.borderSoft || palette.border || '#4b5563',
    borderStrong: palette.borderStrong || palette.border || '#334155',

    success: palette.success || '#22c55e',
    danger: palette.danger || '#ef4444',
    warning: palette.warning || '#f59e0b',

    shadow: palette.shadow || '0 12px 40px rgba(0,0,0,.18)',
  }

  root.style.setProperty('--bg', theme.bg)
  root.style.setProperty('--bg-soft', theme.bgSoft)

  root.style.setProperty('--surface', theme.surface)
  root.style.setProperty('--surface-alt', theme.surfaceAlt)

  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--card-soft', theme.cardSoft)

  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-soft', theme.primarySoft)
  root.style.setProperty('--primary-strong', theme.primaryStrong)

  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-soft', theme.accentSoft)
  root.style.setProperty('--accent-pale', theme.accentPale)

  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--text-soft', theme.textSoft)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--text-strong', theme.textStrong)
  root.style.setProperty('--text-light', theme.textLight)

  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--border-soft', theme.borderSoft)
  root.style.setProperty('--border-strong', theme.borderStrong)

  root.style.setProperty('--success', theme.success)
  root.style.setProperty('--danger', theme.danger)
  root.style.setProperty('--warning', theme.warning)
  root.style.setProperty('--shadow', theme.shadow)

  /* aliases para compatibilidad */
  root.style.setProperty('--panel-bg', theme.card)
  root.style.setProperty('--panel-soft', theme.cardSoft)
  root.style.setProperty('--border-color', theme.border)
  root.style.setProperty('--border-soft-color', theme.borderSoft)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme.surface || theme.bg || '#0f172a')
  }
}