export default function StatCard({ palette, title, value, accent = false }) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${accent ? palette.borderSoft : palette.border}`,
        borderRadius: "1.1rem",
        padding: "1rem",
        boxShadow: `0 10px 25px ${accent ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
      }}
    >
      <div
        style={{
          fontSize: "0.9rem",
          marginBottom: "0.45rem",
          color: accent ? palette.accent : palette.textMuted,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          color: accent ? palette.primary : palette.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}