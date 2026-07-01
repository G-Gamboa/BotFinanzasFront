import { useMemo, useState } from 'react'

const fmt = (n) =>
  `Q${Number(n ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ProgressBar({ pct }) {
  const clamped = Math.min(pct, 1)
  const color =
    pct > 1 ? 'var(--color-danger, #e53e3e)' :
    pct >= 0.8 ? 'var(--color-warning, #f59e0b)' :
    'var(--color-success, #38a169)'

  return (
    <div style={{
      height: '8px',
      borderRadius: '99px',
      background: 'var(--border-color, rgba(128,128,128,0.2))',
      overflow: 'hidden',
      margin: '6px 0',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.round(clamped * 100)}%`,
        borderRadius: '99px',
        background: color,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function BudgetCard({ item, onEdit, onDelete }) {
  const pct = item.pct_used
  const exceeded = item.exceeded_by > 0
  const statusColor =
    pct > 1 ? 'var(--color-danger, #e53e3e)' :
    pct >= 0.8 ? 'var(--color-warning, #f59e0b)' :
    'var(--color-success, #38a169)'

  return (
    <div className="panel" style={{ marginBottom: '12px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.category_name}</div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button className="ghost-btn" style={{ fontSize: '0.78rem', padding: '3px 10px' }} onClick={() => onEdit(item)}>
            Editar
          </button>
          <button className="ghost-btn" style={{ fontSize: '0.78rem', padding: '3px 10px', color: 'var(--color-danger, #e53e3e)' }} onClick={() => onDelete(item)}>
            Eliminar
          </button>
        </div>
      </div>

      <ProgressBar pct={pct} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary, #666)' }}>
        <span>Gastado: <strong style={{ color: statusColor }}>{fmt(item.spent_this_month)}</strong></span>
        <span>Presupuesto: <strong>{fmt(item.monthly_amount)}</strong></span>
      </div>

      {exceeded ? (
        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-danger, #e53e3e)', fontWeight: 500 }}>
          Excedido por {fmt(item.exceeded_by)}
        </div>
      ) : (
        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary, #666)' }}>
          Disponible: {fmt(item.remaining)}
        </div>
      )}
    </div>
  )
}

export default function PresupuestoPage({ userId, api, presupuesto, categorias, onRefreshData }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [formAmount, setFormAmount] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ kind: '', text: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const items = presupuesto?.items || []

  const egrCategories = useMemo(() => {
    const all = categorias?.items || []
    return all.filter((c) => c.kind === 'EGR' && c.is_active)
  }, [categorias])

  const usedCategoryIds = useMemo(() => new Set(items.map((i) => i.category_id)), [items])

  const availableCategories = useMemo(
    () => egrCategories.filter((c) => !usedCategoryIds.has(c.id)),
    [egrCategories, usedCategoryIds]
  )

  function openCreate() {
    setEditItem(null)
    setFormCategoryId(availableCategories[0]?.id?.toString() || '')
    setFormAmount('')
    setMsg({ kind: '', text: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setFormAmount(String(item.monthly_amount))
    setFormCategoryId('')
    setMsg({ kind: '', text: '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setFormAmount('')
    setFormCategoryId('')
  }

  async function handleSave(e) {
    e.preventDefault()
    const amount = parseFloat(formAmount)
    if (!amount || amount <= 0) {
      setMsg({ kind: 'error', text: 'El monto debe ser mayor a 0.' })
      return
    }
    setSaving(true)
    setMsg({ kind: '', text: '' })
    try {
      if (editItem) {
        await api.patchPresupuesto(editItem.id, {
          telegram_user_id: Number(userId),
          monthly_amount: amount,
        })
        setMsg({ kind: 'success', text: 'Presupuesto actualizado.' })
      } else {
        const catId = parseInt(formCategoryId, 10)
        if (!catId) {
          setMsg({ kind: 'error', text: 'Selecciona una categoría.' })
          setSaving(false)
          return
        }
        await api.postPresupuesto({
          telegram_user_id: Number(userId),
          category_id: catId,
          monthly_amount: amount,
        })
        setMsg({ kind: 'success', text: 'Presupuesto creado.' })
      }
      onRefreshData()
      closeForm()
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    setSaving(true)
    setMsg({ kind: '', text: '' })
    try {
      await api.deletePresupuesto(item.id, userId)
      setConfirmDelete(null)
      onRefreshData()
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Error al eliminar.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Presupuesto mensual</h2>
        {!showForm && availableCategories.length > 0 && (
          <button className="primary-btn" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={openCreate}>
            + Agregar
          </button>
        )}
      </div>

      {msg.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '12px',
          marginBottom: '12px',
          fontSize: '0.85rem',
          background: msg.kind === 'error'
            ? 'color-mix(in srgb, var(--color-danger, #e53e3e) 12%, var(--card-soft))'
            : 'color-mix(in srgb, var(--color-success, #38a169) 12%, var(--card-soft))',
          color: msg.kind === 'error' ? 'var(--color-danger, #e53e3e)' : 'var(--color-success, #38a169)',
          border: `1px solid ${msg.kind === 'error'
            ? 'color-mix(in srgb, var(--color-danger, #e53e3e) 30%, transparent)'
            : 'color-mix(in srgb, var(--color-success, #38a169) 30%, transparent)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ marginBottom: '16px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem' }}>
            {editItem ? `Editar presupuesto — ${editItem.category_name}` : 'Nuevo presupuesto'}
          </h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!editItem && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                Categoría de egreso
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  required
                >
                  <option value="">— Selecciona —</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Monto mensual (Q)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="primary-btn" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" className="ghost-btn" onClick={closeForm} disabled={saving}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="panel" style={{
          marginBottom: '16px',
          padding: '14px 16px',
          border: '1.5px solid color-mix(in srgb, var(--color-danger, #e53e3e) 40%, transparent)',
          background: 'color-mix(in srgb, var(--color-danger, #e53e3e) 8%, var(--card-soft))',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.88rem' }}>
            ¿Eliminar el presupuesto de <strong>{confirmDelete.category_name}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="primary-btn"
              style={{ background: 'var(--color-danger, #e53e3e)', flex: 1 }}
              onClick={() => handleDelete(confirmDelete)}
              disabled={saving}
            >
              {saving ? 'Eliminando…' : 'Eliminar'}
            </button>
            <button className="ghost-btn" onClick={() => setConfirmDelete(null)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="panel" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary, #666)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>No hay presupuestos configurados aún.</p>
          {availableCategories.length > 0 && (
            <button className="primary-btn" onClick={openCreate}>+ Agregar presupuesto</button>
          )}
        </div>
      ) : (
        items.map((item) => (
          <BudgetCard
            key={item.id}
            item={item}
            onEdit={openEdit}
            onDelete={(i) => { setMsg({ kind: '', text: '' }); setConfirmDelete(i) }}
          />
        ))
      )}

      {items.length > 0 && !showForm && availableCategories.length === 0 && egrCategories.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #666)', textAlign: 'center', marginTop: '8px' }}>
          Todas las categorías de egreso tienen presupuesto asignado.
        </p>
      )}
    </div>
  )
}
