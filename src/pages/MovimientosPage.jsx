import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'
import { getEgresoMethods, getTransferAccounts } from '../lib/accountFilters'

const initialForm = {
  tipo: 'EGR',
  fecha: new Date().toISOString().slice(0, 10),
  fuente: '',
  categoria: '',
  monto: '',
  metodo: '',
  banco: '',
  nota: '',
  remitente: '',
  destino: '',
  monto_destino: '',
}

export default function MovimientosPage({ userId, api, catalogos, onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const visibleCategories = useMemo(() => {
    if (form.tipo === 'ING') return catalogos?.CATEG_ING || []
    if (form.tipo === 'EGR') return catalogos?.CATEG_EGR || []
    return []
  }, [form.tipo, catalogos])

  const egresoMethods = useMemo(() => getEgresoMethods(), [])
  const transferAccounts = useMemo(() => getTransferAccounts(catalogos), [catalogos])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      metodo:
        prev.tipo === 'EGR'
          ? (egresoMethods[0] || '')
          : (catalogos?.METODOS?.[0] || prev.metodo),
      categoria:
        prev.tipo === 'ING'
          ? (catalogos?.CATEG_ING?.[0] || prev.categoria)
          : prev.tipo === 'EGR'
            ? (catalogos?.CATEG_EGR?.[0] || prev.categoria)
            : prev.categoria,
      fuente: catalogos?.FUENTES_ING?.[0] || prev.fuente,
      banco: transferAccounts[0] || '',
      remitente: catalogos?.CUENTAS?.[0] || prev.remitente,
      destino: catalogos?.CUENTAS?.[1] || prev.destino,
    }))
  }, [catalogos, egresoMethods, transferAccounts])

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'tipo') {
        if (value === 'EGR') {
          next.metodo = egresoMethods[0] || ''
          next.banco = transferAccounts[0] || ''
          next.categoria = catalogos?.CATEG_EGR?.[0] || ''
        } else if (value === 'ING') {
          next.metodo = catalogos?.METODOS?.[0] || ''
          next.banco = catalogos?.BANCOS?.[0] || ''
          next.categoria = catalogos?.CATEG_ING?.[0] || ''
        }
      }

      if (field === 'metodo' && value !== 'Transferencia') {
        next.banco = ''
      }

      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const payload = { user_id: Number(userId), tipo: form.tipo, fecha: form.fecha, nota: form.nota }

      if (form.tipo === 'ING') {
        Object.assign(payload, {
          fuente: form.fuente,
          categoria: form.categoria,
          monto: Number(form.monto),
          metodo: form.metodo,
          banco: form.metodo === 'Transferencia' ? form.banco : '',
        })
      }

      if (form.tipo === 'EGR') {
        Object.assign(payload, {
          categoria: form.categoria,
          monto: Number(form.monto),
          metodo: form.metodo,
          banco: form.metodo === 'Transferencia' ? form.banco : '',
        })
      }

      if (form.tipo === 'MOV') {
        Object.assign(payload, {
          remitente: form.remitente,
          destino: form.destino,
          monto: Number(form.monto),
          monto_destino: form.monto_destino === '' ? Number(form.monto) : Number(form.monto_destino),
        })
      }

      await api.postMovimiento(payload)
      setMessage('Movimiento guardado correctamente.')
      setForm((prev) => ({
        ...initialForm,
        tipo: prev.tipo,
        fecha: new Date().toISOString().slice(0, 10),
        metodo: prev.tipo === 'EGR' ? (egresoMethods[0] || '') : '',
        banco: prev.tipo === 'EGR' ? (transferAccounts[0] || '') : '',
      }))
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid-page single-col">
      <Panel title="Nuevo movimiento">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)}>
              <option value="ING">Ingreso</option>
              <option value="EGR">Egreso</option>
              <option value="MOV">Movimiento</option>
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={form.fecha} onChange={(e) => updateField('fecha', e.target.value)} required />
          </label>

          {form.tipo === 'ING' && (
            <>
              <label>
                <span>Fuente</span>
                <select value={form.fuente} onChange={(e) => updateField('fuente', e.target.value)}>
                  {(catalogos?.FUENTES_ING || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label>
                <span>Categoría</span>
                <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)}>
                  {visibleCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </>
          )}

          {form.tipo === 'EGR' && (
            <label>
              <span>Categoría</span>
              <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)}>
                {visibleCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}

          {form.tipo === 'MOV' && (
            <>
              <label>
                <span>Remitente</span>
                <select value={form.remitente} onChange={(e) => updateField('remitente', e.target.value)}>
                  {(catalogos?.CUENTAS || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label>
                <span>Destino</span>
                <select value={form.destino} onChange={(e) => updateField('destino', e.target.value)}>
                  {(catalogos?.CUENTAS || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </>
          )}

          <label>
            <span>Monto</span>
            <input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => updateField('monto', e.target.value)} required />
          </label>

          {form.tipo === 'MOV' ? (
            <label>
              <span>Monto destino</span>
              <input type="number" min="0" step="0.01" value={form.monto_destino} onChange={(e) => updateField('monto_destino', e.target.value)} />
            </label>
          ) : (
            <>
              <label>
                <span>Método</span>
                <select value={form.metodo} onChange={(e) => updateField('metodo', e.target.value)}>
                  {(form.tipo === 'EGR' ? egresoMethods : (catalogos?.METODOS || [])).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              {form.metodo === 'Transferencia' && (
                <label>
                  <span>Banco</span>
                  <select value={form.banco} onChange={(e) => updateField('banco', e.target.value)}>
                    {transferAccounts.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              )}
            </>
          )}

          <label className="full-span">
            <span>Nota</span>
            <input type="text" value={form.nota} onChange={(e) => updateField('nota', e.target.value)} placeholder="Opcional" />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving || !userId}>
              {saving ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}