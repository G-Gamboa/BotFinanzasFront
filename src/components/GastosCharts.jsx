export default function GastosChart({ data = {}, palette, onCategoryClick, expandedCategory }) {
  const items = Object.entries(data)
    .map(([categoria, monto]) => ({ categoria, monto: Number(monto || 0) }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8)

  const max = Math.max(...items.map((x) => x.monto), 1)
  const clickable = typeof onCategoryClick === 'function'

  if (items.length === 0) {
    return (
      <div
        style={{
          color: palette.textSoft,
          padding: '1rem',
          borderRadius: '1rem',
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
      {items.map((item) => {
        const isExpanded = expandedCategory === item.categoria
        return (
          <div
            key={item.categoria}
            style={{
              display: 'grid',
              gap: '0.35rem',
              padding: '0.8rem',
              borderRadius: '1rem',
              background: palette.cardSoft,
              border: `1px solid ${isExpanded ? palette.primary : (palette.borderSoft || palette.border)}`,
              cursor: clickable ? 'pointer' : 'default',
              transition: 'border-color 0.15s',
            }}
            onClick={clickable ? () => onCategoryClick(item.categoria) : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <span style={{ color: palette.text, fontWeight: 700 }}>{item.categoria}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: palette.textSoft, fontWeight: 700 }}>
                  Q {item.monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {clickable && (
                  <span style={{ color: palette.primary, fontWeight: 700, fontSize: '0.85rem', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▾
                  </span>
                )}
              </div>
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
        )
      })}
    </div>
  )
}
