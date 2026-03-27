import { useMemo, useState } from 'react'
import Panel from '../components/Panel'
import MessageBanner from '../components/MessageBanner'

const initialForm = {
  fecha: new Date().toISOString().slice(0, 10),
  accion: 'DAR',
  persona_prestamo: '',
  cuenta: '',
  monto: '',
  nota: '',
}

export default function PrestamosPage({ userId, api, catalogos, onRefreshData }) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const personas = useMemo(() => catalogos?.PERSONAS_PRESTAMO || [], [catalogos])
  const cuentas = useMemo(() => {
    const raw = catalogos?.CUENTAS || []
    const excluir = new Set(['ugly', 'binance', 'osmo', 'hapi', 'ahorro', 'prestamos', 'préstamos'])
    return raw.filter((x) => !excluir.has(String(x).trim().toLowerCase()))
  }, [catalogos])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const payload =
        form.accion === 'DAR'
          ? {
              user_id: Number(userId),
              tipo: 'MOV',
              fecha: form.fecha,
              bolsa_remitente: 'Normal',
              remitente: form.cuenta,
              bolsa_destino: 'Prestamos',
              destino: form.cuenta,
              persona_prestamo: form.persona_prestamo,
              monto: Number(form.monto),
              monto_destino: Number(form.monto),
              nota: form.nota,
            }
          : {
              user_id: Number(userId),
              tipo: 'MOV',
              fecha: form.fecha,
              bolsa_remitente: 'Prestamos',
              remitente: form.cuenta,
              bolsa_destino: 'Normal',
              destino: form.cuenta,
              persona_prestamo: form.persona_prestamo,
              monto: Number(form.monto),
              monto_destino: Number(form.monto),
              nota: form.nota,
            }

      await api.postMovimiento(payload)
      setMessage('Préstamo registrado correctamente.')
      setForm(initialForm)
      onRefreshData?.()
    } catch (err) {
      setError(err.message || 'No pude registrar el préstamo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid-page single-col">
      <Panel title="Préstamos">
        {message ? <MessageBanner kind="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Acción</span>
            <select value={form.accion} onChange={(e) => update('accion', e.target.value)}>
              <option value="DAR">Dar</option>
              <option value="COBRAR">Cobrar</option>
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} required />
          </label>

          <label>
            <span>Persona</span>
            <select value={form.persona_prestamo} onChange={(e) => update('persona_prestamo', e.target.value)} required>
              <option value="">Selecciona</option>
              {personas.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label>
            <span>Cuenta</span>
            <select value={form.cuenta} onChange={(e) => update('cuenta', e.target.value)} required>
              <option value="">Selecciona</option>
              {cuentas.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label>
            <span>Monto</span>
            <input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => update('monto', e.target.value)} required />
          </label>

          <label className="full-span">
            <span>Nota</span>
            <input type="text" value={form.nota} onChange={(e) => update('nota', e.target.value)} />
          </label>

          <div className="full-span form-actions">
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar préstamo'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  )
}