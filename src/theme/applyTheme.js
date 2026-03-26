export function applyTheme(palette) {
  const root = document.documentElement
  root.style.setProperty('--bg', palette.bg)
  root.style.setProperty('--bg-soft', palette.bgSoft)
  root.style.setProperty('--surface', palette.surface)
  root.style.setProperty('--surface-alt', palette.surfaceAlt)
  root.style.setProperty('--primary', palette.primary)
  root.style.setProperty('--primary-soft', palette.primarySoft)
  root.style.setProperty('--accent', palette.accent)
  root.style.setProperty('--accent-soft', palette.accentSoft)
  root.style.setProperty('--text', palette.text)
  root.style.setProperty('--text-muted', palette.textMuted)
  root.style.setProperty('--border', palette.border)
  root.style.setProperty('--danger', palette.danger)
  root.style.setProperty('--warning', palette.warning)
  root.style.setProperty('--shadow', palette.shadow)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', palette.surface)
}
