import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'
import LoadingBlock from '../components/LoadingBlock'

const initialAccountForm = {
  name: '',
  accountType: 'bank',
  currency: 'GTQ',
  sortOrder: 0,
}

const initialCategoryForm = {
  name: '',
  kind: 'EGR',
  sortOrder: 0,
}

export default function ConfiguracionPage({ userId, api, cuentas, categorias, loading, onRefreshData }) {
  const [accountForm, setAccountForm] = useState(initialAccountForm)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('EGR')

  const cuentasItems = useMemo(() => cuentas?.items || [], [cuentas])
  const categoriasItems = useMemo(() => categorias?.items || [], [categorias])
  const filteredCategorias = useMemo(
    () => categoriasItems.filter((item) => item.kind === categoryFilter),
    [categoriasItems, categoryFilter]
  )

  const selectedAccount = useMemo(
    () => cuentasItems.find((item) => String(item.id) === String(selectedAccountId)) || null,
    [cuentasItems, selectedAccountId]
  )

  const selectedCategory = useMemo(
    () => filteredCategorias.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [filteredCategorias, selectedCategoryId]
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
      sortOrder: selectedAccount.sort_order,
    })
  }, [selectedAccount])

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryForm((prev) => ({ ...initialCategoryForm, kind: categoryFilter }))
      return
    }
    setCategoryForm({
      name: selectedCategory.name,
      kind: selectedCategory.kind,
      sortOrder: selectedCategory.sort_order,
    })
  }, [selectedCategory, categoryFilter])

  function resetAccountForm() {
    setSelectedAccountId('')
    setAccountForm(initialAccountForm)
  }

  function resetCategoryForm(kindOverride = null) {
    setSelectedCategoryId('')
    setCategoryForm({ ...initialCategoryForm, kind: kindOverride || categoryFilter })
  }

  async function submitAccount(e) {
    e.preventDefault()
    setSavingAccount(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        name: accountForm.name,
        account_type: accountForm.accountType,
        currency: accountForm.currency,
        sort_order: Number(accountForm.sortOrder || 0),
      }

      if (selectedAccountId) {
        await api.patchCuenta(selectedAccountId, payload)
        setMessage('Cuenta actualizada correctamente.')
      } else {
        await api.postCuenta(payload)
        setMessage('Cuenta creada correctamente.')
      }

      resetAccountForm()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar la cuenta.')
    } finally {
      setSavingAccount(false)
    }
  }

  async function submitCategory(e) {
    e.preventDefault()
    setSavingCategory(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        telegram_user_id: Number(userId),
        name: categoryForm.name,
        kind: categoryForm.kind,
        sort_order: Number(categoryForm.sortOrder || 0),
      }

      if (selectedCategoryId) {
        await api.patchCategoria(selectedCategoryId, payload)
        setMessage('Categoría actualizada correctamente.')
      } else {
        await api.postCategoria(payload)
        setMessage('Categoría creada correctamente.')
      }

      resetCategoryForm(categoryFilter)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar la categoría.')
    } finally {
      setSavingCategory(false)
    }
  }

  async function toggleCuenta() {
    if (!selectedAccount) return
    setMessage('')
    setError('')
    try {
      if (selectedAccount.is_active) {
        await api.desactivarCuenta(selectedAccount.id, userId)
        setMessage('Cuenta desactivada correctamente.')
      } else {
        await api.activarCuenta(selectedAccount.id, userId)
        setMessage('Cuenta activada correctamente.')
      }
      resetAccountForm()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la cuenta.')
    }
  }

  async function toggleCategoria() {
    if (!selectedCategory) return
    setMessage('')
    setError('')
    try {
      if (selectedCategory.is_active) {
        await api.desactivarCategoria(selectedCategory.id, userId)
        setMessage('Categoría desactivada correctamente.')
      } else {
        await api.activarCategoria(selectedCategory.id, userId)
        setMessage('Categoría activada correctamente.')
      }
      resetCategoryForm(categoryFilter)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la categoría.')
    }
  }

  if (loading && !cuentas && !categorias) {
    return <LoadingBlock text="Cargando configuración..." />
  }

  return (
    <div className="grid-page two-col config-page-grid">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <Panel title="Cuentas">
        <div className="config-select-row">
          <label className="full-span">
            <span>Cuenta</span>
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

        {cuentasItems.length === 0 ? <EmptyState text="No hay cuentas disponibles." /> : null}

        {selectedAccount ? (
          <div className="selected-meta-row">
            <span className={`status-chip ${selectedAccount.is_active ? 'active' : 'inactive'}`}>
              {selectedAccount.is_active ? 'Activa' : 'Inactiva'}
            </span>
            <span className="mini-chip">{selectedAccount.account_type}</span>
            <span className="mini-chip">{selectedAccount.currency}</span>
          </div>
        ) : null}

        <form className="form-grid config-form-block" onSubmit={submitAccount}>
          <label>
            <span>Nombre</span>
            <input value={accountForm.name} onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>

          <label>
            <span>Tipo</span>
            <select value={accountForm.accountType} onChange={(e) => setAccountForm((prev) => ({ ...prev, accountType: e.target.value }))}>
              <option value="cash">Efectivo</option>
              <option value="bank">Banco</option>
              <option value="investment">Inversión</option>
              <option value="asset">Patrimonial</option>
            </select>
          </label>

          <label>
            <span>Moneda</span>
            <select value={accountForm.currency} onChange={(e) => setAccountForm((prev) => ({ ...prev, currency: e.target.value }))}>
              <option value="GTQ">GTQ</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label>
            <span>Orden</span>
            <input type="number" value={accountForm.sortOrder} onChange={(e) => setAccountForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
          </label>

          <div className="full-span form-actions split-actions">
            <button className="ghost-btn" type="button" onClick={resetAccountForm}>Nueva</button>
            {selectedAccount ? (
              <button
                className="ghost-btn"
                type="button"
                onClick={toggleCuenta}
                disabled={selectedAccount.is_system && selectedAccount.is_active}
              >
                {selectedAccount.is_active ? 'Desactivar' : 'Activar'}
              </button>
            ) : null}
            <button className="primary-btn" type="submit" disabled={savingAccount || !userId}>
              {savingAccount ? 'Guardando...' : selectedAccountId ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Categorías">
        <div className="config-filter-tabs">
          <button className={categoryFilter === 'ING' ? 'tab active' : 'tab'} type="button" onClick={() => { setCategoryFilter('ING'); resetCategoryForm('ING') }}>
            Ingresos
          </button>
          <button className={categoryFilter === 'EGR' ? 'tab active' : 'tab'} type="button" onClick={() => { setCategoryFilter('EGR'); resetCategoryForm('EGR') }}>
            Egresos
          </button>
        </div>

        <div className="config-select-row">
          <label className="full-span">
            <span>Categoría</span>
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
              <option value="">Nueva categoría</option>
              {filteredCategorias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.is_active ? 'Activa' : 'Inactiva'}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredCategorias.length === 0 ? <EmptyState text={`No hay categorías ${categoryFilter === 'ING' ? 'de ingresos' : 'de egresos'}.`} /> : null}

        {selectedCategory ? (
          <div className="selected-meta-row">
            <span className={`status-chip ${selectedCategory.is_active ? 'active' : 'inactive'}`}>
              {selectedCategory.is_active ? 'Activa' : 'Inactiva'}
            </span>
            <span className="mini-chip">{selectedCategory.kind}</span>
          </div>
        ) : null}

        <form className="form-grid config-form-block" onSubmit={submitCategory}>
          <label>
            <span>Nombre</span>
            <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>

          <label>
            <span>Tipo</span>
            <select value={categoryForm.kind} onChange={(e) => setCategoryForm((prev) => ({ ...prev, kind: e.target.value }))}>
              <option value="ING">Ingreso</option>
              <option value="EGR">Egreso</option>
            </select>
          </label>

          <label>
            <span>Orden</span>
            <input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
          </label>

          <div className="full-span form-actions split-actions">
            <button className="ghost-btn" type="button" onClick={() => resetCategoryForm(categoryFilter)}>Nueva</button>
            {selectedCategory ? (
              <button
                className="ghost-btn"
                type="button"
                onClick={toggleCategoria}
                disabled={selectedCategory.is_system && selectedCategory.is_active}
              >
                {selectedCategory.is_active ? 'Desactivar' : 'Activar'}
              </button>
            ) : null}
            <button className="primary-btn" type="submit" disabled={savingCategory || !userId}>
              {savingCategory ? 'Guardando...' : selectedCategoryId ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
