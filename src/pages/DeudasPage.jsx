import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'
import { getGuatemalaDateString } from '../utils/dates'

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

const FREQ_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  none: 'Sin fecha fija',
}

const initialCreateForm = {
  name: '',
  creditor: '',
  dueDate: getGuatemalaDateString(),
  installmentAmount: '',
  totalInstallments: '',
  paidInstallments: '0',
  paymentFrequency: 'monthly',
}

const initialPayForm = {
  debtId: '',
  paymentDate: getGuatemalaDateString(),
  paymentMethod: 'Efectivo',
  accountName: 'Efectivo',
  note: '',
}

export default function DeudasPage({ userId, api, disponibles, deudas, onRefreshData }) {
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [payForm, setPayForm] = useState(initialPayForm)
  const [createSaving, setCreateSaving] = useState(false)
  const [paySaving, setPaySaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const deudasRows = useMemo(() => deudas?.items || [], [deudas])
  const activasRows = useMemo(
    () => deudasRows.filter((item) => String(item.status || '').toLowerCase() === 'active' && Number(item.pending_installments || 0) > 0),
    [deudasRows],
  )

  const transferAccounts = useMemo(
    () => (disponibles?.saldos_liquidos || []).filter((item) => item.cuenta !== 'Efectivo'),
    [disponibles],
  )

  function updateCreate(field, value) {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  function updatePay(field, value) {
    setPayForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'paymentMethod') {
        next.accountName = value === 'Transferencia' ? (transferAccounts[0]?.cuenta || '') : 'Efectivo'
      }
      return next
    })
  }

  async function submitCreate(e) {
    e.preventDefault()
    setCreateSaving(true)
    setMessage('')
    setError('')

    try {
      await api.postDeuda({
        telegram_user_id: Number(userId),
        name: createForm.name,
        creditor: createForm.creditor,
        due_date: createForm.dueDate,
        installment_amount: Number(createForm.installmentAmount),
        total_installments: Number(createForm.totalInstallments),
        paid_installments: Number(createForm.paidInstallments || 0),
        payment_frequency: createForm.paymentFrequency,
      })

      setMessage('Deuda creada correctamente.')
      setCreateForm({
        ...initialCreateForm,
        dueDate: getGuatemalaDateString(),
      })
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude crear la deuda.')
    } finally {
      setCreateSaving(false)
    }
  }

  async function submitPay(e) {
    e.preventDefault()
    setPaySaving(true)
    setMessage('')
    setError('')

    try {
      await api.postPagarDeuda({
        telegram_user_id: Number(userId),
        debt_id: Number(payForm.debtId),
        payment_date: payForm.paymentDate,
        payment_method: payForm.paymentMethod,
        account_name: payForm.paymentMethod === 'Transferencia' ? payForm.accountName : 'Efectivo',
        note: payForm.note || null,
      })

      setMessage('Pago registrado correctamente.')
      setPayForm({
        ...initialPayForm,
        paymentDate: getGuatemalaDateString(),
        debtId: '',
        accountName: 'Efectivo',
      })
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude registrar el pago.')
    } finally {
      setPaySaving(false)
    }
  }

  return (
    <div className="grid-page two-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <Panel title="Nueva deuda">
        <form className="form-grid" onSubmit={submitCreate}>
          <label>
            <span>Nombre</span>
            <input value={createForm.name} onChange={(e) => updateCreate('name', e.target.value)} required />
          </label>

          <label>
            <span>Acreedor</span>
            <input value={createForm.creditor} onChange={(e) => updateCreate('creditor', e.target.value)} required />
          </label>

          <label>
            <span>Fecha de próximo pago</span>
            <input type="date" value={createForm.dueDate} onChange={(e) => updateCreate('dueDate', e.target.value)} required />
          </label>

          <label>
            <span>Frecuencia de pago</span>
            <select value={createForm.paymentFrequency} onChange={(e) => updateCreate('paymentFrequency', e.target.value)}>
              <option value="monthly">Mensual</option>
              <option value="biweekly">Quincenal</option>
              <option value="weekly">Semanal</option>
              <option value="none">Sin fecha fija</option>
            </select>
          </label>

          <label>
            <span>Cuota</span>
            <input type="number" min="0.01" step="0.01" value={createForm.installmentAmount} onChange={(e) => updateCreate('installmentAmount', e.target.value)} required />
          </label>

          <label>
            <span>Total de cuotas</span>
            <input type="number" min="1" step="1" value={createForm.totalInstallments} onChange={(e) => updateCreate('totalInstallments', e.target.value)} required />
          </label>

          <label>
            <span>Pagadas inicialmente</span>
            <input type="number" min="0" step="1" value={createForm.paidInstallments} onChange={(e) => updateCreate('paidInstallments', e.target.value)} required />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={createSaving || !userId}>
              {createSaving ? 'Guardando...' : 'Crear deuda'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Pagar cuota">
        {activasRows.length > 0 ? (
          <form className="form-grid" onSubmit={submitPay}>
            <label>
              <span>Deuda</span>
              <select value={payForm.debtId} onChange={(e) => updatePay('debtId', e.target.value)} required>
                <option value="">Selecciona una deuda</option>
                {activasRows.map((deuda) => (
                  <option key={deuda.id} value={deuda.id}>
                    {deuda.name} · {q(deuda.installment_amount)} · {deuda.pending_installments} pendientes
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Fecha de pago</span>
              <input type="date" value={payForm.paymentDate} onChange={(e) => updatePay('paymentDate', e.target.value)} required />
            </label>

            <label>
              <span>Método</span>
              <select value={payForm.paymentMethod} onChange={(e) => updatePay('paymentMethod', e.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </label>

            {payForm.paymentMethod === 'Transferencia' && (
              <label>
                <span>Cuenta</span>
                <select value={payForm.accountName} onChange={(e) => updatePay('accountName', e.target.value)} required>
                  {transferAccounts.map((item) => (
                    <option key={item.cuenta} value={item.cuenta}>
                      {item.cuenta} · Disponible {q(item.saldo)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="full-span">
              <span>Nota</span>
              <input value={payForm.note} onChange={(e) => updatePay('note', e.target.value)} placeholder="Opcional" />
            </label>

            <div className="full-span form-actions">
              <button className="primary-btn" type="submit" disabled={paySaving || !userId || !payForm.debtId}>
                {paySaving ? 'Guardando...' : 'Registrar pago'}
              </button>
            </div>
          </form>
        ) : <EmptyState text="No hay deudas activas para pagar." />}
      </Panel>

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
                  <span>
                    {deuda.payment_frequency !== 'none'
                      ? `Próximo pago: ${deuda.due_date}`
                      : `Pago: ${deuda.due_date}`}
                  </span>
                  <span>{FREQ_LABELS[deuda.payment_frequency] ?? deuda.payment_frequency}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas activas." />}
      </Panel>

      <Panel title="Detalle de deudas" className="full-span">
        {activasRows.length > 0 ? (
          <div className="list-stack">
            {activasRows.map((deuda) => {
              const isPaid = deuda.status === 'paid'
              return (
                <div className="debt-card debt-detail" key={`detail-${deuda.id}`} style={{ opacity: isPaid ? 0.6 : 1 }}>
                  <div>
                    <strong>{deuda.name}</strong>
                    <small>
                      {deuda.creditor}
                      {' · '}
                      {FREQ_LABELS[deuda.payment_frequency] ?? deuda.payment_frequency}
                      {isPaid ? ' · ✅ Pagada' : ` · Próximo: ${deuda.due_date}`}
                    </small>
                  </div>
                  <div className="debt-meta">
                    <span>Cuota: {q(deuda.installment_amount)}</span>
                    <span>Pagadas: {deuda.paid_installments}/{deuda.total_installments}</span>
                    <span>Pendientes: {deuda.pending_installments}</span>
                    <span>Saldo: {q(deuda.saldo_pendiente)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState text="No hay deudas activas." />}
      </Panel>
    </div>
  )
}
