export default function StatCard({ label, value, help, accent = false }) {
  return (
    <article className={accent ? 'stat-card accent' : 'stat-card'}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {help ? <small className="stat-help">{help}</small> : null}
    </article>
  )
}
