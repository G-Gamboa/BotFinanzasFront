export default function Panel({ title, actions, children }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
