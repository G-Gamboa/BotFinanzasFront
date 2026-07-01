const baseTabs = [
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'historial',   label: 'Historial' },
  { key: 'deudas',      label: 'Deudas' },
  { key: 'dashboard',   label: 'Dashboard' },
]

export default function NavTabs({
  current,
  onChange,
  showPrestamos  = false,
  showTarjetas   = false,
  showPresupuesto = false,
  tabOrder       = null,
}) {
  // Construir lista de tabs disponibles
  let tabs = [...baseTabs]

  if (showPrestamos) {
    tabs.splice(1, 0, { key: 'prestamos', label: 'Préstamos' })
  }
  if (showTarjetas) {
    const deudasIdx = tabs.findIndex((t) => t.key === 'deudas')
    tabs.splice(deudasIdx, 0, { key: 'tarjetas', label: 'TC' })
  }
  if (showPresupuesto) {
    tabs.push({ key: 'presupuesto', label: 'Presupuesto' })
  }

  // Aplicar orden personalizado si existe
  if (tabOrder && tabOrder.length > 0) {
    const ordered = []
    for (const key of tabOrder) {
      const tab = tabs.find((t) => t.key === key)
      if (tab) ordered.push(tab)
    }
    // Tabs disponibles que no estaban en el orden guardado van al final
    for (const tab of tabs) {
      if (!ordered.find((t) => t.key === tab.key)) ordered.push(tab)
    }
    tabs = ordered
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
