export default function GastosChart({ data = {}, palette }) {
  const items = Object.entries(data)
    .map(([categoria, monto]) => ({ categoria, monto: Number(monto || 0) }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8)

  const max = Math.max(...items.map((x) => x.monto), 1)

  if (items.length === 0) {
    return (
      <div
        style={{
          color: palette.textSoft,
          padding: "1rem",
          borderRadius: "1rem",
          background: palette.cardSoft,
          border: `1px solid ${palette.borderSoft || palette.border}`,
        }}
      >
        No hay gastos para este período.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      {items.map((item) => (
        <div
          key={item.categoria}
          style={{
            display: 'grid',
            gap: '0.35rem',
            padding: "0.8rem",
            borderRadius: "1rem",
            background: palette.cardSoft,
            border: `1px solid ${palette.borderSoft || palette.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ color: palette.text, fontWeight: 700 }}>{item.categoria}</span>
            <span style={{ color: palette.textSoft, fontWeight: 700 }}>
              Q {item.monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div
            style={{
              height: 14,
              borderRadius: 999,
              background: palette.surface || palette.card,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(item.monto / max) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent || palette.primarySoft})`,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}