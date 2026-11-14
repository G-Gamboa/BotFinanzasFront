import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons'
import Sheet from '../components/Sheet'
import MessageBanner from '../components/MessageBanner'
import LoadingBlock from '../components/LoadingBlock'
import { getGuatemalaDateString } from '../utils/dates'
import { capitalize, longDate, money, monthName, q, shortDate, usd } from '../lib/format'

const KIND_LABEL = {
  ingreso: 'Ingreso',
  pago: 'Pago',
  abono: 'Abono a tarjeta',
  cargo_tc: 'Cargo a tarjeta',
  tarjeta: 'Tarjeta',
  recordatorio: 'Recordatorio',
}

const KIND_OPTIONS = [
  ['pago', 'Pago'],
  ['ingreso', 'Ingreso'],
  ['abono', 'Abono a la tarjeta'],
  ['cargo_tc', 'Cargo a la tarjeta'],
  ['recordatorio', 'Recordatorio'],
]

const RECURRENCE_OPTIONS = [
  ['none', 'No se repite'],
  ['monthly', 'Cada mes'],
  ['biweekly', 'Cada 2 semanas'],
  ['weekly', 'Cada semana'],
]

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const pad = (n) => String(n).padStart(2, '0')
const monthKey = (y, m) => `${y}-${pad(m)}`

function rowAmount(row, visible) {
  if (row.amount == null) return null
  return money(row.amount, row.currency, visible)
}

