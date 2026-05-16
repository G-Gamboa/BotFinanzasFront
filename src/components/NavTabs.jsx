const baseTabs = [
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'historial',   label: 'Historial' },
  { key: 'deudas',      label: 'Deudas' },
  { key: 'dashboard',   label: 'Dashboard' },
]

export default function NavTabs({
  current,
  onChange,
  showPrestamos = false,
  showTarjetas  = false,
}) {
  const tabs = [...baseTabs]

  // Insertar "Préstamos" después de Movimientos
  if (showPrestamos) {
    tabs.splice(1, 0, { key: 'prestamos', label: 'Préstamos' })
  }

  // Insertar "Tarjetas" antes de Deudas (solo si el usuario tiene TC)
  if (showTarjetas) {
    const deudasIdx = tabs.findIndex((t) => t.key === 'deudas')
    tabs.splice(deudasIdx, 0, { key: 'tarjetas', label: 'TC' })
  }

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
