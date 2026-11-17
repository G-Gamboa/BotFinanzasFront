import { useState } from 'react'
import Sheet from './Sheet'
import MessageBanner from './MessageBanner'
import Icon from './Icons'

const MAX_BYTES = 5 * 1024 * 1024

function money(amount, currency) {
  const n = Number(amount || 0)
  if (currency === 'USD') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
}

function shortDate(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',').pop())
    reader.onerror = () => reject(new Error('No pude leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function sameMoney(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.01
}

function BankLine({ line }) {
  const credit = line.side === 'credit'
  return (
    <li className="stmt-line">
      <span className="stmt-date">{shortDate(line.date)}</span>
      <span className="stmt-desc">
        {line.description}
        {line.installment ? ` · cuota ${line.installment.number} de ${line.installment.total}` : ''}
        {line.section === 'otros_cargos' ? ' · cargo del banco' : ''}
      </span>
      <span className={`stmt-amt${credit ? ' pos' : ''}`}>{credit ? '−' : ''}{money(line.amount, line.currency)}</span>
    </li>
  )
}

function AppLine({ entry }) {
  const credit = entry.side === 'credit'
  return (
    <li className="stmt-line">
      <span className="stmt-date">{shortDate(entry.date)}</span>
      <span className="stmt-desc">{entry.label}</span>
      <span className={`stmt-amt${credit ? ' pos' : ''}`}>{credit ? '−' : ''}{money(entry.amount, entry.currency)}</span>
    </li>
  )
}

function Group({ title, hint, children, count }) {
  if (!count) return null
  return (
    <section className="stmt-group">
      <h4>{title} <span className="stmt-count">{count}</span></h4>
      {hint ? <p className="helper-text">{hint}</p> : null}
      <ul className="stmt-list">{children}</ul>
    </section>
  )
}

export default function StatementSheet({ card, userId, api, onClose, onApplied }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [applied, setApplied] = useState(false)

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) { setError('El PDF pesa más de 5 MB.'); return }
    setBusy(true); setError(''); setResult(null); setApplied(false)
    try {
      const pdf = await readAsBase64(file)
      const data = await api.revisarEstadoCuenta(card.id, { telegram_user_id: Number(userId), pdf_base64: pdf })
      setResult(data)
    } catch (err) {
      setError(err.message || 'No pude revisar el estado de cuenta.')
    } finally {
      setBusy(false)
    }
  }

  async function useBankContado() {
    const c = result.contado
    const type = result.card.tc_type
    setBusy(true); setError('')
    try {
      await api.ajustarContado(card.id, {
        telegram_user_id: Number(userId),
        amount_q: type === 'USD' ? null : c.bank_q,
        amount_usd: type === 'GTQ' ? null : c.bank_usd,
      })
      setApplied(true)
      onApplied?.()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el contado.')
    } finally {
      setBusy(false)
    }
  }

  const c = result?.contado
  const type = result?.card?.tc_type
  const contadoOk = c && c.current_cycle
    && (type === 'USD' || sameMoney(c.app_q, c.bank_q))
    && (type === 'GTQ' || sameMoney(c.app_usd, c.bank_usd))
  const mismatchedInstallments = (result?.installments || []).filter((i) => !i.ok)

  return (
    <Sheet title="Revisar estado de cuenta" subtitle={card.name} onClose={onClose}>
      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}

      <label className={`stmt-drop${busy ? ' busy' : ''}`}>
        <input type="file" accept="application/pdf,.pdf" onChange={onFile} disabled={busy} />
        <Icon name="card" size={20} />
        <span>{busy ? 'Leyendo el estado de cuenta...' : result ? 'Subir otro PDF' : 'Elegir el PDF del estado de cuenta de BI'}</span>
      </label>
      <p className="helper-text">
        El archivo se lee y se descarta: no se guarda ni se manda a otro servicio. Nada se registra solo; tú decides qué corregir.
      </p>

      {result ? (
        <div className="stmt-result">
          <p className="helper-text">
            Corte del {shortDate(result.statement.close_date)}, pago el {shortDate(result.statement.payment_date)}
            {result.statement.card_last4 ? ` · tarjeta terminada en ${result.statement.card_last4}` : ''}
            {' · '}{result.statement.lines} líneas leídas
          </p>

          {result.warnings.map((w) => (
            <div key={w} className="notice notice-danger"><div className="notice-text"><Icon name="alert" size={18} /><span>{w}</span></div></div>
          ))}

          <section className="stmt-group">
            <h4>Pago de contado</h4>
            <div className="stmt-contado">
              <div>
                <span>Banco</span>
                <strong>
                  {type !== 'USD' ? money(c.bank_q, 'GTQ') : null}
                  {type === 'MIXTO' ? ' · ' : null}
                  {type !== 'GTQ' ? money(c.bank_usd, 'USD') : null}
                </strong>
              </div>
              {c.current_cycle ? (
                <div>
                  <span>Calculado en la app</span>
                  <strong>
                    {type !== 'USD' ? money(c.app_q, 'GTQ') : null}
                    {type === 'MIXTO' ? ' · ' : null}
                    {type !== 'GTQ' ? money(c.app_usd, 'USD') : null}
                  </strong>
                </div>
              ) : null}
            </div>
            {!c.current_cycle ? (
              <p className="helper-text">Este estado de cuenta no es del corte vigente de la tarjeta: solo se comparan los movimientos.</p>
            ) : contadoOk ? (
              <p className="cover ok">El contado de la app cuadra con el del banco.</p>
            ) : applied ? (
              <p className="cover ok">Listo: el plan y la proyección ya usan el contado del banco.</p>
            ) : (
              <>
                <p className="cover warn">No cuadra. Abajo ves qué líneas lo explican.</p>
                <button type="button" className="confirm-btn" disabled={busy} onClick={useBankContado}>
                  Usar el contado del banco para este corte
                </button>
              </>
            )}
          </section>

          <p className="stmt-tally">
            <span><strong>{result.matched.length}</strong> cuadran</span>
            <span><strong>{result.bank_only.length}</strong> solo en el banco</span>
            <span><strong>{result.app_only.length}</strong> solo en la app</span>
            <span><strong>{result.pending_next.length}</strong> al próximo corte</span>
          </p>

          <Group title="En el banco, no en la app" count={result.bank_only.length}
            hint="Puede que te falte registrarlos, o que estén con otro monto o en otra tarjeta.">
            {result.bank_only.map((l, i) => <BankLine key={`b${i}`} line={l} />)}
          </Group>

          <Group title="En la app, no en el banco" count={result.app_only.length}
            hint="Revisa si están duplicados, con un monto distinto o cargados a otra tarjeta.">
            {result.app_only.map((a) => <AppLine key={a.id} entry={a} />)}
          </Group>

          <Group title="Entran en el próximo corte" count={result.pending_next.length}
            hint="Son de los últimos días antes del corte y el banco todavía no los procesa. Es normal.">
            {result.pending_next.map((a) => <AppLine key={a.id} entry={a} />)}
          </Group>

          {result.installments.length ? (
            <section className="stmt-group">
              <h4>Contador de visacuotas</h4>
              {mismatchedInstallments.length === 0 ? (
                <p className="cover ok">Las {result.installments.length} visacuotas van en la misma cuota que dice el banco.</p>
              ) : (
                <ul className="stmt-list">
                  {mismatchedInstallments.map((i) => (
                    <li key={i.plan_name} className="stmt-line">
                      <span className="stmt-desc">
                        {i.plan_name}: el banco va en la cuota {i.bank_number} de {i.bank_total}, la app en la {i.app_number} de {i.app_total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {result.matched.length ? (
            <details className="stmt-group">
              <summary className="details-summary">Ver lo que cuadra ({result.matched.length})</summary>
              <ul className="stmt-list">
                {result.matched.map((g, i) => (
                  <li key={`m${i}`} className="stmt-match">
                    <span className="stmt-desc">
                      {g.bank.map((b) => b.description).join(' + ')}
                      <span className="helper-text"> = {g.app.map((a) => a.label).join(' + ')}</span>
                      {g.how !== 'exacto' ? <span className="stmt-tag">{g.how}</span> : null}
                    </span>
                    <span className="stmt-amt">
                      {money(g.bank.reduce((s, b) => s + b.amount, 0), g.bank[0].currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  )
}