export default function CalendarioPage({
  userId, api, calendario, catalogos, disponibles, tcBalances = [], showAmounts, loading, onRefreshData,
}) {
  const today = getGuatemalaDateString()
  const thisYear = Number(today.slice(0, 4))

  const [view, setView] = useState({ y: thisYear, m: Number(today.slice(5, 7)) })
  const [months, setMonths] = useState({})
  const [fetching, setFetching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const key = monthKey(view.y, view.m)
  const data = months[key] || null

  // El arranque trae el mes actual; los demás meses se piden al navegar
  useEffect(() => {
    if (!calendario) return
    setMonths((prev) => {
      const bootKey = monthKey(calendario.year, calendario.month)
      const next = { [bootKey]: calendario }
      if (key !== bootKey && prev[key]) next[key] = prev[key]
      return next
    })
  }, [calendario])

  const fetchMonth = useCallback(async (y, m) => {
    setFetching(true)
    try {
      const fresh = await api.getCalendario(userId, y, m)
      setMonths((prev) => ({ ...prev, [monthKey(y, m)]: fresh }))
    } catch (err) {
      setError(err.message || 'No pude cargar el calendario.')
    } finally {
      setFetching(false)
    }
  }, [api, userId])

  useEffect(() => {
    if (!userId || months[key]) return
    fetchMonth(view.y, view.m)
  }, [key, userId, months, fetchMonth])

  async function afterChange(text) {
    setMessage(text)
    setError('')
    setSheet(null)
    setRemoving(null)
    await fetchMonth(view.y, view.m)
    onRefreshData?.()
  }

  function fail(err) {
    setError(err.message || 'No se pudo completar la acción.')
    setMessage('')
  }

  function navigate(delta) {
    const index = view.m - 1 + delta
    setView({ y: view.y + Math.floor(index / 12), m: ((index % 12) + 12) % 12 + 1 })
    setSelected(null)
  }

  const liquidAccounts = useMemo(() => {
    const names = (catalogos?.accounts?.liquid || []).map((a) => a.name)
    const balances = {}
    ;(disponibles?.saldos_liquidos || []).forEach((s) => { balances[s.cuenta] = Number(s.saldo || 0) })
    return names.map((name) => ({ name, balance: balances[name] ?? 0 }))
  }, [catalogos, disponibles])

  const creditCards = useMemo(() => catalogos?.accounts?.credit_cards || [], [catalogos])
  const categories = useMemo(() => ({
    ING: (catalogos?.categories?.ing || []).map((c) => c.name),
    EGR: (catalogos?.categories?.egr || []).map((c) => c.name),
  }), [catalogos])

  // ── Acciones sobre una fila ──────────────────────────────────────────────

  async function markReminder(row, done) {
    try {
      if (done) {
        await api.confirmarProgramado({
          telegram_user_id: Number(userId), item_id: row.item_id, due_date: row.date, payment_date: today,
        })
        await afterChange('Recordatorio marcado como hecho.')
      } else {
        await api.patchOcurrencia({
          telegram_user_id: Number(userId), item_id: row.item_id, due_date: row.date, undo: true,
        })
        await afterChange('Recordatorio pendiente de nuevo.')
      }
    } catch (err) {
      fail(err)
    }
  }

  async function removeRow(row, scope) {
    try {
      if (scope === 'one') {
        await api.patchOcurrencia({
          telegram_user_id: Number(userId), item_id: row.item_id, due_date: row.date, skip: true,
        })
        await afterChange('Se quitó solo esa fecha.')
      } else {
        await api.deleteProgramado(row.item_id, userId)
        await afterChange('Se quitó del calendario.')
      }
    } catch (err) {
      fail(err)
    }
  }

  function onAction(row) {
    if (row.action === 'abonar') return setSheet({ type: 'abonar', row })
    if (row.source === 'debt') return setSheet({ type: 'debt', row })
    if (row.kind === 'recordatorio') return markReminder(row, true)
    return setSheet({ type: 'confirm', row })
  }

  // ── Derivados para pintar ────────────────────────────────────────────────

  const byDay = useMemo(() => {
    const map = {}
    ;(data?.items || []).forEach((row) => { (map[row.date] = map[row.date] || []).push(row) })
    return map
  }, [data])

  const days = useMemo(() => Object.keys(byDay).sort(), [byDay])

  if (!data) {
    return (
      <div className="grid-page single-col">
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
        <LoadingBlock text={loading || fetching ? 'Cargando calendario...' : 'Sin datos del calendario.'} />
      </div>
    )
  }

  const first = new Date(view.y, view.m - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m, 0).getDate()
  const summary = data.summary || {}

  function renderRow(row) {
    const amount = rowAmount(row, showAmounts)
    const isRemoving = removing === row.key
    const canRemove = row.source === 'scheduled' && !row.done
    return (
      <li key={row.key} className={`cal-row k-${row.kind}${row.done ? ' done' : ''}${row.late ? ' late' : ''}`}>
        <span className="cal-ico"><Icon name={row.kind} /></span>
        <div className="cal-main">
          <span className="cal-concept">{row.concept}</span>
          <span className="cal-kind">
            {KIND_LABEL[row.kind] || row.kind}
            {row.recurring ? ' · se repite' : ''}
            {row.late ? ' · atrasado' : ''}
          </span>
          {row.note ? <span className="cal-note">{row.note}</span> : null}
          {canRemove && !isRemoving ? (
            <button type="button" className="link-btn" onClick={() => setRemoving(row.key)}>Quitar</button>
          ) : null}
          {isRemoving ? (
            <span className="cal-remove">
              {row.recurring ? (
                <>
                  <button type="button" className="link-btn danger" onClick={() => removeRow(row, 'one')}>Solo esta fecha</button>
                  <button type="button" className="link-btn danger" onClick={() => removeRow(row, 'all')}>Toda la serie</button>
                </>
              ) : (
                <button type="button" className="link-btn danger" onClick={() => removeRow(row, 'all')}>Sí, quitar</button>
              )}
              <button type="button" className="link-btn" onClick={() => setRemoving(null)}>Cancelar</button>
            </span>
          ) : null}
        </div>
        <div className="cal-side">
          {amount ? (
            <span className="cal-amount">{amount}</span>
          ) : row.needs_amount ? (
            <span className="cal-amount pending">Por anotar</span>
          ) : null}
          {row.currency === 'USD' && row.amount_gtq != null ? (
            <span className="cal-approx">≈ {q(row.amount_gtq, showAmounts)}</span>
          ) : null}
          {row.done ? (
            row.kind === 'recordatorio' && row.source === 'scheduled' ? (
              <button type="button" className="link-btn" onClick={() => markReminder(row, false)}>Deshacer</button>
            ) : (
              <span className="cal-done"><Icon name="check" size={14} /> Hecho</span>
            )
          ) : row.action ? (
            <button type="button" className="confirm-btn" onClick={() => onAction(row)}>
              {row.action === 'abonar' ? 'Abonar' : row.kind === 'recordatorio' ? 'Hecho' : 'Confirmar'}
            </button>
          ) : null}
        </div>
      </li>
    )
  }

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(<span key={`b${i}`} className="cal-cell blank" aria-hidden="true" />)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${view.y}-${pad(view.m)}-${pad(d)}`
    const list = byDay[iso] || []
    const classes = ['cal-cell']
    if (list.length) classes.push('has')
    if (iso === today) classes.push('today')
    if (iso === selected) classes.push('sel')
    if (list.some((r) => r.late)) classes.push('late')
    cells.push(
      <button
        key={iso}
        type="button"
        className={classes.join(' ')}
        aria-label={`${capitalize(longDate(iso, thisYear))}, ${list.length ? `${list.length} movimiento${list.length === 1 ? '' : 's'}` : 'sin movimientos'}`}
        onClick={() => {
          setSelected(iso)
          const target = document.getElementById(`cal-day-${iso}`) || document.getElementById('cal-add')
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      >
        <span className="cal-dn">{d}</span>
        <span className="cal-dots">
          {list.slice(0, 4).map((r) => <span key={r.key} className={`cal-dot k-${r.kind}${r.done ? ' off' : ''}`} />)}
          {list.length > 4 ? <span className="cal-more">+{list.length - 4}</span> : null}
        </span>
      </button>
    )
  }

  return (
    <div className="grid-page single-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      {summary.is_current_month ? (
        <section className="panel cal-summary">
          <p className="hero-label">Tu dinero ahora</p>
          <p className="hero-num">{q(summary.cash_now, showAmounts)}</p>
          <div className="trio">
            <div><span>Falta por entrar</span><strong className="pos">{q(summary.pending_in, showAmounts)}</strong></div>
            <div><span>Falta por salir</span><strong className="neg">{q(summary.pending_out, showAmounts)}</strong></div>
            <div><span>Fin de mes</span><strong>{q(summary.projected_end, showAmounts)}</strong></div>
          </div>
          <p className="helper-text">Fin de mes es tu dinero de hoy más lo que falta por entrar, menos los pagos y abonos pendientes de este mes.</p>
        </section>
      ) : null}

      {(data.cards || []).map((card) => <CardBlock key={card.id} card={card} showAmounts={showAmounts} thisYear={thisYear} />)}

      <section className="panel">
        <div className="cal-head">
          <h2>{capitalize(monthName(view.m - 1))}{view.y !== thisYear ? ` ${view.y}` : ''}</h2>
          <div className="cal-nav">
            <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Mes anterior"><Icon name="prev" size={20} /></button>
            <button type="button" className="icon-btn" onClick={() => navigate(1)} aria-label="Mes siguiente"><Icon name="next" size={20} /></button>
          </div>
        </div>
        <div className="cal-week" aria-hidden="true">{WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="cal-grid">{cells}</div>
        <div className="cal-legend">
          <div className="k-ingreso"><span>Entra</span><strong>{q(data.totals?.ingreso, showAmounts)}</strong></div>
          <div className="k-abono"><span>Abonas a la tarjeta</span><strong>{q(data.totals?.abono, showAmounts)}</strong></div>
          <div className="k-cargo_tc"><span>Cargos a la tarjeta</span><strong>{q(data.totals?.cargo_tc, showAmounts)}</strong></div>
          <div className="k-pago"><span>Pagas en efectivo</span><strong>{q(data.totals?.pago, showAmounts)}</strong></div>
        </div>
      </section>

      <section className="panel">
        {days.length === 0 ? (
          <p className="helper-text">No hay nada anotado en {monthName(view.m - 1)}. Agrégalo abajo.</p>
        ) : (
          <div className="cal-agenda">
            {days.map((iso) => (
              <div key={iso} id={`cal-day-${iso}`} className={`cal-day${iso === today ? ' is-today' : ''}${iso === selected ? ' is-sel' : ''}${iso < today ? ' past' : ''}`}>
                <div className="cal-day-head">
                  <h3>{capitalize(longDate(iso, thisYear))}</h3>
                  {iso === today ? <span className="pill">Hoy</span> : null}
                </div>
                <ul className="cal-rows">{byDay[iso].map(renderRow)}</ul>
              </div>
            ))}
          </div>
        )}

        {(data.undated || []).length > 0 ? (
          <div className="cal-day" style={{ marginTop: days.length ? 24 : 0 }}>
            <div className="cal-day-head"><h3>Sin fecha</h3></div>
            <ul className="cal-rows">{data.undated.map(renderRow)}</ul>
          </div>
        ) : null}
      </section>

      <AddForm
        userId={userId}
        api={api}
        defaultDate={selected || today}
        creditCards={creditCards}
        onAdded={() => afterChange('Agregado al calendario.')}
        onError={fail}
      />

      <NotesBlock userId={userId} api={api} notes={data.notes || []} onChanged={() => afterChange('')} onError={fail} />

      {sheet?.type === 'confirm' ? (
        <ConfirmSheet
          row={sheet.row} userId={userId} api={api} today={today}
          liquidAccounts={liquidAccounts} creditCards={creditCards} categories={categories}
          onClose={() => setSheet(null)} onDone={afterChange}
        />
      ) : null}
      {sheet?.type === 'debt' ? (
        <DebtSheet
          row={sheet.row} userId={userId} api={api} today={today} liquidAccounts={liquidAccounts}
          onClose={() => setSheet(null)} onDone={afterChange}
        />
      ) : null}
      {sheet?.type === 'abonar' ? (
        <AbonoSheet
          row={sheet.row} userId={userId} api={api} today={today} liquidAccounts={liquidAccounts}
          card={tcBalances.find((t) => t.id === sheet.row.credit_card_account_id)}
          onClose={() => setSheet(null)} onDone={afterChange}
        />
      ) : null}
    </div>
  )
}

// ── Pago de la tarjeta ───────────────────────────────────────────────────────

function CardBlock({ card, showAmounts, thisYear }) {
  const zero = card.pending_gtq < 0.005
  const total = Math.max(card.at_close_gtq, 0.01)
  const planned = Math.min(card.planned_gtq, card.pending_gtq)
  const gap = Math.max(card.gap_gtq, 0)
  const width = (v) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`

  let cover = null
  if (!zero) {
    if (Math.abs(card.gap_gtq) < 0.005) cover = <p className="cover ok">Los abonos del calendario cubren todo el pago.</p>
    else if (card.gap_gtq > 0) cover = <p className="cover bad">A los abonos planeados les faltan {q(card.gap_gtq, showAmounts)} para cubrir el pago.</p>
    else cover = <p className="cover warn">Los abonos planeados pasan el pago por {q(-card.gap_gtq, showAmounts)}.</p>
  }

  return (
    <section className="panel cal-card">
      <p className="hero-label">
        {zero ? `${card.name} en cero para el ` : `Te falta para el pago de ${card.name}, `}
        {longDate(card.payment_date, thisYear)}
      </p>
      <p className={`hero-num${zero ? ' pos' : ''}`}>{q(card.pending_gtq, showAmounts)}</p>
      {card.pending_usd ? (
        <p className="helper-text">Incluye {usd(card.pending_usd, showAmounts)} en dólares.</p>
      ) : null}
      <div className="track" role="img" aria-label={`Abonado ${q(card.paid_gtq, showAmounts)} de ${q(card.at_close_gtq, showAmounts)}`}>
        <span className="seg paid" style={{ width: width(card.paid_gtq) }} />
        <span className="seg planned" style={{ width: width(planned) }} />
        <span className="seg gap" style={{ width: width(gap) }} />
      </div>
      <div className="track-key">
        <span><i className="sw paid" />Abonado {q(card.paid_gtq, showAmounts)}</span>
        <span><i className="sw planned" />Planeado {q(planned, showAmounts)}</span>
        {gap > 0.005 ? <span><i className="sw gap" />Sin cubrir {q(gap, showAmounts)}</span> : null}
      </div>
      {cover}
      {card.loans_gtq > 0.005 ? (
        <p className="helper-text">
          Del saldo de la tarjeta, {q(card.loans_gtq, showAmounts)} son préstamos que te deben y {q(card.own_gtq, showAmounts)} es consumo tuyo.
        </p>
      ) : null}
      <p className="helper-text">Corte del {shortDate(card.close_date)}: {q(card.at_close_gtq, showAmounts)}.</p>
    </section>
  )
}

// ── Confirmar un programado ──────────────────────────────────────────────────

function defaultPayDate(row, today) {
  return row.date && row.date <= today ? row.date : today
}

function ConfirmSheet({ row, userId, api, today, liquidAccounts, creditCards, categories, onClose, onDone }) {
  const kind = row.kind
  const isUsd = row.currency === 'USD'
  const catList = kind === 'ingreso' ? categories.ING : categories.EGR
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const allowsCard = kind === 'pago' && creditCards.length > 0

  const initialMethod = (() => {
    if (kind === 'cargo_tc') return 'credit_card'
    if (row.payment_method) return row.payment_method
    if (row.account_name === 'Efectivo') return 'cash'
    return bankAccounts.length ? 'transfer' : 'cash'
  })()

  const [form, setForm] = useState({
    amount: row.amount != null ? String(row.amount) : '',
    amountGtq: '',
    date: defaultPayDate(row, today),
    category: row.category_name && catList.includes(row.category_name) ? row.category_name : (catList[0] || ''),
    method: initialMethod,
    account: row.account_name && row.account_name !== 'Efectivo'
      ? row.account_name
      : (bankAccounts[0]?.name || ''),
    cardId: String(row.credit_card_account_id || creditCards[0]?.id || ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const needsCategory = kind !== 'abono'
  const usesCard = kind === 'cargo_tc' || kind === 'abono' || form.method === 'credit_card'
  const usesAccount = kind === 'abono' || (kind !== 'cargo_tc' && form.method === 'transfer')
  const selectedAccount = liquidAccounts.find((a) => a.name === (kind === 'abono' ? form.account || 'Efectivo' : form.account))

  async function saveAmountOnly() {
    setSaving(true); setError('')
    try {
      await api.patchOcurrencia({
        telegram_user_id: Number(userId), item_id: row.item_id, due_date: row.date, amount: Number(form.amount),
      })
      await onDone('Monto anotado.')
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        item_id: row.item_id,
        due_date: row.date,
        payment_date: form.date,
        amount: Number(form.amount),
      }
      if (needsCategory) payload.category_name = form.category
      if (usesCard) payload.credit_card_account_id = Number(form.cardId)
      if (kind === 'abono') {
        payload.account_name = form.account || 'Efectivo'
        if (isUsd) payload.amount_gtq = Number(form.amountGtq)
      } else if (kind !== 'cargo_tc') {
        payload.payment_method = form.method
        if (form.method === 'transfer') payload.account_name = form.account
      }
      await api.confirmarProgramado(payload)
      await onDone(kind === 'ingreso' ? 'Ingreso registrado.' : kind === 'abono' ? 'Abono registrado.' : 'Egreso registrado.')
    } catch (err) {
      setError(err.message || 'No se pudo registrar.')
      setSaving(false)
    }
  }

  const title = kind === 'ingreso' ? 'Confirmar ingreso'
    : kind === 'abono' ? 'Confirmar abono a la tarjeta'
    : kind === 'cargo_tc' ? 'Confirmar cargo a la tarjeta'
    : 'Confirmar pago'

  return (
    <Sheet title={title} subtitle={row.concept} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>{isUsd ? 'Monto en dólares' : 'Monto'}</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount}
            onChange={(e) => set('amount', e.target.value)} required autoFocus={row.amount == null} />
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>

        {kind === 'abono' && isUsd ? (
          <label className="full-span">
            <span>Quetzales que salieron de tu cuenta</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amountGtq}
              onChange={(e) => set('amountGtq', e.target.value)} required />
          </label>
        ) : null}

        {needsCategory ? (
          <label>
            <span>Categoría</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} required>
              {catList.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        ) : null}

        {kind === 'ingreso' || kind === 'pago' ? (
          <label>
            <span>{kind === 'ingreso' ? 'Entra por' : 'Sale por'}</span>
            <select value={form.method} onChange={(e) => set('method', e.target.value)}>
              <option value="cash">Efectivo</option>
              {bankAccounts.length ? <option value="transfer">Transferencia</option> : null}
              {allowsCard ? <option value="credit_card">Tarjeta de crédito</option> : null}
            </select>
          </label>
        ) : null}

        {usesAccount ? (
          <label>
            <span>{kind === 'abono' ? 'Sale de' : 'Cuenta'}</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)}>
              {kind === 'abono' ? <option value="">Efectivo</option> : null}
              {bankAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        ) : null}

        {usesCard ? (
          <label>
            <span>Tarjeta</span>
            <select value={form.cardId} onChange={(e) => set('cardId', e.target.value)} required>
              {creditCards.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </label>
        ) : null}

        {kind !== 'ingreso' && !usesCard || kind === 'abono' ? (
          <small className="full-span helper-text">
            Disponible en {kind === 'abono' ? (form.account || 'Efectivo') : form.method === 'transfer' ? form.account : 'Efectivo'}:{' '}
            {q((kind === 'abono' || form.method === 'transfer'
              ? selectedAccount
              : liquidAccounts.find((a) => a.name === 'Efectivo'))?.balance ?? 0)}
          </small>
        ) : null}

        <div className="full-span form-actions split-actions">
          {row.needs_amount ? (
            <button type="button" className="ghost-btn" disabled={saving || !form.amount} onClick={saveAmountOnly}>
              Solo anotar el monto
            </button>
          ) : null}
          <button className="primary-btn" type="submit" disabled={saving || !form.amount}>
            {saving ? 'Guardando...' : 'Confirmar y registrar'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function DebtSheet({ row, userId, api, today, liquidAccounts, onClose, onDone }) {
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const [form, setForm] = useState({
    date: defaultPayDate(row, today),
    method: bankAccounts.length ? 'transfer' : 'cash',
    account: bankAccounts[0]?.name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const source = form.method === 'transfer' ? form.account : 'Efectivo'

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.confirmarCuotaDeuda({
        telegram_user_id: Number(userId), debt_id: row.debt_id, payment_date: form.date,
        payment_method: form.method, account_name: form.method === 'transfer' ? form.account : 'Efectivo',
      })
      await onDone('Cuota registrada.')
    } catch (err) {
      setError(err.message || 'No se pudo registrar.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Pagar cuota" subtitle={`${row.concept} · ${q(row.amount)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Fecha</span>
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
            <select value={form.account} onChange={(e) => set('account', e.target.value)}>
              {bankAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        ) : null}
        <small className="full-span helper-text">
          Disponible en {source}: {q(liquidAccounts.find((a) => a.name === source)?.balance ?? 0)}
        </small>
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Confirmar y registrar'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function AbonoSheet({ row, card, userId, api, today, liquidAccounts, onClose, onDone }) {
  const ownMax = card && (card.balance_loans_gtq ?? 0) > 0 ? card.balance_own_gtq ?? 0 : null
  const suggested = ownMax != null ? Math.min(row.amount || 0, ownMax) : (row.amount || 0)
  const [form, setForm] = useState({
    amount: suggested ? suggested.toFixed(2) : '',
    date: today,
    account: liquidAccounts.find((a) => a.balance > 0)?.name || liquidAccounts[0]?.name || 'Efectivo',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const overOwn = ownMax != null && Number(form.amount) > ownMax

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.postTCPayment({
        telegram_user_id: Number(userId), credit_card_account_id: row.credit_card_account_id,
        amount: Number(form.amount), payment_date: form.date, account_name: form.account, note: null,
      })
      await onDone('Abono registrado.')
    } catch (err) {
      setError(err.message || 'No se pudo registrar.')
      setSaving(false)
    }
  }

  return (
    <Sheet title={`Abonar a ${row.credit_card_name}`} subtitle={`Falta ${q(row.amount)} para dejar el corte en cero`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Monto en quetzales</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount}
            onChange={(e) => set('amount', e.target.value)} required />
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label className="full-span">
          <span>Sale de</span>
          <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
            {liquidAccounts.map((a) => <option key={a.name} value={a.name}>{a.name} · {q(a.balance)}</option>)}
          </select>
        </label>
        {overOwn ? (
          <small className="full-span helper-text" style={{ color: 'var(--danger)' }}>
            Tu consumo en esta tarjeta es {q(ownMax)}. El resto son préstamos que se abonan al cobrarlos.
          </small>
        ) : null}
        {card?.pending_usd_portion ? (
          <small className="full-span helper-text">
            La parte en dólares ({usd(card.pending_usd_portion)}) se abona desde la pestaña Tarjetas.
          </small>
        ) : null}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || !form.amount || overOwn}>
            {saving ? 'Guardando...' : 'Registrar abono'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

// ── Agregar al calendario ────────────────────────────────────────────────────

function AddForm({ userId, api, defaultDate, creditCards, onAdded, onError }) {
  const empty = {
    date: defaultDate, undated: false, kind: 'pago', concept: '', amount: '', currency: 'GTQ',
    recurrence: 'none', endDate: '', cardId: '', note: '',
  }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  useEffect(() => { setForm((prev) => ({ ...prev, date: defaultDate })) }, [defaultDate])

  const usesCard = form.kind === 'abono' || form.kind === 'cargo_tc'

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.postProgramado({
        telegram_user_id: Number(userId),
        kind: form.kind,
        concept: form.concept.trim(),
        amount: form.amount ? Number(form.amount) : null,
        currency: form.currency,
        start_date: form.undated ? null : form.date,
        recurrence: form.undated ? 'none' : form.recurrence,
        end_date: !form.undated && form.recurrence !== 'none' && form.endDate ? form.endDate : null,
        note: form.note.trim() || null,
        credit_card_account_id: usesCard && (form.cardId || creditCards[0]?.id) ? Number(form.cardId || creditCards[0].id) : null,
        payment_method: form.kind === 'cargo_tc' ? 'credit_card' : null,
      })
      setForm({ ...empty, date: form.date, kind: form.kind })
      onAdded()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel" id="cal-add">
      <details>
        <summary className="details-summary"><Icon name="plus" /> Agregar al calendario</summary>
        <form className="form-grid" onSubmit={submit} style={{ marginTop: 14 }}>
          <label>
            <span>Tipo</span>
            <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              {KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Fecha</span>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} disabled={form.undated} required={!form.undated} />
          </label>
          <label className="full-span check-label">
            <input type="checkbox" checked={form.undated} onChange={(e) => set('undated', e.target.checked)} />
            Todavía sin fecha
          </label>
          <label className="full-span">
            <span>Qué es</span>
            <input value={form.concept} onChange={(e) => set('concept', e.target.value)} maxLength={120} placeholder="Ej. Pago del teléfono" required />
          </label>
          {form.kind !== 'recordatorio' ? (
            <>
              <label>
                <span>Monto, si ya lo sabes</span>
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
              </label>
              <label>
                <span>Moneda</span>
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                  <option value="GTQ">Quetzales</option>
                  <option value="USD">Dólares</option>
                </select>
              </label>
            </>
          ) : null}
          {!form.undated ? (
            <label>
              <span>Repetición</span>
              <select value={form.recurrence} onChange={(e) => set('recurrence', e.target.value)}>
                {RECURRENCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ) : null}
          {!form.undated && form.recurrence !== 'none' ? (
            <label>
              <span>Hasta, si termina</span>
              <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </label>
          ) : null}
          {usesCard && creditCards.length > 0 ? (
            <label>
              <span>Tarjeta</span>
              <select value={form.cardId || creditCards[0].id} onChange={(e) => set('cardId', e.target.value)}>
                {creditCards.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="full-span">
            <span>Nota, si hace falta</span>
            <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={300} />
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !form.concept.trim()}>
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </details>
    </section>
  )
}

function NotesBlock({ userId, api, notes, onChanged, onError }) {
  const [text, setText] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await api.postNotaCalendario({ telegram_user_id: Number(userId), text: text.trim() })
      setText('')
      onChanged()
    } catch (err) {
      onError(err)
    }
  }

  async function remove(id) {
    try {
      await api.deleteNotaCalendario(id, userId)
      onChanged()
    } catch (err) {
      onError(err)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head"><h2>Para tener presente</h2></div>
      {notes.length ? (
        <ul className="cal-notes">
          {notes.map((n) => (
            <li key={n.id}>
              <span>{n.text}</span>
              <button type="button" className="link-btn" onClick={() => remove(n.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="cal-note-form" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Escribe una nota" aria-label="Nueva nota" />
        <button className="ghost-btn" type="submit">Agregar nota</button>
      </form>
    </section>
  )
}
