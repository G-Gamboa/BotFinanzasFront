export default function Layout({ title, subtitle, actions, children, userLabel, palette }) {
  return (
    <div
      className="app-shell"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '12px',
        }}
      >
        <header
          className="topbar"
          style={{
            border: `1px solid ${palette.border}`,
            background: palette.surface,
            borderRadius: '1.25rem',
            padding: '1rem 1.1rem',
          }}
        >
          <div>
            <p className="eyebrow" style={{ color: palette.primarySoft || palette.textMuted }}>
              Bot Finanzas
            </p>

            <h1 style={{ color: palette.primary }}>{title}</h1>

            {subtitle ? (
              <p className="subtitle" style={{ color: palette.textSoft || palette.textMuted }}>
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="topbar-meta">
            {userLabel ? (
              <span
                className="user-pill"
                style={{
                  background: palette.cardSoft,
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                }}
              >
                {userLabel}
              </span>
            ) : null}
            {actions}
          </div>
        </header>

        <main className="page-content" style={{ padding: '1rem 0 0 0' }}>
          {children}
        </main>
      </div>
    </div>
  )
}