import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import { getLiquidAccounts, getLoanPeople } from '../lib/accountFilters'

function todayLocal() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const initialForm = {
  movement_date: todayLocal(),
  accion: 'DAR',
  loan_person_name: '',
  account_name: '',
  amount: '',
  note: '',
}

export default function PrestamosPage({ userId, api, catalogos, disponibles, onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const personas = useMemo(() => getLoanPeople(catalogos), [catalogos])
  const cuentas = useMemo(() => getLiquidAccounts(catalogos), [catalogos])
  const loanBalances = useMemo(() => new Map((disponibles?.prestamos_por_persona || []).map((item) => [item.persona, Number(item.saldo || 0)])), [disponibles])
  const liquidBalances = useMemo(() => new Map((disponibles?.saldos_liquidos || []).map((item) => [item.cuenta, Number(item.saldo || 0)])), [disponibles])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      loan_person_name: prev.loan_person_name || personas[0]?.name || '',
      account_name: prev.account_name || cuentas[0]?.name || '',
    }))
  }, [personas, cuentas])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function helper() {
    if (form.accion === 'DAR') return form.account_name ? `Disponible: ${money(liquidBalances.get(form.account_name) ?? 0)}` : ''
    return form.loan_person_name ? `Disponible por cobrar: ${money(loanBalances.get(form.loan_person_name) ?? 0)}` : ''
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const amount = Number(form.amount)
      if (!amount || amount <= 0) throw new Error('Ingresa un monto válido.')

      if (form.accion === 'DAR') {
        const available = liquidBalances.get(form.account_name) ?? 0
        if (amount > available) throw new Error(`No puedes prestar más de ${money(available)} desde ${form.account_name}.`)
      } else {
        const available = loanBalances.get(form.loan_person_name) ?? 0
        if (amount > available) throw new Error(`No puedes cobrar más de ${money(available)} a ${form.loan_person_name}.`)
      }

      const payload = {
        telegram_user_id: Number(userId),
        movement_type: 'MOV',
        movement_date: form.movement_date,
        amount,
        note: form.note || null,
        mov_subtype: 'PRESTAMO',
        mov_direction: form.accion,
        loan_person_name: form.loan_person_name,
      }

      if (form.accion === 'DAR') payload.source_account_name = form.account_name
      if (form.accion === 'COBRAR') payload.target_account_name = form.account_name

      await api.postMovimiento(payload)
      setMessage('Préstamo registrado correctamente.')
      setForm({ ...initialForm, movement_date: todayLocal() })
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude registrar el préstamo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid-page single-col">
      <Panel title="Préstamos">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Acción</span>
            <select value={form.accion} onChange={(e) => update('accion', e.target.value)}>
              <option value="DAR">Dar</option>
              <option value="COBRAR">Cobrar</option>
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={form.movement_date} onChange={(e) => update('movement_date', e.target.value)} required />
          </label>

          <label>
            <span>Persona</span>
            <select value={form.loan_person_name} onChange={(e) => update('loan_person_name', e.target.value)} required>
              <option value="">Selecciona</option>
              {personas.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </label>

          <label>
            <span>Cuenta</span>
            <select value={form.account_name} onChange={(e) => update('account_name', e.target.value)} required>
              <option value="">Selecciona</option>
              {cuentas.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>

          <label>
            <span>Monto</span>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
            {helper() ? <small className="field-help">{helper()}</small> : null}
          </label>

          <label className="full-span">
            <span>Nota</span>
            <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !userId}>
              {saving ? 'Guardando...' : 'Guardar préstamo'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}

function money(value) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(value || 0))
}
