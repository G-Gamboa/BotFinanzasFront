import { useMemo, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import GastosChart from '../components/GastosCharts'
import LoadingBlock from '../components/LoadingBlock'
import EmptyState from '../components/EmptyState'

export default function DashboardPage({ userId, api, loading, palette, dashboard, showAmounts }) {
  const [period, setPeriod] = useState('mes')

  // Custom date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [customResult, setCustomResult] = useState(null)
  const [customLoading, setCustomLoading] = useState(false)
  const [customError, setCustomError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)

  function handleCategoryClick(cat) {
    setExpandedCategory((prev) => (prev === cat ? null : cat))
  }

  const periodSource = useMemo(() => {
    if (period === 'dia') return dashboard?.resumen_dia || {}
    if (period === 'semana') return dashboard?.resumen_semana || {}
    return dashboard?.resumen_mes || {}
  }, [period, dashboard])

  async function fetchPeriodo(e) {
    e.preventDefault()
    if (!dateFrom || !dateTo) return
    setCustomLoading(true)
    setCustomError('')
    setCustomResult(null)
    setExpandedCategory(null)
    try {
      const result = await api.getPeriodoResumen(userId, { date_from: dateFrom, date_to: dateTo })
      setCustomResult(result)
    } catch (err) {
      setCustomError(err.message || 'No pude cargar el período.')
    } finally {
      setCustomLoading(false)
    }
  }

  if (loading) return <LoadingBlock text="Cargando dashboard..." />
  if (!dashboard) return <EmptyState text="No hay datos para mostrar." />

  const networthQ = dashboard?.networth?.total_gtq ?? 0
  const netoQ = dashboard?.neto?.patrimonio_neto ?? 0
  const totalDeudas = dashboard?.neto?.pasivos ?? 0
  const inversionesMap = dashboard?.networth?.inv_map || {}
  const inversionesUsd = dashboard?.networth?.inv_total_usd ?? 0
  const tc = dashboard?.networth?.tc ?? 0
  const inversionesGtq = Number(inversionesUsd || 0) * Number(tc || 0)

  const periodLabel = period === 'dia' ? 'Día' : period === 'semana' ? 'Semana' : 'Mes'

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* ── Top stats ── */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
        }}
      >
        <StatCard palette={palette} title="Networth" value={money(networthQ, showAmounts)} />
        <StatCard palette={palette} title="Neto" value={money(netoQ, showAmounts)} accent />
        <StatCard
          palette={palette}
          title="Ahorro"
          value={money(dashboard?.networth?.ahorro_total_gtq ?? 0, showAmounts)}
        />
        <StatCard palette={palette} title="Pasivos" value={money(totalDeudas, showAmounts)} accent />
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'start',
        }}
      >
        {/* ── Left column ── */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <SectionCard palette={palette} title="Liquidez">
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {Object.entries(dashboard?.networth?.liquid_map || {}).map(([cuenta, saldo]) => (
                <div key={cuenta} style={rowBox(palette)}>
                  <span style={{ color: palette.text, fontWeight: 700 }}>{cuenta}</span>
                  <span style={{ color: palette.primary, fontWeight: 800 }}>
                    {money(saldo, showAmounts)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Ahorro por cuenta" accent>
            {(dashboard?.networth?.ahorro_por_cuenta || []).length === 0 ? (
              <div style={{ color: palette.textSoft }}>No tienes ahorro distribuido.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {dashboard.networth.ahorro_por_cuenta.map((item) => (
                  <div key={item.cuenta} style={rowBox(palette)}>
                    <span style={{ color: palette.text, fontWeight: 700 }}>{item.cuenta}</span>
                    <span style={{ color: palette.primary, fontWeight: 800 }}>
                      {moneyVisible(item.saldo, showAmounts)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {(dashboard?.prestamos_resumen?.items || []).length > 0 ? (
            <SectionCard palette={palette} title="Préstamos pendientes">
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {dashboard.prestamos_resumen.items.map((p) => (
                  <div key={p.person} style={rowBox(palette)}>
                    <span style={{ color: palette.text, fontWeight: 700 }}>{p.person}</span>
                    <span style={{ color: palette.primary, fontWeight: 800 }}>{moneyVisible(p.total_balance, showAmounts)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {(dashboard?.savings_goals || []).length > 0 ? (
            <SectionCard palette={palette} title="Metas de ahorro" accent>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {dashboard.savings_goals.map((g) => {
                  const pct = g.target_amount > 0
                    ? Math.min(100, (g.current_amount / g.target_amount) * 100)
                    : 0
                  const done = pct >= 100
                  return (
                    <div key={g.id} style={{ display: 'grid', gap: '0.45rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ color: palette.text, fontWeight: 700 }}>
                          {done ? '✅ ' : '🎯 '}{g.name}
                        </span>
                        {g.account_name ? (
                          <span style={{ fontSize: '0.75rem', color: palette.textSoft }}>{g.account_name}</span>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: palette.textSoft }}>
                        <span>{showAmounts ? moneyVisible(g.current_amount) : 'Q ••••'}</span>
                        <span>de {showAmounts ? moneyVisible(g.target_amount) : 'Q ••••'} · {showAmounts ? `${pct.toFixed(0)}%` : '••%'}</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: palette.surface || palette.card, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: done
                            ? '#43a047'
                            : `linear-gradient(90deg, ${palette.primary}, ${palette.accent || palette.primarySoft})`,
                          borderRadius: 999,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard palette={palette} title="Inversiones" accent>
            {Object.keys(inversionesMap).length === 0 ? (
              <div style={{ color: palette.textSoft }}>No tienes inversiones registradas.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {Object.entries(inversionesMap).map(([cuenta, saldo]) => (
                  <div key={cuenta} style={rowBox(palette)}>
                    <span style={{ color: palette.text, fontWeight: 700 }}>{cuenta}</span>
                    <span style={{ color: palette.primary, fontWeight: 800 }}>
                      {moneyUsdVisible(saldo, showAmounts)}
                    </span>
                  </div>
                ))}
                <div style={{ ...rowBox(palette), marginTop: '0.35rem' }}>
                  <span style={{ color: palette.textSoft, fontWeight: 700 }}>Total inversiones (USD)</span>
                  <span style={{ color: palette.text, fontWeight: 800 }}>
                    {moneyUsdVisible(inversionesUsd, showAmounts)}
                  </span>
                </div>
                <div style={rowBox(palette)}>
                  <span style={{ color: palette.textSoft, fontWeight: 700 }}>Equivalente GTQ</span>
                  <span style={{ color: palette.text, fontWeight: 800 }}>
                    {moneyVisible(inversionesGtq, showAmounts)}
                  </span>
                </div>
                <div style={rowBox(palette)}>
                  <span style={{ color: palette.textSoft, fontWeight: 700 }}>TC usado</span>
                  <span style={{ color: palette.text, fontWeight: 800 }}>
                    {showAmounts ? Number(tc || 0).toFixed(2) : '••••'}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Single tabbed period summary */}
          <SectionCard palette={palette} title="Resumen">
            {/* Period tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['dia', 'semana', 'mes'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={pillStyle(p === period, palette)}
                >
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <Row label="Ingresos" value={money(periodSource?.ingresos || 0, showAmounts)} palette={palette} />
              <Row label="Egresos"  value={money(periodSource?.egresos  || 0, showAmounts)} palette={palette} />
              <Row
                label="Balance"
                value={money(periodSource?.balance || 0, showAmounts)}
                palette={palette}
                highlight={Number(periodSource?.balance || 0) >= 0 ? palette.primary : '#e53935'}
              />
            </div>

            {/* Chart using same period */}
            <div style={{ borderTop: `1px solid ${palette.borderSoft || palette.border}`, paddingTop: '1rem' }}>
              <div style={{ color: palette.textSoft, fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.7rem' }}>
                Gastos por categoría — {periodLabel}
              </div>
              <GastosChart palette={palette} data={periodSource?.gastos_por_categoria || {}} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Custom date range filter ── */}
      <SectionCard palette={palette} title="Filtrar por fechas">
        <form
          onSubmit={fetchPeriodo}
          style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}
        >
          <label>
            <span style={{ display: 'block', color: palette.textSoft, fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem' }}>
              Desde
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              required
              style={inputStyle(palette)}
            />
          </label>

          <label>
            <span style={{ display: 'block', color: palette.textSoft, fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem' }}>
              Hasta
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              required
              style={inputStyle(palette)}
            />
          </label>

          <button
            type="submit"
            disabled={customLoading}
            style={{
              padding: '0.7rem 1.2rem',
              borderRadius: '999px',
              border: 'none',
              background: palette.primary,
              color: '#fff',
              fontWeight: 700,
              cursor: customLoading ? 'not-allowed' : 'pointer',
              opacity: customLoading ? 0.6 : 1,
            }}
          >
            {customLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {customError ? (
          <div style={{ marginTop: '0.8rem', color: '#e53935', fontWeight: 700 }}>{customError}</div>
        ) : null}

        {customResult ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.8rem' }}>
            <div style={{ color: palette.textSoft, fontSize: '0.82rem', fontWeight: 600 }}>
              {customResult.fecha_inicio} → {customResult.fecha_fin}
            </div>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Row label="Ingresos" value={money(customResult.ingresos, showAmounts)} palette={palette} />
              <Row label="Egresos"  value={money(customResult.egresos,  showAmounts)} palette={palette} />
              <Row
                label="Balance"
                value={money(customResult.balance, showAmounts)}
                palette={palette}
                highlight={Number(customResult.balance) >= 0 ? palette.primary : '#e53935'}
              />
            </div>

            {Object.keys(customResult.gastos_por_categoria || {}).length > 0 ? (
              <div style={{ borderTop: `1px solid ${palette.borderSoft || palette.border}`, paddingTop: '0.8rem', display: 'grid', gap: '0.9rem' }}>
                <div style={{ color: palette.textSoft, fontWeight: 700, fontSize: '0.82rem' }}>
                  Gastos por categoría — presiona para ver el desglose
                </div>

                {Object.entries(customResult.gastos_por_categoria)
                  .map(([cat, monto]) => ({ cat, monto: Number(monto) }))
                  .filter((x) => x.monto > 0)
                  .sort((a, b) => b.monto - a.monto)
                  .map(({ cat, monto }) => {
                    const isOpen = expandedCategory === cat
                    const items = (customResult.detalle_por_categoria || {})[cat] || []
                    const maxMonto = Math.max(...Object.values(customResult.gastos_por_categoria).map(Number), 1)

                    return (
                      <div key={cat}>
                        {/* Category row — clickable */}
                        <div
                          onClick={() => handleCategoryClick(cat)}
                          style={{
                            display: 'grid',
                            gap: '0.35rem',
                            padding: '0.8rem',
                            borderRadius: isOpen ? '1rem 1rem 0 0' : '1rem',
                            background: palette.cardSoft,
                            border: `1px solid ${isOpen ? palette.primary : (palette.borderSoft || palette.border)}`,
                            borderBottom: isOpen ? 'none' : undefined,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ color: palette.text, fontWeight: 700 }}>{cat}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: palette.textSoft, fontWeight: 700 }}>
                                {money(monto, showAmounts)}
                              </span>
                              <span style={{
                                color: palette.primary,
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                display: 'inline-block',
                                transition: 'transform 0.15s',
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}>
                                ▾
                              </span>
                            </div>
                          </div>
                          {/* Bar */}
                          <div style={{ height: 10, borderRadius: 999, background: palette.surface || palette.card, overflow: 'hidden' }}>
                            <div style={{
                              width: `${(monto / maxMonto) * 100}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent || palette.primarySoft})`,
                              borderRadius: 999,
                            }} />
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isOpen && (
                          <div style={{
                            border: `1px solid ${palette.primary}`,
                            borderTop: 'none',
                            borderRadius: '0 0 1rem 1rem',
                            overflow: 'hidden',
                          }}>
                            {items.length === 0 ? (
                              <div style={{ padding: '0.8rem 1rem', color: palette.textSoft, fontSize: '0.85rem' }}>
                                Sin detalle disponible.
                              </div>
                            ) : (
                              items.map((item, idx) => (
                                <div
                                  key={`${item.record_type}-${item.id}`}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.65rem 1rem',
                                    background: idx % 2 === 0 ? palette.cardSoft : (palette.surface || palette.card),
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: 0 }}>
                                    <span style={{ color: palette.textSoft, fontSize: '0.78rem', fontWeight: 600 }}>
                                      {item.date}
                                    </span>
                                    {item.note ? (
                                      <span style={{ color: palette.text, fontSize: '0.88rem', fontWeight: 500, wordBreak: 'break-word' }}>
                                        {item.note}
                                      </span>
                                    ) : (
                                      <span style={{ color: palette.textSoft, fontSize: '0.82rem', fontStyle: 'italic' }}>
                                        Sin nota
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ color: palette.primary, fontWeight: 800, whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
                                    {money(item.amount, showAmounts)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                }
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

function Row({ label, value, palette, highlight }) {
  return (
    <div style={rowBox(palette)}>
      <span style={{ color: palette.textSoft, fontWeight: 700 }}>{label}</span>
      <span style={{ color: highlight || palette.text, fontWeight: 800 }}>{value}</span>
    </div>
  )
}

function rowBox(palette) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0.9rem',
    borderRadius: '0.9rem',
    background: palette.cardSoft,
    border: `1px solid ${palette.borderSoft || palette.border}`,
  }
}

function pillStyle(active, palette) {
  return {
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    border: `1px solid ${active ? palette.primary : palette.border}`,
    background: active ? palette.primary : palette.cardSoft,
    color: active ? '#fff' : palette.text,
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
  }
}

function inputStyle(palette) {
  return {
    width: '100%',
    padding: '0.65rem 0.8rem',
    borderRadius: '0.7rem',
    border: `1px solid ${palette.border}`,
    background: palette.cardSoft,
    color: palette.text,
    fontSize: '0.9rem',
  }
}

function money(value, visible) {
  if (!visible) return 'Q ••••••'
  return moneyVisible(value, true)
}

function moneyVisible(value, visible = true) {
  if (!visible) return 'Q ••••••'
  return `Q ${Number(value || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function moneyUsdVisible(value, visible = true) {
  if (!visible) return '$ ••••••'
  return `$ ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
