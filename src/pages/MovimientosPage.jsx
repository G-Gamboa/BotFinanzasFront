import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'

const initialForm = {
  movementType: 'EGR',
  movementDate: new Date().toISOString().slice(0, 10),
  amount: '',
  note: '',

  categoryName: '',
  paymentMethod: 'Efectivo',
  accountName: 'Efectivo',

  movSubtype: 'NORMAL',
  movDirection: 'NORMAL',
  sourceAccountName: '',
  targetAccountName: '',
  destinationAmount: '',
  loanPersonName: '',
}

export default function MovimientosPage({ userId, api, catalogos, disponibles, onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const liquidAccounts = useMemo(
    () => (catalogos?.accounts?.liquid || []).map((a) => a.name),
    [catalogos]
  )

  const investmentAccounts = useMemo(
    () => (catalogos?.accounts?.investment || []).map((a) => a.name),
    [catalogos]
  )

  const ingCategories = useMemo(
    () => (catalogos?.categories?.ing || []).map((c) => c.name),
    [catalogos]
  )

  const egrCategories = useMemo(
    () => (catalogos?.categories?.egr || []).map((c) => c.name),
    [catalogos]
  )

  const loanPeople = useMemo(
    () => (catalogos?.loan_people || []).map((p) => p.name),
    [catalogos]
  )

  const transferAccounts = useMemo(
    () => liquidAccounts.filter((name) => name !== 'Efectivo'),
    [liquidAccounts]
  )

  const ahorroDisponibles = useMemo(
    () => disponibles?.ahorro_por_cuenta || [],
    [disponibles]
  )

  const prestamosDisponibles = useMemo(
    () => disponibles?.prestamos_por_persona || [],
    [disponibles]
  )

  const saldosLiquidos = useMemo(
    () => disponibles?.saldos_liquidos || [],
    [disponibles]
  )

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      categoryName:
        prev.movementType === 'ING'
          ? (ingCategories[0] || '')
          : prev.movementType === 'EGR'
            ? (egrCategories[0] || '')
            : '',
      sourceAccountName: prev.sourceAccountName || liquidAccounts[0] || '',
      targetAccountName: prev.targetAccountName || liquidAccounts[1] || liquidAccounts[0] || '',
      accountName:
        prev.paymentMethod === 'Transferencia'
          ? (transferAccounts[0] || '')
          : 'Efectivo',
      loanPersonName: prev.loanPersonName || loanPeople[0] || '',
    }))
  }, [ingCategories, egrCategories, liquidAccounts, transferAccounts, loanPeople])

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'movementType') {
        if (value === 'ING') {
          next.categoryName = ingCategories[0] || ''
          next.paymentMethod = 'Efectivo'
          next.accountName = 'Efectivo'
        } else if (value === 'EGR') {
          next.categoryName = egrCategories[0] || ''
          next.paymentMethod = 'Efectivo'
          next.accountName = 'Efectivo'
        } else if (value === 'MOV') {
          next.categoryName = ''
        }
      }

      if (field === 'paymentMethod') {
        next.accountName = value === 'Transferencia' ? (transferAccounts[0] || '') : 'Efectivo'
      }

      if (field === 'movSubtype') {
        if (value === 'NORMAL') {
          next.movDirection = 'NORMAL'
        }
        if (value === 'AHORRO') {
          next.movDirection = 'GUARDAR'
          next.targetAccountName = ''
          next.sourceAccountName = liquidAccounts[0] || ''
        }
        if (value === 'INVERSION') {
          next.movDirection = 'INVERTIR'
          next.sourceAccountName = liquidAccounts[0] || ''
          next.targetAccountName = investmentAccounts[0] || ''
        }
        if (value === 'PRESTAMO') {
          next.movDirection = 'DAR'
          next.sourceAccountName = liquidAccounts[0] || ''
          next.targetAccountName = ''
          next.loanPersonName = loanPeople[0] || ''
        }
      }

      return next
    })
  }

  function getAhorroDisponible(cuenta) {
    const found = ahorroDisponibles.find((item) => item.cuenta === cuenta)
    return Number(found?.saldo || 0)
  }

  function getPrestamoDisponible(persona) {
    const found = prestamosDisponibles.find((item) => item.persona === persona)
    return Number(found?.saldo || 0)
  }

  function getSaldoDisponible(cuenta) {
    const found = saldosLiquidos.find((item) => item.cuenta === cuenta)
    return Number(found?.saldo || 0)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      let payload = null

      if (form.movementType === 'ING' || form.movementType === 'EGR') {
        payload = {
          telegram_user_id: Number(userId),
          movement_type: form.movementType,
          movement_date: form.movementDate,
          amount: Number(form.amount),
          note: form.note || null,
          category_name: form.categoryName,
          payment_method: form.paymentMethod,
          account_name: form.paymentMethod === 'Transferencia' ? form.accountName : 'Efectivo',
        }
      }

      if (form.movementType === 'MOV') {
        payload = {
          telegram_user_id: Number(userId),
          movement_type: 'MOV',
          movement_date: form.movementDate,
          amount: Number(form.amount),
          note: form.note || null,
          mov_subtype: form.movSubtype,
          mov_direction: form.movDirection,
          destination_amount:
            form.destinationAmount === '' ? undefined : Number(form.destinationAmount),
        }

        if (form.movSubtype === 'NORMAL') {
          payload.source_account_name = form.sourceAccountName
          payload.target_account_name = form.targetAccountName
        }

        if (form.movSubtype === 'AHORRO') {
          if (form.movDirection === 'GUARDAR') {
            payload.source_account_name = form.sourceAccountName
          } else {
            payload.target_account_name = form.targetAccountName
          }
        }

        if (form.movSubtype === 'INVERSION') {
          payload.source_account_name = form.sourceAccountName
          payload.target_account_name = form.targetAccountName
        }

        if (form.movSubtype === 'PRESTAMO') {
          payload.loan_person_name = form.loanPersonName
          if (form.movDirection === 'DAR') {
            payload.source_account_name = form.sourceAccountName
          } else {
            payload.target_account_name = form.targetAccountName
          }
        }
      }

      await api.postMovimiento(payload)

      setMessage('Movimiento guardado correctamente.')
      setForm((prev) => ({
        ...initialForm,
        movementType: prev.movementType,
        movementDate: new Date().toISOString().slice(0, 10),
        categoryName:
          prev.movementType === 'ING'
            ? (ingCategories[0] || '')
            : prev.movementType === 'EGR'
              ? (egrCategories[0] || '')
              : '',
        sourceAccountName: liquidAccounts[0] || '',
        targetAccountName: liquidAccounts[1] || liquidAccounts[0] || '',
        accountName: 'Efectivo',
        loanPersonName: loanPeople[0] || '',
      }))

      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid-page single-col">
      <Panel title="Nuevo movimiento">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Tipo</span>
            <select value={form.movementType} onChange={(e) => updateField('movementType', e.target.value)}>
              <option value="ING">Ingreso</option>
              <option value="EGR">Egreso</option>
              <option value="MOV">Movimiento</option>
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={form.movementDate}
              onChange={(e) => updateField('movementDate', e.target.value)}
              required
            />
          </label>

          {(form.movementType === 'ING' || form.movementType === 'EGR') && (
            <>
              <label>
                <span>Categoría</span>
                <select value={form.categoryName} onChange={(e) => updateField('categoryName', e.target.value)}>
                  {(form.movementType === 'ING' ? ingCategories : egrCategories).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Método</span>
                <select value={form.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>

              {form.paymentMethod === 'Transferencia' && (
                <label>
                  <span>Cuenta</span>
                  <select value={form.accountName} onChange={(e) => updateField('accountName', e.target.value)}>
                    {transferAccounts.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}

{form.movementType === 'EGR' ? (
  <div className="full-span helper-text">
    Disponible: Q{' '}
    {getSaldoDisponible(form.paymentMethod === 'Transferencia' ? form.accountName : 'Efectivo').toFixed(2)}
  </div>
) : null}
            </>
          )}

          {form.movementType === 'MOV' && (
            <>
              <label>
                <span>Subtipo</span>
                <select value={form.movSubtype} onChange={(e) => updateField('movSubtype', e.target.value)}>
                  <option value="NORMAL">Normal</option>
                  <option value="AHORRO">Ahorro</option>
                  <option value="INVERSION">Inversión</option>
                  {catalogos?.user?.can_use_loans ? <option value="PRESTAMO">Préstamo</option> : null}
                </select>
              </label>

              {form.movSubtype === 'NORMAL' && (
                <>
                  <label>
                    <span>Cuenta origen</span>
                    <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
                      {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Cuenta destino</span>
                    <select value={form.targetAccountName} onChange={(e) => updateField('targetAccountName', e.target.value)}>
                      {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>

                  {form.sourceAccountName ? (
                    <div className="full-span helper-text">
                      Disponible en {form.sourceAccountName}: Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                    </div>
                  ) : null}
                </>
              )}

              {form.movSubtype === 'AHORRO' && (
                <>
                  <label>
                    <span>Acción</span>
                    <select value={form.movDirection} onChange={(e) => updateField('movDirection', e.target.value)}>
                      <option value="GUARDAR">Guardar</option>
                      <option value="RETIRAR">Retirar</option>
                    </select>
                  </label>

                  {form.movDirection === 'GUARDAR' ? (
                    <>
                      <label>
                        <span>Cuenta origen</span>
                        <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
                          {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      {form.sourceAccountName ? (
                        <div className="full-span helper-text">
                          Disponible en {form.sourceAccountName}: Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label>
                        <span>Cuenta destino</span>
<select
  value={form.targetAccountName}
  onChange={(e) => updateField('targetAccountName', e.target.value)}
>
  {ahorroDisponibles.map((item) => (
    <option key={item.cuenta} value={item.cuenta}>
      {item.cuenta} · Disponible Q {Number(item.saldo).toFixed(2)}
    </option>
  ))}
</select>
                      </label>

                      {form.targetAccountName ? (
                        <div className="full-span helper-text">
                          Disponible en ahorro para {form.targetAccountName}: Q {getAhorroDisponible(form.targetAccountName).toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}

              {form.movSubtype === 'INVERSION' && (
                <>
                  <label>
                    <span>Acción</span>
                    <select value={form.movDirection} onChange={(e) => updateField('movDirection', e.target.value)}>
                      <option value="INVERTIR">Invertir</option>
                      <option value="RETIRAR_INV">Retirar</option>
                    </select>
                  </label>

                  {form.movDirection === 'INVERTIR' ? (
                    <>
                      <label>
                        <span>Cuenta origen</span>
                        <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
                          {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label>
                        <span>Cuenta inversión</span>
                        <select value={form.targetAccountName} onChange={(e) => updateField('targetAccountName', e.target.value)}>
                          {investmentAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      {form.sourceAccountName ? (
                        <div className="full-span helper-text">
                          Disponible en {form.sourceAccountName}: Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label>
                        <span>Cuenta inversión</span>
                        <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
                          {investmentAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label>
                        <span>Cuenta destino</span>
                        <select value={form.targetAccountName} onChange={(e) => updateField('targetAccountName', e.target.value)}>
                          {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                    </>
                  )}

                  <label>
                    <span>Monto destino</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.destinationAmount}
                      onChange={(e) => updateField('destinationAmount', e.target.value)}
                    />
                  </label>
                </>
              )}

              {form.movSubtype === 'PRESTAMO' && catalogos?.user?.can_use_loans && (
                <>
                  <label>
                    <span>Acción</span>
                    <select value={form.movDirection} onChange={(e) => updateField('movDirection', e.target.value)}>
                      <option value="DAR">Dar</option>
                      <option value="COBRAR">Cobrar</option>
                    </select>
                  </label>

                  <label>
                    <span>Persona</span>
                    <select value={form.loanPersonName} onChange={(e) => updateField('loanPersonName', e.target.value)}>
                      {loanPeople.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>

                  {form.movDirection === 'DAR' ? (
                    <>
                      <label>
                        <span>Cuenta origen</span>
                        <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
                          {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      {form.sourceAccountName ? (
                        <div className="full-span helper-text">
                          Disponible en {form.sourceAccountName}: Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label>
                        <span>Cuenta destino</span>
                        <select value={form.targetAccountName} onChange={(e) => updateField('targetAccountName', e.target.value)}>
                          {liquidAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      {form.loanPersonName ? (
                        <div className="full-span helper-text">
                          Disponible para cobrar a {form.loanPersonName}: Q {getPrestamoDisponible(form.loanPersonName).toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}
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

          <label className="full-span">
            <span>Nota</span>
            <input
              type="text"
              value={form.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="Opcional"
            />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !userId}>
              {saving ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}