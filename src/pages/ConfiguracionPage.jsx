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

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }}>
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AccountEditor({ item, editing, onStartEdit, onToggle, disabled }) {
  return (
    <details className="config-accordion">
      <summary className="config-accordion-summary">
        <div>
          <div className="config-item-title">{item.name}</div>
          <div className="config-item-subtitle">
            {item.account_type} · {item.currency} · {item.is_active ? 'Activa' : 'Inactiva'}
          </div>
        </div>
        <span className={`status-chip ${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </summary>

      <div className="config-accordion-body">
        <div className="config-detail-grid">
          <div><strong>Tipo:</strong> {item.account_type}</div>
          <div><strong>Moneda:</strong> {item.currency}</div>
          <div><strong>Orden:</strong> {item.sort_order}</div>
          <div><strong>Sistema:</strong> {item.is_system ? 'Sí' : 'No'}</div>
        </div>

        <div className="config-row-actions">
          <button className="secondary-btn" type="button" onClick={() => onStartEdit(item)}>
            {editing ? 'Editando' : 'Editar'}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => onToggle(item)}
            disabled={disabled}
            title={disabled ? 'No se puede cambiar el estado de esta cuenta.' : ''}
          >
            {item.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </details>
  )
}

function CategoryEditor({ item, editing, onStartEdit, onToggle, disabled }) {
  return (
    <details className="config-accordion">
      <summary className="config-accordion-summary">
        <div>
          <div className="config-item-title">{item.name}</div>
          <div className="config-item-subtitle">
            {item.kind} · {item.is_active ? 'Activa' : 'Inactiva'}
          </div>
        </div>
        <span className={`status-chip ${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </summary>

      <div className="config-accordion-body">
        <div className="config-detail-grid">
          <div><strong>Tipo:</strong> {item.kind}</div>
          <div><strong>Orden:</strong> {item.sort_order}</div>
          <div><strong>Sistema:</strong> {item.is_system ? 'Sí' : 'No'}</div>
        </div>

        <div className="config-row-actions">
          <button className="secondary-btn" type="button" onClick={() => onStartEdit(item)}>
            {editing ? 'Editando' : 'Editar'}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => onToggle(item)}
            disabled={disabled}
            title={disabled ? 'No se puede cambiar el estado de esta categoría.' : ''}
          >
            {item.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </details>
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

  const cuentasItems = useMemo(() => cuentas?.items || [], [cuentas])
  const categoriasItems = useMemo(() => categorias?.items || [], [categorias])
  const categoriasIng = useMemo(() => categoriasItems.filter((item) => item.kind === 'ING'), [categoriasItems])
  const categoriasEgr = useMemo(() => categoriasItems.filter((item) => item.kind === 'EGR'), [categoriasItems])

  function resetAccountForm() {
    setAccountForm(initialAccountForm)
    setEditingAccountId(null)
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategoryForm)
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

      resetCategoryForm()
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

      <div className="config-page-grid">
        <Panel title={editingAccountId ? 'Editar cuenta' : 'Nueva cuenta'}>
          <form className="form-grid" onSubmit={submitAccount}>
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

            <div className="full-span form-actions">
              <button className="primary-btn" type="submit" disabled={savingAccount}>
                {savingAccount ? 'Guardando...' : editingAccountId ? 'Actualizar cuenta' : 'Crear cuenta'}
              </button>
              {editingAccountId ? (
                <button className="ghost-btn" type="button" onClick={resetAccountForm}>
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel title={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}>
          <form className="form-grid" onSubmit={submitCategory}>
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

            <div className="full-span form-actions">
              <button className="primary-btn" type="submit" disabled={savingCategory}>
                {savingCategory ? 'Guardando...' : editingCategoryId ? 'Actualizar categoría' : 'Crear categoría'}
              </button>
              {editingCategoryId ? (
                <button className="ghost-btn" type="button" onClick={resetCategoryForm}>
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      </div>

      <div className="config-page-grid">
        <Panel title="Cuentas">
          {cuentasItems.length === 0 ? (
            <EmptyState text="No hay cuentas disponibles." />
          ) : (
            <div className="config-list">
              {cuentasItems.map((item) => (
                <AccountEditor
                  key={item.id}
                  item={item}
                  editing={editingAccountId === item.id}
                  onStartEdit={startEditAccount}
                  onToggle={toggleCuenta}
                  disabled={item.is_system && item.is_active}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Categorías">
          <div className="config-category-section">
            <h3 className="config-section-title">Ingresos</h3>
            {categoriasIng.length === 0 ? (
              <EmptyState text="No hay categorías de ingresos." />
            ) : (
              <div className="config-list">
                {categoriasIng.map((item) => (
                  <CategoryEditor
                    key={item.id}
                    item={item}
                    editing={editingCategoryId === item.id}
                    onStartEdit={startEditCategory}
                    onToggle={toggleCategoria}
                    disabled={item.is_system && item.is_active}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="config-category-section">
            <h3 className="config-section-title">Egresos</h3>
            {categoriasEgr.length === 0 ? (
              <EmptyState text="No hay categorías de egresos." />
            ) : (
              <div className="config-list">
                {categoriasEgr.map((item) => (
                  <CategoryEditor
                    key={item.id}
                    item={item}
                    editing={editingCategoryId === item.id}
                    onStartEdit={startEditCategory}
                    onToggle={toggleCategoria}
                    disabled={item.is_system && item.is_active}
                  />
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
