const baseTabs = [
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'historial', label: 'Historial' },
  { key: 'deudas', label: 'Deudas' },
  { key: 'dashboard', label: 'Dashboard' },
]

export default function NavTabs({ current, onChange, showPrestamos = false }) {
  const tabs = showPrestamos
    ? [
        baseTabs[0],
        { key: 'prestamos', label: 'Préstamos' },
        baseTabs[1],
        baseTabs[2],
        baseTabs[3],
      ]
    : baseTabs

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