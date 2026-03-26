import Panel from '../components/Panel'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import LoadingBlock from '../components/LoadingBlock'

function q(value) {
  if (value === null || value === undefined || value === '') return '—'
  const number = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(number)) return String(value)
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 }).format(number)
}

export default function DashboardPage({ loading, resumen, saldos, networth, neto, refresh }) {
  if (loading) return <LoadingBlock text="Cargando dashboard..." />

  return (
    <div className="grid-page">
      <div className="stats-grid">
        <StatCard label="Patrimonio" value={q(networth?.networth ?? networth?.total ?? networth?.valor)} accent />
        <StatCard label="Balance neto" value={q(neto?.neto ?? neto?.total ?? neto?.valor)} />
        <StatCard label="Ingresos mes" value={q(resumen?.ingresos ?? resumen?.total_ingresos)} />
        <StatCard label="Egresos mes" value={q(resumen?.egresos ?? resumen?.total_egresos)} />
      </div>

      <Panel title="Resumen del mes" actions={<button className="ghost-btn" onClick={refresh}>Actualizar</button>}>
        <div className="kv-grid">
          <div><span>Ingresos</span><strong>{q(resumen?.ingresos ?? resumen?.total_ingresos)}</strong></div>
          <div><span>Egresos</span><strong>{q(resumen?.egresos ?? resumen?.total_egresos)}</strong></div>
          <div><span>Movimientos</span><strong>{resumen?.movimientos ?? resumen?.total_movimientos ?? '—'}</strong></div>
          <div><span>Periodo</span><strong>{resumen?.periodo ?? 'Mes actual'}</strong></div>
        </div>
      </Panel>

      <Panel title="Saldos por cuenta">
        {Array.isArray(saldos?.items || saldos?.saldos) && (saldos?.items || saldos?.saldos).length > 0 ? (
          <div className="list-stack">
            {(saldos?.items || saldos?.saldos).map((item, idx) => (
              <div className="list-row" key={`${item.cuenta || item.nombre}-${idx}`}>
                <div>
                  <strong>{item.cuenta || item.nombre || 'Cuenta'}</strong>
                  <small>{item.moneda || item.tipo || ''}</small>
                </div>
                <span>{q(item.saldo ?? item.valor ?? item.total)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay saldos para mostrar." />}
      </Panel>
    </div>
  )
}
