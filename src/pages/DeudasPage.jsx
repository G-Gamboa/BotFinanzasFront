import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'
import Sheet from '../components/Sheet'
import Icon from '../components/Icons'
import PaySourceFields, { SourceOptions, initialSource, quetzalCards, sourcePayload } from '../components/PaySource'
import { getGuatemalaDateString } from '../utils/dates'
import { fmtDate, q } from '../lib/format'

const FREQ_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  none: 'Sin fecha fija',
}

const COLLECT_FREQ = {
  weekly: 'cada semana',
  biweekly: 'cada 2 semanas',
  monthly: 'cada mes',
}

export default function DeudasPage({
  userId, api, catalogos, disponibles, deudas, cobros, canUsePrestamos, onRefreshData,
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
  const cards = useMemo(() => quetzalCards(catalogos?.accounts?.credit_cards), [catalogos])

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
        <DebtsSection userId={userId} api={api} deudas={deudas} liquidAccounts={liquidAccounts} cards={cards} onDone={notify} onError={fail} />
      ) : (
        <LoansSection userId={userId} api={api} catalogos={catalogos} cobros={cobros}
          liquidAccounts={liquidAccounts} onDone={notify} onError={fail} />
      )}
    </div>
  )
}

// ── Lo que debo ──────────────────────────────────────────────────────────────

const emptyDebt = () => ({
  name: '', creditor: '', dueDate: getGuatemalaDateString(), installmentAmount: '',
  totalInstallments: '', paidInstallments: '0', paymentFrequency: 'monthly', paymentAccount: '',
})

function DebtsSection({ userId, api, deudas, liquidAccounts, cards, onDone, onError }) {
  const [paying, setPaying] = useState(null)
  const [editingDebt, setEditingDebt] = useState(null)
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
        due_date: form.dueDate || null,
        installment_amount: Number(form.installmentAmount),
        total_installments: Number(form.totalInstallments),
        paid_installments: Number(form.paidInstallments || 0),
        payment_frequency: form.paymentFrequency,
        payment_account_name: form.paymentAccount || null,
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
                    <span>{d.due_date ? `Próximo pago ${fmtDate(d.due_date)}` : 'Sin fecha de pago'}</span>
                    <span>{d.payment_account ? `Se paga desde ${d.payment_account}` : 'Sin cuenta de pago'}</span>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="link-btn" onClick={() => setEditingDebt(d)}>Editar</button>
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
            <DueFields form={form} setForm={setForm} />
            <label>
              <span>Cuota</span>
              <input type="number" min="0.01" step="0.01" value={form.installmentAmount} onChange={(e) => set('installmentAmount', e.target.value)} required />
            </label>
            <label>
              <span>Total de cuotas</span>
              <input type="number" min="1" step="1" value={form.totalInstallments} onChange={(e) => set('totalInstallments', e.target.value)} required />
            </label>
            <label>
              <span>Se paga desde</span>
              <select value={form.paymentAccount} onChange={(e) => set('paymentAccount', e.target.value)}>
                <SourceOptions liquidAccounts={liquidAccounts} cards={cards} />
              </select>
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

      {editingDebt ? (
        <EditDebtSheet debt={editingDebt} api={api} liquidAccounts={liquidAccounts} cards={cards}
          onClose={() => setEditingDebt(null)}
          onDone={() => { setEditingDebt(null); onDone('Deuda actualizada. El calendario ya usa estos datos.') }} />
      ) : null}

      {paying ? (
        <PayDebtSheet debt={paying} userId={userId} api={api} liquidAccounts={liquidAccounts} cards={cards}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); onDone('Pago registrado correctamente.') }} />
      ) : null}
    </>
  )
}

// Fecha y frecuencia de una deuda: "Sin fecha fija" deja la fecha vacía por defecto
function DueFields({ form, setForm }) {
  const undated = form.paymentFrequency === 'none'
  function changeFrequency(value) {
    setForm((prev) => ({
      ...prev,
      paymentFrequency: value,
      dueDate: value === 'none' ? '' : (prev.dueDate || getGuatemalaDateString()),
    }))
  }
  return (
    <>
      <label>
        <span>Frecuencia</span>
        <select value={form.paymentFrequency} onChange={(e) => changeFrequency(e.target.value)}>
          <option value="monthly">Mensual</option>
          <option value="biweekly">Quincenal</option>
          <option value="weekly">Semanal</option>
          <option value="none">Sin fecha fija</option>
        </select>
      </label>
      <label>
        <span>{undated ? 'Fecha de pago (opcional)' : 'Próximo pago'}</span>
        <input type="date" value={form.dueDate}
          onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          required={!undated} />
      </label>
      {undated ? (
        <small className="full-span helper-text">
          Sin fecha, la deuda aparece en el calendario bajo "Sin fecha" y no se descuenta de tu saldo esperado.
        </small>
      ) : null}
    </>
  )
}

