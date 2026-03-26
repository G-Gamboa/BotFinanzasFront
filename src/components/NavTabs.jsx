const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'deudas', label: 'Deudas' },
]

export default function NavTabs({ current, onChange }) {
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
