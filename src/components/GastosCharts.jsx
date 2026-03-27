export default function GastosChart({ data = {}, palette }) {
  const items = Object.entries(data)
    .map(([categoria, monto]) => ({ categoria, monto: Number(monto || 0) }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8)

  const max = Math.max(...items.map((x) => x.monto), 1)

  if (items.length === 0) {
    return <div style={{ color: palette.textSoft }}>No hay gastos para este período.</div>
  }

  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      {items.map((item) => (
        <div key={item.categoria} style={{ display: 'grid', gap: '0.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ color: palette.text, fontWeight: 700 }}>{item.categoria}</span>
            <span style={{ color: palette.textSoft, fontWeight: 700 }}>
              Q {item.monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div
            style={{
              height: 12,
              borderRadius: 999,
              background: palette.cardSoft,
              overflow: 'hidden',
              border: `1px solid ${palette.borderSoft || palette.border}`,
            }}
          >
            <div
              style={{
                width: `${(item.monto / max) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent || palette.primarySoft})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}