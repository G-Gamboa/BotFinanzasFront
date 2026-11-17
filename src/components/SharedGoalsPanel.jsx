import { useMemo, useState } from 'react'
import Panel from './Panel'
import Sheet from './Sheet'
import Icon from './Icons'
import MessageBanner from './MessageBanner'
import { getGuatemalaDateString } from '../utils/dates'
import { fmtDate, q } from '../lib/format'

export default function SharedGoalsPanel({ userId, api, sharedGoals, catalogos, disponibles, onRefreshData }) {
  const [sheet, setSheet] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(null)

  const goals = sharedGoals?.items || []
  const partners = sharedGoals?.partners || []

  const liquidAccounts = useMemo(() => {
    const balances = {}
    ;(disponibles?.saldos_liquidos || []).forEach((s) => { balances[s.cuenta] = Number(s.saldo || 0) })
    return (catalogos?.accounts?.liquid || []).map((a) => ({ name: a.name, balance: balances[a.name] ?? 0 }))
  }, [catalogos, disponibles])

  const savedByAccount = useMemo(
    () => (disponibles?.ahorro_por_cuenta || []).map((a) => ({ name: a.cuenta, balance: Number(a.saldo || 0) })),
    [disponibles]
  )

  if (!sharedGoals?.can_use) return null

  function done(text) {
    setSheet(null)
    setClosing(null)
    setMessage(text)
    setError('')
    onRefreshData?.()
  }

  async function closeGoal(goal) {
    try {
      await api.deleteMetaConjunta(goal.id, userId)
      done('Meta conjunta cerrada.')
    } catch (err) {
      setError(err.message || 'No se pudo cerrar la meta.')
    }
  }

  return (
    <Panel title="Metas conjuntas">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <p className="helper-text" style={{ margin: '0 0 12px' }}>
        Cada quien aporta desde sus cuentas a su propio ahorro y la meta suma lo de ambos.
        La otra persona ve la meta y los aportes, no tus cuentas.
      </p>

      {goals.length === 0 ? (
        <p className="helper-text" style={{ margin: '0 0 12px' }}>Todavía no hay metas conjuntas.</p>
      ) : (
        <div className="list-stack" style={{ marginBottom: 14 }}>
          {goals.map((goal) => <GoalCard key={goal.id} goal={goal} closing={closing === goal.id}
            onContribute={() => setSheet({ type: 'aportar', goal })}
            onWithdraw={() => setSheet({ type: 'retirar', goal })}
            onEdit={() => setSheet({ type: 'editar', goal })}
            onAskClose={() => setClosing(goal.id)}
            onCancelClose={() => setClosing(null)}
            onClose={() => closeGoal(goal)} />)}
        </div>
      )}

      {partners.length === 0 ? (
        <p className="helper-text">La otra persona todavía no tiene cuenta activa en el bot.</p>
      ) : (
        <button type="button" className="ghost-btn" onClick={() => setSheet({ type: 'crear' })}>
          <span className="title-with-icon"><Icon name="plus" /> Nueva meta conjunta</span>
        </button>
      )}

      {sheet?.type === 'crear' || sheet?.type === 'editar' ? (
        <GoalFormSheet goal={sheet.goal} partners={partners} userId={userId} api={api}
          onClose={() => setSheet(null)}
          onDone={() => done(sheet.type === 'crear' ? 'Meta conjunta creada.' : 'Meta conjunta actualizada.')} />
      ) : null}
      {sheet?.type === 'aportar' || sheet?.type === 'retirar' ? (
        <MoveSheet type={sheet.type} goal={sheet.goal} userId={userId} api={api}
          accounts={sheet.type === 'aportar' ? liquidAccounts : savedByAccount}
          onClose={() => setSheet(null)}
          onDone={() => done(sheet.type === 'aportar' ? 'Aporte registrado.' : 'Retiro registrado.')} />
      ) : null}
    </Panel>
  )
}

export function SharedGoalBar({ goal }) {
  const target = Math.max(goal.target_amount, 0.01)
  return (
    <div className="goal-bar" role="img" aria-label={`${q(goal.total)} de ${q(goal.target_amount)}`}>
      {goal.members.map((m, i) => (
        <span key={m.name + i} className={m.is_me ? 'mine' : 'theirs'}
          style={{ width: `${Math.max(0, Math.min(100, (m.amount / target) * 100))}%` }} />
      ))}
    </div>
  )
}

