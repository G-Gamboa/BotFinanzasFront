const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

function getTelegramInitData() {
  try {
    return window?.Telegram?.WebApp?.initData || ''
  } catch {
    return ''
  }
}

async function request(path, options = {}) {
  const initData = getTelegramInitData()

  const headers = {
    'Content-Type': 'application/json',
    ...(initData ? { Authorization: `tma ${initData}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()

  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || 'Error en API'
    throw new Error(message)
  }

  return data
}

export const api = {
  getHealth: () => request('/health'),
  getCatalogos: (userId) => request(`/catalogos/${userId}`),
  getDisponibles: (userId) => request(`/disponibles/${userId}`),
  getSaldos: (userId) => request(`/saldos/${userId}`),
  getNetworth: (userId) => request(`/networth/${userId}`),
  getNeto: (userId) => request(`/neto/${userId}`),
  getDeudas: (userId) => request(`/deudas/${userId}`),
  getDashboard: (userId) => request(`/dashboard/${userId}`),
  getPrestamosView: (userId) => request(`/prestamos/${userId}`),

  postMovimiento: (payload) =>
    request('/movimientos', { method: 'POST', body: JSON.stringify(payload) }),

  postDeuda: (payload) =>
    request('/deudas', { method: 'POST', body: JSON.stringify(payload) }),

  postPagarDeuda: (payload) =>
    request('/deudas/pagar', { method: 'POST', body: JSON.stringify(payload) }),

  getCuentas: (userId) => request(`/cuentas/${userId}`),
  postCuenta: (payload) =>
    request('/cuentas', { method: 'POST', body: JSON.stringify(payload) }),
  patchCuenta: (accountId, payload) =>
    request(`/cuentas/${accountId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarCuenta: (accountId, userId) =>
    request(`/cuentas/${accountId}/activar?telegram_user_id=${userId}`, { method: 'PATCH' }),
  desactivarCuenta: (accountId, userId) =>
    request(`/cuentas/${accountId}/desactivar?telegram_user_id=${userId}`, { method: 'PATCH' }),

  getCategoriasAdmin: (userId) => request(`/categorias/${userId}`),
  postCategoria: (payload) =>
    request('/categorias', { method: 'POST', body: JSON.stringify(payload) }),
  patchCategoria: (categoryId, payload) =>
    request(`/categorias/${categoryId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarCategoria: (categoryId, userId) =>
    request(`/categorias/${categoryId}/activar?telegram_user_id=${userId}`, { method: 'PATCH' }),
  desactivarCategoria: (categoryId, userId) =>
    request(`/categorias/${categoryId}/desactivar?telegram_user_id=${userId}`, { method: 'PATCH' }),

  getPreferencias: (userId) => request(`/preferencias/${userId}`),
  patchPreferencias: (payload) =>
    request('/preferencias', { method: 'PATCH', body: JSON.stringify(payload) }),

  getHistorial: (userId, params = {}) => {
  const search = new URLSearchParams()

  if (params.date_from) search.set('date_from', params.date_from)
  if (params.date_to) search.set('date_to', params.date_to)
  if (params.movement_type) search.set('movement_type', params.movement_type)
  if (params.limit) search.set('limit', String(params.limit))

  const qs = search.toString()
  return request(`/historial/${userId}${qs ? `?${qs}` : ''}`)
},

}