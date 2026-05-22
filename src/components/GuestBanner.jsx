export default function GuestBanner({ onRegister, loading, starsPrice }) {
  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 12%, var(--card-soft))',
        border: '1.5px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
        borderRadius: '16px',
        padding: '14px 16px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>
          Modo prueba
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>
          Estás viendo el gestor sin cuenta activa. Regístrate para guardar tus finanzas.
        </div>
      </div>
      <button
        className="primary-btn"
        style={{ whiteSpace: 'nowrap', fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
        onClick={onRegister}
        disabled={loading}
      >
        {loading ? 'Procesando…' : `Crear cuenta · ⭐ ${starsPrice ?? 100}`}
      </button>
    </div>
  )
}
