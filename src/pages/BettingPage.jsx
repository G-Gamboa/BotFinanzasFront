import { useEffect, useMemo, useState } from 'react'

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  green: '#1D9E75', red:  '#E24B4A', blue: '#378ADD', gold:  '#BA7517',
  bg:    '#080808', bg2:  '#0C0C0C', bg3:  '#0F0F0F', bg4:   '#111111',
  b1:    '#1C1C1C', b2:   '#1A1A1A', text: '#DDD9CE', muted: '#555555', faint: '#444444',
}

const COLORES = {
  ganada:    { bg: 'rgba(29,158,117,0.12)',  border: '#1D9E75', text: '#1D9E75', label: 'VERDE'     },
  perdida:   { bg: 'rgba(226,75,74,0.12)',   border: '#E24B4A', text: '#E24B4A', label: 'ROJO'      },
  pendiente: { bg: 'rgba(55,138,221,0.08)',  border: '#378ADD', text: '#378ADD', label: 'PENDIENTE' },
  void:      { bg: 'rgba(128,128,128,0.08)', border: '#555555', text: '#555555', label: 'VOID'      },
}

const ICONS    = { NBA: '◉', Tenis: '◈', Futbol: '⬡', Béisbol: '◎', Otro: '◆' }
const DEPORTES = ['NBA', 'Tenis', 'Futbol', 'Béisbol', 'Otro']
const FONT     = "'DM Mono','Fira Mono','Courier New',monospace"

// ── Helpers de fecha ──────────────────────────────────────────────────────────
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

