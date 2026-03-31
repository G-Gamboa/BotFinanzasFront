import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'

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

export default function ConfiguracionPage({ userId, api, cuentas, categorias, onRefreshData }) {
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

  function startEditCuenta(item) {
    setEditingAccountId(item.id)
    setAccountForm({
      name: item.name,
      accountType: item.account_type,
      currency: item.currency,
      sortOrder: item.sort_order,
    })
  }

  function startEditCategoria(item) {
    setEditingCategoryId(item.id)
    setCategoryForm({
      name: item.name,
      kind: item.kind,
      sortOrder: item.sort_order,
    })
  }

  return (
    <div className="grid-page two-col">
      {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <Panel title={editingAccountId ? 'Editar cuenta' : 'Nueva cuenta'}>
        <form className="form-grid" onSubmit={submitAccount}>
          <label>
            <span>Nombre</span>
            <input value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} required />
          </label>

          <label>
            <span>Tipo</span>
            <select value={accountForm.accountType} onChange={(e) => setAccountForm((p) => ({ ...p, accountType: e.target.value }))}>
              <option value="bank">Banco</option>
              <option value="cash">Efectivo</option>
              <option value="investment">Inversión</option>
              <option value="asset">Patrimonial</option>
            </select>
          </label>

          <label>
            <span>Moneda</span>
            <select value={accountForm.currency} onChange={(e) => setAccountForm((p) => ({ ...p, currency: e.target.value }))}>
              <option value="GTQ">GTQ</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label>
            <span>Orden</span>
            <input type="number" value={accountForm.sortOrder} onChange={(e) => setAccountForm((p) => ({ ...p, sortOrder: e.target.value }))} />
          </label>

          <div className="full-span form-actions config-actions">
            {editingAccountId ? (
              <button type="button" className="ghost-btn" onClick={resetAccountForm}>Cancelar edición</button>
            ) : null}
            <button className="primary-btn" type="submit" disabled={savingAccount || !userId}>
              {savingAccount ? 'Guardando...' : editingAccountId ? 'Actualizar cuenta' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}>
        <form className="form-grid" onSubmit={submitCategory}>
          <label>
            <span>Nombre</span>
            <input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} required />
          </label>

          <label>
            <span>Tipo</span>
            <select value={categoryForm.kind} onChange={(e) => setCategoryForm((p) => ({ ...p, kind: e.target.value }))}>
              <option value="ING">Ingreso</option>
              <option value="EGR">Egreso</option>
            </select>
          </label>

          <label>
            <span>Orden</span>
            <input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))} />
          </label>

          <div className="full-span form-actions config-actions">
            {editingCategoryId ? (
              <button type="button" className="ghost-btn" onClick={resetCategoryForm}>Cancelar edición</button>
            ) : null}
            <button className="primary-btn" type="submit" disabled={savingCategory || !userId}>
              {savingCategory ? 'Guardando...' : editingCategoryId ? 'Actualizar categoría' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Cuentas" className="full-span">
        {cuentasItems.length ? (
          <div className="list-stack">
            {cuentasItems.map((item) => (
              <div key={item.id} className="config-row">
                <div>
                  <strong>{item.name}</strong>
                  <small>{renderAccountType(item.account_type)} · {item.currency} · {item.is_active ? 'Activa' : 'Inactiva'}{item.is_system ? ' · Sistema' : ''}</small>
                </div>
                <div className="config-row-actions">
                  <button className="ghost-btn" type="button" onClick={() => startEditCuenta(item)}>Editar</button>
                  <button className="ghost-btn" type="button" onClick={() => toggleCuenta(item)} disabled={item.is_system && item.is_active}>
                    {item.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay cuentas registradas." />}
      </Panel>

      <Panel title="Categorías de ingresos">
        {categoriasIng.length ? (
          <div className="list-stack">
            {categoriasIng.map((item) => (
              <div key={item.id} className="config-row">
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.is_active ? 'Activa' : 'Inactiva'}{item.is_system ? ' · Sistema' : ''}</small>
                </div>
                <div className="config-row-actions">
                  <button className="ghost-btn" type="button" onClick={() => startEditCategoria(item)}>Editar</button>
                  <button className="ghost-btn" type="button" onClick={() => toggleCategoria(item)} disabled={item.is_system && item.is_active}>
                    {item.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay categorías de ingresos." />}
      </Panel>

      <Panel title="Categorías de egresos">
        {categoriasEgr.length ? (
          <div className="list-stack">
            {categoriasEgr.map((item) => (
              <div key={item.id} className="config-row">
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.is_active ? 'Activa' : 'Inactiva'}{item.is_system ? ' · Sistema' : ''}</small>
                </div>
                <div className="config-row-actions">
                  <button className="ghost-btn" type="button" onClick={() => startEditCategoria(item)}>Editar</button>
                  <button className="ghost-btn" type="button" onClick={() => toggleCategoria(item)} disabled={item.is_system && item.is_active}>
                    {item.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay categorías de egresos." />}
      </Panel>
    </div>
  )
}

function renderAccountType(value) {
  if (value === 'bank') return 'Banco'
  if (value === 'cash') return 'Efectivo'
  if (value === 'investment') return 'Inversión'
  if (value === 'asset') return 'Patrimonial'
  return value
}
