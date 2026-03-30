import { useMemo } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

export default function DeudasPage({ deudas }) {
  const deudasRows = useMemo(() => deudas?.items || [], [deudas])
  const activasRows = useMemo(
    () => deudasRows.filter((item) => String(item.status || '').toLowerCase() === 'active' && Number(item.pending_installments || 0) > 0),
    [deudasRows],
  )

  return (
    <div className="grid-page two-col">
      <Panel title="Deudas activas">
        {activasRows.length > 0 ? (
          <div className="list-stack">
            {activasRows.map((deuda) => (
              <div className="debt-card" key={deuda.id}>
                <div>
                  <strong>{deuda.name}</strong>
                  <small>{deuda.creditor}</small>
                </div>
                <div className="debt-meta">
                  <span>Cuota: {q(deuda.installment_amount)}</span>
                  <span>Pendientes: {deuda.pending_installments}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas activas." />}
      </Panel>

      <Panel title="Todas las deudas">
        {deudasRows.length > 0 ? (
          <div className="list-stack">
            {deudasRows.map((deuda) => (
              <div className="list-row" key={deuda.id}>
                <div>
                  <strong>{deuda.name}</strong>
                  <small>{String(deuda.status || '').toLowerCase() === 'active' ? 'Activa' : deuda.status}</small>
                </div>
                <span>{q(deuda.saldo_pendiente)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas registradas." />}
      </Panel>

      <Panel title="Detalle de deudas" className="full-span">
        {deudasRows.length > 0 ? (
          <div className="list-stack">
            {deudasRows.map((deuda) => (
              <div className="debt-card debt-detail" key={`detail-${deuda.id}`}>
                <div>
                  <strong>{deuda.name}</strong>
                  <small>{deuda.creditor} · vence {deuda.due_date}</small>
                </div>
                <div className="debt-meta">
                  <span>Pagados: {deuda.paid_installments}/{deuda.total_installments}</span>
                  <span>Saldo: {q(deuda.saldo_pendiente)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay detalle para mostrar." />}
      </Panel>

      <MessageBanner kind="success">Alta y pago de deudas quedan para la siguiente ronda. Esta vista ya está conectada a Supabase en modo lectura.</MessageBanner>
    </div>
  )
}
