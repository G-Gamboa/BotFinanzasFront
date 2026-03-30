import { useMemo, useState } from 'react'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import GastosChart from '../components/GastosCharts'
import LoadingBlock from '../components/LoadingBlock'
import EmptyState from '../components/EmptyState'

export default function DashboardPage({ loading, palette, dashboard, showAmounts }) {
  const [chartPeriod, setChartPeriod] = useState('mes')

  const chartSource = useMemo(() => {
    if (chartPeriod === 'dia') return dashboard?.resumen_dia || {}
    if (chartPeriod === 'semana') return dashboard?.resumen_semana || {}
    return dashboard?.resumen_mes || {}
  }, [chartPeriod, dashboard])

  if (loading) return <LoadingBlock text="Cargando dashboard..." />
  if (!dashboard) return <EmptyState text="No hay datos para mostrar." />

  const networthQ = dashboard?.networth?.total_gtq ?? 0
  const netoQ = dashboard?.neto?.patrimonio_neto ?? 0
  const totalDeudas = dashboard?.neto?.pasivos ?? 0
  const deudasActivas = dashboard?.neto?.pasivos > 0 ? (dashboard?.deudas?.items?.length || 0) : 0
  const liquidMap = dashboard?.networth?.liquid_map || {}

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="stats-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard palette={palette} title="Networth" value={money(networthQ, showAmounts)} />
        <StatCard palette={palette} title="Neto" value={money(netoQ, showAmounts)} accent />
        <StatCard palette={palette} title="Ahorro" value={money(dashboard?.networth?.ahorro_total_gtq ?? 0, showAmounts)} />
        <StatCard palette={palette} title="Pasivos" value={money(totalDeudas, showAmounts)} accent />
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
<SectionCard palette={palette} title="Liquidez">
  <div style={{ display: "grid", gap: "0.7rem" }}>
    {Object.entries(dashboard?.networth?.liquid_map || {}).map(([cuenta, saldo]) => (
      <div
        key={cuenta}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1rem",
          borderRadius: "1rem",
          border: `1px solid ${palette.borderSoft || palette.border}`,
          background: palette.cardSoft,
        }}
      >
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
                    <span style={{ color: palette.primary, fontWeight: 800 }}>{moneyVisible(item.saldo, showAmounts)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <SectionCard palette={palette} title="Resumen del día">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Row label="Ingresos" value={money(dashboard?.resumen_dia?.ingresos || 0, showAmounts)} palette={palette} />
              <Row label="Egresos" value={money(dashboard?.resumen_dia?.egresos || 0, showAmounts)} palette={palette} />
              <Row label="Balance" value={money(dashboard?.resumen_dia?.balance || 0, showAmounts)} palette={palette} />
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Resumen semanal">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Row label="Ingresos" value={money(dashboard?.resumen_semana?.ingresos || 0, showAmounts)} palette={palette} />
              <Row label="Egresos" value={money(dashboard?.resumen_semana?.egresos || 0, showAmounts)} palette={palette} />
              <Row label="Balance" value={money(dashboard?.resumen_semana?.balance || 0, showAmounts)} palette={palette} />
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Resumen del mes">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Row label="Ingresos" value={money(dashboard?.resumen_mes?.ingresos || 0, showAmounts)} palette={palette} />
              <Row label="Egresos" value={money(dashboard?.resumen_mes?.egresos || 0, showAmounts)} palette={palette} />
              <Row label="Balance" value={money(dashboard?.resumen_mes?.balance || 0, showAmounts)} palette={palette} />
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Gastos por categoría" accent>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['dia', 'semana', 'mes'].map((period) => (
                <button key={period} onClick={() => setChartPeriod(period)} style={pillStyle(period === chartPeriod, palette)}>
                  {period === 'dia' ? 'Día' : period === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            <GastosChart palette={palette} data={chartSource?.gastos_por_categoria || {}} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, palette }) {
  return (
    <div style={rowBox(palette)}>
      <span style={{ color: palette.textSoft, fontWeight: 700 }}>{label}</span>
      <span style={{ color: palette.text, fontWeight: 800 }}>{value}</span>
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
    padding: '0.65rem 0.9rem',
    borderRadius: '999px',
    border: `1px solid ${active ? palette.primary : palette.border}`,
    background: active ? palette.primary : palette.cardSoft,
    color: active ? '#fff' : palette.text,
    fontWeight: 700,
    cursor: 'pointer',
  }
}

function money(value, visible) {
  if (!visible) return 'Q ••••••'
  return moneyVisible(value)
}

function moneyVisible(value) {
  return `Q ${Number(value || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
