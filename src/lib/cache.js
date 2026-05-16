/**
 * Caché localStorage con TTL para Telegram Mini Apps.
 *
 * Patrón Stale-While-Revalidate: se muestra el dato cacheado al instante
 * mientras se trae la versión fresca del servidor en segundo plano.
 *
 * El WebView de Telegram persiste localStorage entre sesiones, igual que
 * un navegador normal, por lo que este módulo funciona sin cambios extra.
 */

const PREFIX = 'bf_'

export const TTL = {
  // Catálogos y configuración: cambian solo cuando el usuario los edita.
  config: 24 * 60 * 60 * 1000,
  // Balances y disponibles: pueden cambiar con cada movimiento.
  balance: 5 * 60 * 1000,
  // Deudas y tarjetas: cambian con menos frecuencia que los movimientos.
  debts: 10 * 60 * 1000,
}

// Nombres de los conjuntos de datos y su TTL correspondiente
export const CACHE_KEYS = {
  catalogos:        TTL.config,
  dashboard:        TTL.balance,
  disponibles:      TTL.balance,
  deudas:           TTL.debts,
  tcBalances:       TTL.debts,
  installmentPlans: TTL.debts,
  cuentas:          TTL.config,
  categorias:       TTL.config,
  loanPeople:       TTL.config,
  preferencias:     TTL.config,
}

function storageKey(name, userId) {
  return `${PREFIX}${userId}_${name}`
}

export function cacheSet(name, userId, data) {
  try {
    localStorage.setItem(
      storageKey(name, userId),
      JSON.stringify({ data, ts: Date.now() })
    )
  } catch {
    // localStorage puede fallar en modo privado o por cuota llena; ignorar.
  }
}

/**
 * Devuelve el dato cacheado si existe y no expiró, o null.
 * @param {string} name
 * @param {string|number} userId
 * @param {number} ttl  — en milisegundos
 */
export function cacheGet(name, userId, ttl) {
  try {
    const raw = localStorage.getItem(storageKey(name, userId))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > ttl) return null
    return data
  } catch {
    return null
  }
}

function cacheRemove(name, userId) {
  try {
    localStorage.removeItem(storageKey(name, userId))
  } catch {}
}

/** Borra las claves que cambian con cada transacción. */
export function cacheInvalidateFinancial(userId) {
  ;['dashboard', 'disponibles', 'deudas', 'tcBalances', 'installmentPlans'].forEach((n) =>
    cacheRemove(n, userId)
  )
}

/** Borra las claves de configuración (cuentas, categorías, etc.). */
export function cacheInvalidateConfig(userId) {
  ;['catalogos', 'cuentas', 'categorias', 'loanPeople', 'preferencias'].forEach((n) =>
    cacheRemove(n, userId)
  )
}

/** Borra todo el caché del usuario. */
export function cacheInvalidateAll(userId) {
  const prefix = `${PREFIX}${userId}_`
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k))
  } catch {}
}

/**
 * Lee todas las claves del caché para un usuario y devuelve
 * un objeto con los valores vigentes (null si están vencidos).
 */
export function cacheReadAll(userId) {
  return Object.fromEntries(
    Object.entries(CACHE_KEYS).map(([name, ttl]) => [name, cacheGet(name, userId, ttl)])
  )
}
