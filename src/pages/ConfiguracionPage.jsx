import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'
import { getPaletteOptions } from '../theme'

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

const initialPrefsForm = {
  showAmountsDefault: false,
  defaultTab: 'movimientos',
  usdToGtq: '7.7',
  themeKey: '',
}

export default function ConfiguracionPage({
  userId,
  api,
  cuentas,
  categorias,
  preferencias,
  canUsePrestamos,
  onRefreshData,
}) {
  const [accountForm, setAccountForm] = useState(initialAccountForm)
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [prefsForm, setPrefsForm] = useState(initialPrefsForm)

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('EGR')

  const [savingAccount, setSavingAccount] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cuentasItems = useMemo(() => cuentas?.items || [], [cuentas])
  const categoriasItems = useMemo(() => categorias?.items || [], [categorias])
  const themeOptions = useMemo(() => getPaletteOptions(userId), [userId])

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
  }, [preferencias])

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
        await api.desactivarCuenta(selectedAccount.id, userId)
        setMessage('Cuenta desactivada correctamente.')
      } else {
        await api.activarCuenta(selectedAccount.id, userId)
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
        await api.desactivarCategoria(selectedCategory.id, userId)
        setMessage('Categoría desactivada correctamente.')
      } else {
        await api.activarCategoria(selectedCategory.id, userId)
        setMessage('Categoría activada correctamente.')
      }

      resetCategoryEditor()
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude cambiar el estado de la categoría.')
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
                onChange={(e) => setAccountForm((p) => ({ ...p, accountType: e.target.value }))}
              >
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="investment">Inversión</option>
                <option value="asset">Patrimonial</option>
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

            <label>
              <span>Orden</span>
              <input
                type="number"
                value={accountForm.sortOrder}
                onChange={(e) => setAccountForm((p) => ({ ...p, sortOrder: e.target.value }))}
              />
            </label>

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
            <label>
              <span>Nombre</span>
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>

            <label>
              <span>Tipo</span>
              <select
                value={categoryForm.kind}
                onChange={(e) => setCategoryForm((p) => ({ ...p, kind: e.target.value }))}
                disabled={Boolean(selectedCategory?.is_system)}
              >
                <option value="EGR">Egreso</option>
                <option value="ING">Ingreso</option>
              </select>
            </label>

            <label>
              <span>Orden</span>
              <input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))}
              />
            </label>

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

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={savingPrefs}>
              {savingPrefs ? 'Guardando...' : 'Guardar preferencias'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}