const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function num(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function q(value, visible = true) {
  return visible ? `Q${num(value)}` : 'Q ••••'
}

export function usd(value, visible = true) {
  return visible ? `$${num(value)}` : '$ ••••'
}

export function money(value, currency = 'GTQ', visible = true) {
  return currency === 'USD' ? usd(value, visible) : q(value, visible)
}

export function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIso(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function monthName(monthIndex) {
  return MESES[monthIndex]
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

export function longDate(iso, currentYear) {
  const d = parseIso(iso)
  const year = d.getFullYear() !== currentYear ? ` de ${d.getFullYear()}` : ''
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}${year}`
}

export function shortDate(iso) {
  const d = parseIso(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}
