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
  postDeuda: (payload) =>
    request('/deudas', { method: 'POST', body: JSON.stringify(payload) }),
  postPagarDeuda: (payload) =>
    request('/deudas/pagar', { method: 'POST', body: JSON.stringify(payload) }),
}
