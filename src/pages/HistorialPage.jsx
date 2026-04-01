import { useEffect, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import EmptyState from '../components/EmptyState'

export default function HistorialPage({ userId, api }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="grid-page single-col">
      <Panel title="Historial">
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

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit">
              Aplicar filtros
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
              <div className="history-row">
                <strong>{item.movement_date}</strong>
                <span className="history-type">{item.movement_type}</span>
                <span className="history-subtype">{item.subtype}</span>
              </div>

              <div className="history-row">
                <span className="history-amount">
                  Q {Number(item.amount).toFixed(2)}
                </span>
              </div>

              <div className="history-row small">
                {item.category_name && <span>{item.category_name}</span>}
                {item.source_account && <span>Origen: {item.source_account}</span>}
                {item.target_account && <span>Destino: {item.target_account}</span>}
                {item.loan_person_name && <span>{item.loan_person_name}</span>}
              </div>

              {item.note && (
                <div className="history-note">
                  {item.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}