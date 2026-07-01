import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deriveKEK, unwrapDEK, wrapDEK,
  encryptItem, decryptItem,
  generateSalt, generateDEK,
} from '../lib/vaultCrypto'

const CLIPBOARD_CLEAR_MS = 25000

const emptyForm = {
  service: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  category: '',
}

// ── Componente: campo contraseña con toggle ───────────────────────────────────
function PasswordField({ value, onChange, placeholder = 'Contraseña', autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ flex: 1 }}
      />
      <button
        type="button"
        className="ghost-btn"
        style={{ flexShrink: 0, padding: '6px 10px', fontSize: '0.8rem' }}
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
      >
        {show ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  )
}

// ── Componente: tarjeta de un item ────────────────────────────────────────────
function ItemCard({ item, onEdit, onDelete }) {
  const [showPass, setShowPass] = useState(false)
  const [copied, setCopied] = useState('')
  const clearTimerRef = useRef(null)

  function copyToClipboard(text, field) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(''), 2000)
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {})
      }, CLIPBOARD_CLEAR_MS)
    })
  }

  useEffect(() => () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current) }, [])

  return (
    <div className="panel" style={{ marginBottom: '10px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.service}</div>
          {item.category ? (
            <div style={{
              display: 'inline-block', marginTop: '3px',
              fontSize: '0.72rem', padding: '1px 8px', borderRadius: '99px',
              background: 'color-mix(in srgb, var(--color-primary, #4f8ef7) 15%, var(--card-soft))',
              color: 'var(--color-primary, #4f8ef7)',
            }}>
              {item.category}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button className="ghost-btn" style={{ fontSize: '0.78rem', padding: '3px 10px' }} onClick={() => onEdit(item)}>Editar</button>
          <button className="ghost-btn" style={{ fontSize: '0.78rem', padding: '3px 10px', color: 'var(--color-danger, #e53e3e)' }} onClick={() => onDelete(item)}>Eliminar</button>
        </div>
      </div>

      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
        {item.username && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary, #666)', minWidth: '72px' }}>Usuario</span>
            <span style={{ flex: 1, wordBreak: 'break-all' }}>{item.username}</span>
            <button className="ghost-btn" style={{ fontSize: '0.75rem', padding: '2px 8px', flexShrink: 0 }}
              onClick={() => copyToClipboard(item.username, 'username')}>
              {copied === 'username' ? '✓' : 'Copiar'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-secondary, #666)', minWidth: '72px' }}>Contraseña</span>
          <span style={{ flex: 1, fontFamily: showPass ? 'inherit' : 'monospace', letterSpacing: showPass ? 'normal' : '2px', wordBreak: 'break-all' }}>
            {showPass ? item.password : '••••••••'}
          </span>
          <button className="ghost-btn" style={{ fontSize: '0.75rem', padding: '2px 8px', flexShrink: 0 }}
            onClick={() => setShowPass(v => !v)}>
            {showPass ? 'Ocultar' : 'Ver'}
          </button>
          <button className="ghost-btn" style={{ fontSize: '0.75rem', padding: '2px 8px', flexShrink: 0 }}
            onClick={() => copyToClipboard(item.password, 'password')}>
            {copied === 'password' ? '✓' : 'Copiar'}
          </button>
        </div>

        {item.url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary, #666)', minWidth: '72px' }}>URL</span>
            <span style={{ flex: 1, wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--color-primary, #4f8ef7)' }}>{item.url}</span>
          </div>
        )}

        {item.notes && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary, #666)', minWidth: '72px' }}>Notas</span>
            <span style={{ flex: 1, fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{item.notes}</span>
          </div>
        )}
      </div>

      {copied === 'password' && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary, #666)' }}>
          El portapapeles se borrará en ~25 s.
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VaultPage({ userId, api }) {
  const [phase, setPhase] = useState('loading')  // loading | setup | locked | unlocked
  const [dek, setDek] = useState(null)            // Uint8Array | null — solo en memoria
  const [rawItems, setRawItems] = useState([])    // [{ id, ciphertext }] del servidor
  const [items, setItems] = useState([])          // objetos descifrados

  const [masterPass, setMasterPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [deriving, setDeriving] = useState(false)
  const [formError, setFormError] = useState('')

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)  // item descifrado que se edita
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [showChangePass, setShowChangePass] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')

  const dekRef = useRef(null)  // espejo del DEK para acceder desde callbacks sin re-renders

  // ── Auto-lock cuando el Mini App va al background ─────────────────────────
  useEffect(() => {
    if (phase !== 'unlocked') return
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        setDek(null)
        dekRef.current = null
        setItems([])
        setPhase('locked')
        setMasterPass('')
        setShowForm(false)
        setEditItem(null)
        setShowChangePass(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [phase])

  // ── Carga inicial: ¿existe configuración de bóveda? ──────────────────────
  useEffect(() => {
    if (!userId) return
    api.getVaultConfig(userId)
      .then(() => setPhase('locked'))
      .catch((err) => {
        if (err.message?.includes('404') || err.message?.includes('configurada')) {
          setPhase('setup')
        } else {
          setPhase('locked')  // Red error — deja intentar unlock
        }
      })
  }, [userId])

  // ── Descifra items con el DEK ya obtenido ─────────────────────────────────
  const decryptAll = useCallback(async (dekRaw, rawList) => {
    const decrypted = await Promise.all(
      rawList.map(async (raw) => {
        const plain = await decryptItem(dekRaw, raw.ciphertext)
        return { ...plain, _id: raw.id }
      })
    )
    return decrypted
  }, [])

  // ── Setup: crear bóveda por primera vez ───────────────────────────────────
  async function handleSetup(e) {
    e.preventDefault()
    if (masterPass.length < 8) { setFormError('La contraseña maestra debe tener al menos 8 caracteres.'); return }
    if (masterPass !== confirmPass) { setFormError('Las contraseñas no coinciden.'); return }
    setFormError('')
    setDeriving(true)
    try {
      const salt = generateSalt()
      const dekRaw = generateDEK()
      const kek = await deriveKEK(masterPass, salt)
      const dekWrapped = await wrapDEK(kek, dekRaw)
      await api.postVaultConfig({ telegram_user_id: Number(userId), salt, dek_wrapped: dekWrapped })
      setDek(dekRaw)
      dekRef.current = dekRaw
      setItems([])
      setRawItems([])
      setMasterPass('')
      setConfirmPass('')
      setPhase('unlocked')
    } catch (err) {
      setFormError(err.message || 'Error al crear la bóveda.')
    } finally {
      setDeriving(false)
    }
  }

  // ── Unlock: derivar KEK, desenvolver DEK, descifrar items ─────────────────
  async function handleUnlock(e) {
    e.preventDefault()
    if (!masterPass) return
    setFormError('')
    setDeriving(true)
    try {
      const config = await api.getVaultConfig(userId)
      const kek = await deriveKEK(masterPass, config.salt)
      const dekRaw = await unwrapDEK(kek, config.dek_wrapped)
      const rawList = (await api.getVaultItems(userId)).items
      const decrypted = await decryptAll(dekRaw, rawList)
      setDek(dekRaw)
      dekRef.current = dekRaw
      setRawItems(rawList)
      setItems(decrypted)
      setMasterPass('')
      setPhase('unlocked')
    } catch (err) {
      setFormError(err.message || 'Error al desbloquear.')
    } finally {
      setDeriving(false)
    }
  }

  // ── Guardar item (crear o editar) ─────────────────────────────────────────
  async function handleSaveItem(e) {
    e.preventDefault()
    if (!form.service.trim()) { setFormError('El nombre del servicio es requerido.'); return }
    if (!form.password.trim()) { setFormError('La contraseña es requerida.'); return }
    setFormError('')
    setSaving(true)
    try {
      const plain = {
        service: form.service.trim(),
        username: form.username.trim(),
        password: form.password,
        url: form.url.trim(),
        notes: form.notes.trim(),
        category: form.category.trim(),
      }
      const ciphertext = await encryptItem(dek, plain)
      if (editItem) {
        await api.putVaultItem(editItem._id, { telegram_user_id: Number(userId), ciphertext })
        const updated = items.map(i => i._id === editItem._id ? { ...plain, _id: editItem._id } : i)
        setItems(updated)
      } else {
        const res = await api.postVaultItem({ telegram_user_id: Number(userId), ciphertext })
        setItems(prev => [{ ...plain, _id: res.id }, ...prev])
      }
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
    } catch (err) {
      setFormError(err.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar item ─────────────────────────────────────────────────────────
  async function handleDelete(item) {
    setSaving(true)
    try {
      await api.deleteVaultItem(item._id, userId)
      setItems(prev => prev.filter(i => i._id !== item._id))
      setConfirmDelete(null)
    } catch (err) {
      setFormError(err.message || 'Error al eliminar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Cambiar contraseña maestra ────────────────────────────────────────────
  async function handleChangePass(e) {
    e.preventDefault()
    if (newPass.length < 8) { setFormError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (newPass !== newPassConfirm) { setFormError('Las contraseñas no coinciden.'); return }
    setFormError('')
    setDeriving(true)
    try {
      const salt = generateSalt()
      const kek = await deriveKEK(newPass, salt)
      const dekWrapped = await wrapDEK(kek, dek)
      await api.patchVaultConfig({ telegram_user_id: Number(userId), salt, dek_wrapped: dekWrapped })
      setShowChangePass(false)
      setNewPass('')
      setNewPassConfirm('')
    } catch (err) {
      setFormError(err.message || 'Error al cambiar la contraseña.')
    } finally {
      setDeriving(false)
    }
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      service: item.service || '',
      username: item.username || '',
      password: item.password || '',
      url: item.url || '',
      notes: item.notes || '',
      category: item.category || '',
    })
    setFormError('')
    setShowForm(true)
    setShowChangePass(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
    setShowChangePass(false)
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort()

  const filtered = items.filter(item => {
    const matchCat = filterCat === 'all' || item.category === filterCat
    const q = search.toLowerCase()
    const matchSearch = !q || item.service?.toLowerCase().includes(q) || item.username?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  // ── Renders por fase ──────────────────────────────────────────────────────
  if (phase === 'loading') {
    return <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary, #666)', fontSize: '0.9rem' }}>Cargando bóveda…</div>
  }

  if (phase === 'setup') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Crear bóveda segura</h2>
          <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary, #666)', lineHeight: 1.5 }}>
            Tus contraseñas se cifran en tu dispositivo antes de enviarse al servidor.
            Nadie más puede leerlas, ni el servidor. Si olvidas la contraseña maestra,
            <strong> no hay forma de recuperar la bóveda.</strong>
          </p>
        </div>
        <div className="panel" style={{ padding: '16px' }}>
          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Contraseña maestra
              <PasswordField value={masterPass} onChange={e => setMasterPass(e.target.value)} placeholder="Mínimo 8 caracteres" autoFocus />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Confirmar contraseña
              <PasswordField value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repite la contraseña" />
            </label>
            {formError && <div style={{ fontSize: '0.82rem', color: 'var(--color-danger, #e53e3e)' }}>{formError}</div>}
            <button type="submit" className="primary-btn" disabled={deriving}>
              {deriving ? 'Creando bóveda…' : 'Crear bóveda'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (phase === 'locked') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Bóveda bloqueada</h2>
          <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary, #666)' }}>
            Ingresa tu contraseña maestra para desbloquear.
          </p>
        </div>
        <div className="panel" style={{ padding: '16px' }}>
          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Contraseña maestra
              <PasswordField value={masterPass} onChange={e => setMasterPass(e.target.value)} placeholder="Tu contraseña maestra" autoFocus />
            </label>
            {formError && <div style={{ fontSize: '0.82rem', color: 'var(--color-danger, #e53e3e)' }}>{formError}</div>}
            <button type="submit" className="primary-btn" disabled={deriving || !masterPass}>
              {deriving ? 'Desbloqueando…' : 'Desbloquear'}
            </button>
          </form>
        </div>
        {deriving && (
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary, #666)', marginTop: '12px' }}>
            Derivando clave — puede tardar unos segundos…
          </p>
        )}
      </div>
    )
  }

  // ── Fase unlocked ─────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🔓 Bóveda</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="ghost-btn" style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            onClick={() => { setShowChangePass(v => !v); setShowForm(false); setFormError('') }}>
            Cambiar clave
          </button>
          <button className="primary-btn" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={openCreate}>
            + Agregar
          </button>
        </div>
      </div>

      {formError && (
        <div style={{
          padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '0.85rem',
          background: 'color-mix(in srgb, var(--color-danger, #e53e3e) 12%, var(--card-soft))',
          color: 'var(--color-danger, #e53e3e)',
          border: '1px solid color-mix(in srgb, var(--color-danger, #e53e3e) 30%, transparent)',
        }}>
          {formError}
        </div>
      )}

      {/* Cambiar contraseña maestra */}
      {showChangePass && (
        <div className="panel" style={{ marginBottom: '14px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Cambiar contraseña maestra</h3>
          <form onSubmit={handleChangePass} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Nueva contraseña
              <PasswordField value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" autoFocus />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Confirmar nueva contraseña
              <PasswordField value={newPassConfirm} onChange={e => setNewPassConfirm(e.target.value)} placeholder="Repite la contraseña" />
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="primary-btn" disabled={deriving} style={{ flex: 1 }}>
                {deriving ? 'Guardando…' : 'Guardar nueva clave'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => { setShowChangePass(false); setNewPass(''); setNewPassConfirm(''); setFormError('') }}>
                Cancelar
              </button>
            </div>
          </form>
          {deriving && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #666)', marginTop: '8px', textAlign: 'center' }}>Derivando clave…</p>}
        </div>
      )}

      {/* Formulario crear/editar */}
      {showForm && (
        <div className="panel" style={{ marginBottom: '14px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>
            {editItem ? `Editar — ${editItem.service}` : 'Nueva credencial'}
          </h3>
          <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'service', label: 'Servicio *', type: 'text', placeholder: 'GitHub, Gmail, Netflix…' },
              { key: 'username', label: 'Usuario / Email', type: 'text', placeholder: 'usuario@ejemplo.com' },
              { key: 'url', label: 'URL', type: 'url', placeholder: 'https://…' },
              { key: 'category', label: 'Categoría', type: 'text', placeholder: 'Trabajo, Personal, Bancos…' },
            ].map(({ key, label, type, placeholder }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                {label}
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  autoFocus={key === 'service'}
                />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Contraseña *
              <PasswordField value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              Notas
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas adicionales…"
                rows={2}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="primary-btn" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" className="ghost-btn" disabled={saving}
                onClick={() => { setShowForm(false); setEditItem(null); setForm(emptyForm); setFormError('') }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmación eliminar */}
      {confirmDelete && (
        <div className="panel" style={{
          marginBottom: '14px', padding: '14px 16px',
          border: '1.5px solid color-mix(in srgb, var(--color-danger, #e53e3e) 40%, transparent)',
          background: 'color-mix(in srgb, var(--color-danger, #e53e3e) 8%, var(--card-soft))',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.88rem' }}>
            ¿Eliminar <strong>{confirmDelete.service}</strong>? Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-btn" disabled={saving}
              style={{ background: 'var(--color-danger, #e53e3e)', flex: 1 }}
              onClick={() => handleDelete(confirmDelete)}>
              {saving ? 'Eliminando…' : 'Eliminar'}
            </button>
            <button className="ghost-btn" disabled={saving} onClick={() => setConfirmDelete(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Buscador y filtro */}
      {items.length > 0 && !showForm && !showChangePass && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="search"
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          {categories.length > 0 && (
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flexShrink: 0 }}>
              <option value="all">Todas</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Lista de items */}
      {items.length === 0 && !showForm ? (
        <div className="panel" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary, #666)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>Bóveda vacía. Agrega tu primera credencial.</p>
          <button className="primary-btn" onClick={openCreate}>+ Agregar credencial</button>
        </div>
      ) : (
        filtered.map(item => (
          <ItemCard
            key={item._id}
            item={item}
            onEdit={openEdit}
            onDelete={(i) => { setFormError(''); setConfirmDelete(i) }}
          />
        ))
      )}

      {filtered.length === 0 && items.length > 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary, #666)', fontSize: '0.88rem' }}>
          Sin resultados para "{search}".
        </div>
      )}
    </div>
  )
}
