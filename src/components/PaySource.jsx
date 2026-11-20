import { q } from '../lib/format'

// Tarjetas que pueden recibir una cuota en quetzales (no las que llevan saldo solo en dólares)
export function quetzalCards(creditCards = []) {
  return creditCards.filter((c) => (c.tc_type || 'GTQ') !== 'USD').map((c) => ({ id: c.id, name: c.name }))
}

// Estado inicial de "de dónde sale" a partir de la cuenta guardada en la deuda
export function initialSource(preferred, liquidAccounts, cards) {
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const card = cards.find((c) => c.name === preferred)
  if (card) return { method: 'credit_card', account: bankAccounts[0]?.name || '', card: card.name }
  return {
    method: preferred === 'Efectivo' || !bankAccounts.length ? 'cash' : 'transfer',
    account: preferred && preferred !== 'Efectivo' ? preferred : (bankAccounts[0]?.name || ''),
    card: cards[0]?.name || '',
  }
}

// Lo que se manda a la API: método y nombre de la cuenta o tarjeta
export function sourcePayload(form) {
  if (form.method === 'credit_card') return { payment_method: 'credit_card', account_name: form.card }
  if (form.method === 'transfer') return { payment_method: 'transfer', account_name: form.account }
  return { payment_method: 'cash', account_name: 'Efectivo' }
}

export default function PaySourceFields({ form, set, liquidAccounts, cards }) {
  const bankAccounts = liquidAccounts.filter((a) => a.name !== 'Efectivo')
  const source = form.method === 'transfer' ? form.account : 'Efectivo'
  return (
    <>
      <label>
        <span>Sale por</span>
        <select value={form.method} onChange={(e) => set('method', e.target.value)}>
          <option value="cash">Efectivo</option>
          {bankAccounts.length ? <option value="transfer">Transferencia</option> : null}
          {cards.length ? <option value="credit_card">Tarjeta de crédito</option> : null}
        </select>
      </label>
      {form.method === 'transfer' ? (
        <label className="full-span">
          <span>Cuenta</span>
          <select value={form.account} onChange={(e) => set('account', e.target.value)} required>
            {bankAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
        </label>
      ) : null}
      {form.method === 'credit_card' ? (
        <label className="full-span">
          <span>Tarjeta</span>
          <select value={form.card} onChange={(e) => set('card', e.target.value)} required>
            {cards.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
      ) : null}
      <small className="full-span helper-text">
        {form.method === 'credit_card'
          ? `La cuota se suma al saldo en quetzales de ${form.card}: no sale de tu efectivo y la pagas con el corte de la tarjeta.`
          : `Disponible en ${source}: ${q(liquidAccounts.find((a) => a.name === source)?.balance ?? 0)}`}
      </small>
    </>
  )
}

// Opciones para "Se paga desde": cuentas líquidas y tarjetas en quetzales
export function SourceOptions({ liquidAccounts, cards }) {
  return (
    <>
      <option value="">Lo elijo al pagar</option>
      {liquidAccounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
      {cards.length ? (
        <optgroup label="Tarjeta de crédito">
          {cards.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </optgroup>
      ) : null}
    </>
  )
}
