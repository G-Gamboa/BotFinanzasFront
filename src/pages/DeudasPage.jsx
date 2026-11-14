import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'
import Sheet from '../components/Sheet'
import Icon from '../components/Icons'
import { getGuatemalaDateString } from '../utils/dates'
import { fmtDate, q } from '../lib/format'

const FREQ_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  none: 'Sin fecha fija',
}

export default function DeudasPage({
  userId, api, catalogos, disponibles, deudas, prestamos, canUsePrestamos, onRefreshData,
}) {
  const [section, setSection] = useState('debo')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function notify(text) { setMessage(text); setError(''); onRefreshData?.() }
  function fail(err) { setError(err.message || String(err)); setMessage('') }

  const liquidAccounts = useMemo(() => {
    const balances = {}
    ;(disponibles?.saldos_liquidos || []).forEach((s) => { balances[s.cuenta] = Number(s.saldo || 0) })
    return (catalogos?.accounts?.liquid || []).map((a) => ({ name: a.name, balance: balances[a.name] ?? 0 }))
  }, [catalogos, disponibles])

  return (
    <div className="grid-page single-col">
      {canUsePrestamos ? (
        <div className="segmented-tabs" role="tablist" style={{ justifySelf: 'start' }}>
          <button type="button" role="tab" aria-selected={section === 'debo'}
            className={`segmented-tab${section === 'debo' ? ' active' : ''}`} onClick={() => setSection('debo')}>
            Lo que debo
          </button>
          <button type="button" role="tab" aria-selected={section === 'me-deben'}
            className={`segmented-tab${section === 'me-deben' ? ' active' : ''}`} onClick={() => setSection('me-deben')}>
            Lo que me deben
          </button>
        </div>
      ) : null}

      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      {section === 'debo' || !canUsePrestamos ? (
        <DebtsSection userId={userId} api={api} deudas={deudas} liquidAccounts={liquidAccounts} onDone={notify} onError={fail} />
      ) : (
        <LoansSection userId={userId} api={api} catalogos={catalogos} prestamos={prestamos}
          liquidAccounts={liquidAccounts} onDone={notify} onError={fail} />
      )}
    </div>
  )
}

// ── Lo que debo ──────────────────────────────────────────────────────────────

const emptyDebt = () => ({
  name: '', creditor: '', dueDate: getGuatemalaDateString(), installmentAmount: '',
  totalInstallments: '', paidInstallments: '0', paymentFrequency: 'monthly',
})

