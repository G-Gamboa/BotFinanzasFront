/**
 * Caché en localStorage del último arranque de la app.
 *
 * Al abrir se pinta de inmediato lo último guardado y en segundo plano se
 * trae la versión fresca del servidor, que reemplaza a la anterior. No hay
 * vencimiento corto: un dato de hace horas es mejor que una pantalla de
 * carga, y dura un instante porque siempre se revalida.
 */

const PREFIX = 'bf_'
const BOOT_KEY = 'boot'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function storageKey(userId) {
  return `${PREFIX}${userId}_${BOOT_KEY}`
}

export function cacheWriteBoot(userId, data) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // localStorage puede fallar en modo privado o por cuota llena.
  }
}

export function cacheReadBoot(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > MAX_AGE_MS) return null
    return data
  } catch {
    return null
  }
}

/** Borra todo lo guardado del usuario, incluidas las claves del esquema anterior. */
export function cacheClear(userId) {
  const prefix = `${PREFIX}${userId}_`
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // noop
  }
}
