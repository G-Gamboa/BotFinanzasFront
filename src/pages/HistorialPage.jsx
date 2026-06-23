import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'

const PAGE_SIZE = 15

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function fmtMethod(pm) {
  if (pm === 'cash') return 'Efectivo'
  if (pm === 'transfer') return 'Transferencia'
  if (pm === 'credit_card') return 'TC'
  return pm || ''
}

function fmtSubtype(s) {
  const map = {
    INGRESO: 'Ingreso',
    EGRESO: 'Egreso',
    AHORRO: 'Ahorro',
    INVERSION: 'Inversión',
    NORMAL: 'Movimiento',
    COBRO: 'Cobro',
    PAGO_DEUDA: 'Pago deuda',
    PRESTAMO: 'Préstamo',
    OTRO: 'Otro',
  }
  return map[s] || s
}

function getOrigenText(item) {
  if (item.payment_method === 'credit_card') {
    return item.credit_card_account_name ? `TC: ${item.credit_card_account_name}` : 'TC'
  }
  if (item.payment_method === 'cash' && item.movement_type === 'EGR') return 'Efectivo'
  const method = fmtMethod(item.payment_method)
  const account = item.transfer_account || item.source_account || item.target_account
  if (account && method) return `${method}: ${account}`
  if (account) return account
  if (method) return method
  return null
}

