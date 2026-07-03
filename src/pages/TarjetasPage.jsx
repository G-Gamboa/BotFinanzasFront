import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'
import { getGuatemalaDateString } from '../utils/dates'

// ── Formatters ────────────────────────────────────────────────────────────────

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

function usd(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, danger = 85, warn = 60, label, sublabel }) {
  if (!max || max <= 0) return null
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= danger ? '#e53935' : pct >= warn ? '#fb8c00' : 'var(--color-primary, #4f8ef7)'
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.75 }}>
          <span>{label}</span>
          <span>{sublabel}</span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border, #e0e0e0)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const initialTCPayForm = {
  creditCardAccountId: '',
  amount: '',
  amountUsd: '',
  mixtoPayPortion: 'Q',
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

export default function TarjetasPage({
  userId,
  api,
  tcBalances = [],
  installmentPlans = [],
  catalogos,
  disponibles,
  onRefreshData,
}) {
  const [tcPayForm, setTcPayForm]         = useState(initialTCPayForm)
  const [installPlanForm, setInstallPlanForm] = useState(initialInstallPlanForm)

  const [tcPaySaving, setTcPaySaving]     = useState(false)
  const [installPlanSaving, setInstallPlanSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  // TC history
  const [tcHistory, setTcHistory]       = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────

  const liquidAccounts = useMemo(() => disponibles?.saldos_liquidos || [], [disponibles])
  const ccCatalog      = useMemo(() => catalogos?.accounts?.credit_cards || [], [catalogos])

  const selectedTC = useMemo(
    () => tcBalances.find((tc) => String(tc.id) === String(tcPayForm.creditCardAccountId)),
    [tcBalances, tcPayForm.creditCardAccountId],
  )
  const isUsdTC   = selectedTC?.tc_type === 'USD'
  const isMixtoTC = selectedTC?.tc_type === 'MIXTO'
  const needsUsdFields = isUsdTC || (isMixtoTC && tcPayForm.mixtoPayPortion === 'USD')

  const totalGTQ = useMemo(
    () => tcBalances.reduce((s, tc) => s + Math.max(0, tc.balance_gtq ?? 0), 0),
    [tcBalances],
  )
  const totalUSD = useMemo(
    () => tcBalances.reduce((s, tc) => s + Math.max(0, tc.balance_usd_portion ?? 0), 0),
    [tcBalances],
  )

  const totalCorteGTQ = useMemo(
    () => tcBalances.reduce((s, tc) => s + (tc.pending_to_pay_gtq ?? 0), 0),
    [tcBalances],
  )
  const totalCorteUSD = useMemo(
    () => tcBalances.reduce((s, tc) => s + (tc.pending_usd_portion ?? 0), 0),
    [tcBalances],
  )

  const activePlans = useMemo(
    () => installmentPlans.filter((p) => p.status === 'active'),
    [installmentPlans],
  )

  // ── TC history fetch ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return
    setHistoryLoading(true)
    api.getHistorial(userId, { limit: 50 })
      .then((res) => {
        const items = (res?.items || [])
          .filter((i) => i.payment_method === 'credit_card')
          .slice(0, 5)
        setTcHistory(items)
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [userId])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function notify(msg)  { setMessage(msg); setError('') }
  function notifyErr(e) { setError(e.message || String(e)); setMessage('') }

  function updateTCPay(field, value) {
    setTcPayForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'creditCardAccountId') {
        next.amountUsd = ''; next.amount = ''; next.mixtoPayPortion = 'Q'
      }
      if (field === 'mixtoPayPortion') {
        next.amountUsd = ''; next.amount = ''
      }
      return next
    })
  }

  function updateInstallPlan(field, value) {
    setInstallPlanForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'totalAmount' || field === 'totalInstallments') {
        const total = Number(field === 'totalAmount' ? value : next.totalAmount)
        const count = Number(field === 'totalInstallments' ? value : next.totalInstallments)
        if (total > 0 && count > 0) next.monthlyAmount = (total / count).toFixed(2)
      }
      return next
    })
  }

  // ── Submit: TC payment ────────────────────────────────────────────────────

  async function submitTCPay(e) {
    e.preventDefault()
    setTcPaySaving(true); setMessage(''); setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        credit_card_account_id: Number(tcPayForm.creditCardAccountId),
        amount: Number(tcPayForm.amount),
        payment_date: tcPayForm.paymentDate,
        account_name: tcPayForm.accountName,
        note: tcPayForm.note || null,
      }
      if (needsUsdFields && tcPayForm.amountUsd) {
        payload.amount_usd = Number(tcPayForm.amountUsd)
      }
      await api.postTCPayment(payload)
      notify('Abono registrado correctamente.')
      setTcPayForm({ ...initialTCPayForm, paymentDate: getGuatemalaDateString() })
      onRefreshData?.()
      // Refrescar historial local
      api.getHistorial(userId, { limit: 50 }).then((res) => {
        setTcHistory((res?.items || []).filter((i) => i.payment_method === 'credit_card').slice(0, 5))
      }).catch(() => {})
    } catch (err) {
      notifyErr(err)
    } finally {
      setTcPaySaving(false)
    }
  }

  // ── Submit: install plan ──────────────────────────────────────────────────

  async function submitInstallPlan(e) {
    e.preventDefault()
    setInstallPlanSaving(true); setMessage(''); setError('')
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
      notify('Plan de cuotas creado.')
      setInstallPlanForm({ ...initialInstallPlanForm, purchaseDate: getGuatemalaDateString(), firstChargeDate: getGuatemalaDateString() })
      onRefreshData?.()
    } catch (err) {
      notifyErr(err)
    } finally {
      setInstallPlanSaving(false)
    }
  }

  async function deletePlan(planId) {
    if (!window.confirm('¿Cancelar este plan de cuotas?')) return
    setMessage(''); setError('')
    try {
      await api.deleteInstallmentPlan(planId)
      notify('Plan cancelado.')
      onRefreshData?.()
    } catch (err) {
      notifyErr(err)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid-page single-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error   ? <MessageBanner kind="error">{error}</MessageBanner>   : null}

      {/* ── Resumen total ── */}
      <Panel title="Tarjetas de crédito">
        {/* Totales globales */}
        {(totalGTQ > 0 || totalUSD > 0) && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {totalGTQ > 0 && (
              <div className="stat-chip">
                <span>Total Q</span>
                <strong style={{ color: 'var(--color-danger, #e53935)' }}>{q(totalGTQ)}</strong>
              </div>
            )}
            {totalUSD > 0 && (
              <div className="stat-chip">
                <span>Total $</span>
                <strong style={{ color: 'var(--color-danger, #e53935)' }}>{usd(totalUSD)}</strong>
              </div>
            )}
            {totalCorteGTQ > 0 && (
              <div className="stat-chip">
                <span>Corte Q</span>
                <strong style={{ color: 'var(--color-danger, #e53935)' }}>{q(totalCorteGTQ)}</strong>
              </div>
            )}
            {totalCorteUSD > 0 && (
              <div className="stat-chip">
                <span>Corte $</span>
                <strong style={{ color: 'var(--color-danger, #e53935)' }}>{usd(totalCorteUSD)}</strong>
              </div>
            )}
          </div>
        )}

        {/* Una card por tarjeta */}
        <div className="list-stack">
          {tcBalances.map((tc) => {
            const rate  = tc.tc_exchange_rate ?? 8
            const isUSD = tc.tc_type === 'USD'
            const isMX  = tc.tc_type === 'MIXTO'

            // Valores nativos para barra general
            const nativeBalance = isUSD ? (tc.balance_usd_portion ?? tc.balance) : tc.balance_gtq
            const nativeLimit   = tc.credit_limit ?? null

            // Visacuotas barra — usar restante de planes activos (cuotas futuras)
            const vcBalance = tc.visacuota_remaining ?? tc.visacuota_balance ?? 0
            const vcLimit   = tc.visacuotas_limit  ?? null

            // Disponible general (en moneda nativa de la TC)
            const availGeneral = nativeLimit != null
              ? Math.max(0, nativeLimit - nativeBalance)
              : null

            // Disponible Visacuotas
            const availVC = vcLimit != null
              ? Math.max(0, vcLimit - vcBalance)
              : null

            return (
              <div key={tc.id} className="tc-card">
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <strong>💳 {tc.name}</strong>
                  <span className="tc-type-badge">
                    {isUSD ? 'USD' : isMX ? 'Mixta Q/$' : 'GTQ'}
                  </span>
                </div>

                {/* Saldos */}
                <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                  {isMX ? (
                    /* MIXTO: mostrar Q y $ por separado */
                    <>
                      {(tc.balance_gtq_portion ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ opacity: 0.7 }}>Saldo Q</span>
                          <strong style={{ color: 'var(--color-danger, #e53935)' }}>{q(tc.balance_gtq_portion)}</strong>
                        </div>
                      )}
                      {(tc.balance_usd_portion ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ opacity: 0.7 }}>Saldo $</span>
                          <span>
                            <strong style={{ color: 'var(--color-danger, #e53935)' }}>{usd(tc.balance_usd_portion)}</strong>
                            <span style={{ opacity: 0.5, fontSize: '0.78rem' }}> ≈{q((tc.balance_usd_portion ?? 0) * rate)}</span>
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', opacity: 0.7 }}>
                        <span>Total Q estimado</span>
                        <span>{q(tc.balance_gtq)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ opacity: 0.7 }}>Saldo</span>
                      <span>
                        <strong style={{ color: tc.balance > 0 ? 'var(--color-danger, #e53935)' : 'inherit' }}>
                          {isUSD ? usd(tc.balance) : q(tc.balance)}
                        </strong>
                        {isUSD && (
                          <span style={{ opacity: 0.5, fontSize: '0.78rem' }}> ≈{q(tc.balance_gtq)}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Desglose préstamos TC — solo visible si hay saldo de préstamos */}
                {(tc.balance_loans_gtq ?? 0) > 0 && (
                  <div style={{
                    marginTop: 8, padding: '8px 10px', borderRadius: 10,
                    background: 'color-mix(in srgb, var(--color-primary, #4f8ef7) 8%, var(--card-soft))',
                    border: '1px solid color-mix(in srgb, var(--color-primary, #4f8ef7) 20%, transparent)',
                    display: 'grid', gap: 4,
                  }}>
                    <div style={{ fontSize: '0.72rem', opacity: 0.6, marginBottom: 2 }}>
                      Desglose del saldo
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span>Tus gastos</span>
                      <strong style={{ color: 'var(--color-danger, #e53935)' }}>{q(tc.balance_own_gtq ?? 0)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span style={{ opacity: 0.8 }}>Préstamos TC pendientes</span>
                      <span style={{ color: 'var(--color-warning, #f59e0b)', fontWeight: 600 }}>{q(tc.balance_loans_gtq ?? 0)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: 2 }}>
                      Los préstamos pendientes se abonarán cuando los cobres desde la sección Préstamos.
                    </div>
                  </div>
                )}

                {/* Saldo a corte */}
                {tc.billing_close_day && (
                  <div style={{
                    display: 'grid', gap: 3, marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-soft, rgba(128,128,128,.2))',
                  }}>
                    {tc.last_close_date && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.45 }}>
                        Último corte {fmtDate(tc.last_close_date)}
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ opacity: 0.7 }}>Saldo a corte</span>
                      <strong style={{ color: tc.pending_to_pay_gtq > 0 ? 'var(--color-danger, #e53935)' : 'var(--color-success, #43a047)' }}>
                        {q(tc.pending_to_pay_gtq)}
                      </strong>
                    </div>
                    {tc.pending_usd_portion != null && tc.pending_usd_portion > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ opacity: 0.6 }}>Porción $ a corte</span>
                        <span style={{ color: 'var(--color-danger, #e53935)' }}>{usd(tc.pending_usd_portion)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Disponible */}
                {(availGeneral != null || availVC != null) && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {availGeneral != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: '0.68rem', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Disponible
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: availGeneral > 0 ? 'var(--color-success, #43a047)' : 'var(--color-danger, #e53935)' }}>
                          {isUSD ? usd(availGeneral) : q(availGeneral)}
                        </strong>
                      </div>
                    )}
                    {availVC != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: '0.68rem', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Disp. Visacuotas
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: availVC > 0 ? 'var(--color-success, #43a047)' : 'var(--color-danger, #e53935)' }}>
                          {isUSD ? usd(availVC) : q(availVC)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Barras de uso */}
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  <ProgressBar
                    value={nativeBalance}
                    max={nativeLimit}
                    label="Gastado / Límite"
                    sublabel={nativeLimit
                      ? `${isUSD ? usd(nativeBalance) : q(nativeBalance)} / ${isUSD ? usd(nativeLimit) : q(nativeLimit)}`
                      : null}
                  />
                  {vcBalance > 0 && (
                    <ProgressBar
                      value={vcBalance}
                      max={vcLimit}
                      label="Restante visacuotas / Límite VC"
                      sublabel={vcLimit
                        ? `${isUSD ? usd(vcBalance) : q(vcBalance)} / ${isUSD ? usd(vcLimit) : q(vcLimit)}`
                        : `Restante: ${isUSD ? usd(vcBalance) : q(vcBalance)}`}
                    />
                  )}
                </div>

                {/* Fechas */}
                {(tc.billing_close_day || tc.payment_due_day) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.78rem', opacity: 0.65 }}>
                    {tc.billing_close_day && <span>✂️ Corte día {tc.billing_close_day}</span>}
                    {tc.payment_due_day   && <span>📅 Pago día {tc.payment_due_day}</span>}
                  </div>
                )}
              </div>
            )
          })}
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
                  {tc.name}
                  {tc.tc_type === 'USD' ? ' — USD' : tc.tc_type === 'MIXTO' ? ' — Mixta' : ' — GTQ'}
                </option>
              ))}
            </select>
          </label>

          {/* Info de saldo según TC */}
          {selectedTC && (
            <div className="full-span" style={{ fontSize: '0.82rem', display: 'grid', gap: 3 }}>
              {selectedTC.tc_type === 'GTQ' && (
                <span style={{ opacity: 0.7 }}>Saldo: <strong>{q(selectedTC.balance)}</strong></span>
              )}
              {selectedTC.tc_type === 'USD' && (
                <span style={{ opacity: 0.7 }}>
                  Saldo: <strong>{usd(selectedTC.balance)}</strong>
                  <span style={{ opacity: 0.6 }}> ≈ {q(selectedTC.balance_gtq)}</span>
                </span>
              )}
              {selectedTC.tc_type === 'MIXTO' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ opacity: 0.7 }}>Q: <strong>{q(selectedTC.balance_gtq_portion ?? 0)}</strong></span>
                  <span style={{ opacity: 0.7 }}>$: <strong>{usd(selectedTC.balance_usd_portion ?? 0)}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Selector porción MIXTO */}
          {isMixtoTC && (
            <div className="full-span" style={{ display: 'flex', gap: 16 }}>
              {['Q', 'USD'].map((p) => (
                <label key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, fontWeight: tcPayForm.mixtoPayPortion === p ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="mixtoPayPortion"
                    value={p}
                    checked={tcPayForm.mixtoPayPortion === p}
                    onChange={() => updateTCPay('mixtoPayPortion', p)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  {p === 'Q' ? 'Pagar en Q' : 'Pagar en $'}
                </label>
              ))}
            </div>
          )}

          {/* Campos de monto */}
          {needsUsdFields ? (
            <>
              <label>
                <span>Dólares pagados a TC ($)</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="Ej. 150.00"
                  value={tcPayForm.amountUsd}
                  onChange={(e) => updateTCPay('amountUsd', e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Q debitados de tu cuenta</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="Q exactos"
                  value={tcPayForm.amount}
                  onChange={(e) => updateTCPay('amount', e.target.value)}
                  required
                />
              </label>
              {selectedTC?.tc_exchange_rate && tcPayForm.amountUsd && (
                <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                  Ref. Q {(Number(tcPayForm.amountUsd) * Number(selectedTC.tc_exchange_rate)).toFixed(2)}
                </small>
              )}
            </>
          ) : (
            <label>
              <span>{isMixtoTC ? 'Monto abono en Q' : 'Monto del abono (Q)'}</span>
              <input
                type="number" min="0.01" step="0.01" placeholder="Ej. 500.00"
                value={tcPayForm.amount}
                onChange={(e) => updateTCPay('amount', e.target.value)}
                required
              />
            </label>
          )}

          <label>
            <span>Fecha</span>
            <input
              type="date" value={tcPayForm.paymentDate}
              onChange={(e) => updateTCPay('paymentDate', e.target.value)} required
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
              className="primary-btn" type="submit"
              disabled={tcPaySaving || !userId || !tcPayForm.creditCardAccountId || !tcPayForm.amount || (needsUsdFields && !tcPayForm.amountUsd)}
            >
              {tcPaySaving ? 'Guardando...' : 'Registrar abono'}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Visacuotas ── */}
      <Panel title="Visacuotas">
        {/* Lista de planes activos */}
        {activePlans.length > 0 ? (
          <div className="list-stack" style={{ marginBottom: 16 }}>
            {activePlans.map((plan) => {
              const pct = plan.total_installments > 0
                ? Math.round((plan.paid_installments / plan.total_installments) * 100)
                : 0
              return (
                <div key={plan.id} className="tc-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '0.93rem' }}>{plan.name}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.65 }}>{plan.credit_card_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', marginTop: 4, flexWrap: 'wrap', opacity: 0.8 }}>
                    <span>Cuota {q(plan.monthly_amount)}</span>
                    <span>{plan.paid_installments}/{plan.total_installments}</span>
                    {plan.next_charge_date && <span>Próx. {fmtDate(plan.next_charge_date)}</span>}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar value={plan.paid_installments} max={plan.total_installments} danger={95} warn={70} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.8rem' }}>
                    <span style={{ opacity: 0.65 }}>Restante: {q(plan.remaining_amount)}</span>
                    <button
                      className="ghost-btn small"
                      type="button"
                      style={{ color: 'var(--color-danger, #e53935)', padding: '2px 8px', fontSize: '0.78rem' }}
                      onClick={() => deletePlan(plan.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: 14 }}>Sin planes activos.</p>
        )}

        {/* Crear nuevo plan */}
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: '6px 0' }}>
            + Nuevo plan de Visacuotas
          </summary>
          <form className="form-grid" onSubmit={submitInstallPlan} style={{ marginTop: 12 }}>
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
              <span>Nombre</span>
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
                type="number" min="0.01" step="0.01"
                value={installPlanForm.totalAmount}
                onChange={(e) => updateInstallPlan('totalAmount', e.target.value)}
                required
              />
            </label>

            <label>
              <span>N.º cuotas</span>
              <input
                type="number" min="2" step="1"
                value={installPlanForm.totalInstallments}
                onChange={(e) => updateInstallPlan('totalInstallments', e.target.value)}
                required
              />
            </label>

            <label>
              <span>Cuota mensual</span>
              <input
                type="number" min="0.01" step="0.01"
                value={installPlanForm.monthlyAmount}
                onChange={(e) => updateInstallPlan('monthlyAmount', e.target.value)}
                required
              />
            </label>

            <label>
              <span>Fecha compra</span>
              <input
                type="date"
                value={installPlanForm.purchaseDate}
                onChange={(e) => updateInstallPlan('purchaseDate', e.target.value)}
                required
              />
            </label>

            <label>
              <span>Primer corte</span>
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
                className="primary-btn" type="submit"
                disabled={installPlanSaving || !userId || !installPlanForm.creditCardAccountId}
              >
                {installPlanSaving ? 'Guardando...' : 'Crear plan'}
              </button>
            </div>
          </form>
        </details>
      </Panel>

      {/* ── Últimos movimientos TC ── */}
      <Panel title="Últimos cargos en TC">
        {historyLoading ? (
          <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Cargando...</p>
        ) : tcHistory.length === 0 ? (
          <EmptyState text="Sin cargos recientes en tarjeta." />
        ) : (
          <div className="list-stack">
            {tcHistory.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.82rem', opacity: 0.6 }}>
                    {fmtDate(item.date || item.movement_date)}
                    {item.credit_card_account_name ? ` · ${item.credit_card_account_name}` : ''}
                  </span>
                  <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.note || item.category || '—'}
                  </span>
                </div>
                <strong style={{ fontSize: '0.93rem', color: 'var(--color-danger, #e53935)', whiteSpace: 'nowrap' }}>
                  {q(item.amount)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
