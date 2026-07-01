import { useEffect, useMemo, useRef, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'
import { getPaletteOptions } from '../theme'

const initialAccountForm = {
  name: '',
  accountType: 'bank',
  currency: 'GTQ',
  sortOrder: 0,
  creditLimit: '',
  billingCloseDay: '',
  paymentDueDay: '',
  tcType: 'GTQ',
  tcExchangeRate: '8.00',
  visacuotasLimit: '',
}

const initialCategoryForm = {
  name: '',
  kind: 'EGR',
  sortOrder: 0,
}

const initialPrefsForm = {
  showAmountsDefault: false,
  defaultTab: 'movimientos',
  usdToGtq: '7.7',
  themeKey: '',
}

const initialLoanPersonForm = { name: '' }

const initialDebtForm = { name: '', creditor: '', due_date: '', installment_amount: '', total_installments: '', payment_frequency: 'monthly' }
const initialGoalForm = { name: '', target_amount: '', account_name: '' }

const ALL_TAB_LABELS = {
  movimientos: 'Movimientos',
  historial:   'Historial',
  deudas:      'Deudas',
  dashboard:   'Dashboard',
  prestamos:   'Préstamos',
  tarjetas:    'TC',
}

export default function ConfiguracionPage({
  userId,
  api,
  cuentas,
  categorias,
  loanPeople,
  deudas,
  preferencias,
  canUsePrestamos,
  canUseTarjetas = false,
  canPrivate,
  isAdmin = false,
  onRefreshData,
}) {
  const [accountForm, setAccountForm] = useState(initialAccountForm)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [prefsForm, setPrefsForm] = useState(initialPrefsForm)
  const [loanPersonForm, setLoanPersonForm] = useState(initialLoanPersonForm)
  const [debtForm, setDebtForm] = useState(initialDebtForm)
  const [goalForm, setGoalForm] = useState(initialGoalForm)
  const [goals, setGoals] = useState([])
  const [tabOrder, setTabOrder] = useState(null)
  // Ref to avoid re-initialising tabOrder on every availableTabs change after first load
  const tabOrderInitialisedRef = useRef(false)

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedLoanPersonId, setSelectedLoanPersonId] = useState('')
  const [selectedDebtId, setSelectedDebtId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('EGR')

  const [savingAccount, setSavingAccount] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingLoanPerson, setSavingLoanPerson] = useState(false)
  const [savingDebt, setSavingDebt] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)
  const [savingNewUser, setSavingNewUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    telegram_user_id: '',
    first_name: '',
    last_name: '',
    username: '',
    can_use_loans: false,
  })
  const [adminUsers, setAdminUsers] = useState(null)
  const [togglingUserId, setTogglingUserId] = useState(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cuentasItems = useMemo(() => cuentas?.items || [], [cuentas])
  const categoriasItems = useMemo(() => categorias?.items || [], [categorias])
  const loanPeopleItems = useMemo(() => loanPeople?.items || [], [loanPeople])
  const deudasItems = useMemo(() => deudas?.items || [], [deudas])
  const activeDeudas = useMemo(() => deudasItems.filter((d) => d.status !== 'paid'), [deudasItems])
  const ahorroAccounts = useMemo(
    () => cuentasItems.filter((a) => a.account_type === 'cash' || a.account_type === 'bank').map((a) => a.name),
    [cuentasItems]
  )
  const sortedAccounts = useMemo(
    () => [...cuentasItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [cuentasItems]
  )
  const themeOptions = useMemo(
    () => getPaletteOptions(Boolean(canPrivate)),
    [canPrivate]
  )

  // Mirror NavTabs logic: build ordered list of available tab keys
  const availableTabs = useMemo(() => {
    const tabs = ['movimientos', 'historial', 'deudas', 'dashboard']
    if (canUsePrestamos) tabs.splice(1, 0, 'prestamos')
    if (canUseTarjetas) {
      const deudasIdx = tabs.indexOf('deudas')
      tabs.splice(deudasIdx, 0, 'tarjetas')
    }
    return tabs
  }, [canUsePrestamos, canUseTarjetas])

  const visibleCategories = useMemo(
    () => categoriasItems.filter((item) => item.kind === categoryFilter),
    [categoriasItems, categoryFilter]
  )

  const selectedAccount = useMemo(
    () => cuentasItems.find((item) => String(item.id) === String(selectedAccountId)) || null,
    [cuentasItems, selectedAccountId]
  )

  const selectedCategory = useMemo(
    () => categoriasItems.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categoriasItems, selectedCategoryId]
  )

  const selectedLoanPerson = useMemo(
    () => loanPeopleItems.find((item) => String(item.id) === String(selectedLoanPersonId)) || null,
    [loanPeopleItems, selectedLoanPersonId]
  )

  useEffect(() => {
    if (!selectedAccount) {
      setAccountForm(initialAccountForm)
      return
    }

    setAccountForm({
      name: selectedAccount.name,
      accountType: selectedAccount.account_type,
      currency: selectedAccount.currency,
      sortOrder: selectedAccount.sort_order ?? 0,
      creditLimit: selectedAccount.credit_limit != null ? String(selectedAccount.credit_limit) : '',
      billingCloseDay: selectedAccount.billing_close_day != null ? String(selectedAccount.billing_close_day) : '',
      paymentDueDay: selectedAccount.payment_due_day != null ? String(selectedAccount.payment_due_day) : '',
      tcType: selectedAccount.tc_type || 'GTQ',
      tcExchangeRate: selectedAccount.tc_exchange_rate != null ? String(selectedAccount.tc_exchange_rate) : '8.00',
      visacuotasLimit: selectedAccount.visacuotas_limit != null ? String(selectedAccount.visacuotas_limit) : '',
    })
  }, [selectedAccount])

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryForm({
        ...initialCategoryForm,
        kind: categoryFilter,
      })
      return
    }

    setCategoryForm({
      name: selectedCategory.name,
      kind: selectedCategory.kind,
      sortOrder: selectedCategory.sort_order ?? 0,
    })
  }, [selectedCategory, categoryFilter])

  useEffect(() => {
    if (!preferencias) return
    setPrefsForm({
      showAmountsDefault: Boolean(preferencias.show_amounts_default),
      defaultTab: preferencias.default_tab || 'movimientos',
      usdToGtq: String(preferencias.usd_to_gtq ?? '7.7'),
      themeKey: preferencias.theme_key || '',
    })

    // Initialise tab order (only once per user load to avoid overwriting local edits)
    if (!tabOrderInitialisedRef.current) {
      tabOrderInitialisedRef.current = true
      const saved = preferencias.tab_order
      if (saved && saved.length > 0) {
        // Apply saved order to available tabs, append any new tabs at the end
        const ordered = saved.filter((k) => availableTabs.includes(k))
        for (const k of availableTabs) {
          if (!ordered.includes(k)) ordered.push(k)
        }
        setTabOrder(ordered)
      } else {
        setTabOrder([...availableTabs])
      }
    }
  }, [preferencias, availableTabs])

  useEffect(() => {
    if (!selectedLoanPerson) {
      setLoanPersonForm(initialLoanPersonForm)
      return
    }
    setLoanPersonForm({ name: selectedLoanPerson.name })
  }, [selectedLoanPerson])

  // Reset tab-order initialisation flag when user switches (dev mode)
  useEffect(() => {
    tabOrderInitialisedRef.current = false
    setTabOrder(null)
  }, [userId])

  // Load savings goals
  useEffect(() => {
    if (!userId) return
    api.getSavingsGoals(userId).then((res) => setGoals(res?.items || [])).catch(() => {})
  }, [userId])

  const selectedDebt = useMemo(
    () => deudasItems.find((d) => String(d.id) === String(selectedDebtId)) || null,
    [deudasItems, selectedDebtId]
  )

  const selectedGoal = useMemo(
    () => goals.find((g) => String(g.id) === String(selectedGoalId)) || null,
    [goals, selectedGoalId]
  )

  useEffect(() => {
    if (!selectedDebt) { setDebtForm(initialDebtForm); return }
    setDebtForm({
      name: selectedDebt.name,
      creditor: selectedDebt.creditor,
      due_date: selectedDebt.due_date || '',
      installment_amount: String(selectedDebt.installment_amount),
      total_installments: String(selectedDebt.total_installments),
      payment_frequency: selectedDebt.payment_frequency || 'monthly',
    })
  }, [selectedDebt])

  useEffect(() => {
    if (!selectedGoal) { setGoalForm(initialGoalForm); return }
    setGoalForm({
      name: selectedGoal.name,
      target_amount: String(selectedGoal.target_amount),
      account_name: selectedGoal.account_name || '',
    })
  }, [selectedGoal])

  async function submitDebt(e) {
    e.preventDefault(); clearMessages(); setSavingDebt(true)
    try {
      await api.patchDeuda(selectedDebtId, {
        name: debtForm.name,
        creditor: debtForm.creditor,
        due_date: debtForm.due_date,
        installment_amount: Number(debtForm.installment_amount),
        total_installments: Number(debtForm.total_installments),
        payment_frequency: debtForm.payment_frequency,
      })
      setMessage('Deuda actualizada correctamente.')
      setSelectedDebtId(''); setDebtForm(initialDebtForm)
      onRefreshData?.()
    } catch (err) { setError(err.message || 'No pude guardar la deuda.') }
    finally { setSavingDebt(false) }
  }

  async function submitGoal(e) {
    e.preventDefault(); clearMessages(); setSavingGoal(true)
    try {
      const payload = {
        telegram_user_id: Number(userId),
        name: goalForm.name,
        target_amount: Number(goalForm.target_amount),
        account_name: goalForm.account_name || null,
      }
      if (selectedGoalId) {
        await api.patchSavingsGoal(selectedGoalId, { name: payload.name, target_amount: payload.target_amount, account_name: payload.account_name })
        setMessage('Meta actualizada correctamente.')
      } else {
        await api.postSavingsGoal(payload)
        setMessage('Meta creada correctamente.')
      }
      setSelectedGoalId(''); setGoalForm(initialGoalForm)
      const res = await api.getSavingsGoals(userId); setGoals(res?.items || [])
      onRefreshData?.()
    } catch (err) { setError(err.message || 'No pude guardar la meta.') }
    finally { setSavingGoal(false) }
  }

  async function deleteGoal(goalId) {
    clearMessages()
    try {
      await api.deleteSavingsGoal(goalId)
      setMessage('Meta eliminada correctamente.')
      setSelectedGoalId(''); setGoalForm(initialGoalForm)
      const res = await api.getSavingsGoals(userId); setGoals(res?.items || [])
      onRefreshData?.()
    } catch (err) { setError(err.message || 'No pude eliminar la meta.') }
  }

  async function reorderAccount(accountId, direction) {
    const idx = sortedAccounts.findIndex((a) => a.id === accountId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedAccounts.length) return
    const a = sortedAccounts[idx]
    const b = sortedAccounts[swapIdx]
    const aOrder = a.sort_order ?? idx
    const bOrder = b.sort_order ?? swapIdx
    clearMessages()
    try {
      await Promise.all([
        api.patchCuenta(a.id, { telegram_user_id: Number(userId), name: a.name, account_type: a.account_type, currency: a.currency, sort_order: bOrder, credit_limit: a.credit_limit ?? null, billing_close_day: a.billing_close_day ?? null, payment_due_day: a.payment_due_day ?? null, tc_type: a.tc_type ?? null, tc_exchange_rate: a.tc_exchange_rate ?? null, visacuotas_limit: a.visacuotas_limit ?? null }),
        api.patchCuenta(b.id, { telegram_user_id: Number(userId), name: b.name, account_type: b.account_type, currency: b.currency, sort_order: aOrder, credit_limit: b.credit_limit ?? null, billing_close_day: b.billing_close_day ?? null, payment_due_day: b.payment_due_day ?? null, tc_type: b.tc_type ?? null, tc_exchange_rate: b.tc_exchange_rate ?? null, visacuotas_limit: b.visacuotas_limit ?? null }),
      ])
      onRefreshData?.()
    } catch (err) { setError(err.message || 'No pude reordenar las cuentas.') }
  }

  function moveTab(idx, dir) {
    setTabOrder((prev) => {
      const arr = [...(prev || availableTabs)]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= arr.length) return prev
      ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
      return arr
    })
  }

  function clearMessages() {
    setMessage('')
    setError('')
  }

  function resetAccountEditor() {
    setSelectedAccountId('')
    setAccountForm(initialAccountForm)
  }

  function resetCategoryEditor() {
    setSelectedCategoryId('')
    setCategoryForm({
      ...initialCategoryForm,
      kind: categoryFilter,
    })
  }

  async function submitAccount(e) {
    e.preventDefault()
    clearMessages()
    setSavingAccount(true)

    try {
      const isTC = accountForm.accountType === 'credit_card'
      const payload = {
        telegram_user_id: Number(userId),
        name: accountForm.name,
        account_type: accountForm.accountType,
        currency: accountForm.currency,
        sort_order: 0,   // gestionado automáticamente por saldo
        credit_limit: isTC && accountForm.creditLimit ? Number(accountForm.creditLimit) : null,
        billing_close_day: isTC && accountForm.billingCloseDay ? Number(accountForm.billingCloseDay) : null,
        payment_due_day: isTC && accountForm.paymentDueDay ? Number(accountForm.paymentDueDay) : null,
        tc_type: isTC ? accountForm.tcType : null,
        tc_exchange_rate: isTC && accountForm.tcExchangeRate ? Number(accountForm.tcExchangeRate) : null,
        visacuotas_limit: isTC && accountForm.visacuotasLimit ? Number(accountForm.visacuotasLimit) : null,
      }

      if (selectedAccountId) {
        await api.patchCuenta(selectedAccountId, payload)
        setMessage('Cuenta actualizada correctamente.')
      } else {
        await api.postCuenta(payload)
        setMessage('Cuenta creada correctamente.')
      }

      resetAccountEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar la cuenta.')
    } finally {
      setSavingAccount(false)
    }
  }

  async function submitCategory(e) {
    e.preventDefault()
    clearMessages()
    setSavingCategory(true)

    try {
      const payload = {
        telegram_user_id: Number(userId),
        name: categoryForm.name,
        kind: selectedCategoryId ? categoryForm.kind : categoryFilter, // al crear, usa el tab activo
        sort_order: 0,   // orden gestionado automáticamente
      }

      if (selectedCategoryId) {
        await api.patchCategoria(selectedCategoryId, payload)
        setMessage('Categoría actualizada correctamente.')
      } else {
        await api.postCategoria(payload)
        setMessage('Categoría creada correctamente.')
      }

      resetCategoryEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar la categoría.')
    } finally {
      setSavingCategory(false)
    }
  }

  async function submitPreferences(e) {
    e.preventDefault()
    clearMessages()
    setSavingPrefs(true)

    try {
      await api.patchPreferencias({
        telegram_user_id: Number(userId),
        show_amounts_default: Boolean(prefsForm.showAmountsDefault),
        default_tab: prefsForm.defaultTab,
        usd_to_gtq: Number(prefsForm.usdToGtq),
        theme_key: prefsForm.themeKey || null,
        tab_order: tabOrder && tabOrder.length > 0 ? tabOrder : null,
      })

      setMessage('Preferencias actualizadas correctamente.')
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar las preferencias.')
    } finally {
      setSavingPrefs(false)
    }
  }

  async function toggleCuenta() {
    if (!selectedAccount) return
    clearMessages()

    try {
      if (selectedAccount.is_active) {
        await api.desactivarCuenta(selectedAccount.id)
        setMessage('Cuenta desactivada correctamente.')
      } else {
        await api.activarCuenta(selectedAccount.id)
        setMessage('Cuenta activada correctamente.')
      }

      resetAccountEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la cuenta.')
    }
  }

  async function toggleCategoria() {
    if (!selectedCategory) return
    clearMessages()

    try {
      if (selectedCategory.is_active) {
        await api.desactivarCategoria(selectedCategory.id)
        setMessage('Categoría desactivada correctamente.')
      } else {
        await api.activarCategoria(selectedCategory.id)
        setMessage('Categoría activada correctamente.')
      }

      resetCategoryEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la categoría.')
    }
  }

  function resetLoanPersonEditor() {
    setSelectedLoanPersonId('')
    setLoanPersonForm(initialLoanPersonForm)
  }

  async function submitLoanPerson(e) {
    e.preventDefault()
    clearMessages()
    setSavingLoanPerson(true)

    try {
      const payload = {
        telegram_user_id: Number(userId),
        name: loanPersonForm.name,
      }

      if (selectedLoanPersonId) {
        await api.patchLoanPerson(selectedLoanPersonId, payload)
        setMessage('Persona actualizada correctamente.')
      } else {
        await api.postLoanPerson(payload)
        setMessage('Persona creada correctamente.')
      }

      resetLoanPersonEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar la persona.')
    } finally {
      setSavingLoanPerson(false)
    }
  }

  async function toggleLoanPerson() {
    if (!selectedLoanPerson) return
    clearMessages()

    try {
      if (selectedLoanPerson.is_active) {
        await api.desactivarLoanPerson(selectedLoanPerson.id)
        setMessage('Persona desactivada correctamente.')
      } else {
        await api.activarLoanPerson(selectedLoanPerson.id)
        setMessage('Persona activada correctamente.')
      }

      resetLoanPersonEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la persona.')
    }
  }

  async function loadAdminUsers() {
    try {
      const data = await api.getAdminUsuarios()
      setAdminUsers(data?.items || [])
    } catch {
      setAdminUsers([])
    }
  }

  useEffect(() => {
    if (isAdmin) loadAdminUsers()
  }, [isAdmin])

  async function toggleUsuario(user) {
    setTogglingUserId(user.id)
    clearMessages()
    try {
      await api.patchAdminUsuario(user.id, { is_active: !user.is_active })
      setAdminUsers((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u)
      )
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado del usuario.')
    } finally {
      setTogglingUserId(null)
    }
  }

  async function submitNewUser(e) {
    e.preventDefault()
    clearMessages()
    setSavingNewUser(true)
    try {
      const result = await api.postCrearUsuario({
        telegram_user_id: Number(newUserForm.telegram_user_id),
        first_name: newUserForm.first_name.trim() || null,
        last_name: newUserForm.last_name.trim() || null,
        username: newUserForm.username.trim() || null,
        can_use_loans: newUserForm.can_use_loans,
      })
      setMessage(`✅ Usuario creado. ID interno: ${result.id} · Telegram ID: ${result.telegram_user_id}`)
      setNewUserForm({ telegram_user_id: '', first_name: '', last_name: '', username: '', can_use_loans: false })
      loadAdminUsers()
    } catch (err) {
      setError(err.message || 'No pude crear el usuario.')
    } finally {
      setSavingNewUser(false)
    }
  }

  return (
    <div className="grid-page single-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <div className="config-page-grid">
        <Panel title="Cuentas">
          {!cuentasItems.length ? (
            <EmptyState text="No hay cuentas todavía." />
          ) : (
            <>
              <div className="config-select-row">
                <label>
                  <span>Selecciona una cuenta para editar</span>
                  <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                    <option value="">Nueva cuenta</option>
                    {cuentasItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.account_type} · {item.is_active ? 'Activa' : 'Inactiva'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedAccount ? (
                <div className="selected-meta-row">
                  <span className={`status-chip ${selectedAccount.is_active ? 'active' : 'inactive'}`}>
                    {selectedAccount.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {selectedAccount.is_system ? <span className="mini-chip">Sistema</span> : null}
                  <span className="mini-chip">{selectedAccount.account_type}</span>
                  <span className="mini-chip">{selectedAccount.currency}</span>
                </div>
              ) : null}
            </>
          )}

          <form className="form-grid" onSubmit={submitAccount}>
            <label>
              <span>Nombre</span>
              <input
                value={accountForm.name}
                onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>

            <label>
              <span>Tipo</span>
              <select
                value={accountForm.accountType}
                onChange={(e) => setAccountForm((p) => ({ ...p, accountType: e.target.value, creditLimit: '', billingCloseDay: '', paymentDueDay: '' }))}
              >
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="investment">Inversión</option>
                <option value="asset">Patrimonial</option>
                <option value="credit_card">Tarjeta de Crédito</option>
              </select>
            </label>

            <label>
              <span>Moneda</span>
              <select
                value={accountForm.currency}
                onChange={(e) => setAccountForm((p) => ({ ...p, currency: e.target.value }))}
              >
                <option value="GTQ">GTQ</option>
                <option value="USD">USD</option>
              </select>
            </label>

            {accountForm.accountType === 'credit_card' && (
              <>
                <label>
                  <span>Límite de crédito</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Ej. 5000.00"
                    value={accountForm.creditLimit}
                    onChange={(e) => setAccountForm((p) => ({ ...p, creditLimit: e.target.value }))}
                  />
                </label>

                <label>
                  <span>Día de corte (1–28)</span>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    placeholder="Ej. 15"
                    value={accountForm.billingCloseDay}
                    onChange={(e) => setAccountForm((p) => ({ ...p, billingCloseDay: e.target.value }))}
                  />
                </label>

                <label>
                  <span>Día límite de pago (1–28)</span>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    placeholder="Ej. 5"
                    value={accountForm.paymentDueDay}
                    onChange={(e) => setAccountForm((p) => ({ ...p, paymentDueDay: e.target.value }))}
                  />
                </label>

                <label>
                  <span>Tipo de TC</span>
                  <select
                    value={accountForm.tcType}
                    onChange={(e) => setAccountForm((p) => ({ ...p, tcType: e.target.value }))}
                  >
                    <option value="GTQ">GTQ (quetzales)</option>
                    <option value="USD">USD (dólares)</option>
                    <option value="MIXTO">MIXTO (Q y $)</option>
                  </select>
                </label>

                {(accountForm.tcType === 'USD' || accountForm.tcType === 'MIXTO') && (
                  <label>
                    <span>Tipo de cambio (Q por $)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.0001"
                      placeholder="Ej. 8.00"
                      value={accountForm.tcExchangeRate}
                      onChange={(e) => setAccountForm((p) => ({ ...p, tcExchangeRate: e.target.value }))}
                    />
                  </label>
                )}

                <label>
                  <span>Límite Visacuotas (opcional)</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Dejar vacío = comparte límite general"
                    value={accountForm.visacuotasLimit}
                    onChange={(e) => setAccountForm((p) => ({ ...p, visacuotasLimit: e.target.value }))}
                  />
                </label>
              </>
            )}

            <div className="full-span form-actions split-actions">
              <button className="primary-btn" type="submit" disabled={savingAccount}>
                {savingAccount ? 'Guardando...' : selectedAccount ? 'Actualizar cuenta' : 'Crear cuenta'}
              </button>

              {selectedAccount ? (
                <>
                  <button className="ghost-btn" type="button" onClick={resetAccountEditor}>
                    Limpiar
                  </button>

                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={toggleCuenta}
                    disabled={selectedAccount.is_system && selectedAccount.is_active}
                    title={selectedAccount.is_system && selectedAccount.is_active ? 'Cuenta protegida del sistema' : ''}
                  >
                    {selectedAccount.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel title="Categorías">
          {!categoriasItems.length ? (
            <EmptyState text="No hay categorías todavía." />
          ) : (
            <>
              <div className="config-filter-tabs segmented-tabs">
                {['EGR', 'ING'].map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`segmented-tab${categoryFilter === kind ? ' active' : ''}`}
                    onClick={() => {
                      setCategoryFilter(kind)
                      setSelectedCategoryId('')
                    }}
                  >
                    {kind === 'ING' ? 'Ingresos' : 'Egresos'}
                  </button>
                ))}
              </div>

              <div className="config-select-row">
                <label>
                  <span>Selecciona una categoría para editar</span>
                  <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                    <option value="">Nueva categoría</option>
                    {visibleCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.is_active ? 'Activa' : 'Inactiva'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedCategory ? (
                <div className="selected-meta-row">
                  <span className={`status-chip ${selectedCategory.is_active ? 'active' : 'inactive'}`}>
                    {selectedCategory.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {selectedCategory.is_system ? <span className="mini-chip">Sistema</span> : null}
                  <span className="mini-chip">{selectedCategory.kind}</span>
                </div>
              ) : null}
            </>
          )}

          <form className="form-grid" onSubmit={submitCategory}>
            <label className="full-span">
              <span>Nombre</span>
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>

            {/* Al editar una categoría existente se puede cambiar de tipo */}
            {selectedCategory && (
              <label>
                <span>Tipo</span>
                <select
                  value={categoryForm.kind}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, kind: e.target.value }))}
                  disabled={Boolean(selectedCategory.is_system)}
                >
                  <option value="EGR">Egreso</option>
                  <option value="ING">Ingreso</option>
                </select>
              </label>
            )}

            <div className="full-span form-actions split-actions">
              <button className="primary-btn" type="submit" disabled={savingCategory}>
                {savingCategory ? 'Guardando...' : selectedCategory ? 'Actualizar categoría' : 'Crear categoría'}
              </button>

              {selectedCategory ? (
                <>
                  <button className="ghost-btn" type="button" onClick={resetCategoryEditor}>
                    Limpiar
                  </button>

                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={toggleCategoria}
                    disabled={selectedCategory.is_system && selectedCategory.is_active}
                    title={selectedCategory.is_system && selectedCategory.is_active ? 'Categoría protegida del sistema' : ''}
                  >
                    {selectedCategory.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>

      {canUsePrestamos ? (
        <Panel title="Personas de préstamos">
          {!loanPeopleItems.length ? (
            <EmptyState text="No hay personas todavía." />
          ) : (
            <>
              <div className="config-select-row">
                <label>
                  <span>Selecciona una persona para editar</span>
                  <select value={selectedLoanPersonId} onChange={(e) => setSelectedLoanPersonId(e.target.value)}>
                    <option value="">Nueva persona</option>
                    {loanPeopleItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.is_active ? 'Activa' : 'Inactiva'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedLoanPerson ? (
                <div className="selected-meta-row">
                  <span className={`status-chip ${selectedLoanPerson.is_active ? 'active' : 'inactive'}`}>
                    {selectedLoanPerson.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              ) : null}
            </>
          )}

          <form className="form-grid" onSubmit={submitLoanPerson}>
            <label>
              <span>Nombre</span>
              <input
                value={loanPersonForm.name}
                onChange={(e) => setLoanPersonForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>

            <div className="full-span form-actions split-actions">
              <button className="primary-btn" type="submit" disabled={savingLoanPerson}>
                {savingLoanPerson ? 'Guardando...' : selectedLoanPerson ? 'Actualizar persona' : 'Crear persona'}
              </button>

              {selectedLoanPerson ? (
                <>
                  <button className="ghost-btn" type="button" onClick={resetLoanPersonEditor}>
                    Limpiar
                  </button>

                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={toggleLoanPerson}
                  >
                    {selectedLoanPerson.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}

      {/* ── Editar Deudas ── */}
      {activeDeudas.length > 0 ? (
        <Panel title="Editar deudas">
          <div className="config-select-row">
            <label>
              <span>Selecciona una deuda para editar</span>
              <select value={selectedDebtId} onChange={(e) => setSelectedDebtId(e.target.value)}>
                <option value="">Selecciona…</option>
                {activeDeudas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.creditor}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedDebt ? (
            <form className="form-grid" onSubmit={submitDebt}>
              <label>
                <span>Nombre</span>
                <input value={debtForm.name} onChange={(e) => setDebtForm((p) => ({ ...p, name: e.target.value }))} required />
              </label>
              <label>
                <span>Acreedor</span>
                <input value={debtForm.creditor} onChange={(e) => setDebtForm((p) => ({ ...p, creditor: e.target.value }))} required />
              </label>
              <label>
                <span>Fecha próximo pago</span>
                <input type="date" value={debtForm.due_date} onChange={(e) => setDebtForm((p) => ({ ...p, due_date: e.target.value }))} required />
              </label>
              <label>
                <span>Frecuencia de pago</span>
                <select value={debtForm.payment_frequency} onChange={(e) => setDebtForm((p) => ({ ...p, payment_frequency: e.target.value }))}>
                  <option value="monthly">Mensual</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="weekly">Semanal</option>
                  <option value="none">Sin fecha fija</option>
                </select>
              </label>
              <label>
                <span>Monto por cuota</span>
                <input type="number" min="0.01" step="0.01" value={debtForm.installment_amount} onChange={(e) => setDebtForm((p) => ({ ...p, installment_amount: e.target.value }))} required />
              </label>
              <label>
                <span>Total de cuotas</span>
                <input type="number" min="1" step="1" value={debtForm.total_installments} onChange={(e) => setDebtForm((p) => ({ ...p, total_installments: e.target.value }))} required />
              </label>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', gridColumn: '1/-1' }}>
                Cuotas pagadas: {selectedDebt.paid_installments} (no editable)
              </div>
              <div className="full-span form-actions split-actions">
                <button className="primary-btn" type="submit" disabled={savingDebt}>{savingDebt ? 'Guardando...' : 'Actualizar deuda'}</button>
                <button className="ghost-btn" type="button" onClick={() => { setSelectedDebtId(''); setDebtForm(initialDebtForm) }}>Limpiar</button>
              </div>
            </form>
          ) : null}
        </Panel>
      ) : null}

      {/* ── Metas de ahorro ── */}
      <Panel title="Metas de ahorro">
        {goals.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
            {goals.map((g) => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', borderRadius: '0.8rem', background: 'var(--card-soft)', border: '1px solid var(--border-soft)', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{g.name}</span>
                  {g.account_name ? <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'var(--text-soft)' }}>· {g.account_name}</span> : null}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>Meta: Q {Number(g.target_amount).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="ghost-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => setSelectedGoalId(String(g.id))}>Editar</button>
                  <button className="ghost-btn danger-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => deleteGoal(g.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No tienes metas de ahorro." />}

        <form className="form-grid" onSubmit={submitGoal}>
          <label>
            <span>Nombre de la meta</span>
            <input value={goalForm.name} onChange={(e) => setGoalForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Vacaciones" required />
          </label>
          <label>
            <span>Monto objetivo (Q)</span>
            <input type="number" min="0.01" step="0.01" value={goalForm.target_amount} onChange={(e) => setGoalForm((p) => ({ ...p, target_amount: e.target.value }))} required />
          </label>
          <label>
            <span>Cuenta de ahorro vinculada</span>
            <select value={goalForm.account_name} onChange={(e) => setGoalForm((p) => ({ ...p, account_name: e.target.value }))}>
              <option value="">Sin vincular</option>
              {ahorroAccounts.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="full-span form-actions split-actions">
            <button className="primary-btn" type="submit" disabled={savingGoal}>{savingGoal ? 'Guardando...' : selectedGoalId ? 'Actualizar meta' : 'Crear meta'}</button>
            {selectedGoalId ? <button className="ghost-btn" type="button" onClick={() => { setSelectedGoalId(''); setGoalForm(initialGoalForm) }}>Limpiar</button> : null}
          </div>
        </form>
      </Panel>

      <Panel title="Preferencias">
        <form className="form-grid" onSubmit={submitPreferences}>
          <label>
            <span>Mostrar montos por defecto</span>
            <select
              value={prefsForm.showAmountsDefault ? 'si' : 'no'}
              onChange={(e) =>
                setPrefsForm((p) => ({ ...p, showAmountsDefault: e.target.value === 'si' }))
              }
            >
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </label>

          <label>
            <span>Pestaña inicial</span>
            <select
              value={prefsForm.defaultTab}
              onChange={(e) => setPrefsForm((p) => ({ ...p, defaultTab: e.target.value }))}
            >
              <option value="movimientos">Movimientos</option>
              <option value="deudas">Deudas</option>
              <option value="dashboard">Dashboard</option>
              <option value="historial">Historial</option>
              {canUsePrestamos ? <option value="prestamos">Préstamos</option> : null}
            </select>
          </label>

          <label>
            <span>Tipo de cambio USD/GTQ</span>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={prefsForm.usdToGtq}
              onChange={(e) => setPrefsForm((p) => ({ ...p, usdToGtq: e.target.value }))}
              required
            />
          </label>

          <label>
            <span>Tema</span>
            <select
              value={prefsForm.themeKey}
              onChange={(e) => setPrefsForm((p) => ({ ...p, themeKey: e.target.value }))}
            >
              {themeOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="full-span">
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: '0.4rem' }}>
              Orden de pestañas
            </span>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              {(tabOrder || availableTabs).map((key, idx, arr) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '0.6rem',
                    background: 'var(--card-soft)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <button
                      className="ghost-btn"
                      type="button"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem', lineHeight: 1 }}
                      onClick={() => moveTab(idx, 'up')}
                      disabled={idx === 0}
                    >↑</button>
                    <button
                      className="ghost-btn"
                      type="button"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem', lineHeight: 1 }}
                      onClick={() => moveTab(idx, 'down')}
                      disabled={idx === arr.length - 1}
                    >↓</button>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {ALL_TAB_LABELS[key] ?? key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={savingPrefs}>
              {savingPrefs ? 'Guardando...' : 'Guardar preferencias'}
            </button>
          </div>
        </form>
      </Panel>

      {isAdmin ? (
        <Panel title="👥 Usuarios">
          {adminUsers === null ? (
            <div style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>Cargando usuarios…</div>
          ) : adminUsers.length === 0 ? (
            <EmptyState text="No hay usuarios registrados." />
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              {adminUsers.map((u) => {
                const label = [u.first_name, u.last_name].filter(Boolean).join(' ') || `ID ${u.telegram_user_id}`
                const sub = u.username ? `@${u.username}` : `TG: ${u.telegram_user_id}`
                const isSelf = String(u.telegram_user_id) === String(userId)
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '0.8rem',
                      background: 'var(--card-soft)',
                      border: '1px solid var(--border-soft)',
                      gap: '0.5rem',
                      opacity: u.is_active ? 1 : 0.55,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>{label}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                        {sub}{u.can_use_loans ? ' · préstamos' : ''}
                        {isSelf ? ' · tú' : ''}
                      </span>
                    </div>
                    {!isSelf ? (
                      <button
                        className={u.is_active ? 'ghost-btn' : 'primary-btn'}
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', whiteSpace: 'nowrap' }}
                        disabled={togglingUserId === u.id}
                        onClick={() => toggleUsuario(u)}
                      >
                        {togglingUserId === u.id ? '…' : u.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>Admin</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      ) : null}

      {isAdmin ? (
        <Panel title="👤 Crear usuario">
          <form className="form-grid" onSubmit={submitNewUser}>
            <label>
              <span>Telegram User ID</span>
              <input
                type="number"
                min="1"
                step="1"
                value={newUserForm.telegram_user_id}
                onChange={(e) => setNewUserForm((p) => ({ ...p, telegram_user_id: e.target.value }))}
                placeholder="Ej. 123456789"
                required
              />
            </label>

            <label>
              <span>Nombre</span>
              <input
                value={newUserForm.first_name}
                onChange={(e) => setNewUserForm((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="Opcional"
              />
            </label>

            <label>
              <span>Apellido</span>
              <input
                value={newUserForm.last_name}
                onChange={(e) => setNewUserForm((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Opcional"
              />
            </label>

            <label>
              <span>Username (sin @)</span>
              <input
                value={newUserForm.username}
                onChange={(e) => setNewUserForm((p) => ({ ...p, username: e.target.value.replace('@', '') }))}
                placeholder="Opcional"
              />
            </label>

            <label>
              <span>Módulo de préstamos</span>
              <select
                value={newUserForm.can_use_loans ? 'si' : 'no'}
                onChange={(e) => setNewUserForm((p) => ({ ...p, can_use_loans: e.target.value === 'si' }))}
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </label>

            <div className="full-span form-actions">
              <button className="primary-btn" type="submit" disabled={savingNewUser}>
                {savingNewUser ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

    </div>
  )
}