function DebtsSection({ userId, api, deudas, liquidAccounts, onDone, onError }) {
  const [paying, setPaying] = useState(null)
  const [form, setForm] = useState(emptyDebt)
  const [saving, setSaving] = useState(false)
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const active = useMemo(
    () => (deudas?.items || []).filter(
      (d) => String(d.status || '').toLowerCase() === 'active' && Number(d.pending_installments || 0) > 0
    ),
    [deudas]
  )
  const total = active.reduce((s, d) => s + Number(d.saldo_pendiente || 0), 0)

  async function create(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.postDeuda({
        telegram_user_id: Number(userId),
        name: form.name,
        creditor: form.creditor,
        due_date: form.dueDate,
        installment_amount: Number(form.installmentAmount),
        total_installments: Number(form.totalInstallments),
        paid_installments: Number(form.paidInstallments || 0),
        payment_frequency: form.paymentFrequency,
      })
      setForm(emptyDebt())
      onDone('Deuda creada correctamente.')
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Panel title="Deudas activas" actions={active.length ? <strong>{q(total)}</strong> : null}>
        {active.length === 0 ? (
          <EmptyState text="No hay deudas activas." />
        ) : (
          <div className="list-stack">
            {active.map((d) => {
              const pct = d.total_installments > 0 ? (d.paid_installments / d.total_installments) * 100 : 0
              return (
                <div className="item-card" key={d.id}>
                  <div className="item-head">
                    <strong>{d.name}</strong>
                    <strong>{q(d.saldo_pendiente)}</strong>
                  </div>
                  <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                  <div className="item-meta">
                    <span>{d.creditor}</span>
                    <span>{d.paid_installments} de {d.total_installments} cuotas</span>
                    <span>Cuota {q(d.installment_amount)}</span>
                    <span>{FREQ_LABELS[d.payment_frequency] ?? d.payment_frequency}</span>
                    <span>Próximo pago {fmtDate(d.due_date)}</span>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="confirm-btn" onClick={() => setPaying(d)}>Pagar cuota</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <section className="panel">
        <details>
          <summary className="details-summary"><Icon name="plus" /> Nueva deuda</summary>
          <form className="form-grid" onSubmit={create} style={{ marginTop: 14 }}>
            <label>
              <span>Nombre</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </label>
            <label>
              <span>Acreedor</span>
              <input value={form.creditor} onChange={(e) => set('creditor', e.target.value)} required />
            </label>
            <label>
              <span>Próximo pago</span>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} required />
            </label>
            <label>
              <span>Frecuencia</span>
              <select value={form.paymentFrequency} onChange={(e) => set('paymentFrequency', e.target.value)}>
                <option value="monthly">Mensual</option>
                <option value="biweekly">Quincenal</option>
                <option value="weekly">Semanal</option>
                <option value="none">Sin fecha fija</option>
              </select>
            </label>
            <label>
              <span>Cuota</span>
              <input type="number" min="0.01" step="0.01" value={form.installmentAmount} onChange={(e) => set('installmentAmount', e.target.value)} required />
            </label>
            <label>
              <span>Total de cuotas</span>
              <input type="number" min="1" step="1" value={form.totalInstallments} onChange={(e) => set('totalInstallments', e.target.value)} required />
            </label>
            <label>
              <span>Cuotas ya pagadas</span>
              <input type="number" min="0" step="1" value={form.paidInstallments} onChange={(e) => set('paidInstallments', e.target.value)} required />
            </label>
            <div className="full-span form-actions">
              <button className="primary-btn" type="submit" disabled={saving || !userId}>
                {saving ? 'Guardando...' : 'Crear deuda'}
              </button>
            </div>
          </form>
        </details>
      </section>

      {paying ? (
        <PayDebtSheet debt={paying} userId={userId} api={api} liquidAccounts={liquidAccounts}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); onDone('Pago registrado correctamente.') }} />
      ) : null}
    </>
  )
}

function PayDebtSheet({ debt, userId, api, liquidAccounts, onClose, onDone }) {
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const [form, setForm] = useState({
    date: getGuatemalaDateString(),
    method: bankAccounts.length ? 'transfer' : 'cash',
    account: bankAccounts[0]?.name || '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const source = form.method === 'transfer' ? form.account : 'Efectivo'

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.postPagarDeuda({
        telegram_user_id: Number(userId),
        debt_id: Number(debt.id),
        payment_date: form.date,
        payment_method: form.method,
        account_name: source,
        note: form.note || null,
      })
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el pago.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Pagar cuota" subtitle={`${debt.name} · ${q(debt.installment_amount)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Fecha de pago</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label>
          <span>Sale por</span>
          <select value={form.method} onChange={(e) => set('method', e.target.value)}>
            <option value="cash">Efectivo</option>
            {bankAccounts.length ? <option value="transfer">Transferencia</option> : null}
          </select>
        </label>
        {form.method === 'transfer' ? (
          <label className="full-span">
            <span>Cuenta</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
              {bankAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        ) : null}
        <small className="full-span helper-text">
          Disponible en {source}: {q(liquidAccounts.find((a) => a.name === source)?.balance ?? 0)}
        </small>
        <label className="full-span">
          <span>Nota</span>
          <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Opcional" />
        </label>
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

// ── Lo que me deben ──────────────────────────────────────────────────────────

function LoansSection({ userId, api, catalogos, prestamos, liquidAccounts, onDone, onError }) {
  const people = useMemo(() => (catalogos?.loan_people || []).map((p) => p.name), [catalogos])
  const creditCards = useMemo(() => catalogos?.accounts?.credit_cards || [], [catalogos])
  const items = prestamos?.items || []
  const total = items.reduce((s, p) => s + Number(p.total_balance || 0), 0)

  const emptyLoan = () => ({
    date: getGuatemalaDateString(), source: 'account', account: liquidAccounts[0]?.name || '',
    cardId: String(creditCards[0]?.id || ''), person: people[0] || '', amount: '', note: '',
  })
  const [collecting, setCollecting] = useState(null)
  const [form, setForm] = useState(emptyLoan)
  const [saving, setSaving] = useState(false)
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function lend(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fromCard = form.source === 'card'
      const payload = {
        telegram_user_id: Number(userId),
        movement_type: 'MOV',
        movement_date: form.date,
        mov_subtype: 'PRESTAMO',
        mov_direction: fromCard ? 'DAR_TC' : 'DAR',
        loan_person_name: form.person || people[0],
        amount: Number(form.amount),
        note: form.note.trim() || null,
      }
      if (fromCard) payload.credit_card_account_id = Number(form.cardId || creditCards[0]?.id)
      else payload.source_account_name = form.account || liquidAccounts[0]?.name
      await api.postMovimiento(payload)
      setForm(emptyLoan())
      onDone(fromCard ? 'Préstamo desde tarjeta registrado.' : 'Préstamo registrado.')
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  const sourceAccount = liquidAccounts.find((a) => a.name === (form.account || liquidAccounts[0]?.name))

  return (
    <>
      <Panel title="Te deben" actions={items.length ? <strong>{q(total)}</strong> : null}>
        {items.length === 0 ? (
          <EmptyState text="No hay préstamos pendientes de cobro." />
        ) : (
          <div className="list-stack">
            {items.map((person) => (
              <div className="item-card" key={person.person}>
                <div className="item-head">
                  <strong>{person.person}</strong>
                  <strong>{q(person.total_balance)}</strong>
                </div>
                {(person.concepts || []).map((c) => (
                  <div className="row-line" key={c.concept}>
                    <span>
                      {c.concept}
                      {c.is_tc_loan ? <span className="tc-badge" title={c.tc_account_name || 'Tarjeta'}>TC</span> : null}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <strong>{q(c.balance)}</strong>
                      <button type="button" className="confirm-btn" onClick={() => setCollecting({ person: person.person, ...c })}>
                        Cobrar
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <section className="panel">
        <details>
          <summary className="details-summary"><Icon name="plus" /> Dar un préstamo</summary>
          {people.length === 0 ? (
            <p className="helper-text" style={{ marginTop: 12 }}>
              Primero agrega a la persona en Configuración, en Personas de préstamos.
            </p>
          ) : (
            <form className="form-grid" onSubmit={lend} style={{ marginTop: 14 }}>
              <label>
                <span>Persona</span>
                <select value={form.person || people[0]} onChange={(e) => set('person', e.target.value)}>
                  {people.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label>
                <span>Fecha</span>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </label>
              <label>
                <span>Sale de</span>
                <select value={form.source} onChange={(e) => set('source', e.target.value)}>
                  <option value="account">Efectivo o banco</option>
                  {creditCards.length > 0 ? <option value="card">Tarjeta de crédito</option> : null}
                </select>
              </label>
              {form.source === 'card' ? (
                <label>
                  <span>Tarjeta</span>
                  <select value={form.cardId || creditCards[0]?.id} onChange={(e) => set('cardId', e.target.value)}>
                    {creditCards.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                  </select>
                </label>
              ) : (
                <label>
                  <span>Cuenta</span>
                  <select value={form.account || liquidAccounts[0]?.name} onChange={(e) => set('account', e.target.value)}>
                    {liquidAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span>Monto</span>
                <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
              </label>
              <label>
                <span>Concepto</span>
                <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Vacío se guarda como General" />
              </label>
              <small className="full-span helper-text">
                {form.source === 'card'
                  ? 'El cargo queda en la tarjeta y la persona te debe el monto.'
                  : `Disponible en ${sourceAccount?.name || 'la cuenta'}: ${q(sourceAccount?.balance ?? 0)}`}
              </small>
              <div className="full-span form-actions">
                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar préstamo'}
                </button>
              </div>
            </form>
          )}
        </details>
      </section>

      {collecting ? (
        <CollectSheet loan={collecting} userId={userId} api={api} liquidAccounts={liquidAccounts}
          onClose={() => setCollecting(null)}
          onDone={() => { setCollecting(null); onDone('Cobro registrado correctamente.') }} />
      ) : null}
    </>
  )
}

function CollectSheet({ loan, userId, api, liquidAccounts, onClose, onDone }) {
  const [form, setForm] = useState({
    date: getGuatemalaDateString(),
    amount: Number(loan.balance).toFixed(2),
    account: liquidAccounts[0]?.name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        movement_type: 'MOV',
        movement_date: form.date,
        mov_subtype: 'PRESTAMO',
        mov_direction: 'COBRAR',
        loan_person_name: loan.person,
        amount: Number(form.amount),
        note: loan.concept === 'General' ? null : loan.concept,
      }
      if (!loan.is_tc_loan) payload.target_account_name = form.account
      await api.postMovimiento(payload)
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el cobro.')
      setSaving(false)
    }
  }

  return (
    <Sheet title={`Cobrar a ${loan.person}`} subtitle={`${loan.concept} · pendiente ${q(loan.balance)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Monto</span>
          <input type="number" min="0.01" step="0.01" max={loan.balance} value={form.amount}
            onChange={(e) => set('amount', e.target.value)} required />
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        {loan.is_tc_loan ? (
          <small className="full-span helper-text">
            El cobro se abona directo a {loan.tc_account_name || 'la tarjeta'}.
          </small>
        ) : (
          <label className="full-span">
            <span>Entra a</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
              {liquidAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        )}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar cobro'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
