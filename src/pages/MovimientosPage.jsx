import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import {
  getLiquidAccounts,
  getInvestmentAccounts,
  getIngCategories,
  getEgrCategories,
} from '../lib/accountFilters'

function todayLocal() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const baseState = {
  entryType: 'EGR',
  movSubtype: 'NORMAL',
  movDirection: 'NORMAL',
  movement_date: todayLocal(),
  amount: '',
  destination_amount: '',
  note: '',
  category_name: '',
  payment_method: 'Efectivo',
  account_name: '',
  source_account_name: '',
  target_account_name: '',
}

export default function MovimientosPage({ userId, api, catalogos, disponibles, onRefreshData }) {
  const [form, setForm] = useState(baseState)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const liquidAccounts = useMemo(() => getLiquidAccounts(catalogos), [catalogos])
  const investmentAccounts = useMemo(() => getInvestmentAccounts(catalogos), [catalogos])
  const ingCategories = useMemo(() => getIngCategories(catalogos), [catalogos])
  const egrCategories = useMemo(() => getEgrCategories(catalogos), [catalogos])
  const liquidBalances = useMemo(() => new Map((disponibles?.saldos_liquidos || []).map((item) => [item.cuenta, Number(item.saldo || 0)])), [disponibles])
  const ahorroBalances = useMemo(() => new Map((disponibles?.ahorro_por_cuenta || []).map((item) => [item.cuenta, Number(item.saldo || 0)])), [disponibles])

  useEffect(() => {
    if (!catalogos) return
    setForm((prev) => ({
      ...prev,
      category_name: prev.entryType === 'ING'
        ? (prev.category_name || ingCategories[0]?.name || '')
        : (prev.entryType === 'EGR' ? (prev.category_name || egrCategories[0]?.name || '') : ''),
      account_name: prev.account_name || liquidAccounts[0]?.name || '',
      source_account_name: prev.source_account_name || liquidAccounts[0]?.name || '',
      target_account_name: prev.target_account_name || liquidAccounts[1]?.name || liquidAccounts[0]?.name || '',
    }))
  }, [catalogos, ingCategories, egrCategories, liquidAccounts])

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'entryType') {
        next.amount = ''
        next.destination_amount = ''
        next.note = ''
        if (value === 'ING') {
          next.category_name = ingCategories[0]?.name || ''
          next.account_name = liquidAccounts[0]?.name || ''
          next.payment_method = 'Efectivo'
        } else if (value === 'EGR') {
          next.category_name = egrCategories[0]?.name || ''
          next.account_name = liquidAccounts[0]?.name || ''
          next.payment_method = 'Efectivo'
        } else {
          next.movSubtype = 'NORMAL'
          next.movDirection = 'NORMAL'
          next.source_account_name = liquidAccounts[0]?.name || ''
          next.target_account_name = liquidAccounts[1]?.name || liquidAccounts[0]?.name || ''
        }
      }

      if (field === 'movSubtype') {
        if (value === 'NORMAL') {
          next.movDirection = 'NORMAL'
          next.source_account_name = liquidAccounts[0]?.name || ''
          next.target_account_name = liquidAccounts[1]?.name || liquidAccounts[0]?.name || ''
        }
        if (value === 'AHORRO') {
          next.movDirection = 'GUARDAR'
          next.source_account_name = liquidAccounts[0]?.name || ''
          next.target_account_name = liquidAccounts[0]?.name || ''
        }
        if (value === 'INVERSION') {
          next.movDirection = 'INVERTIR'
          next.source_account_name = liquidAccounts[0]?.name || ''
          next.target_account_name = investmentAccounts[0]?.name || ''
        }
      }

      if (field === 'movDirection') {
        if (value === 'RETIRAR') next.target_account_name = form.target_account_name || liquidAccounts[0]?.name || ''
        if (value === 'RETIRAR_INV') {
          next.source_account_name = investmentAccounts[0]?.name || ''
          next.target_account_name = liquidAccounts[0]?.name || ''
        }
        if (value === 'INVERTIR') {
          next.source_account_name = liquidAccounts[0]?.name || ''
          next.target_account_name = investmentAccounts[0]?.name || ''
        }
      }

      return next
    })
  }

  function getAmountHelp() {
    if (form.entryType === 'EGR') {
      return form.account_name ? `Disponible: ${money(liquidBalances.get(form.account_name) ?? 0)}` : ''
    }
    if (form.entryType !== 'MOV') return ''
    if (form.movSubtype === 'NORMAL') {
      return form.source_account_name ? `Disponible: ${money(liquidBalances.get(form.source_account_name) ?? 0)}` : ''
    }
    if (form.movSubtype === 'AHORRO') {
      if (form.movDirection === 'GUARDAR') return form.source_account_name ? `Disponible: ${money(liquidBalances.get(form.source_account_name) ?? 0)}` : ''
      return form.target_account_name ? `Disponible en ahorro: ${money(ahorroBalances.get(form.target_account_name) ?? 0)}` : ''
    }
    if (form.movSubtype === 'INVERSION') {
      if (form.movDirection === 'INVERTIR') return form.source_account_name ? `Disponible: ${money(liquidBalances.get(form.source_account_name) ?? 0)}` : ''
    }
    return ''
  }

  function validateBeforeSubmit() {
    const amount = Number(form.amount)
    if (!amount || amount <= 0) throw new Error('Ingresa un monto válido.')

    if (form.entryType === 'EGR') {
      const available = liquidBalances.get(form.account_name) ?? 0
      if (amount > available) throw new Error(`No puedes egresar más de ${money(available)} desde ${form.account_name}.`)
    }

    if (form.entryType === 'MOV') {
      if (form.movSubtype === 'NORMAL') {
        if (form.source_account_name === form.target_account_name) {
          throw new Error('La cuenta origen y destino no pueden ser iguales.')
        }
        const available = liquidBalances.get(form.source_account_name) ?? 0
        if (amount > available) throw new Error(`No puedes mover más de ${money(available)} desde ${form.source_account_name}.`)
      }
      if (form.movSubtype === 'AHORRO') {
        if (form.movDirection === 'GUARDAR') {
          const available = liquidBalances.get(form.source_account_name) ?? 0
          if (amount > available) throw new Error(`No puedes guardar más de ${money(available)} desde ${form.source_account_name}.`)
        } else {
          const available = ahorroBalances.get(form.target_account_name) ?? 0
          if (amount > available) throw new Error(`No puedes retirar más de ${money(available)} del ahorro de ${form.target_account_name}.`)
        }
      }
      if (form.movSubtype === 'INVERSION' && form.movDirection === 'INVERTIR') {
        const available = liquidBalances.get(form.source_account_name) ?? 0
        if (amount > available) throw new Error(`No puedes invertir más de ${money(available)} desde ${form.source_account_name}.`)
      }
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      validateBeforeSubmit()

      const payload = {
        telegram_user_id: Number(userId),
        movement_type: form.entryType,
        movement_date: form.movement_date,
        amount: Number(form.amount),
        note: form.note || null,
      }

      if (form.entryType === 'ING' || form.entryType === 'EGR') {
        Object.assign(payload, {
          category_name: form.category_name,
          payment_method: form.payment_method,
          account_name: form.account_name,
        })
      }

      if (form.entryType === 'MOV') {
        Object.assign(payload, {
          mov_subtype: form.movSubtype,
          mov_direction: form.movDirection,
        })

        if (form.destination_amount !== '') {
          payload.destination_amount = Number(form.destination_amount)
        }

        if (form.movSubtype === 'NORMAL') {
          payload.source_account_name = form.source_account_name
          payload.target_account_name = form.target_account_name
        }

        if (form.movSubtype === 'AHORRO') {
          if (form.movDirection === 'GUARDAR') payload.source_account_name = form.source_account_name
          if (form.movDirection === 'RETIRAR') payload.target_account_name = form.target_account_name
        }

        if (form.movSubtype === 'INVERSION') {
          if (form.movDirection === 'INVERTIR') {
            payload.source_account_name = form.source_account_name
            payload.target_account_name = form.target_account_name
          }
          if (form.movDirection === 'RETIRAR_INV') {
            payload.source_account_name = form.source_account_name
            payload.target_account_name = form.target_account_name
          }
        }
      }

      await api.postMovimiento(payload)
      setMessage('Movimiento guardado correctamente.')
      setForm((prev) => ({ ...baseState, entryType: prev.entryType, movement_date: todayLocal() }))
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  const amountHelp = getAmountHelp()
  const canShowDestinationAmount = form.entryType === 'MOV' && (
    form.movSubtype === 'NORMAL' || form.movSubtype === 'INVERSION'
  )

  return (
    <div className="grid-page single-col">
      <Panel title="Nuevo movimiento">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Tipo</span>
            <select value={form.entryType} onChange={(e) => update('entryType', e.target.value)}>
              <option value="ING">Ingreso</option>
              <option value="EGR">Egreso</option>
              <option value="MOV">Movimiento</option>
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={form.movement_date} onChange={(e) => update('movement_date', e.target.value)} required />
          </label>

          {(form.entryType === 'ING' || form.entryType === 'EGR') && (
            <>
              <label>
                <span>Categoría</span>
                <select value={form.category_name} onChange={(e) => update('category_name', e.target.value)} required>
                  <option value="">Selecciona</option>
                  {(form.entryType === 'ING' ? ingCategories : egrCategories).map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Método</span>
                <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>

              <label>
                <span>Cuenta</span>
                <select value={form.account_name} onChange={(e) => update('account_name', e.target.value)} required>
                  <option value="">Selecciona</option>
                  {liquidAccounts.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {form.entryType === 'MOV' && (
            <>
              <label>
                <span>Tipo de movimiento</span>
                <select value={form.movSubtype} onChange={(e) => update('movSubtype', e.target.value)}>
                  <option value="NORMAL">Normal</option>
                  <option value="AHORRO">Ahorro</option>
                  <option value="INVERSION">Inversión</option>
                </select>
              </label>

              {form.movSubtype === 'AHORRO' && (
                <label>
                  <span>Acción</span>
                  <select value={form.movDirection} onChange={(e) => update('movDirection', e.target.value)}>
                    <option value="GUARDAR">Guardar</option>
                    <option value="RETIRAR">Retirar</option>
                  </select>
                </label>
              )}

              {form.movSubtype === 'INVERSION' && (
                <label>
                  <span>Acción</span>
                  <select value={form.movDirection} onChange={(e) => update('movDirection', e.target.value)}>
                    <option value="INVERTIR">Invertir</option>
                    <option value="RETIRAR_INV">Retirar</option>
                  </select>
                </label>
              )}

              {form.movSubtype === 'NORMAL' && (
                <>
                  <label>
                    <span>Cuenta origen</span>
                    <select value={form.source_account_name} onChange={(e) => update('source_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {liquidAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Cuenta destino</span>
                    <select value={form.target_account_name} onChange={(e) => update('target_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {liquidAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                </>
              )}

              {form.movSubtype === 'AHORRO' && form.movDirection === 'GUARDAR' && (
                <label>
                  <span>Cuenta origen</span>
                  <select value={form.source_account_name} onChange={(e) => update('source_account_name', e.target.value)} required>
                    <option value="">Selecciona</option>
                    {liquidAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  </select>
                </label>
              )}

              {form.movSubtype === 'AHORRO' && form.movDirection === 'RETIRAR' && (
                <label>
                  <span>Cuenta destino</span>
                  <select value={form.target_account_name} onChange={(e) => update('target_account_name', e.target.value)} required>
                    <option value="">Selecciona</option>
                    {(disponibles?.ahorro_por_cuenta || []).filter((item) => Number(item.saldo || 0) > 0).map((item) => (
                      <option key={item.cuenta} value={item.cuenta}>{item.cuenta}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.movSubtype === 'INVERSION' && form.movDirection === 'INVERTIR' && (
                <>
                  <label>
                    <span>Cuenta origen</span>
                    <select value={form.source_account_name} onChange={(e) => update('source_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {liquidAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Cuenta inversión</span>
                    <select value={form.target_account_name} onChange={(e) => update('target_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {investmentAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                </>
              )}

              {form.movSubtype === 'INVERSION' && form.movDirection === 'RETIRAR_INV' && (
                <>
                  <label>
                    <span>Cuenta inversión</span>
                    <select value={form.source_account_name} onChange={(e) => update('source_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {investmentAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Cuenta destino</span>
                    <select value={form.target_account_name} onChange={(e) => update('target_account_name', e.target.value)} required>
                      <option value="">Selecciona</option>
                      {liquidAccounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                </>
              )}
            </>
          )}

          <label>
            <span>Monto</span>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
            {amountHelp ? <small className="field-help">{amountHelp}</small> : null}
          </label>

          {canShowDestinationAmount && (
            <label>
              <span>Monto destino</span>
              <input type="number" min="0" step="0.01" value={form.destination_amount} onChange={(e) => update('destination_amount', e.target.value)} placeholder="Opcional si cambia la moneda" />
            </label>
          )}

          <label className="full-span">
            <span>Nota</span>
            <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Opcional" />
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

function money(value) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(value || 0))
}
