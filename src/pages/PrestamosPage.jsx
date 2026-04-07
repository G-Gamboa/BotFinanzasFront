import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'
import { getGuatemalaDateString } from '../utils/dates'

const initialForm = {
  movementDate: getGuatemalaDateString(),
  action: 'DAR',
  sourceAccountName: '',
  targetAccountName: '',
  loanPersonName: '',
  amount: '',
  note: '',
  selectedConcept: 'General',
}

export default function PrestamosPage({ userId, api, catalogos, disponibles, onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [prestamosView, setPrestamosView] = useState({ items: [], total_people: 0 })
  const [loadingView, setLoadingView] = useState(false)

  const liquidAccounts = useMemo(
    () => (catalogos?.accounts?.liquid || []).map((a) => a.name),
    [catalogos]
  )

  const loanPeople = useMemo(
    () => (catalogos?.loan_people || []).map((p) => p.name),
    [catalogos]
  )

  const saldosLiquidos = useMemo(
    () => disponibles?.saldos_liquidos || [],
    [disponibles]
  )

  const selectedPersonData = useMemo(
    () => (prestamosView.items || []).find((item) => item.person === form.loanPersonName) || null,
    [prestamosView, form.loanPersonName]
  )

  const availableConcepts = useMemo(() => {
    if (!selectedPersonData) return []
    return selectedPersonData.concepts || []
  }, [selectedPersonData])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      sourceAccountName: prev.sourceAccountName || liquidAccounts[0] || '',
      targetAccountName: prev.targetAccountName || liquidAccounts[0] || '',
      loanPersonName: prev.loanPersonName || loanPeople[0] || '',
    }))
  }, [liquidAccounts, loanPeople])

  useEffect(() => {
    if (form.action !== 'COBRAR') return
    if (!availableConcepts.length) {
      if (form.selectedConcept !== 'General') {
        setForm((prev) => ({ ...prev, selectedConcept: 'General' }))
      }
      return
    }

    const exists = availableConcepts.some((c) => c.concept === form.selectedConcept)
    if (!exists) {
      setForm((prev) => ({ ...prev, selectedConcept: availableConcepts[0].concept }))
    }
  }, [form.action, availableConcepts, form.selectedConcept])

  async function loadPrestamosView() {
    if (!userId) return
    setLoadingView(true)
    try {
      const data = await api.getPrestamosView(userId)
      setPrestamosView(data || { items: [], total_people: 0 })
    } catch (err) {
      setError(err.message || 'No pude cargar el resumen de préstamos.')
    } finally {
      setLoadingView(false)
    }
  }

  useEffect(() => {
    loadPrestamosView()
  }, [userId])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function getSaldoDisponible(cuenta) {
    const found = saldosLiquidos.find((item) => item.cuenta === cuenta)
    return Number(found?.saldo || 0)
  }

  function getSelectedConceptBalance() {
    const found = availableConcepts.find((c) => c.concept === form.selectedConcept)
    return Number(found?.balance || 0)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const payload = {
        telegram_user_id: Number(userId),
        movement_type: 'MOV',
        movement_date: form.movementDate,
        mov_subtype: 'PRESTAMO',
        mov_direction: form.action,
        loan_person_name: form.loanPersonName,
        amount: Number(form.amount),
        note:
          form.action === 'DAR'
            ? (form.note?.trim() || null)
            : form.selectedConcept === 'General'
              ? null
              : form.selectedConcept,
      }

      if (form.action === 'DAR') {
        payload.source_account_name = form.sourceAccountName
      } else {
        payload.target_account_name = form.targetAccountName
      }

      await api.postMovimiento(payload)

      setMessage(
        form.action === 'DAR'
          ? 'Préstamo registrado correctamente.'
          : 'Cobro registrado correctamente.'
      )

      setForm((prev) => ({
        ...initialForm,
        movementDate: getGuatemalaDateString(),
        action: prev.action,
        sourceAccountName: liquidAccounts[0] || '',
        targetAccountName: liquidAccounts[0] || '',
        loanPersonName: loanPeople[0] || '',
        selectedConcept: 'General',
      }))

      await loadPrestamosView()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar el movimiento de préstamo.')
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
            <span>Fecha</span>
            <input
              type="date"
              value={form.movementDate}
              onChange={(e) => updateField('movementDate', e.target.value)}
              required
            />
          </label>

          <label>
            <span>Acción</span>
            <select
              value={form.action}
              onChange={(e) => updateField('action', e.target.value)}
            >
              <option value="DAR">Dar préstamo</option>
              <option value="COBRAR">Cobrar préstamo</option>
            </select>
          </label>

          <label>
            <span>Persona</span>
            <select
              value={form.loanPersonName}
              onChange={(e) => updateField('loanPersonName', e.target.value)}
            >
              {loanPeople.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {form.action === 'DAR' ? (
            <>
              <label>
                <span>Cuenta origen</span>
                <select
                  value={form.sourceAccountName}
                  onChange={(e) => updateField('sourceAccountName', e.target.value)}
                >
                  {liquidAccounts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {form.sourceAccountName ? (
                <div className="full-span helper-text">
                  Disponible en {form.sourceAccountName}: Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                </div>
              ) : null}

              <label className="full-span">
                <span>Nota / concepto</span>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => updateField('note', e.target.value)}
                  placeholder="Opcional. Si va vacío, se guarda como General"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Cuenta destino</span>
                <select
                  value={form.targetAccountName}
                  onChange={(e) => updateField('targetAccountName', e.target.value)}
                >
                  {liquidAccounts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Concepto a cobrar</span>
                <select
                  value={form.selectedConcept}
                  onChange={(e) => updateField('selectedConcept', e.target.value)}
                  disabled={!availableConcepts.length}
                >
                  {!availableConcepts.length ? (
                    <option value="General">Sin conceptos disponibles</option>
                  ) : (
                    availableConcepts.map((item) => (
                      <option key={item.concept} value={item.concept}>
                        {item.concept} · Q {Number(item.balance).toFixed(2)}
                      </option>
                    ))
                  )}
                </select>
              </label>

              {form.selectedConcept ? (
                <div className="full-span helper-text">
                  Disponible en {form.selectedConcept}: Q {getSelectedConceptBalance().toFixed(2)}
                </div>
              ) : null}
            </>
          )}

          <label>
            <span>Monto</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              required
            />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving
                ? 'Guardando...'
                : form.action === 'DAR'
                  ? 'Guardar préstamo'
                  : 'Registrar cobro'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Resumen por persona">
        {loadingView ? <div>Cargando...</div> : null}

        {!loadingView && !(prestamosView.items || []).length ? (
          <EmptyState text="No hay préstamos activos." />
        ) : null}

        <div className="loan-summary-list">
          {(prestamosView.items || []).map((item) => (
            <div key={item.person} className="loan-summary-card">
              <div className="loan-summary-header">
                <strong>{item.person}</strong>
                <span>Q {Number(item.total_balance).toFixed(2)}</span>
              </div>

              <div className="loan-concepts-list">
                {(item.concepts || []).map((concept) => (
                  <div key={`${item.person}-${concept.concept}`} className="loan-concept-row">
                    <span>{concept.concept}</span>
                    <span>Q {Number(concept.balance).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}