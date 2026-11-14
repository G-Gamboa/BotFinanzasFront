import Panel from '../components/Panel'
import Icon from '../components/Icons'
import LoadingBlock from '../components/LoadingBlock'
import EmptyState from '../components/EmptyState'
import { q, usd } from '../lib/format'

function Line({ label, value, className = '' }) {
  return (
    <div className={`row-line ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function DashboardPage({ loading, dashboard, deudas, tcBalances = [], showAmounts }) {
  if (loading && !dashboard) return <LoadingBlock text="Cargando resumen..." />
  if (!dashboard?.networth) return <EmptyState text="No hay datos para mostrar." />

  const nw = dashboard.networth
  const neto = dashboard.neto || {}
  const mes = dashboard.resumen_mes || {}
  const goals = dashboard.savings_goals || []

  const liquid = Object.entries(nw.liquid_map || {})
  const ahorro = nw.ahorro_por_cuenta || []
  const inversiones = Object.entries(nw.inv_map || {})
  const inversionesGtq = Number(nw.inv_total_usd || 0) * Number(nw.tc || 0)

  const deudaPendiente = Number(deudas?.total_pendiente || 0)
  const tarjetasPropio = tcBalances.reduce((s, tc) => s + Math.max(0, tc.balance_own_gtq ?? 0), 0)
  const compromiso = Number(neto.compromiso_visacuotas || 0)
  const netoFinal = compromiso > 0 ? neto.patrimonio_neto_ajustado : neto.patrimonio_neto
  const m = (v) => q(v, showAmounts)

  return (
    <div className="grid-page single-col">
      <section className="panel">
        <p className="hero-label">Lo que tienes menos lo que debes</p>
        <p className={`hero-num${Number(netoFinal) < 0 ? ' neg' : ''}`}>{m(netoFinal)}</p>
        <div className="trio">
          <div><span>Tienes</span><strong>{m(neto.patrimonio_bruto)}</strong></div>
          <div><span>Debes</span><strong className="neg">{m(Number(neto.pasivos || 0) + compromiso)}</strong></div>
          <div><span>Este mes</span><strong className={Number(mes.balance) < 0 ? 'neg' : 'pos'}>{m(mes.balance)}</strong></div>
        </div>
        <p className="helper-text">
          Este mes entraron {m(mes.ingresos)} y salieron {m(mes.egresos)}.
        </p>
      </section>

      <div className="grid-page two-col">
        <Panel title="Dinero por cuenta">
          <div className="rows">
            {liquid.length === 0 ? <p className="helper-text">Sin saldo en cuentas.</p> : null}
            {liquid.map(([cuenta, saldo]) => <Line key={cuenta} label={cuenta} value={m(saldo)} />)}
            <Line label="Total disponible" value={m(nw.liquidez_gtq)} className="total" />
          </div>
        </Panel>

        <Panel title="Ahorro">
          <div className="rows">
            {ahorro.length === 0 ? <p className="helper-text">No tienes ahorro distribuido.</p> : null}
            {ahorro.map((item) => <Line key={item.cuenta} label={item.cuenta} value={m(item.saldo)} />)}
            {ahorro.length > 0 ? <Line label="Total ahorrado" value={m(nw.ahorro_total_gtq)} className="total" /> : null}
            {goals.map((g) => {
              const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0
              return (
                <div key={g.id} className="item-card">
                  <div className="item-head">
                    <strong className="title-with-icon"><Icon name={pct >= 100 ? 'check' : 'target'} /> {g.name}</strong>
                    <span className="helper-text">{showAmounts ? `${pct.toFixed(0)}%` : '••%'}</span>
                  </div>
                  <div className={`bar${pct >= 100 ? ' done' : ''}`}><span style={{ width: `${pct}%` }} /></div>
                  <span className="helper-text">{m(g.current_amount)} de {m(g.target_amount)}</span>
                </div>
              )
            })}
          </div>
        </Panel>

        {inversiones.length > 0 ? (
          <Panel title="Inversiones">
            <div className="rows">
              {inversiones.map(([cuenta, saldo]) => <Line key={cuenta} label={cuenta} value={usd(saldo, showAmounts)} />)}
              <Line
                label={`Total en quetzales, a ${showAmounts ? Number(nw.tc || 0).toFixed(2) : '••'}`}
                value={m(inversionesGtq)}
                className="total"
              />
            </div>
          </Panel>
        ) : null}

        <Panel title="Lo que debes">
          <div className="rows">
            <Line label="Deudas" value={m(deudaPendiente)} />
            <Line label="Tarjetas, tu consumo" value={m(tarjetasPropio)} />
            {compromiso > 0 ? <Line label="Visacuotas por cargar" value={m(compromiso)} /> : null}
            <Line label="Total" value={m(Number(neto.pasivos || 0) + compromiso)} className="total" />
            {Number(nw.prestamos_gtq) > 0 ? (
              <Line label="Aparte, te deben en préstamos" value={m(nw.prestamos_gtq)} className="sub" />
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  )
}
