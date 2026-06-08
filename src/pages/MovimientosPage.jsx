import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import { getGuatemalaDateString } from '../utils/dates'

const initialForm = {
  movementType: 'EGR',
  movementDate: getGuatemalaDateString(),
  amount: '',
  note: '',

  categoryName: '',
  paymentMethod: 'cash',
  accountName: 'Efectivo',
  creditCardAccountId: '',

  // TC MIXTO: cargo en USD
  tcChargeInUsd: false,
  amountForeign: '',     // monto original en USD (MIXTO)

  movSubtype: 'NORMAL',
  movDirection: 'NORMAL',
  sourceAccountName: '',
  targetAccountName: '',
  destinationAmount: '',
  loanPersonName: '',
  savingsGoalId: '',
}

export default function MovimientosPage({ userId, api, catalogos, disponibles, dashboard, savingsGoals = [], onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // saldosLiquidos debe ir antes que liquidAccounts para el ordenamiento por balance
  const saldosLiquidos = useMemo(
    () => disponibles?.saldos_liquidos || [],
    [disponibles]
  )

  const liquidAccounts = useMemo(() => {
    const accounts = catalogos?.accounts?.liquid || []
    if (!saldosLiquidos.length) return accounts.map((a) => a.name)
    // Ordenar por saldo descendente (más fondos primero)
    const balMap = {}
    saldosLiquidos.forEach((s) => { balMap[s.cuenta] = Number(s.saldo || 0) })
    return [...accounts]
      .sort((a, b) => (balMap[b.name] || 0) - (balMap[a.name] || 0))
      .map((a) => a.name)
  }, [catalogos, saldosLiquidos])

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

  const creditCards = useMemo(
    () => catalogos?.accounts?.credit_cards || [],
    [catalogos]
  )

  // TC seleccionada en el formulario (incluye tc_type y tc_exchange_rate)
  const selectedCC = useMemo(
    () => creditCards.find((tc) => String(tc.id) === String(form.creditCardAccountId)),
    [creditCards, form.creditCardAccountId]
  )
  const isMixtoTC = selectedCC?.tc_type === 'MIXTO'

  const loanPeople = useMemo(
    () => (catalogos?.loan_people || []).map((p) => p.name),
    [catalogos]
  )

  const investmentBalances=useMemo(
    ()=> dashboard?.networth?.inv_map || {}, [dashboard]
  )

  const transferAccounts = useMemo(
    () => liquidAccounts.filter((name) => name !== 'Efectivo'),
    [liquidAccounts]
  )

  const ahorroDisponibles = useMemo(
    () => disponibles?.ahorro_por_cuenta || [],
    [disponibles]
  )

  const goalsWithBalance = useMemo(
    () => (savingsGoals || []).filter((g) => g.current_amount > 0),
    [savingsGoals]
  )

  // Saldo de ahorro general = total en cuentas − lo que está en metas
  const generalSavingsBalance = useMemo(() => {
    const totalAhorro = ahorroDisponibles.reduce((s, i) => s + Number(i.saldo || 0), 0)
    const totalGoals  = (savingsGoals || []).reduce((s, g) => s + Number(g.current_amount || 0), 0)
    return Math.max(0, totalAhorro - totalGoals)
  }, [ahorroDisponibles, savingsGoals])

  const prestamosDisponibles = useMemo(
    () => disponibles?.prestamos_por_persona || [],
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
        prev.paymentMethod === 'transfer'
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
          next.paymentMethod = 'cash'
          next.accountName = 'Efectivo'
        } else if (value === 'EGR') {
          next.categoryName = egrCategories[0] || ''
          next.paymentMethod = 'cash'
          next.accountName = 'Efectivo'
          next.creditCardAccountId = ''
        } else if (value === 'MOV') {
          next.categoryName = ''
        }
      }

      if (field === 'paymentMethod') {
        if (value === 'credit_card') {
          next.accountName = ''
          next.creditCardAccountId = creditCards[0]?.id?.toString() || ''
        } else {
          next.accountName = value === 'transfer' ? (transferAccounts[0] || '') : 'Efectivo'
          next.creditCardAccountId = ''
        }
        next.tcChargeInUsd = false
        next.amountForeign = ''
      }

      // Al cambiar la TC seleccionada, resetear el modo USD
      if (field === 'creditCardAccountId') {
        next.tcChargeInUsd = false
        next.amountForeign = ''
      }

      if (field === 'movDirection') {
        if (prev.movSubtype === 'AHORRO') {
          if (value === 'GUARDAR') {
            next.sourceAccountName = liquidAccounts[0] || ''
            next.targetAccountName = ''
          }
          if (value === 'RETIRAR') {
            const totalAhorro = ahorroDisponibles.reduce((s, i) => s + Number(i.saldo || 0), 0)
            const totalGoals  = (savingsGoals || []).reduce((s, g) => s + Number(g.current_amount || 0), 0)
            const genBal = Math.max(0, totalAhorro - totalGoals)
            const goalsOk = (savingsGoals || []).filter((g) => g.current_amount > 0)

            next.sourceAccountName = ''
            next.targetAccountName = ahorroDisponibles[0]?.cuenta || liquidAccounts[0] || ''
            // Si el general no tiene saldo, pre-seleccionar la primera meta disponible
            next.savingsGoalId = (genBal <= 0 && goalsOk.length > 0)
              ? String(goalsOk[0].id)
              : ''
          }
        }

        if (prev.movSubtype === 'INVERSION') {
          if (value === 'INVERTIR') {
            next.sourceAccountName = liquidAccounts[0] || ''
            next.targetAccountName = investmentAccounts[0] || ''
          }
          if (value === 'RETIRAR_INV') {
            next.sourceAccountName = investmentAccounts[0] || ''
            next.targetAccountName = liquidAccounts[0] || ''
          }
          if (value === 'MOVER_INV') {
            next.sourceAccountName = investmentAccounts[0] || ''
            next.targetAccountName = investmentAccounts[1] || investmentAccounts[0] || ''
          }
        }

        if (prev.movSubtype === 'PRESTAMO') {
          if (value === 'DAR') {
            next.sourceAccountName = liquidAccounts[0] || ''
            next.targetAccountName = ''
          }
          if (value === 'COBRAR') {
            next.sourceAccountName = ''
            next.targetAccountName = liquidAccounts[0] || ''
          }
          // Auto-fill note when direction changes
          const person = next.loanPersonName || prev.loanPersonName
          if (person) {
            const prefix = value === 'DAR' ? 'Préstamo a' : 'Cobro a'
            if (!prev.note || prev.note.startsWith('Préstamo a') || prev.note.startsWith('Cobro a')) {
              next.note = `${prefix} ${person}`
            }
          }
        }
      }

      if (field === 'loanPersonName' && prev.movSubtype === 'PRESTAMO') {
        const prefix = prev.movDirection === 'DAR' ? 'Préstamo a' : 'Cobro a'
        if (!prev.note || prev.note.startsWith('Préstamo a') || prev.note.startsWith('Cobro a')) {
          next.note = `${prefix} ${value}`
        }
      }

      if (field === 'movSubtype') {
        if (value === 'NORMAL') {
          next.movDirection = 'NORMAL'
          next.sourceAccountName = liquidAccounts[0] || ''
          next.targetAccountName = liquidAccounts[1] || liquidAccounts[0] || ''
        }

        if (value === 'AHORRO') {
          next.movDirection = 'GUARDAR'
          next.targetAccountName = ''
          next.sourceAccountName = liquidAccounts[0] || ''
          next.savingsGoalId = ''
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

  function getGoalDisponible(goalId) {
    const found = (savingsGoals || []).find((g) => String(g.id) === String(goalId))
    return Number(found?.current_amount || 0)
  }

  function getPrestamoDisponible(persona) {
    const found = prestamosDisponibles.find((item) => item.persona === persona)
    return Number(found?.saldo || 0)
  }

  function getSaldoDisponible(cuenta) {
    const found = saldosLiquidos.find((item) => item.cuenta === cuenta)
    return Number(found?.saldo || 0)
  }

  function getInvestmentDisponible(cuenta){
    return Number(investmentBalances?.[cuenta] || 0)
  }

  useEffect(() => {
    if (form.movementType !== 'MOV') return
    if (form.movSubtype !== 'AHORRO') return
    if (form.movDirection !== 'RETIRAR') return
    if (!ahorroDisponibles.length) return

    const cuentaActualExiste = ahorroDisponibles.some(
      (item) => item.cuenta === form.targetAccountName
    )

    if (!form.targetAccountName || !cuentaActualExiste) {
      setForm((prev) => ({
        ...prev,
        targetAccountName: ahorroDisponibles[0].cuenta,
      }))
    }
  }, [
    form.movementType,
    form.movSubtype,
    form.movDirection,
    ahorroDisponibles,
    form.targetAccountName,
  ])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      // ── Validación de saldo para retiro de ahorro ──────────────────
      if (
        form.movementType === 'MOV' &&
        form.movSubtype === 'AHORRO' &&
        form.movDirection === 'RETIRAR'
      ) {
        if (form.savingsGoalId) {
          if (getGoalDisponible(form.savingsGoalId) <= 0) {
            setError('La meta seleccionada no tiene saldo disponible.')
            setSaving(false)
            return
          }
        } else {
          if (generalSavingsBalance <= 0) {
            setError('El ahorro general no tiene saldo disponible para retirar.')
            setSaving(false)
            return
          }
        }
      }

      let payload = null

      if (form.movementType === 'ING' || form.movementType === 'EGR') {
        const isTarjeta = form.paymentMethod === 'credit_card'
        payload = {
          telegram_user_id: Number(userId),
          movement_type: form.movementType,
          movement_date: form.movementDate,
          amount: Number(form.amount),
          note: form.note || null,
          category_name: form.categoryName,
          payment_method: form.paymentMethod,
          account_name: isTarjeta
            ? null
            : form.paymentMethod === 'transfer'
              ? form.accountName
              : 'Efectivo',
          credit_card_account_id: isTarjeta ? Number(form.creditCardAccountId) : null,
        }
        // Para TC MIXTO con cargo en USD: incluir el monto en USD original
        if (isTarjeta && form.tcChargeInUsd && form.amountForeign) {
          payload.amount_foreign = Number(form.amountForeign)
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
            payload.savings_goal_id = form.savingsGoalId ? Number(form.savingsGoalId) : null
          } else {
            payload.target_account_name = form.targetAccountName
            payload.savings_goal_id = form.savingsGoalId ? Number(form.savingsGoalId) : null
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
        movementDate: getGuatemalaDateString(),
        categoryName:
          prev.movementType === 'ING'
            ? (ingCategories[0] || '')
            : prev.movementType === 'EGR'
              ? (egrCategories[0] || '')
              : '',
        sourceAccountName: '',
        targetAccountName: '',
        accountName: 'Efectivo',
        loanPersonName: loanPeople[0] || '',
        savingsGoalId: '',
        tcChargeInUsd: false,
        amountForeign: '',
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
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  {form.movementType === 'EGR' && creditCards.length > 0 && (
                    <option value="credit_card">Tarjeta de Crédito</option>
                  )}
                </select>
              </label>

              {form.paymentMethod === 'transfer' && (
                <label>
                  <span>Cuenta</span>
                  <select value={form.accountName} onChange={(e) => updateField('accountName', e.target.value)}>
                    {transferAccounts.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}

              {form.paymentMethod === 'credit_card' && (
                <>
                  <label>
                    <span>Tarjeta</span>
                    <select
                      value={form.creditCardAccountId}
                      onChange={(e) => updateField('creditCardAccountId', e.target.value)}
                      required
                    >
                      {creditCards.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name}{tc.tc_type && tc.tc_type !== 'GTQ' ? ` (${tc.tc_type})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* TC MIXTO: opción de cargo en USD */}
                  {isMixtoTC && form.movementType === 'EGR' && (
                    <label className="full-span" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={form.tcChargeInUsd}
                        onChange={(e) => updateField('tcChargeInUsd', e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      <span>Cargo en USD</span>
                      {form.tcChargeInUsd && (
                        <small style={{ opacity: 0.65 }}>
                          TC ref: Q{(selectedCC?.tc_exchange_rate || 8.0).toFixed(2)}/$
                        </small>
                      )}
                    </label>
                  )}

                  {/* Campo USD (solo visible cuando MIXTO + USD) */}
                  {isMixtoTC && form.tcChargeInUsd && form.movementType === 'EGR' && (
                    <label>
                      <span>Monto en USD $</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Ej. 50.00"
                        value={form.amountForeign}
                        onChange={(e) => {
                          const usdVal = e.target.value
                          updateField('amountForeign', usdVal)
                          const rate = selectedCC?.tc_exchange_rate || 8.0
                          if (usdVal && !Number.isNaN(Number(usdVal))) {
                            updateField('amount', (Number(usdVal) * rate).toFixed(2))
                          }
                        }}
                        required
                      />
                    </label>
                  )}
                </>
              )}

              {form.movementType === 'EGR' && form.paymentMethod !== 'credit_card' ? (
                <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                  Disp. Q {getSaldoDisponible(form.paymentMethod === 'transfer' ? form.accountName : 'Efectivo').toFixed(2)}
                </small>
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
                    <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                      Disp. Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                    </small>
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
                        <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -6 }}>
                          Disp. Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </small>
                      ) : null}

                      {savingsGoals.length > 0 ? (
                        <label>
                          <span>Meta de ahorro</span>
                          <select
                            value={form.savingsGoalId}
                            onChange={(e) => updateField('savingsGoalId', e.target.value)}
                          >
                            <option value="">Sin meta</option>
                            {savingsGoals.map((g) => (
                              <option key={g.id} value={String(g.id)}>{g.name}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {/* Sin ninguna fuente disponible */}
                      {ahorroDisponibles.length === 0 && goalsWithBalance.length === 0 ? (
                        <p className="full-span" style={{ opacity: 0.6, fontSize: '0.85rem', margin: '4px 0' }}>
                          No hay ahorro disponible para retirar.
                        </p>
                      ) : (
                        <>
                          {ahorroDisponibles.length > 0 && (
                            <label>
                              <span>Cuenta de ahorro</span>
                              <select
                                value={form.targetAccountName}
                                onChange={(e) => updateField('targetAccountName', e.target.value)}
                              >
                                {ahorroDisponibles.map((item) => (
                                  <option key={item.cuenta} value={item.cuenta}>
                                    {item.cuenta}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          {/* "Retirar de": solo muestra opciones con saldo */}
                          {(generalSavingsBalance > 0 || goalsWithBalance.length > 0) && (
                            <label>
                              <span>Retirar de</span>
                              <select
                                value={form.savingsGoalId}
                                onChange={(e) => updateField('savingsGoalId', e.target.value)}
                              >
                                {generalSavingsBalance > 0 && (
                                  <option value="">Ahorro general</option>
                                )}
                                {goalsWithBalance.map((g) => (
                                  <option key={g.id} value={String(g.id)}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          {/* Saldo disponible de la fuente seleccionada */}
                          {form.savingsGoalId ? (
                            <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                              Disp. meta Q {getGoalDisponible(form.savingsGoalId).toFixed(2)}
                            </small>
                          ) : (
                            <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                              Disp. general Q {generalSavingsBalance.toFixed(2)}
                            </small>
                          )}
                        </>
                      )}
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
                      <option value="MOVER_INV">Mover entre inversiones</option>
                    </select>
                  </label>

                  {form.movDirection === 'INVERTIR' && (
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
                        <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                          Disp. Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </small>
                      ) : null}
                    </>
                  )}

                  {form.movDirection === 'RETIRAR_INV' && (
  <>
    <label>
      <span>Inversión (sale)</span>
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

    {form.sourceAccountName ? (
      <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
        Disp. $ {getInvestmentDisponible(form.sourceAccountName).toFixed(2)}
      </small>
    ) : null}
  </>
)}

                  {form.movDirection === 'MOVER_INV' && (
  <>
    <label>
      <span>Inv. origen</span>
      <select value={form.sourceAccountName} onChange={(e) => updateField('sourceAccountName', e.target.value)}>
        {investmentAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>

    <label>
      <span>Inv. destino</span>
      <select value={form.targetAccountName} onChange={(e) => updateField('targetAccountName', e.target.value)}>
        {investmentAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>

    {form.sourceAccountName ? (
      <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
        Disp. $ {getInvestmentDisponible(form.sourceAccountName).toFixed(2)}
      </small>
    ) : null}
  </>
)}

                  <label>
                    <span>Monto (sale)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => updateField('amount', e.target.value)}
                      required
                    />
                  </label>

                  <label>
                    <span>Monto destino (entra)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.destinationAmount}
                      onChange={(e) => updateField('destinationAmount', e.target.value)}
                      placeholder="Opcional"
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
                        <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                          Disp. Q {getSaldoDisponible(form.sourceAccountName).toFixed(2)}
                        </small>
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
                        <small className="full-span" style={{ opacity: 0.6, fontSize: '0.78rem', marginTop: -8 }}>
                          Cobrable Q {getPrestamoDisponible(form.loanPersonName).toFixed(2)}
                        </small>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* El campo monto se oculta cuando la TC MIXTO usa cargo en USD (se autocompleta) */}
          {form.movSubtype !== 'INVERSION' && !(isMixtoTC && form.tcChargeInUsd) && (
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
          )}

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