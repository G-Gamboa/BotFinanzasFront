export default function SectionCard({ palette, title, children, accent = false }) {
  return (
    <section
      style={{
        background: palette.card,
        border: `1px solid ${accent ? palette.borderSoft : palette.border}`,
        borderRadius: "1.25rem",
        padding: "1.1rem",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "1rem",
          color: accent ? palette.primary : palette.text,
          fontSize: "1.1rem",
          fontWeight: 800,
        }}
      >
        {title}
      </h3>

      {children}
    </section>
  );
}