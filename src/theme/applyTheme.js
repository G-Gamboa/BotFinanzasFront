export function applyTheme(palette) {
  const root = document.documentElement

  root.style.setProperty('--bg', palette.bg || '#0f172a')
  root.style.setProperty('--bg-soft', palette.bgSoft || palette.cardSoft || palette.surface || '#111827')
  root.style.setProperty('--surface', palette.surface || palette.card || '#1f2937')
  root.style.setProperty('--surface-alt', palette.surfaceAlt || palette.cardSoft || palette.surface || '#374151')
  root.style.setProperty('--primary', palette.primary || '#3b82f6')
  root.style.setProperty('--primary-soft', palette.primarySoft || palette.primary || '#60a5fa')
  root.style.setProperty('--accent', palette.accent || palette.primary || '#38bdf8')
  root.style.setProperty('--accent-soft', palette.accentSoft || palette.accent || '#7dd3fc')
  root.style.setProperty('--text', palette.text || '#f9fafb')
  root.style.setProperty('--text-muted', palette.textMuted || palette.textSoft || '#94a3b8')
  root.style.setProperty('--border', palette.border || '#374151')
  root.style.setProperty('--danger', palette.danger || '#ef4444')
  root.style.setProperty('--warning', palette.warning || '#f59e0b')
  root.style.setProperty('--shadow', palette.shadow || '0 12px 40px rgba(0,0,0,.18)')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', palette.surface || palette.bg || '#0f172a')
}