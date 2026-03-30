import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'

const deudaBase = {
  name: '',
  creditor: '',
  due_date: new Date().toISOString().slice(0, 10),
  installment_amount: '',
  total_installments: '',
  paid_installments: '0',
}

const pagoBase = {
  debt_id: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: 'Efectivo',
  account_name: 'Efectivo',
  note: '',
}

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-GT')
}

export default function DeudasPage({ userId, api, disponibles, deudas, deudasActivas, onRefreshData }) {
  const cuentasLiquidas = useMemo(() => disponibles?.saldos_liquidos || [], [disponibles])
  const cuentasTransferencia = useMemo(
    () => cuentasLiquidas.filter((item) => item.cuenta?.toLowerCase() !== 'efectivo'),
    [cuentasLiquidas],
  )

  const [form, setForm] = useState(deudaBase)
  const [pago, setPago] = useState(pagoBase)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingPay, setSavingPay] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const deudasRows = useMemo(() => deudas?.items || [], [deudas])
  const activasRows = useMemo(() => deudasActivas || [], [deudasActivas])

  useEffect(() => {
    setPago((prev) => {
      const nextAccount = prev.payment_method === 'Transferencia'
        ? (cuentasTransferencia[0]?.cuenta || '')
        : 'Efectivo'
      return { ...prev, account_name: nextAccount }
    })
  }, [cuentasTransferencia])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updatePago(field, value) {
    setPago((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'payment_method') {
        next.account_name = value === 'Transferencia' ? (cuentasTransferencia[0]?.cuenta || '') : 'Efectivo'
      }
      return next
    })
  }

  async function submitDeuda(e) {
    e.preventDefault()
    setSavingCreate(true)
    setMessage('')
    setError('')
    try {
      await api.postDeuda({
        telegram_user_id: Number(userId),
        name: form.name.trim(),
        creditor: form.creditor.trim(),
        due_date: form.due_date,
        installment_amount: Number(form.installment_amount),
        total_installments: Number(form.total_installments),
        paid_installments: Number(form.paid_installments),
      })
      setMessage('Deuda creada correctamente.')
      setForm(deudaBase)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude crear la deuda.')
    } finally {
      setSavingCreate(false)
    }
  }

  async function submitPago(e) {
    e.preventDefault()
    setSavingPay(true)
    setMessage('')
    setError('')
    try {
      await api.postPagarDeuda({
        telegram_user_id: Number(userId),
        debt_id: Number(pago.debt_id),
        payment_date: pago.payment_date,
        payment_method: pago.payment_method,
        account_name: pago.payment_method === 'Transferencia' ? pago.account_name : 'Efectivo',
        note: pago.note?.trim() || null,
      })
      setMessage('Pago de deuda registrado.')
      setPago({ ...pagoBase, payment_method: 'Efectivo', account_name: 'Efectivo' })
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude registrar el pago.')
    } finally {
      setSavingPay(false)
    }
  }

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
                  <span>Saldo: {q(deuda.saldo_pendiente)}</span>
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
              <div className="debt-card" key={deuda.id}>
                <div>
                  <strong>{deuda.name}</strong>
                  <small>{deuda.creditor} · Vence {fmtDate(deuda.due_date)}</small>
                </div>
                <div className="debt-meta">
                  <span>{deuda.paid_installments}/{deuda.total_installments} pagadas</span>
                  <span>{(deuda.status || '').toLowerCase() === 'paid' ? 'Pagada' : 'Activa'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas registradas." />}
      </Panel>

      <Panel title="Crear deuda">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
        <form className="form-grid" onSubmit={submitDeuda}>
          <label>
            <span>Nombre</span>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </label>
          <label>
            <span>Acreedor</span>
            <input value={form.creditor} onChange={(e) => update('creditor', e.target.value)} required />
          </label>
          <label>
            <span>Fecha pago</span>
            <input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} required />
          </label>
          <label>
            <span>Cuota</span>
            <input type="number" min="0.01" step="0.01" value={form.installment_amount} onChange={(e) => update('installment_amount', e.target.value)} required />
          </label>
          <label>
            <span>Meses</span>
            <input type="number" min="1" step="1" value={form.total_installments} onChange={(e) => update('total_installments', e.target.value)} required />
          </label>
          <label>
            <span>Pagados</span>
            <input type="number" min="0" step="1" value={form.paid_installments} onChange={(e) => update('paid_installments', e.target.value)} required />
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" disabled={savingCreate || !userId}>{savingCreate ? 'Guardando...' : 'Crear deuda'}</button>
          </div>
        </form>
      </Panel>

      <Panel title="Pagar deuda">
        <form className="form-grid" onSubmit={submitPago}>
          <label>
            <span>Deuda activa</span>
            <select value={pago.debt_id} onChange={(e) => updatePago('debt_id', e.target.value)} required>
              <option value="">Selecciona una deuda</option>
              {activasRows.map((deuda) => (
                <option key={deuda.id} value={deuda.id}>
                  {deuda.name} · Cuota {q(deuda.installment_amount)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Fecha pago</span>
            <input type="date" value={pago.payment_date} onChange={(e) => updatePago('payment_date', e.target.value)} required />
          </label>
          <label>
            <span>Método</span>
            <select value={pago.payment_method} onChange={(e) => updatePago('payment_method', e.target.value)}>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </label>
          {pago.payment_method === 'Transferencia' && (
            <label>
              <span>Cuenta</span>
              <select value={pago.account_name} onChange={(e) => updatePago('account_name', e.target.value)} required>
                {cuentasTransferencia.map((item) => (
                  <option key={item.cuenta} value={item.cuenta}>
                    {item.cuenta} · {q(item.saldo)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="full-span">
            <span>Nota</span>
            <input type="text" value={pago.note} onChange={(e) => updatePago('note', e.target.value)} placeholder="Opcional" />
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" disabled={savingPay || !userId || !activasRows.length}>{savingPay ? 'Guardando...' : 'Registrar pago'}</button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
