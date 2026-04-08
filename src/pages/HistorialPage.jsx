import { useEffect, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'

export default function HistorialPage({ userId, api,onRefreshData }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [voidingId, setVoidingId] = useState(null)

  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    movement_type: '',
    limit: 50,
  })

  async function loadHistorial() {
    if (!userId) return

    setLoading(true)
    setError('')

    try {
      const data = await api.getHistorial(userId, filters)
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'No pude cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistorial()
  }, [userId])

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  function applyFilters(e) {
    e.preventDefault()
    loadHistorial()
  }

  async function handleVoid(item) {
    const reason = window.prompt(
      `Anular movimiento #${item.id}\n\nMotivo opcional:`,
      ''
    )

    if (reason === null) return

    setVoidingId(item.id)
    setError('')
    setMessage('')

    try {
      await api.anularMovimiento(item.id, {
        reason: reason.trim() || null,
      })

      setMessage(`Movimiento #${item.id} anulado correctamente.`)
      await loadHistorial()
      await onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude anular el movimiento.')
    } finally {
      setVoidingId(null)
    }
  }

  function renderSecondaryLine(item) {
    const parts = []

    if (item.category_name) parts.push(item.category_name)
    if (item.loan_person_name) parts.push(item.loan_person_name)
    if (item.payment_method) parts.push(item.payment_method)
    if (item.source_account) parts.push(`Origen: ${item.source_account}`)
    if (item.target_account) parts.push(`Destino: ${item.target_account}`)
    if (item.transfer_account) parts.push(`Cuenta: ${item.transfer_account}`)

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
              onChange={(e) => updateFilter('movement_type', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="ING">Ingresos</option>
              <option value="EGR">Egresos</option>
              <option value="MOV">Movimientos</option>
            </select>
          </label>

          <label>
            <span>Límite</span>
            <input
              type="number"
              min="1"
              max="200"
              value={filters.limit}
              onChange={(e) => updateFilter('limit', e.target.value)}
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
                  date_from: '',
                  date_to: '',
                  movement_type: '',
                  limit: 50,
                }
                setFilters(next)
                setTimeout(() => {
                  loadHistorial()
                }, 0)
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

        <div className="history-list">
          {items.map((item) => (
            <div key={item.id} className="history-card">
              <div className="history-row history-row-top">
                <div className="history-top-left">
                  <strong>{item.movement_date}</strong>
                  <span className={`history-chip history-chip-${String(item.movement_type).toLowerCase()}`}>
                    {item.movement_type}
                  </span>
                  <span className="history-chip history-chip-subtype">
                    {item.subtype}
                  </span>
                </div>

                <div className="history-top-right">
                  <span className="history-amount">
                    Q {Number(item.amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="history-row small history-wrap">
                <span>ID: {item.id}</span>
                {renderSecondaryLine(item) ? <span>{renderSecondaryLine(item)}</span> : null}
              </div>

              {item.note ? (
                <div className="history-note">
                  {item.note}
                </div>
              ) : null}

              <div className="history-actions">
                <button
                  className="ghost-btn danger-btn"
                  type="button"
                  onClick={() => handleVoid(item)}
                  disabled={voidingId === item.id}
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