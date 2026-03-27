import { getPaletteByUser } from "../theme";

export default function Layout({ title, subtitle, actions, children, userLabel, userId }) {

  const palette = getPaletteByUser(userId);

  const isLight = palette.bg === "#fff5f8" || palette.bg === "#ffffff";

  return (
    <div
      className="app-shell"
      style={{
        background: palette.bg,
        color: palette.text,
        minHeight: "100vh",
      }}
    >
      <header
        className="topbar"
        style={{
          borderBottom: `1px solid ${palette.border}`,
          background: palette.surface,
        }}
      >
        <div>
          <p
            className="eyebrow"
            style={{ color: palette.textMuted }}
          >
            Bot Finanzas
          </p>

          <h1 style={{ color: palette.primary }}>
            {title}
          </h1>

          {subtitle ? (
            <p
              className="subtitle"
              style={{ color: palette.textSoft }}
            >
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

      <main
        className="page-content"
        style={{
          padding: "1rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}