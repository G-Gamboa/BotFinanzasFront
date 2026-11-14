export const TAB_LABELS = {
  movimientos: 'Registrar',
  calendario:  'Calendario',
  historial:   'Historial',
  dashboard:   'Resumen',
  tarjetas:    'Tarjetas',
  deudas:      'Deudas y préstamos',
  presupuesto: 'Presupuesto',
}

export function availableTabKeys({ showCalendario = true, showTarjetas = false, showPresupuesto = false } = {}) {
  const keys = ['movimientos']
  if (showCalendario) keys.push('calendario')
  keys.push('historial', 'dashboard')
  if (showTarjetas) keys.push('tarjetas')
  keys.push('deudas')
  if (showPresupuesto) keys.push('presupuesto')
  return keys
}

export function buildTabs({ tabOrder = null, ...flags } = {}) {
  const available = availableTabKeys(flags)
  let keys = available

  if (tabOrder && tabOrder.length > 0) {
    // El orden guardado manda; las pestañas nuevas que no estaban van al final
    const ordered = tabOrder.filter((k) => available.includes(k))
    keys = [...ordered, ...available.filter((k) => !ordered.includes(k))]
  }

  return keys.map((key) => ({ key, label: TAB_LABELS[key] }))
}

export default function NavTabs({ tabs, current, onChange }) {
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={current === tab.key ? 'tab active' : 'tab'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
