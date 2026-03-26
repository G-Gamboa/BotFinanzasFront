export default function Layout({ title, subtitle, actions, children, userLabel }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Bot Finanzas</p>
          <h1>{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="topbar-meta">
          {userLabel ? <span className="user-pill">{userLabel}</span> : null}
          {actions}
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
  )
}
