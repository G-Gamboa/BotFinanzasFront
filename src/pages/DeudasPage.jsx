import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import MessageBanner from '../components/MessageBanner'

const deudaBase = {
  deuda_nombre: '',
  deuda_acreedor: '',
  deuda_fecha_pago: new Date().toISOString().slice(0, 10),
  deuda_cuota: '',
  deuda_meses: '',
  deuda_pagados: '0',
}

function q(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return value ?? '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

export default function DeudasPage({ userId, api, deudas, deudasActivas, catalogos, onRefreshData }) {
  const [form, setForm] = useState(deudaBase)
  const [pago, setPago] = useState({ deuda_row: '', cuenta_pago: catalogos?.CUENTAS?.[0] || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const deudasRows = useMemo(() => deudas?.items || deudas?.deudas || deudas || [], [deudas])
  const activasRows = useMemo(() => deudasActivas?.items || deudasActivas?.deudas || deudasActivas || [], [deudasActivas])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submitDeuda(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.postDeuda({
        user_id: Number(userId),
        deuda_nombre: form.deuda_nombre,
        deuda_acreedor: form.deuda_acreedor,
        deuda_fecha_pago: form.deuda_fecha_pago,
        deuda_cuota: Number(form.deuda_cuota),
        deuda_meses: Number(form.deuda_meses),
        deuda_pagados: Number(form.deuda_pagados),
      })
      setMessage('Deuda creada correctamente.')
      setForm(deudaBase)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude crear la deuda.')
    } finally {
      setSaving(false)
    }
  }

  async function submitPago(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.postPagarDeuda({
        user_id: Number(userId),
        deuda_row: Number(pago.deuda_row),
        cuenta_pago: pago.cuenta_pago,
      })
      setMessage('Pago de deuda registrado.')
      setPago({ deuda_row: '', cuenta_pago: catalogos?.CUENTAS?.[0] || '' })
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid-page two-col">
      <Panel title="Deudas activas">
        {activasRows.length > 0 ? (
          <div className="list-stack">
            {activasRows.map((deuda, idx) => (
              <div className="debt-card" key={`${deuda.row || idx}-${deuda.nombre || deuda.deuda_nombre || 'deuda'}`}>
                <div>
                  <strong>{deuda.nombre || deuda.deuda_nombre}</strong>
                  <small>{deuda.acreedor || deuda.deuda_acreedor || ''}</small>
                </div>
                <div className="debt-meta">
                  <span>Cuota: {q(deuda.cuota || deuda.deuda_cuota)}</span>
                  <span>Pendientes: {deuda.pendientes ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas activas." />}
      </Panel>

      <Panel title="Todas las deudas">
        {deudasRows.length > 0 ? (
          <div className="list-stack">
            {deudasRows.map((deuda, idx) => (
              <div className="list-row" key={`${deuda.row || idx}-${deuda.nombre || deuda.deuda_nombre || 'deuda'}`}>
                <div>
                  <strong>{deuda.nombre || deuda.deuda_nombre}</strong>
                  <small>{deuda.estado || '—'}</small>
                </div>
                <span>{q(deuda.cuota || deuda.deuda_cuota)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No hay deudas registradas." />}
      </Panel>

      <Panel title="Crear deuda">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
        <form className="form-grid" onSubmit={submitDeuda}>
          <label>
            <span>Nombre</span>
            <input value={form.deuda_nombre} onChange={(e) => update('deuda_nombre', e.target.value)} required />
          </label>
          <label>
            <span>Acreedor</span>
            <input value={form.deuda_acreedor} onChange={(e) => update('deuda_acreedor', e.target.value)} required />
          </label>
          <label>
            <span>Fecha pago</span>
            <input type="date" value={form.deuda_fecha_pago} onChange={(e) => update('deuda_fecha_pago', e.target.value)} required />
          </label>
          <label>
            <span>Cuota</span>
            <input type="number" min="0.01" step="0.01" value={form.deuda_cuota} onChange={(e) => update('deuda_cuota', e.target.value)} required />
          </label>
          <label>
            <span>Meses</span>
            <input type="number" min="1" step="1" value={form.deuda_meses} onChange={(e) => update('deuda_meses', e.target.value)} required />
          </label>
          <label>
            <span>Pagados</span>
            <input type="number" min="0" step="1" value={form.deuda_pagados} onChange={(e) => update('deuda_pagados', e.target.value)} required />
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" disabled={saving || !userId}>{saving ? 'Guardando...' : 'Crear deuda'}</button>
          </div>
        </form>
      </Panel>

      <Panel title="Pagar deuda">
        <form className="form-grid" onSubmit={submitPago}>
          <label>
            <span>Deuda activa</span>
            <select value={pago.deuda_row} onChange={(e) => setPago((prev) => ({ ...prev, deuda_row: e.target.value }))} required>
              <option value="">Selecciona una deuda</option>
              {activasRows.map((deuda) => (
                <option key={deuda.row} value={deuda.row}>
                  {deuda.nombre || deuda.deuda_nombre} - fila {deuda.row}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Cuenta de pago</span>
            <select value={pago.cuenta_pago} onChange={(e) => setPago((prev) => ({ ...prev, cuenta_pago: e.target.value }))} required>
              {(catalogos?.CUENTAS || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="full-span form-actions">
            <button className="primary-btn" disabled={saving || !userId}>{saving ? 'Guardando...' : 'Registrar pago'}</button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
