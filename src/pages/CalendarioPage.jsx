import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons'
import Sheet from '../components/Sheet'
import MessageBanner from '../components/MessageBanner'
import LoadingBlock from '../components/LoadingBlock'
import { getGuatemalaDateString } from '../utils/dates'
import { capitalize, longDate, money, monthName, q, shortDate, usd } from '../lib/format'

const KIND_LABEL = {
  ingreso: 'Ingreso',
  cobro: 'Cobro de préstamo',
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

  // Al entrar a la pestaña se pide el mes de nuevo: lo registrado en otras pestañas cuenta de inmediato
  useEffect(() => {
    if (userId) fetchMonth(view.y, view.m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function refresh() {
    setError('')
    await fetchMonth(view.y, view.m)
    onRefreshData?.()
    setMessage('Calendario y proyección actualizados.')
  }

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
        await afterChange('Quedó pendiente de nuevo.')
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

  function onEdit(row) {
    const series = [...(data?.fixed?.items || []), ...(data?.fixed?.incomes || [])]
      .find((i) => i.item_id === row.item_id)
    setSheet(series ? { type: 'editSeries', item: series, row } : { type: 'editOne', row })
  }

  function onAction(row) {
    if (row.action === 'abonar') return setSheet({ type: 'abonar', row })
    if (row.source === 'debt') return setSheet({ type: 'debt', row })
    if (row.source === 'collection') return setSheet({ type: 'cobro', row })
    if (row.kind === 'recordatorio') return markReminder(row, true)
    return setSheet({ type: 'confirm', row })
  }

  // ── Derivados para pintar ────────────────────────────────────────────────

  const byDay = useMemo(() => {
    const map = {}
    // Lo atrasado de meses anteriores se muestra en el día de hoy
    ;(data?.items || []).forEach((row) => {
      const day = row.show_on || row.date
      ;(map[day] = map[day] || []).push(row)
    })
    return map
  }, [data])

  const days = useMemo(() => Object.keys(byDay).sort(), [byDay])

  const balanceByDay = useMemo(() => {
    const map = {}
    ;(data?.projection?.days || []).forEach((d) => { map[d.date] = d.balance })
    return map
  }, [data])

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
    const canEdit = canRemove
    return (
      <li key={row.key} className={`cal-row k-${row.kind}${row.done ? ' done' : ''}${row.late ? ' late' : ''}`}>
        <span className="cal-ico"><Icon name={row.kind} /></span>
        <div className="cal-main">
          <span className="cal-concept">{row.concept}</span>
          <span className="cal-kind">
            {KIND_LABEL[row.kind] || row.kind}
            {row.recurring ? ' · se repite' : ''}
            {row.show_on ? ` · atrasado desde el ${shortDate(row.date)}` : row.late ? ' · atrasado' : ''}
          </span>
          {row.note ? <span className="cal-note">{row.note}</span> : null}
          {canRemove && !isRemoving ? (
            <span className="cal-remove">
              {canEdit ? <button type="button" className="link-btn" onClick={() => onEdit(row)}>Editar</button> : null}
              <button type="button" className="link-btn" onClick={() => setRemoving(row.key)}>Quitar</button>
            </span>
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
            <>
              <span className="cal-done"><Icon name="check" size={14} /> Hecho</span>
              {row.source === 'scheduled' && !row.record_type ? (
                <button type="button" className="link-btn" onClick={() => markReminder(row, false)}>Deshacer</button>
              ) : null}
            </>
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

      {!summary.is_current_month && data.projection ? (
        <section className="panel cal-summary">
          <p className="hero-label">Saldo esperado al cierre de {monthName(view.m - 1)}</p>
          <p className={`hero-num${data.projection.end_balance < 0 ? ' neg' : ''}`}>{q(data.projection.end_balance, showAmounts)}</p>
          <p className="helper-text">
            Parte de tu dinero de hoy, {q(data.projection.start_balance, showAmounts)}, y aplica todo lo planeado hasta esa fecha.
          </p>
        </section>
      ) : null}

      {data.projection?.first_negative ? (
        <div className="notice notice-danger">
          <div className="notice-text">
            <Icon name="alert" size={18} />
            <span>
              Con lo planeado, tu saldo quedaría en negativo el {longDate(data.projection.first_negative, thisYear)},
              hasta {q(data.projection.lowest.balance, showAmounts)}. Mueve un pago o adelanta un ingreso.
            </span>
          </div>
        </div>
      ) : null}

      {data.close ? (
        <CloseBlock
          close={data.close}
          showAmounts={showAmounts}
          thisYear={thisYear}
          onView={data.close.month !== view.m || data.close.year !== view.y ? () => navigate(-1) : null}
        />
      ) : null}

      {(data.cards || []).map((card) => (
        <CardBlock key={card.id} card={card} showAmounts={showAmounts} thisYear={thisYear}
          userId={userId} api={api} onChanged={afterChange} onError={fail} />
      ))}

      <section className="panel">
        <div className="cal-head">
          <h2>{capitalize(monthName(view.m - 1))}{view.y !== thisYear ? ` ${view.y}` : ''}</h2>
          <div className="cal-nav">
            <button type="button" className={`icon-btn${fetching ? ' spinning' : ''}`} onClick={refresh} disabled={fetching}
              aria-label="Actualizar calendario y proyección" title="Actualizar"><Icon name="refresh" size={18} /></button>
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
                  {balanceByDay[iso] != null ? (
                    <span className={`cal-balance${balanceByDay[iso] < 0 ? ' neg' : ''}`}>
                      Saldo esperado {q(balanceByDay[iso], showAmounts)}
                    </span>
                  ) : null}
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

      <IncomePanel
        fixed={data.fixed}
        userId={userId}
        api={api}
        creditCards={creditCards}
        liquidAccounts={liquidAccounts}
        categories={categories}
        showAmounts={showAmounts}
        onChanged={afterChange}
        onError={fail}
      />

      <FixedPanel
        fixed={data.fixed}
        userId={userId}
        api={api}
        creditCards={creditCards}
        liquidAccounts={liquidAccounts}
        categories={categories}
        showAmounts={showAmounts}
        onChanged={afterChange}
        onError={fail}
      />

      <AddForm
        userId={userId}
        api={api}
        defaultDate={selected || today}
        creditCards={creditCards}
        onAdded={() => afterChange('Agregado al calendario.')}
        onError={fail}
      />

      <NotesBlock userId={userId} api={api} notes={data.notes || []} onChanged={() => afterChange('')} onError={fail} />

      {sheet?.type === 'editSeries' ? (
        <FixedSheet
          item={sheet.item} onlyDate={sheet.row.date} rowAmount={sheet.row.amount}
          userId={userId} api={api} creditCards={creditCards} liquidAccounts={liquidAccounts} categories={categories}
          onClose={() => setSheet(null)} onDone={afterChange}
        />
      ) : null}
      {sheet?.type === 'editOne' ? (
        <EditOneSheet row={sheet.row} userId={userId} api={api}
          onClose={() => setSheet(null)} onDone={afterChange} />
      ) : null}

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
      {sheet?.type === 'cobro' ? (
        <CobroSheet
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

// ── Cierre de mes ────────────────────────────────────────────────────────────

function CloseBlock({ close, showAmounts, thisYear, onView }) {
  const pending = close.unconfirmed || []
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Cierre de {monthName(close.month - 1)}{close.year !== thisYear ? ` ${close.year}` : ''}</h2>
        {onView ? <button type="button" className="link-btn" onClick={onView}>Ver el mes</button> : null}
      </div>
      <div className="trio">
        <div><span>Entró</span><strong className="pos">{q(close.ingresos, showAmounts)}</strong></div>
        <div><span>Salió</span><strong className="neg">{q(close.egresos, showAmounts)}</strong></div>
        <div><span>Balance</span><strong className={close.balance < 0 ? 'neg' : ''}>{q(close.balance, showAmounts)}</strong></div>
      </div>
      <div className="rows">
        <div className="row-line">
          <span>Ahorro del mes</span>
          <strong className={close.ahorro < 0 ? 'neg' : ''}>{q(close.ahorro, showAmounts)}</strong>
        </div>
        {(close.top_gastos || []).map((g) => (
          <div className="row-line sub" key={g.categoria}>
            <span>{g.categoria}</span>
            <strong>{q(g.monto, showAmounts)}</strong>
          </div>
        ))}
      </div>
      {pending.length > 0 ? (
        <>
          <p className="helper-text" style={{ margin: '12px 0 6px' }}>
            {pending.length === 1 ? 'Quedó 1 sin confirmar:' : `Quedaron ${pending.length} sin confirmar:`}
          </p>
          <div className="rows">
            {pending.map((u) => (
              <div className="row-line sub" key={u.key}>
                <span>{shortDate(u.date)} · {u.concept}</span>
                <strong>{u.amount_gtq != null ? q(u.amount_gtq, showAmounts) : 'Por anotar'}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="helper-text" style={{ margin: '12px 0 0' }}>Todo lo planeado quedó confirmado.</p>
      )}
    </section>
  )
}

// ── Pago de la tarjeta ───────────────────────────────────────────────────────

function CardBlock({ card, showAmounts, thisYear, userId, api, onChanged, onError }) {
  const [editing, setEditing] = useState(false)
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
      <p className="helper-text">
        Pago de contado del corte del {shortDate(card.close_date)}: {q(card.at_close_gtq, showAmounts)}
        {card.statement_override ? ' · ajustado a mano' : ''}.{' '}
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>
          {card.statement_override ? 'Cambiar' : 'Ajustar contado'}
        </button>
      </p>
      {editing ? (
        <ContadoSheet card={card} userId={userId} api={api} showAmounts={showAmounts}
          onClose={() => setEditing(false)}
          onDone={async (text) => { setEditing(false); await onChanged(text) }} />
      ) : null}
      {card.plan ? (
        <PlanBlock card={card} showAmounts={showAmounts} thisYear={thisYear}
          userId={userId} api={api} onChanged={onChanged} onError={onError} />
      ) : null}
    </section>
  )
}

function PlanBlock({ card, showAmounts, thisYear, userId, api, onChanged, onError }) {
  const plan = card.plan
  const [saving, setSaving] = useState(false)
  const total = plan.suggestions.reduce((s, x) => s + x.amount, 0)

  async function addAll() {
    setSaving(true)
    try {
      for (const s of plan.suggestions) {
        const dollars = s.currency === 'USD'
        await api.postProgramado({
          telegram_user_id: Number(userId),
          kind: 'abono',
          concept: dollars ? `Abono en dólares a ${card.name}` : `Abono a ${card.name}`,
          amount: dollars ? s.usd : s.amount,
          currency: dollars ? 'USD' : 'GTQ',
          start_date: s.date,
          recurrence: 'none',
          credit_card_account_id: card.id,
          account_name: s.account || null,
          note: `Plan sugerido · ${s.reason}`,
        })
      }
      await onChanged('Abonos del plan agregados al calendario. Confírmalos cuando los hagas.')
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="plan-box">
      <p className="plan-title">Plan sugerido · colchón de {q(plan.buffer, showAmounts)}</p>
      {plan.planned > 0 ? (
        <p className="helper-text">Ya tienes {q(plan.planned, showAmounts)} planeado o por cobrar para esta tarjeta; el plan cubre lo que falta.</p>
      ) : null}
      {plan.suggestions.length > 0 ? (
        <>
          <ol className="plan-list">
            {plan.suggestions.map((s) => (
              <li key={s.date + s.currency + s.amount}>
                <span>
                  <strong>{capitalize(longDate(s.date, thisYear))}:</strong>{' '}
                  {s.currency === 'USD'
                    ? <>paga los dólares, {usd(s.usd, showAmounts)} (≈ {q(s.amount, showAmounts)})</>
                    : <>abona {q(s.amount, showAmounts)}</>}
                  {s.account ? ` desde ${s.account}` : ''}
                </span>
                <span className="helper-text">{capitalize(s.reason)}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="confirm-btn" disabled={saving} onClick={addAll}>
            {saving ? 'Agregando...' : `Agregar ${plan.suggestions.length === 1 ? 'este abono' : 'estos abonos'} al calendario (${q(total, showAmounts)})`}
          </button>
        </>
      ) : plan.covered ? (
        <p className="cover ok">Con lo que ya planeaste alcanza para dejarla en cero.</p>
      ) : null}
      {!plan.covered ? (
        <p className="cover bad">
          Te faltan {q(plan.shortfall, showAmounts)}: lo que entra antes del {longDate(card.payment_date, thisYear)} no alcanza sin bajar del colchón.
        </p>
      ) : null}
      {plan.usd_unplaced ? (
        <p className="cover bad">
          Los {usd(plan.usd_unplaced, showAmounts)} no caben completos en un solo día antes del {longDate(card.payment_date, thisYear)} sin bajar del colchón.
        </p>
      ) : plan.suggestions.some((s) => s.currency === 'USD') ? (
        <p className="helper-text">Los dólares van en un solo abono: así sabes qué día se pagan. Al confirmarlo queda como abono a la porción en dólares.</p>
      ) : null}
    </div>
  )
}

// ── Ajustar el pago de contado ───────────────────────────────────────────────

function ContadoSheet({ card, userId, api, showAmounts, onClose, onDone }) {
  const type = card.tc_type || 'GTQ'
  const showQ = type !== 'USD'
  const showUsd = type !== 'GTQ'
  const [form, setForm] = useState({
    q: card.statement_q != null ? Number(card.statement_q).toFixed(2) : '',
    usd: card.statement_usd != null ? Number(card.statement_usd).toFixed(2) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function send(payload, text) {
    setSaving(true); setError('')
    try {
      await api.ajustarContado(card.id, { telegram_user_id: Number(userId), ...payload })
      await onDone(text)
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setSaving(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    send({
      amount_q: showQ && form.q !== '' ? Number(form.q) : null,
      amount_usd: showUsd && form.usd !== '' ? Number(form.usd) : null,
    }, 'Pago de contado ajustado. El plan y la proyección ya usan este monto.')
  }

  return (
    <Sheet title="Pago de contado" subtitle={`${card.name} · corte del ${shortDate(card.close_date)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <p className="full-span helper-text">
          Escribe lo que dice el banco. Si un cargo todavía no lo procesó, el contado de este corte es menor;
          ese cargo pasa solo al corte siguiente. El saldo total de la tarjeta no cambia.
        </p>
        {showQ ? (
          <label>
            <span>Contado en quetzales</span>
            <input type="number" min="0" step="0.01" value={form.q}
              onChange={(e) => setForm((p) => ({ ...p, q: e.target.value }))} required={type === 'GTQ'} />
            <small className="helper-text">Calculado: {q(card.statement_computed_q, showAmounts)}</small>
          </label>
        ) : null}
        {showUsd ? (
          <label>
            <span>Contado en dólares</span>
            <input type="number" min="0" step="0.01" value={form.usd}
              onChange={(e) => setForm((p) => ({ ...p, usd: e.target.value }))} required={type === 'USD'} />
            <small className="helper-text">Calculado: {usd(card.statement_computed_usd, showAmounts)}</small>
          </label>
        ) : null}
        <p className="full-span helper-text">Solo aplica a este corte. En el siguiente vuelve el cálculo normal.</p>
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar contado'}</button>
          {card.statement_override ? (
            <button type="button" className="link-btn" disabled={saving}
              onClick={() => send({ reset: true }, 'Volviste al pago de contado calculado.')}>
              Volver al calculado
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  )
}

// ── Confirmar un programado ──────────────────────────────────────────────────

function defaultPayDate(row, today) {
  return row.date && row.date <= today ? row.date : today
}

const DEFAULT_RATE = 7.7

function cardInfo(creditCards, cardId) {
  const card = creditCards.find((tc) => String(tc.id) === String(cardId))
  return { card, type: card?.tc_type || 'GTQ', rate: Number(card?.tc_exchange_rate || DEFAULT_RATE) }
}

// En qué moneda se escribe el monto según la tarjeta y la moneda del programado
function entryFor(kind, itemCurrency, type) {
  if (kind === 'abono') {
    if (type === 'USD') return { dollars: true, locked: true }
    if (type === 'GTQ') return { dollars: false, locked: true }
    return { dollars: itemCurrency === 'USD', locked: false }
  }
  if (type === 'USD') return { currency: 'USD', locked: true }
  if (type === 'GTQ') return { currency: 'GTQ', locked: true }
  return { currency: itemCurrency, locked: false }
}

function convert(amount, from, to, rate) {
  if (amount == null || amount === '') return ''
  const n = Number(amount)
  if (from === to) return n.toFixed(2)
  return (from === 'USD' ? n * rate : n / rate).toFixed(2)
}

function ConfirmSheet({ row, userId, api, today, liquidAccounts, creditCards, categories, onClose, onDone }) {
  const kind = row.kind
  const itemCurrency = row.currency || 'GTQ'
  const catList = kind === 'ingreso' ? categories.ING : categories.EGR
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const allowsCard = kind === 'pago' && creditCards.length > 0

  const initialMethod = (() => {
    if (kind === 'cargo_tc') return 'credit_card'
    if (row.payment_method) return row.payment_method
    if (row.account_name === 'Efectivo') return 'cash'
    return bankAccounts.length ? 'transfer' : 'cash'
  })()
  const initialCardId = String(row.credit_card_account_id || creditCards[0]?.id || '')

  // Monto inicial y moneda de captura según la tarjeta elegida
  function cardDefaults(cardId) {
    const { type, rate } = cardInfo(creditCards, cardId)
    if (kind === 'abono') {
      const mode = entryFor('abono', itemCurrency, type)
      const usd = mode.dollars ? convert(row.amount, itemCurrency, 'USD', rate) : ''
      return {
        chargeCurrency: 'GTQ',
        dollars: mode.dollars,
        usdPaid: usd,
        amount: mode.dollars ? convert(usd, 'USD', 'GTQ', rate) : convert(row.amount, itemCurrency, 'GTQ', rate),
      }
    }
    const mode = entryFor(kind, itemCurrency, type)
    return {
      chargeCurrency: mode.currency,
      dollars: false,
      usdPaid: '',
      amount: convert(row.amount, itemCurrency, mode.currency, rate),
    }
  }

  const [form, setForm] = useState(() => ({
    date: defaultPayDate(row, today),
    category: row.category_name && catList.includes(row.category_name) ? row.category_name : (catList[0] || ''),
    method: initialMethod,
    account: row.account_name && row.account_name !== 'Efectivo' ? row.account_name : (bankAccounts[0]?.name || ''),
    cardId: initialCardId,
    ...(kind === 'abono' || kind === 'cargo_tc' || initialMethod === 'credit_card'
      ? cardDefaults(initialCardId)
      : { chargeCurrency: 'GTQ', dollars: false, usdPaid: '', amount: row.amount_gtq != null ? Number(row.amount_gtq).toFixed(2) : '' }),
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const needsCategory = kind !== 'abono'
  const usesCard = kind === 'cargo_tc' || kind === 'abono' || form.method === 'credit_card'
  const usesAccount = kind === 'abono' || (kind !== 'cargo_tc' && form.method === 'transfer')
  const selectedAccount = liquidAccounts.find((a) => a.name === (kind === 'abono' ? form.account || 'Efectivo' : form.account))
  const { card, type: cardType, rate } = cardInfo(creditCards, form.cardId)
  const mode = usesCard ? entryFor(kind, itemCurrency, cardType) : null

  function changeCard(cardId) {
    setForm((prev) => ({ ...prev, cardId, ...cardDefaults(cardId) }))
  }

  function changeMethod(method) {
    setForm((prev) => ({
      ...prev,
      method,
      ...(method === 'credit_card'
        ? cardDefaults(prev.cardId)
        : { chargeCurrency: 'GTQ', dollars: false, usdPaid: '', amount: row.amount_gtq != null ? Number(row.amount_gtq).toFixed(2) : prev.amount }),
    }))
  }

  function toggleChargeDollars(on) {
    setForm((prev) => ({
      ...prev,
      chargeCurrency: on ? 'USD' : 'GTQ',
      amount: convert(prev.amount, prev.chargeCurrency, on ? 'USD' : 'GTQ', rate),
    }))
  }

  function togglePaymentDollars(on) {
    setForm((prev) => ({
      ...prev,
      dollars: on,
      usdPaid: on ? convert(prev.amount, 'GTQ', 'USD', rate) : '',
    }))
  }

  // Monto que se guarda en la fecha, siempre en la moneda del programado
  function amountInItemCurrency() {
    if (kind === 'abono' && form.dollars) return Number(convert(form.usdPaid, 'USD', itemCurrency, rate))
    const entryCurrency = usesCard && kind !== 'abono' ? form.chargeCurrency : 'GTQ'
    return Number(convert(form.amount, entryCurrency, itemCurrency, rate))
  }

  async function saveAmountOnly() {
    setSaving(true); setError('')
    try {
      await api.patchOcurrencia({
        telegram_user_id: Number(userId), item_id: row.item_id, due_date: row.date, amount: amountInItemCurrency(),
      })
      await onDone('Monto anotado.')
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function markOnly() {
    setSaving(true); setError('')
    try {
      await api.confirmarProgramado({
        telegram_user_id: Number(userId),
        item_id: row.item_id,
        due_date: row.date,
        payment_date: form.date,
        amount: form.amount ? amountInItemCurrency() : null,
        create_record: false,
      })
      await onDone('Marcado como hecho, sin registrar otro movimiento.')
    } catch (err) {
      setError(err.message || 'No se pudo marcar.')
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
        if (form.dollars) payload.usd_paid = Number(form.usdPaid)
      } else if (usesCard) {
        payload.charge_currency = form.chargeCurrency
        if (kind === 'pago') payload.payment_method = 'credit_card'
      } else {
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

  const planned = row.amount != null ? `Planeado: ${money(row.amount, itemCurrency)}` : null
  const chargeLabel = !usesCard || kind === 'abono' ? 'Monto'
    : form.chargeCurrency === 'USD' ? 'Dólares cargados' : 'Quetzales que cobró el banco'

  let cardHelp = null
  if (usesCard && card) {
    if (kind === 'abono') {
      if (cardType === 'GTQ') cardHelp = `${card.name} lleva su saldo en quetzales: el abono va en quetzales.`
      else if (form.dollars) cardHelp = `Se abona a la porción en dólares de ${card.name}. Escribe los dólares abonados y los quetzales que salieron de tu cuenta.`
      else cardHelp = `Se abona a la porción en quetzales de ${card.name}.`
    } else if (cardType === 'GTQ') {
      cardHelp = itemCurrency === 'USD'
        ? `${card.name} lleva su saldo en quetzales: escribe los quetzales que cobró el banco por este cargo en dólares (referencia ${q(convert(row.amount, 'USD', 'GTQ', rate))}).`
        : `${card.name} lleva su saldo en quetzales.`
    } else if (cardType === 'USD') {
      cardHelp = `${card.name} lleva su saldo en dólares: el cargo se registra en dólares.`
    } else if (form.chargeCurrency === 'USD') {
      cardHelp = `Va a la porción en dólares de ${card.name}; en quetzales serían unos ${q(convert(form.amount, 'USD', 'GTQ', rate))} al tipo de la tarjeta.`
    } else {
      cardHelp = `Va a la porción en quetzales de ${card.name}.`
    }
  }

  return (
    <Sheet title={title} subtitle={[row.concept, planned].filter(Boolean).join(' · ')} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        {usesCard ? (
          <label className="full-span">
            <span>Tarjeta</span>
            <select value={form.cardId} onChange={(e) => changeCard(e.target.value)} required>
              {creditCards.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name} · {tc.tc_type === 'USD' ? 'en dólares' : tc.tc_type === 'MIXTO' ? 'quetzales y dólares' : 'en quetzales'}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {usesCard && kind !== 'abono' && !mode.locked ? (
          <label className="full-span check-label">
            <input type="checkbox" checked={form.chargeCurrency === 'USD'} onChange={(e) => toggleChargeDollars(e.target.checked)} />
            Cargo en dólares
          </label>
        ) : null}
        {usesCard && kind === 'abono' && !mode.locked ? (
          <label className="full-span check-label">
            <input type="checkbox" checked={form.dollars} onChange={(e) => togglePaymentDollars(e.target.checked)} />
            Abono a la porción en dólares
          </label>
        ) : null}

        {kind === 'abono' && form.dollars ? (
          <label>
            <span>Dólares abonados</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.usdPaid}
              onChange={(e) => set('usdPaid', e.target.value)} required />
          </label>
        ) : null}

        <label>
          <span>{kind === 'abono' ? (form.dollars ? 'Quetzales que salieron de tu cuenta' : 'Quetzales abonados') : chargeLabel}</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount}
            onChange={(e) => set('amount', e.target.value)} required autoFocus={row.amount == null} />
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>

        {cardHelp ? <small className="full-span helper-text">{cardHelp}</small> : null}

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
            <select value={form.method} onChange={(e) => changeMethod(e.target.value)}>
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

        {(kind !== 'ingreso' && !usesCard) || kind === 'abono' ? (
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
          <button className="primary-btn" type="submit" disabled={saving || !form.amount || (form.dollars && !form.usdPaid)}>
            {saving ? 'Guardando...' : 'Confirmar y registrar'}
          </button>
        </div>

        <div className="full-span sheet-alt">
          <button type="button" className="ghost-btn" disabled={saving} onClick={markOnly}>
            Confirmar sin registrar
          </button>
          <small className="helper-text">Úsalo si ya lo anotaste desde Registrar: lo marca como hecho y no crea otro movimiento.</small>
        </div>
      </form>
    </Sheet>
  )
}

function DebtSheet({ row, userId, api, today, liquidAccounts, onClose, onDone }) {
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const [form, setForm] = useState({
    date: defaultPayDate(row, today),
    method: row.account_name === 'Efectivo' || !bankAccounts.length ? 'cash' : 'transfer',
    account: row.account_name && row.account_name !== 'Efectivo' ? row.account_name : (bankAccounts[0]?.name || ''),
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

function CobroSheet({ row, userId, api, today, liquidAccounts, onClose, onDone }) {
  const isTc = Boolean(row.credit_card_account_id)
  const charged = Number(row.balance || 0) > 0.005
  const [form, setForm] = useState({
    amount: Math.min(Number(row.amount || 0), Number(row.balance || 0) || Number(row.amount || 0)).toFixed(2),
    date: defaultPayDate(row, today),
    account: liquidAccounts.find((a) => a.name !== 'Efectivo')?.name || liquidAccounts[0]?.name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function send(createRecord) {
    setSaving(true); setError('')
    try {
      await api.confirmarCobro({
        telegram_user_id: Number(userId),
        plan_id: row.plan_id,
        payment_date: form.date,
        amount: createRecord ? Number(form.amount) : null,
        account_name: createRecord && !isTc ? form.account : null,
        create_record: createRecord,
      })
      await onDone(createRecord ? 'Cobro registrado.' : 'Cobro marcado como hecho, sin registrar otro movimiento.')
    } catch (err) {
      setError(err.message || 'No se pudo registrar el cobro.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Confirmar cobro" subtitle={`${row.concept} · le queda ${q(row.balance)}`} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); send(true) }}>
        <label>
          <span>Monto</span>
          <input type="number" min="0.01" step="0.01" max={row.balance || undefined} inputMode="decimal"
            value={form.amount} onChange={(e) => set('amount', e.target.value)} required disabled={!charged} />
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        {isTc ? (
          <small className="full-span helper-text">Se abona directo a {row.credit_card_name || 'la tarjeta'}.</small>
        ) : (
          <label className="full-span">
            <span>Entra a</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
              {liquidAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        )}
        {!charged ? (
          <small className="full-span helper-text">
            La visacuota de este cobro todavía no se carga a la tarjeta, así que aún no hay saldo que registrar.
          </small>
        ) : null}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || !charged || !form.amount}>
            {saving ? 'Guardando...' : 'Confirmar y registrar'}
          </button>
        </div>
        <div className="full-span sheet-alt">
          <button type="button" className="ghost-btn" disabled={saving} onClick={() => send(false)}>
            Confirmar sin registrar
          </button>
          <small className="helper-text">Úsalo si ya registraste el cobro desde Deudas y préstamos: pasa al siguiente cobro sin crear otro.</small>
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

// ── Suscripciones y pagos fijos ──────────────────────────────────────────────

const EVERY = { monthly: 'cada mes', biweekly: 'cada 2 semanas', weekly: 'cada semana' }

function FixedPanel({ fixed, userId, api, creditCards, liquidAccounts, categories, showAmounts, onChanged, onError }) {
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const items = fixed?.items || []

  async function remove(item) {
    try {
      await api.deleteProgramado(item.item_id, userId)
      setRemoving(null)
      await onChanged('Se quitó de tus pagos fijos.')
    } catch (err) {
      onError(err)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Suscripciones y pagos fijos</h2>
        {items.length ? <strong>{q(fixed.monthly_gtq, showAmounts)} al mes</strong> : null}
      </div>
      {items.length === 0 ? (
        <p className="helper-text">Agrega aquí la luz, el internet y tus suscripciones para verlos en el calendario y confirmarlos.</p>
      ) : (
        <div className="rows">
          {items.map((item) => (
            <div key={item.item_id} className="fixed-row">
              <span className={`cal-ico k-${item.kind}`}><Icon name={item.kind} /></span>
              <div className="cal-main">
                <span className="cal-concept">{item.concept}</span>
                <span className="cal-kind">
                  {item.amount != null ? money(item.amount, item.currency, showAmounts) : 'Monto variable'}
                  {item.currency === 'USD' && item.amount_gtq != null ? ` ≈ ${q(item.amount_gtq, showAmounts)}` : ''}
                  {' · '}{EVERY[item.recurrence] || item.recurrence}
                  {item.next_date ? ` · próximo ${shortDate(item.next_date)}` : ''}
                </span>
                <span className="cal-kind">
                  {item.kind === 'cargo_tc' ? `A ${item.credit_card_name || 'tarjeta sin elegir'}` : `Desde ${item.account_name || 'cuenta por elegir'}`}
                  {item.category_name ? ` · ${item.category_name}` : ''}
                </span>
                {removing === item.item_id ? (
                  <span className="cal-remove">
                    <button type="button" className="link-btn danger" onClick={() => remove(item)}>Sí, quitar</button>
                    <button type="button" className="link-btn" onClick={() => setRemoving(null)}>Cancelar</button>
                  </span>
                ) : (
                  <span className="cal-remove">
                    <button type="button" className="link-btn" onClick={() => setEditing(item)}>Editar</button>
                    <button type="button" className="link-btn" onClick={() => setRemoving(item.item_id)}>Quitar</button>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="row-line sub">
            <span>Al año</span>
            <strong>{q(fixed.yearly_gtq, showAmounts)}</strong>
          </div>
        </div>
      )}
      <button type="button" className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setEditing({})}>
        <span className="title-with-icon"><Icon name="plus" /> Agregar suscripción o pago fijo</span>
      </button>

      {editing ? (
        <FixedSheet
          item={editing.item_id ? editing : null}
          userId={userId} api={api} creditCards={creditCards} liquidAccounts={liquidAccounts} categories={categories}
          onClose={() => setEditing(null)}
          onDone={async (text) => { setEditing(null); await onChanged(text) }}
        />
      ) : null}
    </section>
  )
}

function FixedSheet({ item, defaultKind, onlyDate, rowAmount, userId, api, creditCards, liquidAccounts, categories, onClose, onDone }) {
  const editingItem = Boolean(item)
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const isIncome = (item?.kind || defaultKind) === 'ingreso'
  // Desde una fecha del calendario se puede cambiar solo esa fecha o toda la serie
  const [scope, setScope] = useState('all')
  const [oneAmount, setOneAmount] = useState(rowAmount != null ? String(rowAmount) : (item?.amount != null ? String(item.amount) : ''))
  const [form, setForm] = useState({
    kind: item?.kind || defaultKind || (creditCards.length ? 'cargo_tc' : 'pago'),
    concept: item?.concept || '',
    amount: item?.amount != null ? String(item.amount) : '',
    currency: item?.currency || 'GTQ',
    start: item?.start_date || getGuatemalaDateString(),
    recurrence: item?.recurrence || 'monthly',
    end: item?.end_date || '',
    cardId: String(item?.credit_card_account_id || creditCards[0]?.id || ''),
    account: item?.account_name || 'Efectivo',
    category: item?.category_name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const card = creditCards.find((tc) => String(tc.id) === String(form.cardId))
  const cardType = card?.tc_type || 'GTQ'

  let currencyHelp = null
  if (form.kind === 'cargo_tc' && card) {
    if (form.currency === 'USD' && cardType === 'GTQ') {
      currencyHelp = `${card.name} lleva su saldo en quetzales: al confirmar escribirás los quetzales que cobró el banco.`
    } else if (form.currency === 'GTQ' && cardType === 'USD') {
      currencyHelp = `${card.name} lleva su saldo en dólares: al confirmar escribirás el cargo en dólares.`
    } else if (form.currency === 'USD' && cardType === 'MIXTO') {
      currencyHelp = `Se cargará a la porción en dólares de ${card.name}.`
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    if (onlyDate && scope === 'one') {
      try {
        await api.patchOcurrencia({
          telegram_user_id: Number(userId), item_id: item.item_id, due_date: onlyDate, amount: Number(oneAmount),
        })
        await onDone(`Monto cambiado solo para el ${shortDate(onlyDate)}.`)
      } catch (err) {
        setError(err.message || 'No se pudo guardar.')
        setSaving(false)
      }
      return
    }
    const isCard = form.kind === 'cargo_tc'
    const fields = {
      telegram_user_id: Number(userId),
      concept: form.concept.trim(),
      amount: form.amount ? Number(form.amount) : null,
      currency: form.currency,
      start_date: form.start,
      recurrence: form.recurrence,
      end_date: form.end || null,
      category_name: form.category || null,
      credit_card_account_id: isCard ? Number(form.cardId) : null,
      payment_method: isCard ? 'credit_card' : (form.account === 'Efectivo' ? 'cash' : 'transfer'),
      account_name: isCard || form.account === 'Efectivo' ? null : form.account,
    }
    try {
      if (editingItem) await api.patchProgramado(item.item_id, fields)
      else await api.postProgramado({ ...fields, kind: form.kind })
      await onDone(isIncome
        ? (editingItem ? 'Ingreso fijo actualizado. Las fechas ya confirmadas no cambian.' : 'Ingreso fijo agregado al calendario.')
        : (editingItem ? 'Pago fijo actualizado. Las fechas ya confirmadas no cambian.' : 'Pago fijo agregado al calendario.'))
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      title={isIncome ? (editingItem ? 'Editar ingreso fijo' : 'Nuevo ingreso fijo') : (editingItem ? 'Editar pago fijo' : 'Nueva suscripción o pago fijo')}
      subtitle={editingItem ? item.concept : undefined}
      onClose={onClose}
    >
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      {onlyDate ? (
        <div className="seg-toggle" role="radiogroup" aria-label="Qué cambiar">
          <button type="button" role="radio" aria-checked={scope === 'all'} className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
            Toda la serie
          </button>
          <button type="button" role="radio" aria-checked={scope === 'one'} className={scope === 'one' ? 'on' : ''} onClick={() => setScope('one')}>
            Solo el {shortDate(onlyDate)}
          </button>
        </div>
      ) : null}
      {onlyDate && scope === 'one' ? (
        <form className="form-grid" onSubmit={submit}>
          <label className="full-span">
            <span>Monto del {longDate(onlyDate, Number(onlyDate.slice(0, 4)))}</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={oneAmount}
              onChange={(e) => setOneAmount(e.target.value)} required />
            <small className="helper-text">Las demás fechas siguen con {item.amount != null ? money(item.amount, item.currency, true) : 'su monto'}.</small>
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !oneAmount}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      ) : (
      <form className="form-grid" onSubmit={submit}>
        {isIncome ? null : (
          <label className="full-span">
            <span>Cómo se paga</span>
            <select value={form.kind} onChange={(e) => set('kind', e.target.value)} disabled={editingItem}>
              {creditCards.length ? <option value="cargo_tc">Se carga a la tarjeta</option> : null}
              <option value="pago">Lo pago en efectivo o desde el banco</option>
            </select>
          </label>
        )}
        <label className="full-span">
          <span>Qué es</span>
          <input value={form.concept} onChange={(e) => set('concept', e.target.value)} maxLength={120}
            placeholder={isIncome ? 'Ej. Quincena, Sueldo' : 'Ej. Netflix, Luz, Internet'} required />
        </label>
        <label>
          <span>Monto, si es fijo</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="Vacío si varía" />
        </label>
        <label>
          <span>Moneda</span>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
            <option value="GTQ">Quetzales</option>
            <option value="USD">Dólares</option>
          </select>
        </label>
        {form.kind === 'cargo_tc' ? (
          <label className="full-span">
            <span>Tarjeta</span>
            <select value={form.cardId} onChange={(e) => set('cardId', e.target.value)} required>
              {creditCards.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="full-span">
            <span>{isIncome ? 'Entra a' : 'Sale de'}</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)}>
              <option value="Efectivo">Efectivo</option>
              {bankAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        )}
        {currencyHelp ? <small className="full-span helper-text">{currencyHelp}</small> : null}
        <label>
          <span>{isIncome ? 'Desde' : 'Próximo cargo'}</span>
          <input type="date" value={form.start} onChange={(e) => set('start', e.target.value)} required />
        </label>
        <label>
          <span>Se repite</span>
          <select value={form.recurrence} onChange={(e) => set('recurrence', e.target.value)}>
            <option value="monthly">Cada mes</option>
            <option value="biweekly">Cada 2 semanas</option>
            <option value="weekly">Cada semana</option>
          </select>
        </label>
        <label>
          <span>Categoría</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">La elijo al confirmar</option>
            {(isIncome ? categories.ING : categories.EGR).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>Hasta, si termina</span>
          <input type="date" value={form.end} onChange={(e) => set('end', e.target.value)} />
        </label>
        {editingItem ? (
          <small className="full-span helper-text">Cambia todas las fechas pendientes. Las que ya confirmaste no cambian.</small>
        ) : null}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || !form.concept.trim()}>
            {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </form>
      )}
    </Sheet>
  )
}

// ── Ingresos fijos ───────────────────────────────────────────────────────────

function IncomePanel({ fixed, userId, api, creditCards, liquidAccounts, categories, showAmounts, onChanged, onError }) {
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const items = fixed?.incomes || []

  async function remove(item) {
    try {
      await api.deleteProgramado(item.item_id, userId)
      setRemoving(null)
      await onChanged('Se quitó de tus ingresos fijos.')
    } catch (err) {
      onError(err)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Ingresos fijos</h2>
        {items.length ? <strong>{q(fixed.monthly_income_gtq, showAmounts)} al mes</strong> : null}
      </div>
      {items.length === 0 ? (
        <p className="helper-text">Agrega tu sueldo o quincenas para verlos en el calendario y en la proyección.</p>
      ) : (
        <div className="rows">
          {items.map((item) => (
            <div key={item.item_id} className="fixed-row">
              <span className="cal-ico k-ingreso"><Icon name="ingreso" /></span>
              <div className="cal-main">
                <span className="cal-concept">{item.concept}</span>
                <span className="cal-kind">
                  {item.amount != null ? money(item.amount, item.currency, showAmounts) : 'Monto variable'}
                  {' · '}{EVERY[item.recurrence] || item.recurrence}
                  {item.next_date ? ` · próximo ${shortDate(item.next_date)}` : ''}
                </span>
                {item.account_name ? <span className="cal-kind">Entra a {item.account_name}</span> : null}
                {removing === item.item_id ? (
                  <span className="cal-remove">
                    <button type="button" className="link-btn danger" onClick={() => remove(item)}>Sí, quitar</button>
                    <button type="button" className="link-btn" onClick={() => setRemoving(null)}>Cancelar</button>
                  </span>
                ) : (
                  <span className="cal-remove">
                    <button type="button" className="link-btn" onClick={() => setEditing(item)}>Editar</button>
                    <button type="button" className="link-btn" onClick={() => setRemoving(item.item_id)}>Quitar</button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setEditing({})}>
        <span className="title-with-icon"><Icon name="plus" /> Agregar ingreso fijo</span>
      </button>

      {editing ? (
        <FixedSheet
          item={editing.item_id ? editing : null} defaultKind="ingreso"
          userId={userId} api={api} creditCards={creditCards} liquidAccounts={liquidAccounts} categories={categories}
          onClose={() => setEditing(null)}
          onDone={async (text) => { setEditing(null); await onChanged(text) }}
        />
      ) : null}
    </section>
  )
}

// ── Editar un programado de una sola vez ─────────────────────────────────────

function EditOneSheet({ row, userId, api, onClose, onDone }) {
  const [form, setForm] = useState({
    concept: row.concept,
    amount: row.amount != null ? String(row.amount) : '',
    date: row.date || '',
    note: row.note || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const fields = {
      telegram_user_id: Number(userId),
      concept: form.concept.trim(),
      note: form.note.trim() || null,
    }
    if (form.amount) fields.amount = Number(form.amount)
    if (!row.recurring) fields.start_date = form.date || null
    try {
      await api.patchProgramado(row.item_id, fields)
      await onDone('Cambios guardados.')
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <Sheet title="Editar" subtitle={KIND_LABEL[row.kind] || row.kind} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label className="full-span">
          <span>Qué es</span>
          <input value={form.concept} onChange={(e) => set('concept', e.target.value)} maxLength={120} required />
        </label>
        {row.kind !== 'recordatorio' ? (
          <label>
            <span>Monto{row.currency === 'USD' ? ' en dólares' : ''}</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount}
              onChange={(e) => set('amount', e.target.value)} placeholder="Vacío si varía" />
          </label>
        ) : null}
        {!row.recurring ? (
          <label>
            <span>Fecha</span>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <small className="helper-text">Vacía la deja en "Sin fecha".</small>
          </label>
        ) : null}
        <label className="full-span">
          <span>Nota</span>
          <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={300} />
        </label>
        {row.recurring ? (
          <small className="full-span helper-text">Se repite: el cambio aplica a todas las fechas pendientes.</small>
        ) : null}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || !form.concept.trim()}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
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