export default function HistorialPage({
  userId, api, categorias, catalogos, disponibles, tcBalances = [], onRefreshData,
}) {
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [voidingId, setVoidingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const categoriasItems = useMemo(() => categorias?.items || [], [categorias])
  const creditCards = useMemo(() => catalogos?.accounts?.credit_cards || [], [catalogos])

  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    movement_type: '',
    category_name: '',
    payment_method: '',
    note: '',
    amount_min: '',
    amount_max: '',
    limit: PAGE_SIZE,
  })

  const categoryOptions = useMemo(() => {
    if (filters.movement_type !== 'ING' && filters.movement_type !== 'EGR') return []
    return categoriasItems.filter((c) => c.kind === filters.movement_type && c.is_active)
  }, [categoriasItems, filters.movement_type])

  async function loadHistorial(currentPage = page, currentFilters = filters) {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.getHistorial(userId, {
        ...currentFilters,
        offset: currentPage * PAGE_SIZE,
      })
      setItems(data.items || [])
      setTotalCount(data.total_count ?? data.total ?? 0)
    } catch (err) {
      setError(err.message || 'No pude cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistorial(0, filters)
    setPage(0)
  }, [userId])

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  function applyFilters(e) {
    e.preventDefault()
    setPage(0)
    loadHistorial(0, filters)
  }

  function goToPage(newPage) {
    setPage(newPage)
    loadHistorial(newPage, filters)
  }

  async function handleVoid(item) {
    const label = item.record_type === 'loan_payment'
      ? 'cobro'
      : item.record_type === 'debt_payment'
      ? 'pago de deuda'
      : 'movimiento'

    const reason = window.prompt(`Anular ${label}\n\nMotivo opcional:`, '')
    if (reason === null) return

    setVoidingId(item.id)
    setError('')
    setMessage('')

    try {
      const voidPayload = { reason: reason.trim() || null }
      if (item.record_type === 'loan_payment') {
        await api.anularLoanPayment(item.id, voidPayload)
      } else if (item.record_type === 'debt_payment') {
        await api.anularDebtPayment(item.id, voidPayload)
      } else {
        await api.anularMovimiento(item.id, voidPayload)
      }
      setMessage('Registro anulado correctamente.')
      await loadHistorial()
      await onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude anular el registro.')
    } finally {
      setVoidingId(null)
    }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    setEditForm({
      movement_date: item.movement_date || '',
      amount: String(item.amount),
      note: item.note || '',
      category_name: item.category_name || '',
      credit_card_account_id: item.credit_card_account_id
        ? String(item.credit_card_account_id)
        : (creditCards[0]?.id ? String(creditCards[0].id) : ''),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  // Compute max spendable for the item being edited (for EGR validation)
  const editMaxAmount = useMemo(() => {
    if (!editingId) return null
    const item = items.find((i) => i.id === editingId)
    if (!item || item.movement_type !== 'EGR') return null

    const getSaldo = (name) => {
      if (!name) return 0
      const found = (disponibles?.saldos_liquidos || []).find((s) => s.cuenta === name)
      return Number(found?.saldo ?? 0)
    }

    if (item.payment_method === 'cash') {
      return Math.round((getSaldo('Efectivo') + item.amount) * 100) / 100
    }
    if (item.payment_method === 'transfer') {
      const acct = item.transfer_account || ''
      return Math.round((getSaldo(acct) + item.amount) * 100) / 100
    }
    if (item.payment_method === 'credit_card') {
      const cardId = Number(editForm.credit_card_account_id || item.credit_card_account_id)
      const tc = tcBalances.find((t) => t.id === cardId)
      if (!tc || tc.credit_limit == null) return null
      return Math.round(((tc.credit_limit || 0) - (tc.balance || 0) + item.amount) * 100) / 100
    }
    return null
  }, [editingId, editForm.credit_card_account_id, items, disponibles, tcBalances])

  async function submitEdit(e, item) {
    e.preventDefault()
    setSavingEdit(true)
    setError('')
    setMessage('')

    const newAmount = Number(editForm.amount)
    if (editMaxAmount !== null && newAmount > editMaxAmount) {
      setError(`El monto excede el disponible (máx Q ${editMaxAmount.toFixed(2)}).`)
      setSavingEdit(false)
      return
    }

    try {
      const payload = {}
      if (editForm.movement_date) payload.movement_date = editForm.movement_date
      if (editForm.amount !== '') payload.amount = newAmount
      payload.note = editForm.note || null

      if (item.movement_type === 'ING' || item.movement_type === 'EGR') {
        if (editForm.category_name) payload.category_name = editForm.category_name
        if (item.payment_method === 'credit_card' && editForm.credit_card_account_id) {
          payload.credit_card_account_id = Number(editForm.credit_card_account_id)
        }
      }

      await api.patchMovimiento(item.id, payload)
      setMessage('Movimiento actualizado correctamente.')
      cancelEdit()
      await loadHistorial()
      await onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude editar el movimiento.')
    } finally {
      setSavingEdit(false)
    }
  }

  function renderInfo(item) {
    const parts = []
    if (item.category_name) parts.push(item.category_name)
    const origen = getOrigenText(item)
    if (origen) parts.push(origen)
    if (item.loan_person_name) parts.push(item.loan_person_name)
    if (item.debt_name) parts.push(item.debt_name)
    return parts.join(' · ')
  }

  return (
    <div className="grid-page single-col">
      <Panel title="Historial">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={applyFilters}>
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => updateFilter('date_from', e.target.value)}
            />
          </label>

          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => updateFilter('date_to', e.target.value)}
            />
          </label>

          <label>
            <span>Tipo</span>
            <select
              value={filters.movement_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, movement_type: e.target.value, category_name: '' }))}
            >
              <option value="">Todos</option>
              <option value="ING">Ingresos</option>
              <option value="EGR">Egresos</option>
              <option value="MOV">Movimientos</option>
            </select>
          </label>

          {categoryOptions.length > 0 && (
            <label>
              <span>Categoría</span>
              <select
                value={filters.category_name}
                onChange={(e) => updateFilter('category_name', e.target.value)}
              >
                <option value="">Todas</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          {(filters.movement_type === '' || filters.movement_type === 'ING' || filters.movement_type === 'EGR') && (
            <label>
              <span>Método de pago</span>
              <select
                value={filters.payment_method}
                onChange={(e) => updateFilter('payment_method', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="credit_card">Tarjeta de crédito</option>
              </select>
            </label>
          )}

          <label className="full-span">
            <span>Buscar en nota</span>
            <input
              type="text"
              value={filters.note}
              onChange={(e) => updateFilter('note', e.target.value)}
              placeholder="Texto parcial..."
            />
          </label>

          <label>
            <span>Monto mín.</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.amount_min}
              onChange={(e) => updateFilter('amount_min', e.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>Monto máx.</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.amount_max}
              onChange={(e) => updateFilter('amount_max', e.target.value)}
              placeholder="Sin límite"
            />
          </label>

          <div className="full-span form-actions split-actions">
            <button className="primary-btn" type="submit">
              Aplicar filtros
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                const next = {
                  date_from: '', date_to: '', movement_type: '', category_name: '', payment_method: '', note: '',
                  amount_min: '', amount_max: '', limit: PAGE_SIZE,
                }
                setFilters(next)
                setPage(0)
                loadHistorial(0, next)
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Resultados">
        {loading ? <div>Cargando...</div> : null}

        {!loading && items.length === 0 ? (
          <EmptyState text="No hay movimientos en este rango." />
        ) : null}

        {totalCount > 0 && (
          <div className="pagination-bar">
            <button
              className="ghost-btn"
              onClick={() => goToPage(page - 1)}
              disabled={page === 0 || loading}
            >
              ←
            </button>
            <span className="pagination-info">
              Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)} · {totalCount} regs
            </span>
            <button
              className="ghost-btn"
              onClick={() => goToPage(page + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount || loading}
            >
              →
            </button>
          </div>
        )}

        <div className="history-list">
          {items.map((item) => (
            <div key={item.id} className={`history-card${item.is_void ? ' history-card-void' : ''}`}>
              <div className="history-row history-row-top">
                <div className="history-top-left">
                  <strong>{fmtDate(item.movement_date)}</strong>
                  <span className="history-chip history-chip-subtype">
                    {fmtSubtype(item.subtype)}
                  </span>
                  {item.is_void ? <span className="history-chip history-chip-void">Anulado</span> : null}
                </div>

                <div className="history-top-right">
                  <span className="history-amount">
                    Q {Number(item.amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {renderInfo(item) ? (
                <div className="history-row small history-wrap">
                  <span>{renderInfo(item)}</span>
                </div>
              ) : null}

              {item.note ? (
                <div className="history-note">Nota: {item.note}</div>
              ) : null}

              {editingId === item.id && item.record_type === 'movement' ? (
                <form className="edit-movement-form form-grid" onSubmit={(e) => submitEdit(e, item)}>
                  <label>
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={editForm.movement_date}
                      onChange={(e) => setEditForm((p) => ({ ...p, movement_date: e.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Monto
                      {editMaxAmount !== null ? (
                        <span className="helper-text"> (máx Q {editMaxAmount.toFixed(2)})</span>
                      ) : null}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={editMaxAmount !== null ? editMaxAmount : undefined}
                      value={editForm.amount}
                      onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </label>

                  {(item.movement_type === 'ING' || item.movement_type === 'EGR') ? (
                    <label>
                      <span>Categoría</span>
                      <select
                        value={editForm.category_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, category_name: e.target.value }))}
                      >
                        <option value="">Sin cambio</option>
                        {categoriasItems
                          .filter((c) => c.kind === item.movement_type && c.is_active)
                          .map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                    </label>
                  ) : null}

                  {item.payment_method === 'credit_card' && creditCards.length > 0 ? (
                    <label>
                      <span>Tarjeta</span>
                      <select
                        value={editForm.credit_card_account_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, credit_card_account_id: e.target.value }))}
                      >
                        {creditCards.map((tc) => (
                          <option key={tc.id} value={String(tc.id)}>{tc.name}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="full-span">
                    <span>Nota</span>
                    <input
                      type="text"
                      value={editForm.note}
                      onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                    />
                  </label>

                  <div className="full-span form-actions split-actions">
                    <button className="primary-btn" type="submit" disabled={savingEdit}>
                      {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button className="ghost-btn" type="button" onClick={cancelEdit}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="history-actions">
                {!item.is_void && item.record_type === 'movement' ? (
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={editingId !== null}
                  >
                    Editar
                  </button>
                ) : null}

                <button
                  className="ghost-btn danger-btn"
                  type="button"
                  onClick={() => handleVoid(item)}
                  disabled={voidingId === item.id || item.is_void}
                >
                  {voidingId === item.id ? 'Anulando...' : 'Anular'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