function GoalCard({ goal, closing, onContribute, onWithdraw, onEdit, onAskClose, onCancelClose, onClose }) {
  const reached = goal.remaining <= 0
  return (
    <div className="item-card">
      <div className="item-head">
        <strong className="title-with-icon"><Icon name={reached ? 'check' : 'target'} /> {goal.name}</strong>
        <strong>{q(goal.total)}</strong>
      </div>
      <SharedGoalBar goal={goal} />
      <div className="goal-key">
        {goal.members.map((m, i) => (
          <span key={m.name + i}><i className={`sw ${m.is_me ? 'mine' : 'theirs'}`} />{m.is_me ? 'Tú' : m.name} {q(m.amount)}</span>
        ))}
      </div>
      <div className="item-meta">
        <span>Meta {q(goal.target_amount)}</span>
        <span>{reached ? 'Meta alcanzada' : `Faltan ${q(goal.remaining)}`}</span>
        {goal.target_date ? <span>Para el {fmtDate(goal.target_date)}</span> : null}
        {goal.monthly_needed ? <span>{q(goal.monthly_needed)} al mes entre ambos</span> : null}
      </div>

      <div className="item-actions">
        <button type="button" className="link-btn" onClick={onEdit}>Editar</button>
        {goal.is_creator && !closing ? <button type="button" className="link-btn" onClick={onAskClose}>Cerrar meta</button> : null}
        {closing ? (
          <>
            <button type="button" className="link-btn danger" onClick={onClose}>Sí, cerrar</button>
            <button type="button" className="link-btn" onClick={onCancelClose}>Cancelar</button>
          </>
        ) : null}
        {goal.my_amount > 0 ? <button type="button" className="ghost-btn" onClick={onWithdraw}>Retirar</button> : null}
        <button type="button" className="confirm-btn" onClick={onContribute}>Aportar</button>
      </div>

      {goal.contributions.length > 0 ? (
        <details>
          <summary className="link-btn" style={{ cursor: 'pointer' }}>Ver aportes</summary>
          <div className="rows" style={{ marginTop: 8 }}>
            {goal.contributions.map((c) => (
              <div className="row-line sub" key={c.id}>
                <span>{fmtDate(c.date)} · {c.is_me ? 'Tú' : c.name}</span>
                <strong className={c.amount < 0 ? 'neg' : ''}>{c.amount < 0 ? `− ${q(-c.amount)}` : q(c.amount)}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function GoalFormSheet({ goal, partners, userId, api, onClose, onDone }) {
  const editing = Boolean(goal)
  const [form, setForm] = useState({
    name: goal?.name || '',
    target: goal ? String(goal.target_amount) : '',
    date: goal?.target_date || '',
    partnerIds: partners.length === 1 ? [partners[0].telegram_user_id] : [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  function togglePartner(id) {
    setForm((prev) => ({
      ...prev,
      partnerIds: prev.partnerIds.includes(id) ? prev.partnerIds.filter((x) => x !== id) : [...prev.partnerIds, id],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const base = {
        telegram_user_id: Number(userId),
        name: form.name.trim(),
        target_amount: Number(form.target),
        target_date: form.date || null,
      }
      if (editing) await api.patchMetaConjunta(goal.id, base)
      else await api.postMetaConjunta({ ...base, partner_ids: form.partnerIds })
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la meta.')
      setSaving(false)
    }
  }

  return (
    <Sheet title={editing ? 'Editar meta conjunta' : 'Nueva meta conjunta'} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      <form className="form-grid" onSubmit={submit}>
        <label className="full-span">
          <span>Nombre</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} placeholder="Ej. Viaje a la playa" required />
        </label>
        <label>
          <span>Monto objetivo</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.target} onChange={(e) => set('target', e.target.value)} required />
        </label>
        <label>
          <span>Fecha límite, si tiene</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        {!editing ? (
          <div className="full-span" style={{ display: 'grid', gap: 6 }}>
            <span className="helper-text">Con quién</span>
            {partners.map((p) => (
              <label key={p.telegram_user_id} className="check-label">
                <input type="checkbox" checked={form.partnerIds.includes(p.telegram_user_id)} onChange={() => togglePartner(p.telegram_user_id)} />
                {p.name}
              </label>
            ))}
          </div>
        ) : null}
        <div className="full-span form-actions">
          <button className="primary-btn" type="submit" disabled={saving || (!editing && form.partnerIds.length === 0)}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear meta'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function MoveSheet({ type, goal, accounts, userId, api, onClose, onDone }) {
  const isContribution = type === 'aportar'
  const usable = isContribution ? accounts : accounts.filter((a) => a.balance > 0)
  const [form, setForm] = useState({
    amount: '',
    date: getGuatemalaDateString(),
    account: (usable.find((a) => a.balance > 0) || usable[0])?.name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const selected = usable.find((a) => a.name === form.account)
  const limit = isContribution ? selected?.balance ?? 0 : Math.min(selected?.balance ?? 0, goal.my_amount)
  const over = Number(form.amount) > limit + 0.001

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId), amount: Number(form.amount),
        account_name: form.account, movement_date: form.date,
      }
      if (isContribution) await api.aportarMetaConjunta(goal.id, payload)
      else await api.retirarMetaConjunta(goal.id, payload)
      onDone()
    } catch (err) {
      setError(err.message || 'No se pudo registrar.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      title={isContribution ? `Aportar a ${goal.name}` : `Retirar de ${goal.name}`}
      subtitle={isContribution ? `Van ${q(goal.total)} de ${q(goal.target_amount)}` : `Tu aporte: ${q(goal.my_amount)}`}
      onClose={onClose}
    >
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      {usable.length === 0 ? (
        <p className="helper-text">No tienes ahorro disponible para retirar.</p>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Monto</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} required autoFocus />
          </label>
          <label>
            <span>Fecha</span>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          </label>
          <label className="full-span">
            <span>{isContribution ? 'Sale de' : 'Regresa a'}</span>
            <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
              {usable.map((a) => <option key={a.name} value={a.name}>{a.name} · {q(a.balance)}</option>)}
            </select>
          </label>
          <small className="full-span helper-text" style={over ? { color: 'var(--danger)' } : undefined}>
            {isContribution
              ? `El dinero pasa de ${form.account || 'tu cuenta'} a tu ahorro. Disponible: ${q(limit)}.`
              : `Puedes retirar hasta ${q(limit)}: lo que aportaste y sigue ahorrado desde ${form.account}.`}
          </small>
          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !form.amount || over}>
              {saving ? 'Guardando...' : isContribution ? 'Registrar aporte' : 'Registrar retiro'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
