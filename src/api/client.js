const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || 'Error inesperado en la API'
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
  postMovimiento: (payload) =>
    request('/movimientos', { method: 'POST', body: JSON.stringify(payload) }),
  getCuentas: (userId) => request(`/cuentas/${userId}`),
  postCuenta: (payload) => request('/cuentas', { method: 'POST', body: JSON.stringify(payload) }),
  patchCuenta: (accountId, payload) => request(`/cuentas/${accountId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarCuenta: (accountId, userId) => request(`/cuentas/${accountId}/activar?telegram_user_id=${userId}`, { method: 'PATCH' }),
  desactivarCuenta: (accountId, userId) => request(`/cuentas/${accountId}/desactivar?telegram_user_id=${userId}`, { method: 'PATCH' }),
  getCategoriasAdmin: (userId) => request(`/categorias/${userId}`),
  postCategoria: (payload) => request('/categorias', { method: 'POST', body: JSON.stringify(payload) }),
  patchCategoria: (categoryId, payload) => request(`/categorias/${categoryId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarCategoria: (categoryId, userId) => request(`/categorias/${categoryId}/activar?telegram_user_id=${userId}`, { method: 'PATCH' }),
  desactivarCategoria: (categoryId, userId) => request(`/categorias/${categoryId}/desactivar?telegram_user_id=${userId}`, { method: 'PATCH' }),
}
