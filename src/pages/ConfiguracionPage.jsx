import { useMemo, useState } from 'react'
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

function CompactItemButton({ title, subtitle, active, status, onClick }) {
  return (
    <button
      type="button"
      className={`compact-item-btn${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <div className="compact-item-main">
        <div className="compact-item-title">{title}</div>
        {subtitle ? <div className="compact-item-subtitle">{subtitle}</div> : null}
      </div>
      <span className={`status-chip ${status === 'Activa' ? 'active' : 'inactive'}`}>{status}</span>
    </button>
  )
}

export default function ConfiguracionPage({ userId, api, cuentas, categorias, loading, onRefreshData }) {
  const [accountForm, setAccountForm] = useState(initialAccountForm)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
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

  function resetAccountForm() {
    setAccountForm(initialAccountForm)
    setEditingAccountId(null)
  }

  function resetCategoryForm(kindOverride = null) {
    setCategoryForm({ ...initialCategoryForm, kind: kindOverride || categoryFilter })
    setEditingCategoryId(null)
  }

  function startEditAccount(item) {
    setEditingAccountId(item.id)
    setAccountForm({
      name: item.name,
      accountType: item.account_type,
      currency: item.currency,
      sortOrder: item.sort_order,
    })
  }

  function startEditCategory(item) {
    setEditingCategoryId(item.id)
    setCategoryFilter(item.kind)
    setCategoryForm({
      name: item.name,
      kind: item.kind,
      sortOrder: item.sort_order,
    })
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

      if (editingAccountId) {
        await api.patchCuenta(editingAccountId, payload)
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

      if (editingCategoryId) {
        await api.patchCategoria(editingCategoryId, payload)
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

  async function toggleCuenta(item) {
    setMessage('')
    setError('')
    try {
      if (item.is_active) {
        await api.desactivarCuenta(item.id, userId)
        setMessage('Cuenta desactivada correctamente.')
      } else {
        await api.activarCuenta(item.id, userId)
        setMessage('Cuenta activada correctamente.')
      }
      if (editingAccountId === item.id) resetAccountForm()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la cuenta.')
    }
  }

  async function toggleCategoria(item) {
    setMessage('')
    setError('')
    try {
      if (item.is_active) {
        await api.desactivarCategoria(item.id, userId)
        setMessage('Categoría desactivada correctamente.')
      } else {
        await api.activarCategoria(item.id, userId)
        setMessage('Categoría activada correctamente.')
      }
      if (editingCategoryId === item.id) resetCategoryForm(item.kind)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la categoría.')
    }
  }

  if (loading && !cuentas && !categorias) {
    return <LoadingBlock text="Cargando configuración..." />
  }

  return (
    <div className="grid-page single-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <div className="config-compact-grid">
        <Panel title="Cuentas">
          <div className="config-toolbar">
            <div className="config-toolbar-title">Selecciona una cuenta para editarla</div>
            <button className="ghost-btn" type="button" onClick={resetAccountForm}>
              Nueva cuenta
            </button>
          </div>

          {cuentasItems.length === 0 ? (
            <EmptyState text="No hay cuentas disponibles." />
          ) : (
            <div className="compact-list">
              {cuentasItems.map((item) => (
                <CompactItemButton
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.account_type} · ${item.currency}`}
                  status={item.is_active ? 'Activa' : 'Inactiva'}
                  active={editingAccountId === item.id}
                  onClick={() => startEditAccount(item)}
                />
              ))}
            </div>
          )}

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

            {editingAccountId ? (
              <div className="full-span config-inline-actions">
                <button className="primary-btn" type="submit" disabled={savingAccount}>
                  {savingAccount ? 'Guardando...' : 'Actualizar cuenta'}
                </button>
                <button className="ghost-btn" type="button" onClick={resetAccountForm}>
                  Cancelar
                </button>
                {(() => {
                  const item = cuentasItems.find((x) => x.id === editingAccountId)
                  if (!item) return null
                  return (
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => toggleCuenta(item)}
                      disabled={item.is_system && item.is_active}
                      title={item.is_system && item.is_active ? 'No se puede cambiar el estado de esta cuenta.' : ''}
                    >
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  )
                })()}
              </div>
            ) : (
              <div className="full-span form-actions">
                <button className="primary-btn" type="submit" disabled={savingAccount}>
                  {savingAccount ? 'Guardando...' : 'Crear cuenta'}
                </button>
              </div>
            )}
          </form>
        </Panel>

        <Panel title="Categorías">
          <div className="config-toolbar">
            <div className="segmented-tabs">
              <button
                type="button"
                className={categoryFilter === 'ING' ? 'segmented-tab active' : 'segmented-tab'}
                onClick={() => {
                  setCategoryFilter('ING')
                  if (!editingCategoryId) setCategoryForm((prev) => ({ ...prev, kind: 'ING' }))
                }}
              >
                Ingresos
              </button>
              <button
                type="button"
                className={categoryFilter === 'EGR' ? 'segmented-tab active' : 'segmented-tab'}
                onClick={() => {
                  setCategoryFilter('EGR')
                  if (!editingCategoryId) setCategoryForm((prev) => ({ ...prev, kind: 'EGR' }))
                }}
              >
                Egresos
              </button>
            </div>
            <button className="ghost-btn" type="button" onClick={() => resetCategoryForm(categoryFilter)}>
              Nueva categoría
            </button>
          </div>

          {filteredCategorias.length === 0 ? (
            <EmptyState text={`No hay categorías de ${categoryFilter === 'ING' ? 'ingresos' : 'egresos'}.`} />
          ) : (
            <div className="compact-list">
              {filteredCategorias.map((item) => (
                <CompactItemButton
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.kind} · orden ${item.sort_order}`}
                  status={item.is_active ? 'Activa' : 'Inactiva'}
                  active={editingCategoryId === item.id}
                  onClick={() => startEditCategory(item)}
                />
              ))}
            </div>
          )}

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

            {editingCategoryId ? (
              <div className="full-span config-inline-actions">
                <button className="primary-btn" type="submit" disabled={savingCategory}>
                  {savingCategory ? 'Guardando...' : 'Actualizar categoría'}
                </button>
                <button className="ghost-btn" type="button" onClick={() => resetCategoryForm(categoryFilter)}>
                  Cancelar
                </button>
                {(() => {
                  const item = categoriasItems.find((x) => x.id === editingCategoryId)
                  if (!item) return null
                  return (
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => toggleCategoria(item)}
                      disabled={item.is_system && item.is_active}
                      title={item.is_system && item.is_active ? 'No se puede cambiar el estado de esta categoría.' : ''}
                    >
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  )
                })()}
              </div>
            ) : (
              <div className="full-span form-actions">
                <button className="primary-btn" type="submit" disabled={savingCategory}>
                  {savingCategory ? 'Guardando...' : 'Crear categoría'}
                </button>
              </div>
            )}
          </form>
        </Panel>
      </div>
    </div>
  )
}