function EditDebtSheet({ debt, api, liquidAccounts, cards, onClose, onDone }) {
  const [form, setForm] = useState({
    name: debt.name,
    creditor: debt.creditor,
    dueDate: debt.due_date || '',
    installmentAmount: String(debt.installment_amount),
    totalInstallments: String(debt.total_installments),
    paymentFrequency: debt.payment_frequency || 'monthly',
    paymentAccount: debt.payment_account || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.patchDeuda(debt.id, {
        name: form.name,
        creditor: form.creditor,
        due_date: form.dueDate || null,
        installment_amount: Number(form.installmentAmount),
        total_installments: Number(form.totalInstallments),
        payment_frequency: form.paymentFrequency,
        payment_account_name: form.paymentAccount || null,
      })
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la deuda.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Editar deuda" subtitle={`${debt.paid_installments} de ${debt.total_installments} cuotas pagadas`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Nombre</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label>
          <span>Acreedor</span>
          <input value={form.creditor} onChange={(e) => set('creditor', e.target.value)} required />
        </label>
        <DueFields form={form} setForm={setForm} />
        <label>
          <span>Cuota</span>
          <input type="number" min="0.01" step="0.01" value={form.installmentAmount} onChange={(e) => set('installmentAmount', e.target.value)} required />
        </label>
        <label>
          <span>Total de cuotas</span>
          <input type="number" min="1" step="1" value={form.totalInstallments} onChange={(e) => set('totalInstallments', e.target.value)} required />
        </label>
        <label className="full-span">
          <span>Se paga desde</span>
          <select value={form.paymentAccount} onChange={(e) => set('paymentAccount', e.target.value)}>
            <SourceOptions liquidAccounts={liquidAccounts} cards={cards} />
          </select>
        </label>
        <small className="full-span helper-text">
          {cards.some((c) => c.name === form.paymentAccount)
            ? 'El calendario muestra cada cuota en su fecha para cargarla a la tarjeta; no se descuenta de tu efectivo.'
            : 'El calendario muestra cada cuota en su fecha con esta cuenta ya elegida, y la descuenta de tu saldo esperado.'}
        </small>
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function PayDebtSheet({ debt, userId, api, liquidAccounts, cards, onClose, onDone }) {
  const [form, setForm] = useState({
    date: getGuatemalaDateString(),
    ...initialSource(debt.payment_account, liquidAccounts, cards),
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.postPagarDeuda({
        telegram_user_id: Number(userId),
        debt_id: Number(debt.id),
        payment_date: form.date,
        ...sourcePayload(form),
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
        <PaySourceFields form={form} set={set} liquidAccounts={liquidAccounts} cards={cards} />
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

function LoansSection({ userId, api, catalogos, cobros, liquidAccounts, onDone, onError }) {
  const peopleList = useMemo(() => catalogos?.loan_people || [], [catalogos])
  const people = useMemo(() => peopleList.map((p) => p.name), [peopleList])
  const creditCards = useMemo(() => catalogos?.accounts?.credit_cards || [], [catalogos])

  // Lo que te deben, agrupado por persona; incluye visacuotas de préstamo aún sin cargar
  const items = useMemo(() => {
    const byPerson = new Map()
    ;(cobros?.items || []).forEach((c) => {
      if (!byPerson.has(c.person)) byPerson.set(c.person, { person: c.person, total: 0, concepts: [] })
      const p = byPerson.get(c.person)
      p.total += Number(c.balance || 0)
      p.concepts.push(c)
    })
    return [...byPerson.values()]
  }, [cobros])
  const total = items.reduce((s, p) => s + p.total, 0)

  const emptyLoan = () => ({
    date: getGuatemalaDateString(), source: 'account', account: liquidAccounts[0]?.name || '',
    cardId: String(creditCards[0]?.id || ''), person: people[0] || '', amount: '', note: '',
    inInstallments: false, installment: '', frequency: 'monthly', firstDate: '',
  })
  const [collecting, setCollecting] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [removing, setRemoving] = useState(null)

  async function removePlan(concept) {
    try {
      await api.deletePlanCobro(concept.plan.id, userId)
      setRemoving(null)
      onDone('Plan de cobro quitado.')
    } catch (err) {
      onError(err)
    }
  }
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
      if (form.inInstallments) {
        const person = peopleList.find((p) => p.name === (form.person || people[0]))
        await api.postPlanCobro({
          telegram_user_id: Number(userId),
          loan_person_id: person.id,
          concept: form.note.trim() || null,
          installment_amount: Number(form.installment),
          frequency: form.frequency,
          next_due_date: form.firstDate,
        })
      }
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
                  <strong>{q(person.total)}</strong>
                </div>
                {person.concepts.map((c) => (
                  <div className="loan-concept" key={c.concept}>
                    <div className="item-head">
                      <span>
                        {c.concept}
                        {c.is_tc ? <span className="tc-badge" title={c.card_name || 'Tarjeta'}>TC</span> : null}
                      </span>
                      <strong>{q(c.balance)}</strong>
                    </div>
                    {c.upcoming > 0 ? (
                      <span className="helper-text">Más {q(c.upcoming)} en visacuotas que aún no se cargan</span>
                    ) : null}
                    {c.plan ? (
                      <span className="helper-text">
                        Cobro de {q(c.plan.installment_amount)} {COLLECT_FREQ[c.plan.frequency]} · próximo {fmtDate(c.plan.next_due_date)}
                      </span>
                    ) : null}
                    <div className="item-actions">
                      {removing === c.concept + person.person ? (
                        <>
                          <button type="button" className="link-btn danger" onClick={() => removePlan(c)}>Sí, quitar plan</button>
                          <button type="button" className="link-btn" onClick={() => setRemoving(null)}>Cancelar</button>
                        </>
                      ) : c.plan ? (
                        <>
                          <button type="button" className="link-btn" onClick={() => setPlanning(c)}>Editar plan</button>
                          <button type="button" className="link-btn" onClick={() => setRemoving(c.concept + person.person)}>Quitar plan</button>
                        </>
                      ) : (
                        <button type="button" className="ghost-btn" onClick={() => setPlanning(c)}>
                          {c.is_visacuota ? 'Poner fecha de cobro' : 'Plan de cobro'}
                        </button>
                      )}
                      {c.balance > 0 ? (
                        <button type="button" className="confirm-btn"
                          onClick={() => setCollecting({ person: c.person, concept: c.concept, balance: c.balance, is_tc_loan: c.is_tc, tc_account_name: c.card_name })}>
                          Cobrar
                        </button>
                      ) : null}
                    </div>
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
              <label className="full-span check-label">
                <input type="checkbox" checked={form.inInstallments} onChange={(e) => set('inInstallments', e.target.checked)} />
                Me lo paga en cuotas
              </label>
              {form.inInstallments ? (
                <>
                  <label>
                    <span>Cuota</span>
                    <input type="number" min="0.01" step="0.01" value={form.installment} onChange={(e) => set('installment', e.target.value)} required />
                  </label>
                  <label>
                    <span>Cada cuánto</span>
                    <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                      <option value="monthly">Cada mes</option>
                      <option value="biweekly">Cada 2 semanas</option>
                      <option value="weekly">Cada semana</option>
                    </select>
                  </label>
                  <label className="full-span">
                    <span>Primer cobro</span>
                    <input type="date" value={form.firstDate} onChange={(e) => set('firstDate', e.target.value)} required />
                  </label>
                </>
              ) : null}
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

      {planning ? (
        <PlanSheet concept={planning} userId={userId} api={api}
          onClose={() => setPlanning(null)}
          onDone={() => { setPlanning(null); onDone('Plan de cobro guardado. Ya aparece en el Calendario.') }} />
      ) : null}

      {collecting ? (
        <CollectSheet loan={collecting} userId={userId} api={api} liquidAccounts={liquidAccounts}
          onClose={() => setCollecting(null)}
          onDone={() => { setCollecting(null); onDone('Cobro registrado correctamente.') }} />
      ) : null}
    </>
  )
}

function PlanSheet({ concept, userId, api, onClose, onDone }) {
  const [form, setForm] = useState({
    amount: String(concept.plan?.installment_amount ?? concept.default_amount ?? ''),
    frequency: concept.plan?.frequency || 'monthly',
    date: concept.plan?.next_due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const pending = Number(concept.balance || 0) + Number(concept.upcoming || 0)

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.postPlanCobro({
        telegram_user_id: Number(userId),
        loan_person_id: concept.person_id,
        concept: concept.concept === 'General' ? null : concept.concept,
        installment_amount: Number(form.amount),
        frequency: form.frequency,
        next_due_date: form.date,
      })
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el plan.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Plan de cobro" subtitle={`${concept.person} · ${concept.concept} · por cobrar ${q(pending)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Cuota</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
        </label>
        <label>
          <span>Cada cuánto</span>
          <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
            <option value="monthly">Cada mes</option>
            <option value="biweekly">Cada 2 semanas</option>
            <option value="weekly">Cada semana</option>
          </select>
        </label>
        <label className="full-span">
          <span>Próximo cobro</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <small className="full-span helper-text">
          {concept.is_tc
            ? `Lo que cobres se abona directo a ${concept.card_name || 'la tarjeta'} y cuenta para cubrir su pago.`
            : 'Lo que cobres entra a tu cuenta y suma a tu saldo esperado.'}
          {' '}El Calendario muestra cobros hasta cubrir lo que te deben.
        </small>
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || !form.amount || !form.date}>
            {saving ? 'Guardando...' : 'Guardar plan'}
          </button>
        </div>
      </form>
    </Sheet>
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
