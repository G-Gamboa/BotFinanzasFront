export default function MessageBanner({ kind = 'info', children }) {
  return <div className={`message-banner ${kind}`}>{children}</div>
}
