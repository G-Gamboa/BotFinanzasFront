import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'
import { getGuatemalaDateString } from '../utils/dates'

// ── Formatters ──────────────────────────────────────────────────────────────

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

function usd(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatBalance(tc) {
  if (tc.tc_type === 'USD') return usd(tc.balance)
  return q(tc.balance)
}

// ── Constants ────────────────────────────────────────────────────────────────

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
  paymentMethod: 'cash',
  accountName: 'Efectivo',
  note: '',
}

const initialTCPayForm = {
  creditCardAccountId: '',
  amount: '',
  amountUsd: '',        // solo para TC USD
  paymentDate: getGuatemalaDateString(),
  accountName: 'Efectivo',
  note: '',
}

const initialInstallPlanForm = {
  creditCardAccountId: '',
  name: '',
  totalAmount: '',
  totalInstallments: '',
  monthlyAmount: '',
  purchaseDate: getGuatemalaDateString(),
  firstChargeDate: getGuatemalaDateString(),
  note: '',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DeudasPage({
  userId,
  api,
  catalogos,
  disponibles,
  deudas,
  tcBalances = [],
  installmentPlans = [],
  onRefreshData,
}) {
  const [createForm, setCreateForm]             = useState(initialCreateForm)
  const [payForm, setPayForm]                   = useState(initialPayForm)
  const [tcPayForm, setTcPayForm]               = useState(initialTCPayForm)
  const [installPlanForm, setInstallPlanForm]   = useState(initialInstallPlanForm)

  const [createSaving, setCreateSaving]         = useState(false)
  const [paySaving, setPaySaving]               = useState(false)
  const [tcPaySaving, setTcPaySaving]           = useState(false)
  const [installPlanSaving, setInstallPlanSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  // ── Derived data ──────────────────────────────────────────────────────────

  const deudasRows = useMemo(() => deudas?.items || [], [deudas])
  const activasRows = useMemo(
    () => deudasRows.filter(
      (d) => String(d.status || '').toLowerCase() === 'active' &&
             Number(d.pending_installments || 0) > 0
    ),
    [deudasRows],
  )

  const transferAccounts = useMemo(
    () => (disponibles?.saldos_liquidos || []).filter((item) => item.cuenta !== 'Efectivo'),
    [disponibles],
  )

  const liquidAccounts = useMemo(
    () => disponibles?.saldos_liquidos || [],
    [disponibles],
  )

  const hasTCCards = tcBalances.length > 0

  // TC currently selected in payment form
  const selectedTC = useMemo(
    () => tcBalances.find((tc) => String(tc.id) === String(tcPayForm.creditCardAccountId)),
    [tcBalances, tcPayForm.creditCardAccountId],
  )
  const isUsdTC = selectedTC?.tc_type === 'USD'

  // Credit cards available in catalogos
  const ccCatalog = useMemo(
    () => catalogos?.accounts?.credit_cards || [],
    [catalogos],
  )

  // ── Form update helpers ───────────────────────────────────────────────────

  function updateCreate(field, value) {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  function updatePay(field, value) {
    setPayForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'paymentMethod') {
        next.accountName = value === 'transfer' ? (transferAccounts[0]?.cuenta || '') : 'Efectivo'
      }
      return next
    })
  }

  function updateTCPay(field, value) {
    setTcPayForm((prev) => {
      const next = { ...prev, [field]: value }
      // Reset USD amount when TC changes
      if (field === 'creditCardAccountId') next.amountUsd = ''
      return next
    })
  }

  function updateInstallPlan(field, value) {
    setInstallPlanForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-calculate monthly amount when total/installments change
      if (field === 'totalAmount' || field === 'totalInstallments') {
        const total = Number(field === 'totalAmount' ? value : next.totalAmount)
        const count = Number(field === 'totalInstallments' ? value : next.totalInstallments)
        if (total > 0 && count > 0) {
          next.monthlyAmount = (total / count).toFixed(2)
        }
      }
      return next
    })
  }

  // ── Submissions ───────────────────────────────────────────────────────────

  function notify(msg) {
    setMessage(msg)
    setError('')
  }

  function notifyError(err) {
    setError(err.message || String(err))
    setMessage('')
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
      notify('Deuda creada correctamente.')
      setCreateForm({ ...initialCreateForm, dueDate: getGuatemalaDateString() })
      onRefreshData?.()
    } catch (err) {
      notifyError(err)
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
        account_name: payForm.paymentMethod === 'transfer' ? payForm.accountName : 'Efectivo',
        note: payForm.note || null,
      })
      notify('Pago registrado correctamente.')
      setPayForm({ ...initialPayForm, paymentDate: getGuatemalaDateString(), debtId: '', accountName: 'Efectivo' })
      onRefreshData?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setPaySaving(false)
    }
  }

  async function submitTCPay(e) {
    e.preventDefault()
    setTcPaySaving(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        credit_card_account_id: Number(tcPayForm.creditCardAccountId),
        amount: Number(tcPayForm.amount),
        payment_date: tcPayForm.paymentDate,
        account_name: tcPayForm.accountName,
        note: tcPayForm.note || null,
      }
      // Para TC USD: incluir monto en dólares pagados
      if (isUsdTC && tcPayForm.amountUsd) {
        payload.amount_usd = Number(tcPayForm.amountUsd)
      }
      await api.postTCPayment(payload)
      notify('Abono a tarjeta registrado correctamente.')
      setTcPayForm({ ...initialTCPayForm, paymentDate: getGuatemalaDateString() })
      onRefreshData?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setTcPaySaving(false)
    }
  }

  async function submitInstallPlan(e) {
    e.preventDefault()
    setInstallPlanSaving(true)
    setMessage('')
    setError('')
    try {
      await api.postInstallmentPlan({
        telegram_user_id: Number(userId),
        credit_card_account_id: Number(installPlanForm.creditCardAccountId),
        name: installPlanForm.name,
        total_amount: Number(installPlanForm.totalAmount),
        total_installments: Number(installPlanForm.totalInstallments),
        monthly_amount: Number(installPlanForm.monthlyAmount),
        purchase_date: installPlanForm.purchaseDate,
        first_charge_date: installPlanForm.firstChargeDate,
        note: installPlanForm.note || null,
      })
      notify('Plan de cuotas creado correctamente.')
      setInstallPlanForm({ ...initialInstallPlanForm, purchaseDate: getGuatemalaDateString(), firstChargeDate: getGuatemalaDateString() })
      onRefreshData?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setInstallPlanSaving(false)
    }
  }

  async function deletePlan(planId) {
    if (!window.confirm('¿Cancelar este plan de cuotas?')) return
    setMessage('')
    setError('')
    try {
      await api.deleteInstallmentPlan(planId)
      notify('Plan cancelado correctamente.')
      onRefreshData?.()
    } catch (err) {
      notifyError(err)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid-page two-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error   ? <MessageBanner kind="error">{error}</MessageBanner>   : null}

      {/* ── Nueva deuda ── */}
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
            <span>Frecuencia</span>
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

      {/* ── Pagar cuota ── */}
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
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </label>

            {payForm.paymentMethod === 'transfer' && (
              <label>
                <span>Cuenta</span>
                <select value={payForm.accountName} onChange={(e) => updatePay('accountName', e.target.value)} required>
                  {transferAccounts.map((item) => (
                    <option key={item.cuenta} value={item.cuenta}>{item.cuenta} · {q(item.saldo)}</option>
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
        ) : (
          <EmptyState text="No hay deudas activas para pagar." />
        )}
      </Panel>

      {/* ── Deudas activas ── */}
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
                      ? `Próximo: ${deuda.due_date}`
                      : `Fecha: ${deuda.due_date}`}
                  </span>
                  <span>{FREQ_LABELS[deuda.payment_frequency] ?? deuda.payment_frequency}</span>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No hay deudas activas." />
        )}
      </Panel>

      {/* ── Detalle de deudas ── */}
      <Panel title="Detalle de deudas" className="full-span">
        {deudasRows.filter((d) => d.status !== 'paid').length > 0 ? (
          <div className="list-stack">
            {deudasRows
              .filter((d) => d.status !== 'paid')
              .map((deuda) => (
                <div className="debt-card debt-detail" key={`detail-${deuda.id}`}>
                  <div>
                    <strong>{deuda.name}</strong>
                    <small>
                      {deuda.creditor}
                      {' · '}
                      {FREQ_LABELS[deuda.payment_frequency] ?? deuda.payment_frequency}
                      {` · Próximo: ${deuda.due_date}`}
                    </small>
                  </div>
                  <div className="debt-meta">
                    <span>Cuota: {q(deuda.installment_amount)}</span>
                    <span>Pagadas: {deuda.paid_installments}/{deuda.total_installments}</span>
                    <span>Pendientes: {deuda.pending_installments}</span>
                    <span>Saldo: {q(deuda.saldo_pendiente)}</span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState text="No hay deudas pendientes." />
        )}
      </Panel>

      {/* ── Tarjetas de Crédito ── */}
      {hasTCCards && (
        <>
          <Panel title="Tarjetas de crédito">
            <div className="list-stack">
              {tcBalances.map((tc) => (
                <div className="debt-card" key={tc.id}>
                  <div>
                    <strong>{tc.name}</strong>
                    <small>
                      {tc.tc_type === 'USD' ? 'TC en dólares' : tc.tc_type === 'MIXTO' ? 'TC Mixta Q/$' : 'TC en quetzales'}
                    </small>
                  </div>
                  <div className="debt-meta">
                    <span style={{ color: tc.balance > 0 ? 'var(--color-danger, #e53)' : 'inherit' }}>
                      Saldo: {formatBalance(tc)}
                      {tc.tc_type === 'USD' && ` (≈ ${q(tc.balance_gtq)})`}
                    </span>
                    {tc.visacuota_balance > 0 && (
                      <span>Visacuotas: {tc.tc_type === 'USD' ? usd(tc.visacuota_balance) : q(tc.visacuota_balance)}</span>
                    )}
                    {tc.credit_limit && (
                      <span>Límite: {tc.tc_type === 'USD' ? usd(tc.credit_limit) : q(tc.credit_limit)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* ── Abonar a tarjeta ── */}
          <Panel title="Abonar a tarjeta">
            <form className="form-grid" onSubmit={submitTCPay}>
              <label>
                <span>Tarjeta</span>
                <select
                  value={tcPayForm.creditCardAccountId}
                  onChange={(e) => updateTCPay('creditCardAccountId', e.target.value)}
                  required
                >
                  <option value="">Selecciona tarjeta</option>
                  {tcBalances.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} · {formatBalance(tc)}
                      {tc.tc_type === 'USD' ? ' (USD)' : tc.tc_type === 'MIXTO' ? ' (Mixta Q/$)' : ' (GTQ)'}
                    </option>
                  ))}
                </select>
              </label>

              {/* Indicador de tipo de TC seleccionada */}
              {selectedTC && (
                <div className="full-span helper-text" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span>
                    {selectedTC.tc_type === 'USD'
                      ? '💵 Tarjeta en dólares — el saldo se maneja en USD, el débito es en Q'
                      : selectedTC.tc_type === 'MIXTO'
                      ? '🔀 Tarjeta mixta Q/$ — el saldo total se lleva en Q'
                      : '🇬🇹 Tarjeta en quetzales'}
                  </span>
                  <strong>Saldo actual: {formatBalance(selectedTC)}</strong>
                  {selectedTC.tc_type === 'USD' && selectedTC.balance_gtq !== undefined && (
                    <span>(≈ {q(selectedTC.balance_gtq)})</span>
                  )}
                </div>
              )}

              {/* Para TC USD: mostrar monto en $ y monto en Q por separado */}
              {isUsdTC ? (
                <>
                  <label>
                    <span>Dólares pagados a la TC ($)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Ej. 150.00"
                      value={tcPayForm.amountUsd}
                      onChange={(e) => updateTCPay('amountUsd', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>Quetzales debitados de tu cuenta (Q)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Q exactos que saldrán de tu cuenta"
                      value={tcPayForm.amount}
                      onChange={(e) => updateTCPay('amount', e.target.value)}
                      required
                    />
                  </label>
                  <div className="full-span helper-text">
                    💡 Los $ reducen el saldo de la TC. Los Q se debitan de tu cuenta líquida.
                  </div>
                </>
              ) : (
                <label>
                  <span>Monto del abono (Q)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Ej. 500.00"
                    value={tcPayForm.amount}
                    onChange={(e) => updateTCPay('amount', e.target.value)}
                    required
                  />
                </label>
              )}

              <label>
                <span>Fecha</span>
                <input
                  type="date"
                  value={tcPayForm.paymentDate}
                  onChange={(e) => updateTCPay('paymentDate', e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Pagar desde</span>
                <select value={tcPayForm.accountName} onChange={(e) => updateTCPay('accountName', e.target.value)}>
                  {liquidAccounts.map((item) => (
                    <option key={item.cuenta} value={item.cuenta}>
                      {item.cuenta} · {q(item.saldo)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-span">
                <span>Nota</span>
                <input
                  value={tcPayForm.note}
                  onChange={(e) => updateTCPay('note', e.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <div className="full-span form-actions">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={
                    tcPaySaving || !userId ||
                    !tcPayForm.creditCardAccountId ||
                    !tcPayForm.amount ||
                    (isUsdTC && !tcPayForm.amountUsd)
                  }
                >
                  {tcPaySaving ? 'Guardando...' : 'Registrar abono'}
                </button>
              </div>
            </form>
          </Panel>

          {/* ── Visacuotas: planes activos ── */}
          <Panel title="Visacuotas" className="full-span">
            {installmentPlans.length > 0 ? (
              <div className="list-stack" style={{ marginBottom: 16 }}>
                {installmentPlans.map((plan) => (
                  <div className="debt-card" key={plan.id}>
                    <div>
                      <strong>{plan.name}</strong>
                      <small>
                        {plan.credit_card_name} ·{' '}
                        {plan.paid_installments}/{plan.total_installments} cuotas ·{' '}
                        {plan.status === 'completed' ? '✅ Completado' : plan.status === 'cancelled' ? '❌ Cancelado' : '🔄 Activo'}
                      </small>
                    </div>
                    <div className="debt-meta">
                      <span>Cuota: {q(plan.monthly_amount)}</span>
                      <span>Restante: {q(plan.remaining_amount)}</span>
                      {plan.next_charge_date && (
                        <span>Próximo cargo: {plan.next_charge_date}</span>
                      )}
                    </div>
                    {plan.status === 'active' && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="ghost-btn small"
                          type="button"
                          onClick={() => deletePlan(plan.id)}
                          style={{ color: 'var(--color-danger, #e53)' }}
                        >
                          Cancelar plan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="helper-text" style={{ marginBottom: 16 }}>Sin planes de cuotas registrados.</p>
            )}

            {/* Formulario crear nuevo plan */}
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 10 }}>
                + Nuevo plan de Visacuotas
              </summary>
              <form className="form-grid" onSubmit={submitInstallPlan} style={{ marginTop: 10 }}>
                <label>
                  <span>Tarjeta</span>
                  <select
                    value={installPlanForm.creditCardAccountId}
                    onChange={(e) => updateInstallPlan('creditCardAccountId', e.target.value)}
                    required
                  >
                    <option value="">Selecciona TC</option>
                    {ccCatalog.map((tc) => (
                      <option key={tc.id} value={tc.id}>{tc.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Nombre del plan</span>
                  <input
                    value={installPlanForm.name}
                    onChange={(e) => updateInstallPlan('name', e.target.value)}
                    placeholder="Ej. Laptop 12c"
                    required
                  />
                </label>

                <label>
                  <span>Monto total</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={installPlanForm.totalAmount}
                    onChange={(e) => updateInstallPlan('totalAmount', e.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Número de cuotas</span>
                  <input
                    type="number"
                    min="2"
                    step="1"
                    value={installPlanForm.totalInstallments}
                    onChange={(e) => updateInstallPlan('totalInstallments', e.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Cuota mensual</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={installPlanForm.monthlyAmount}
                    onChange={(e) => updateInstallPlan('monthlyAmount', e.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Fecha de compra</span>
                  <input
                    type="date"
                    value={installPlanForm.purchaseDate}
                    onChange={(e) => updateInstallPlan('purchaseDate', e.target.value)}
                    required
                  />
                </label>

                <label>
                  <span>Primer corte (fecha del primer cargo)</span>
                  <input
                    type="date"
                    value={installPlanForm.firstChargeDate}
                    onChange={(e) => updateInstallPlan('firstChargeDate', e.target.value)}
                    required
                  />
                </label>

                <label className="full-span">
                  <span>Nota</span>
                  <input
                    value={installPlanForm.note}
                    onChange={(e) => updateInstallPlan('note', e.target.value)}
                    placeholder="Opcional"
                  />
                </label>

                <div className="full-span form-actions">
                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={installPlanSaving || !userId || !installPlanForm.creditCardAccountId}
                  >
                    {installPlanSaving ? 'Guardando...' : 'Crear plan'}
                  </button>
                </div>
              </form>
            </details>
          </Panel>
        </>
      )}
    </div>
  )
}
