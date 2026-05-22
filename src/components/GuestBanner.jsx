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
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>
          Modo prueba
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>
          Suscripción mensual · {starsPrice ?? 100} Stars/mes. Cancela cuando quieras.
        </div>
      </div>
      <button
        className="primary-btn"
        style={{ fontSize: '0.84rem', padding: '0.5rem' }}
        onClick={onRegister}
        disabled={loading}
      >
        {loading ? 'Procesando…' : `⭐ Suscribirse · ${starsPrice ?? 100} Stars`}
      </button>
    </div>
  )
}