/** Devuelve hoy como "YYYY-MM-DD" en hora local */
function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "2026-05-29" → "29 May" · texto libre ("28 May") → sin cambios */
function fmtFecha(fecha) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [, m, d] = fecha.split('-')
    return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`
  }
  return fecha
}

/** Ordena fechas: ISO primero (lexicográfico correcto), luego texto libre */
function sortFechas(a, b) {
  const aISO = /^\d{4}-\d{2}-\d{2}$/.test(a)
  const bISO = /^\d{4}-\d{2}-\d{2}$/.test(b)
  if (aISO && bISO) return a.localeCompare(b)
  if (aISO) return -1
  if (bISO) return  1
  return 0
}

// ── Helpers de formato ────────────────────────────────────────────────────────
const fmtQ    = (v) => 'Q' + Math.abs(v).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const makeForm = () => ({ fecha: todayISO(), deporte: 'NBA', partido: '', pick: '', cuota: '', stake: '' })

// ── Componente raíz ───────────────────────────────────────────────────────────
export default function BettingPage({ api, onClose }) {
  const [bets,       setBets]       = useState([])
  const [config,     setConfig]     = useState({ bank_inicial: 750, meta: 20000 })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [tab,        setTab]        = useState('apuestas')
  const [filtro,     setFiltro]     = useState('todas')
  const [openId,     setOpenId]     = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [form,       setForm]       = useState(makeForm)
  const [saving,     setSaving]     = useState(false)
  const [editCfg,    setEditCfg]    = useState(false)
  const [cfgForm,    setCfgForm]    = useState({ bank_inicial: '', meta: '' })
  const [editingBet,    setEditingBet]    = useState(null)   // bet completa al editar
  const [selectedFecha, setSelectedFecha] = useState(null)   // día activo en navegador

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await api.getBets()
      setBets(data.items || [])
      setConfig(data.config || { bank_inicial: 750, meta: 20000 })
    } catch (e) { setError(e.message || 'Error cargando apuestas.') }
    finally     { setLoading(false) }
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const cerradas      = bets.filter(b => b.estado !== 'pendiente' && b.estado !== 'void')
    const gananciaTotal = cerradas.reduce((a, b) => a + (b.ganancia || 0), 0)
    const bankActual    = config.bank_inicial + gananciaTotal
    const apostado      = cerradas.reduce((a, b) => a + b.stake, 0)
    const roi           = apostado > 0 ? (gananciaTotal / apostado * 100) : null
    const ganadas       = cerradas.filter(b => b.estado === 'ganada').length
    const perdidas      = cerradas.filter(b => b.estado === 'perdida').length
    const pendientes    = bets.filter(b => b.estado === 'pendiente')
    const enRiesgo      = pendientes.reduce((a, b) => a + b.stake, 0)
    const libre         = bankActual - enRiesgo
    const falta         = config.meta - config.bank_inicial
    const progreso      = falta > 0 ? Math.max(0, Math.min(100, (gananciaTotal / falta) * 100)) : 100
    const wrate         = cerradas.length ? Math.round(ganadas / cerradas.length * 100) + '%' : '—'
    return { cerradas, gananciaTotal, bankActual, libre, roi, ganadas, perdidas, pendientes, enRiesgo, progreso, apostado, wrate }
  }, [bets, config])

  // ── Acciones ──────────────────────────────────────────────────────────────
  async function setEstado(id, estado) {
    setSaving(true)
    try {
      const updated = await api.patchBet(id, { estado })
      setBets(prev => prev.map(b => b.id === id ? updated : b))
      setOpenId(null)
    } catch (e) { setError(e.message) }
    finally     { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta apuesta?')) return
    try {
      await api.deleteBet(id)
      setBets(prev => prev.filter(b => b.id !== id))
      setOpenId(null)
    } catch (e) { setError(e.message) }
  }

  async function submitAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      const newBet = await api.postBet({
        fecha: form.fecha, deporte: form.deporte,
        partido: form.partido, pick: form.pick,
        cuota: Number(form.cuota), stake: Number(form.stake), estado: 'pendiente',
      })
      setBets(prev => [...prev, newBet])
      setForm(makeForm())
      setShowAdd(false)
    } catch (e) { setError(e.message) }
    finally     { setSaving(false) }
  }

  async function submitEdit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const updated = await api.patchBet(editingBet.id, {
        fecha:   editingBet.fecha,
        deporte: editingBet.deporte,
        partido: editingBet.partido,
        pick:    editingBet.pick,
        cuota:   Number(editingBet.cuota),
        stake:   Number(editingBet.stake),
        estado:  editingBet.estado,
      })
      setBets(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditingBet(null)
      setOpenId(null)
    } catch (e) { setError(e.message) }
    finally     { setSaving(false) }
  }

  async function submitConfig(e) {
    e.preventDefault()
    try {
      const updated = await api.patchBettingConfig({
        bank_inicial: Number(cfgForm.bank_inicial),
        meta:         Number(cfgForm.meta),
      })
      setConfig(updated); setEditCfg(false)
    } catch (e) { setError(e.message) }
  }

  // ── Días disponibles (más reciente primero) ────────────────────────────────
  const fechasOrden = useMemo(() => {
    const seen = []
    bets.forEach(b => { if (!seen.includes(b.fecha)) seen.push(b.fecha) })
    return [...seen].sort(sortFechas).reverse()   // más reciente primero
  }, [bets])

  // Auto-seleccionar el día más reciente al cargar o si el día activo desaparece
  useEffect(() => {
    if (fechasOrden.length === 0) return
    if (!selectedFecha || !fechasOrden.includes(selectedFecha)) {
      setSelectedFecha(fechasOrden[0])
    }
  }, [fechasOrden])

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 9999, fontFamily: FONT, color: C.text, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header sticky ────────────────────────────────────── */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.b1}`, padding: '16px 16px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>

          {/* Fila principal: disponible/total + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>

            {/* Lado izquierdo: disponible / total */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: '.25em', color: C.faint, marginBottom: 6 }}>DISPONIBLE · TOTAL</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>
                  {fmtQ(metrics.libre)}
                </span>
                <span style={{ fontSize: 15, color: C.muted, fontWeight: 400, letterSpacing: '-.01em' }}>
                  &nbsp;/&nbsp;{fmtQ(metrics.bankActual)}
                </span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: metrics.gananciaTotal >= 0 ? C.green : C.red }}>
                {metrics.gananciaTotal >= 0 ? '▲ +' : '▼ '}{fmtQ(metrics.gananciaTotal)} desde {fmtQ(config.bank_inicial)}
              </div>
            </div>

            {/* Lado derecho: meta + salir */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <button onClick={onClose}
                style={{ background: 'transparent', border: `1px solid ${C.b2}`, color: C.muted, fontSize: 10, letterSpacing: '.1em', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontFamily: FONT }}>
                ✕ SALIR
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: C.faint, letterSpacing: '.15em' }}>
                  META {fmtQ(config.meta)}
                  <button onClick={() => { setEditCfg(true); setCfgForm({ bank_inicial: config.bank_inicial, meta: config.meta }) }}
                    style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', fontSize: 10, marginLeft: 5, padding: 0, fontFamily: FONT }}
                    title="Editar configuración">✎</button>
                </div>
                <div style={{ fontSize: 11, color: C.gold, marginTop: 2 }}>{metrics.progreso.toFixed(1)}% completado</div>
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ height: 3, background: '#1A1A1A', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#1D9E75,#378ADD)', width: metrics.progreso + '%', transition: 'width .6s ease' }} />
          </div>

          {/* Stats 5-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 14 }}>
            {[
              { l: 'WIN',    v: metrics.ganadas,  c: C.green },
              { l: 'LOSS',   v: metrics.perdidas, c: C.red   },
              { l: 'ROI',    v: metrics.roi != null ? metrics.roi.toFixed(1) + '%' : '—', c: metrics.roi != null && metrics.roi >= 0 ? C.green : C.red },
              { l: 'W-RATE', v: metrics.wrate,    c: C.blue  },
              { l: 'RIESGO', v: 'Q' + metrics.enRiesgo, c: C.gold },
            ].map(s => (
              <div key={s.l} style={{ background: C.bg4, borderRadius: 5, padding: '7px 8px', border: `1px solid ${C.b2}` }}>
                <div style={{ fontSize: 8, color: C.faint, letterSpacing: '.15em', marginBottom: 3 }}>{s.l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.b1}` }}>
            {['apuestas', 'resumen'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: tab === t ? `2px solid ${C.text}` : '2px solid transparent', color: tab === t ? C.text : C.faint, fontSize: 10, letterSpacing: '.15em', cursor: 'pointer', fontFamily: FONT, textTransform: 'uppercase', transition: 'all .15s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px', width: '100%', flex: 1, boxSizing: 'border-box' }}>

        {error ? (
          <div style={{ margin: '16px 0', padding: '10px 12px', background: 'rgba(226,75,74,0.1)', border: `1px solid ${C.red}44`, borderRadius: 6, color: C.red, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.faint, fontSize: 11, letterSpacing: '.15em' }}>CARGANDO...</div>
        ) : tab === 'apuestas' ? (
          <PanelApuestas
            bets={bets}
            fechasOrden={fechasOrden}
            selectedFecha={selectedFecha}
            setSelectedFecha={setSelectedFecha}
            filtro={filtro}      setFiltro={setFiltro}
            openId={openId}      setOpenId={setOpenId}
            setEstado={setEstado}
            onDelete={handleDelete}
            onEdit={(bet) => { setEditingBet({ ...bet }); setOpenId(null) }}
            saving={saving}
            showAdd={showAdd}    setShowAdd={setShowAdd}
            form={form}          setForm={setForm}
            submitAdd={submitAdd}
          />
        ) : (
          <PanelResumen bets={bets} metrics={metrics} config={config} fechasOrden={fechasOrden} />
        )}
      </div>

      {/* ── Modal editar apuesta ────────────────────────────── */}
      {editingBet && (
        <BetEditModal
          bet={editingBet}
          onChange={setEditingBet}
          onSubmit={submitEdit}
          onCancel={() => setEditingBet(null)}
          saving={saving}
        />
      )}

      {/* ── Modal config ────────────────────────────────────── */}
      {editCfg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 22, width: '100%', maxWidth: 320, fontFamily: FONT }}>
            <div style={{ fontSize: 10, letterSpacing: '.2em', color: C.faint, marginBottom: 16 }}>CONFIGURACIÓN</div>
            <form onSubmit={submitConfig}>
              {[{ key: 'bank_inicial', label: 'BANK INICIAL Q' }, { key: 'meta', label: 'META Q' }].map(({ key, label }) => (
                <label key={key} style={{ display: 'block', marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: C.faint, letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
                  <input type="number" step="0.01" min="0" required value={cfgForm[key]}
                    onChange={e => setCfgForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', background: C.bg4, border: `1px solid ${C.b2}`, color: C.text, padding: '9px 10px', borderRadius: 5, fontFamily: FONT, fontSize: 14, boxSizing: 'border-box' }} />
                </label>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setEditCfg(false)}
                  style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${C.b2}`, color: C.muted, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 10, letterSpacing: '.1em' }}>
                  CANCELAR
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '9px', background: C.b2, border: `1px solid ${C.b1}`, color: C.text, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 10, letterSpacing: '.1em' }}>
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ height: 60 }} />
    </div>
  )
}

// ── Panel Apuestas ────────────────────────────────────────────────────────────
function PanelApuestas({ bets, fechasOrden, selectedFecha, setSelectedFecha, filtro, setFiltro, openId, setOpenId, setEstado, onDelete, onEdit, saving, showAdd, setShowAdd, form, setForm, submitAdd }) {

  // Índice del día activo dentro de fechasOrden (más reciente = índice 0)
  const idx = fechasOrden.indexOf(selectedFecha)

  // Todas las apuestas del día (sin filtrar, para el resumen)
  const diaAll = bets.filter(b => b.fecha === selectedFecha)

  // Apuestas del día filtradas por estado, más reciente primero (por id desc)
  const diaVisible = diaAll
    .filter(b => filtro === 'todas' || b.estado === filtro)
    .slice()
    .sort((a, b) => b.id - a.id)

  // Resumen del día (sobre todas, no solo las filtradas)
  const diaCerradas = diaAll.filter(b => b.estado !== 'pendiente' && b.estado !== 'void')
  const diaGan      = diaCerradas.reduce((a, b) => a + (b.ganancia || 0), 0)
  const diaW        = diaCerradas.filter(b => b.estado === 'ganada').length
  const diaL        = diaCerradas.filter(b => b.estado === 'perdida').length
  const diaP        = diaAll.filter(b => b.estado === 'pendiente').length

  const canOlder  = idx < fechasOrden.length - 1   // ← hay días más antiguos
  const canNewer  = idx > 0                         // → hay días más recientes

  const navBtn = (disabled, label, onClick) => (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${disabled ? '#1A1A1A' : C.b1}`, color: disabled ? '#2A2A2A' : C.muted, borderRadius: 5, cursor: disabled ? 'default' : 'pointer', fontFamily: FONT, fontSize: 13, lineHeight: 1, transition: 'all .15s' }}>
      {label}
    </button>
  )

  return (
    <>
      {/* ── Filtros de estado + botón nueva ─────────────────── */}
      <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', overflowX: 'auto', paddingBottom: 2, alignItems: 'center' }}>
        {['todas', 'pendiente', 'ganada', 'perdida'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '4px 14px', borderRadius: 20, border: `1px solid ${filtro === f ? C.text : '#222'}`, background: filtro === f ? C.text : 'transparent', color: filtro === f ? C.bg : C.muted, fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', fontFamily: FONT, textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'all .15s', flexShrink: 0 }}>
            {f}
          </button>
        ))}
        <button onClick={() => setShowAdd(p => !p)}
          style={{ padding: '4px 14px', borderRadius: 20, border: `1px solid ${showAdd ? C.green : '#222'}`, background: showAdd ? 'rgba(29,158,117,0.12)' : 'transparent', color: showAdd ? C.green : C.muted, fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', fontFamily: FONT, textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'all .15s', marginLeft: 'auto', flexShrink: 0 }}>
          + NUEVA
        </button>
      </div>

      {showAdd && (
        <AddBetForm form={form} setForm={setForm} onSubmit={submitAdd} saving={saving} onCancel={() => setShowAdd(false)} />
      )}

      {/* Sin apuestas en absoluto */}
      {fechasOrden.length === 0 && !showAdd && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: C.faint, fontSize: 11, letterSpacing: '.15em' }}>SIN APUESTAS</div>
      )}

      {/* ── Navegador de día ────────────────────────────────── */}
      {fechasOrden.length > 0 && selectedFecha && (
        <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          {/* Fila: ← fecha → */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: diaCerradas.length > 0 || diaP > 0 ? 10 : 0 }}>
            {navBtn(!canOlder, '←', () => setSelectedFecha(fechasOrden[idx + 1]))}

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: '.03em' }}>
                {fmtFecha(selectedFecha)}
              </div>
              <div style={{ fontSize: 8, color: C.faint, letterSpacing: '.15em', marginTop: 2 }}>
                {idx === 0 ? 'HOY / MÁS RECIENTE' : `día ${fechasOrden.length - idx} de ${fechasOrden.length}`}
              </div>
            </div>

            {navBtn(!canNewer, '→', () => setSelectedFecha(fechasOrden[idx - 1]))}
          </div>

          {/* Mini resumen del día */}
          {(diaCerradas.length > 0 || diaP > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[
                { l: 'VERDE',  v: diaW, c: C.green },
                { l: 'ROJO',   v: diaL, c: C.red   },
                { l: 'PEND',   v: diaP, c: C.blue  },
                { l: 'NET',    v: diaCerradas.length
                    ? (diaGan >= 0 ? '+' : '') + fmtQ(diaGan)
                    : '—',
                  c: diaGan >= 0 ? C.green : C.red },
              ].map(s => (
                <div key={s.l} style={{ background: '#151515', borderRadius: 5, padding: '5px 7px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.faint, letterSpacing: '.1em', marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Lista de apuestas del día ────────────────────────── */}
      {diaVisible.length === 0 && fechasOrden.length > 0 && !showAdd && (
        <div style={{ padding: '24px 0', textAlign: 'center', color: C.faint, fontSize: 10, letterSpacing: '.15em' }}>
          SIN {filtro !== 'todas' ? filtro.toUpperCase() + 'S ' : ''}APUESTAS ESTE DÍA
        </div>
      )}

      {diaVisible.map(bet => (
        <BetCard key={bet.id} bet={bet} isOpen={openId === bet.id}
          onToggle={() => setOpenId(openId === bet.id ? null : bet.id)}
          onSetEstado={setEstado} onDelete={onDelete} onEdit={onEdit} saving={saving} />
      ))}
    </>
  )
}

// ── Tarjeta de apuesta ────────────────────────────────────────────────────────
function BetCard({ bet, isOpen, onToggle, onSetEstado, onDelete, onEdit, saving }) {
  const c           = COLORES[bet.estado] || COLORES.pendiente
  const potencial   = bet.estado === 'pendiente' ? (bet.stake * (bet.cuota - 1)).toFixed(0) : null
  const amountVal   = bet.ganancia != null ? (bet.ganancia >= 0 ? '+' : '') + fmtQ(bet.ganancia) : fmtQ(bet.stake)
  const amountLabel = bet.ganancia != null ? (bet.estado === 'ganada' ? 'ganancia' : bet.estado === 'void' ? 'void' : 'perdida') : 'stake'

  return (
    <div onClick={onToggle}
      style={{ borderRadius: 8, marginBottom: 7, overflow: 'hidden', border: `1px solid ${c.border}28`, borderLeft: `3px solid ${c.border}`, background: c.bg, cursor: 'pointer', transition: 'opacity .15s' }}>
      <div style={{ padding: '11px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: C.faint }}>{ICONS[bet.deporte] || '◆'}</span>
              <span style={{ fontSize: 9, color: C.faint, letterSpacing: '.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.partido}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{bet.pick}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: '#555' }}>@{bet.cuota}</span>
              <span style={{ fontSize: 9, color: '#555' }}>·</span>
              <span style={{ fontSize: 9, color: '#555' }}>{fmtQ(bet.stake)}</span>
              {potencial && <>
                <span style={{ fontSize: 9, color: '#555' }}>·</span>
                <span style={{ fontSize: 9, color: C.gold }}>+Q{potencial} potencial</span>
              </>}
            </div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{amountVal}</div>
            <div style={{ fontSize: 8, color: C.faint, marginTop: 2 }}>{amountLabel}</div>
            <div style={{ fontSize: 8, letterSpacing: '.1em', marginTop: 4, color: c.text }}>{c.label}</div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div style={{ borderTop: '1px solid #161616', padding: '9px 13px' }} onClick={e => e.stopPropagation()}>
          {/* Botones de estado */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {['ganada', 'perdida', 'pendiente', 'void'].map(est => {
              const ec = COLORES[est]
              const active = bet.estado === est
              return (
                <button key={est} onClick={() => onSetEstado(bet.id, est)} disabled={saving}
                  style={{ flex: 1, padding: '6px 2px', borderRadius: 5, border: `1px solid ${active ? ec.border : '#222'}`, background: active ? ec.bg : 'transparent', color: active ? ec.text : '#444', fontSize: 8, letterSpacing: '.1em', cursor: 'pointer', fontFamily: FONT, textTransform: 'uppercase', transition: 'all .15s' }}>
                  {ec.label}
                </button>
              )
            })}
          </div>
          {/* Editar + Eliminar */}
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => onEdit(bet)} disabled={saving}
              style={{ flex: 1, padding: '6px', borderRadius: 5, border: `1px solid ${C.blue}33`, background: 'rgba(55,138,221,0.06)', color: C.blue, fontSize: 8, letterSpacing: '.1em', cursor: 'pointer', fontFamily: FONT, textTransform: 'uppercase' }}>
              ✎ EDITAR
            </button>
            <button onClick={() => onDelete(bet.id)} disabled={saving}
              style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #222', background: 'transparent', color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: FONT }}
              title="Eliminar">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulario nueva apuesta ──────────────────────────────────────────────────
function AddBetForm({ form, setForm, onSubmit, saving, onCancel }) {
  const inp = { width: '100%', background: C.bg4, border: `1px solid ${C.b2}`, color: C.text, padding: '8px 10px', borderRadius: 5, fontFamily: FONT, fontSize: 12, boxSizing: 'border-box' }
  const lbl = { fontSize: 8, color: C.faint, letterSpacing: '.1em', marginBottom: 4, display: 'block' }
  const potencial = form.cuota && form.stake && !isNaN(form.cuota) && !isNaN(form.stake)
    ? (Number(form.stake) * (Number(form.cuota) - 1)).toFixed(2) : null

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderLeft: `3px solid ${C.blue}`, borderRadius: 8, padding: '14px 13px', marginBottom: 16 }}>
      <div style={{ fontSize: 9, color: C.faint, letterSpacing: '.2em', marginBottom: 12 }}>NUEVA APUESTA</div>
      <form onSubmit={onSubmit}>
        <BetFields form={form} setForm={setForm} inp={inp} lbl={lbl} />
        {potencial && <div style={{ fontSize: 10, color: C.gold, marginBottom: 14, letterSpacing: '.08em' }}>Potencial: +Q{potencial}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${C.b2}`, color: C.muted, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 9, letterSpacing: '.1em' }}>
            CANCELAR
          </button>
          <button type="submit" disabled={saving}
            style={{ flex: 2, padding: '9px', background: 'rgba(55,138,221,0.12)', border: `1px solid ${C.blue}`, color: C.blue, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 9, letterSpacing: '.1em' }}>
            {saving ? 'GUARDANDO...' : 'REGISTRAR APUESTA'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Modal editar apuesta ──────────────────────────────────────────────────────
function BetEditModal({ bet, onChange, onSubmit, onCancel, saving }) {
  const inp = { width: '100%', background: C.bg4, border: `1px solid ${C.b2}`, color: C.text, padding: '8px 10px', borderRadius: 5, fontFamily: FONT, fontSize: 12, boxSizing: 'border-box' }
  const lbl = { fontSize: 8, color: C.faint, letterSpacing: '.1em', marginBottom: 4, display: 'block' }
  const potencial = bet.cuota && bet.stake && !isNaN(bet.cuota) && !isNaN(bet.stake)
    ? (Number(bet.stake) * (Number(bet.cuota) - 1)).toFixed(2) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.80)', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}>
      <div style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderTop: `3px solid ${C.gold}`, borderRadius: '14px 14px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 540, fontFamily: FONT, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '.2em', color: C.gold }}>EDITAR APUESTA</div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: 0, fontFamily: FONT }}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <BetFields form={bet} setForm={onChange} inp={inp} lbl={lbl} />

          {/* Estado dentro del editor */}
          <label style={{ display: 'block', marginBottom: potencial ? 8 : 14 }}>
            <span style={lbl}>ESTADO</span>
            <select style={inp} value={bet.estado} onChange={e => onChange(p => ({ ...p, estado: e.target.value }))}>
              {['pendiente','ganada','perdida','void'].map(est => (
                <option key={est} value={est}>{COLORES[est].label}</option>
              ))}
            </select>
          </label>

          {potencial && <div style={{ fontSize: 10, color: C.gold, marginBottom: 14, letterSpacing: '.08em' }}>Potencial: +Q{potencial}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onCancel}
              style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${C.b2}`, color: C.muted, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 9, letterSpacing: '.1em' }}>
              CANCELAR
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', background: 'rgba(186,117,23,0.15)', border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 9, letterSpacing: '.1em' }}>
              {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Campos compartidos (nueva + editar) ───────────────────────────────────────
function BetFields({ form, setForm, inp, lbl }) {
  const potencial = form.cuota && form.stake && !isNaN(form.cuota) && !isNaN(form.stake)
    ? (Number(form.stake) * (Number(form.cuota) - 1)).toFixed(2) : null

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label>
          <span style={lbl}>FECHA</span>
          <input style={inp} type="date" value={form.fecha}
            onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required />
        </label>
        <label>
          <span style={lbl}>DEPORTE</span>
          <select style={inp} value={form.deporte} onChange={e => setForm(p => ({ ...p, deporte: e.target.value }))}>
            {DEPORTES.map(d => <option key={d} value={d}>{ICONS[d]} {d}</option>)}
          </select>
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={lbl}>PARTIDO</span>
        <input style={inp} type="text" placeholder="PSG vs Arsenal — UCL Final" value={form.partido}
          onChange={e => setForm(p => ({ ...p, partido: e.target.value }))} required />
      </label>

      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={lbl}>PICK</span>
        <input style={inp} type="text" placeholder="Saque de banda 0:00–0:59" value={form.pick}
          onChange={e => setForm(p => ({ ...p, pick: e.target.value }))} required />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: potencial ? 8 : 14 }}>
        <label>
          <span style={lbl}>CUOTA</span>
          <input style={inp} type="number" step="0.01" min="1.01" placeholder="1.95" value={form.cuota}
            onChange={e => setForm(p => ({ ...p, cuota: e.target.value }))} required />
        </label>
        <label>
          <span style={lbl}>STAKE Q</span>
          <input style={inp} type="number" step="0.01" min="1" placeholder="100" value={form.stake}
            onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} required />
        </label>
      </div>
    </>
  )
}

// ── Panel Resumen ─────────────────────────────────────────────────────────────
function PanelResumen({ bets, metrics, config, fechasOrden }) {
  const cardStyle    = { background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }
  const sectionStyle = { fontSize: 9, color: C.faint, letterSpacing: '.2em', margin: '20px 0 10px', textTransform: 'uppercase' }

  const porDep = {}
  metrics.cerradas.forEach(b => {
    if (!porDep[b.deporte]) porDep[b.deporte] = { gan: 0, apost: 0, n: 0, wins: 0 }
    porDep[b.deporte].gan   += b.ganancia || 0
    porDep[b.deporte].apost += b.stake
    porDep[b.deporte].n++
    if (b.estado === 'ganada') porDep[b.deporte].wins++
  })

  return (
    <div>
      {fechasOrden.length > 0 && <div style={sectionStyle}>Por día</div>}
      {fechasOrden.map(fecha => {
        const dBets   = bets.filter(b => b.fecha === fecha)
        if (!dBets.length) return null
        const cerradas = dBets.filter(b => b.estado !== 'pendiente' && b.estado !== 'void')
        const gan      = cerradas.reduce((a, b) => a + (b.ganancia || 0), 0)
        const apost    = cerradas.reduce((a, b) => a + b.stake, 0)
        const roi      = apost > 0 ? (gan / apost * 100).toFixed(1) : null
        const wins     = cerradas.filter(b => b.estado === 'ganada').length
        const losses   = cerradas.filter(b => b.estado === 'perdida').length
        const pend     = dBets.filter(b => b.estado === 'pendiente').length
        const color    = gan >= 0 ? C.green : C.red

        return (
          <div key={fecha} style={{ ...cardStyle, borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{fmtFecha(fecha)}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{cerradas.length ? (gan >= 0 ? '+' : '') + fmtQ(gan) : '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[
                { l: 'GANADAS',  v: wins,   c: C.green },
                { l: 'PERDIDAS', v: losses, c: C.red   },
                { l: 'ROI',      v: roi != null ? roi + '%' : '—', c: roi != null && Number(roi) >= 0 ? C.green : C.red },
                { l: 'PEND.',    v: pend,   c: C.blue  },
              ].map(s => (
                <div key={s.l} style={{ background: '#151515', borderRadius: 5, padding: '6px 8px' }}>
                  <div style={{ fontSize: 8, color: C.faint, marginBottom: 2, letterSpacing: '.1em' }}>{s.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {Object.keys(porDep).length > 0 && (
        <>
          <div style={sectionStyle}>Por deporte</div>
          {Object.entries(porDep).map(([dep, d]) => {
            const roi = (d.gan / d.apost * 100).toFixed(1)
            return (
              <div key={dep} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{ICONS[dep] || '◆'} {dep}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>{d.wins}/{d.n} ganadas · ROI {roi}%</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: d.gan >= 0 ? C.green : C.red }}>
                  {(d.gan >= 0 ? '+' : '') + fmtQ(d.gan)}
                </div>
              </div>
            )
          })}
        </>
      )}

      <div style={sectionStyle}>Progreso hacia meta</div>
      <div style={cardStyle}>
        {[
          { l: 'Bank inicial', v: fmtQ(config.bank_inicial),                          c: '#555'  },
          { l: 'Bank actual',  v: fmtQ(metrics.bankActual),                            c: C.text  },
          { l: 'Disponible',   v: fmtQ(metrics.libre),                                 c: C.green },
          { l: 'Meta',         v: fmtQ(config.meta),                                   c: C.gold  },
          { l: 'Falta',        v: fmtQ(Math.max(0, config.meta - metrics.bankActual)), c: C.blue  },
          { l: 'Progreso',     v: metrics.progreso.toFixed(1) + '%',                   c: C.green },
        ].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #151515', fontSize: 11 }}>
            <span style={{ color: '#555' }}>{r.l}</span>
            <span style={{ color: r.c, fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </div>

      {metrics.pendientes.length > 0 && (
        <>
          <div style={sectionStyle}>En juego</div>
          {metrics.pendientes.map(b => (
            <div key={b.id} style={{ background: 'rgba(55,138,221,.06)', border: `1px solid #378ADD22`, borderLeft: `3px solid ${C.blue}`, borderRadius: 8, padding: '10px 13px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: C.faint, marginBottom: 2 }}>{b.partido}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{b.pick}</div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 3 }}>@{b.cuota} · {fmtQ(b.stake)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: C.gold }}>potencial</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>+Q{(b.stake * (b.cuota - 1)).toFixed(0)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
