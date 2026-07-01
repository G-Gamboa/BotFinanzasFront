const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

export function getTelegramInitData() {
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
    const raw = data?.detail || data?.message || 'Error en API'
    const message = Array.isArray(raw)
      ? raw.map((e) => e?.msg || JSON.stringify(e)).join('; ')
      : typeof raw === 'object'
        ? JSON.stringify(raw)
        : raw
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
  activarCuenta: (accountId) =>
    request(`/cuentas/${accountId}/activar`, { method: 'PATCH' }),
  desactivarCuenta: (accountId) =>
    request(`/cuentas/${accountId}/desactivar`, { method: 'PATCH' }),

  getCategoriasAdmin: (userId) => request(`/categorias/${userId}`),
  postCategoria: (payload) =>
    request('/categorias', { method: 'POST', body: JSON.stringify(payload) }),
  patchCategoria: (categoryId, payload) =>
    request(`/categorias/${categoryId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarCategoria: (categoryId) =>
    request(`/categorias/${categoryId}/activar`, { method: 'PATCH' }),
  desactivarCategoria: (categoryId) =>
    request(`/categorias/${categoryId}/desactivar`, { method: 'PATCH' }),

  getPreferencias: (userId) => request(`/preferencias/${userId}`),
  patchPreferencias: (payload) =>
    request('/preferencias', { method: 'PATCH', body: JSON.stringify(payload) }),


  anularMovimiento: (movementId, payload) =>
    request(`/movimientos/${movementId}/anular`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  anularLoanPayment: (loanPaymentId, payload) =>
    request(`/loan-payments/${loanPaymentId}/anular`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  anularDebtPayment: (debtPaymentId, payload) =>
    request(`/debt-payments/${debtPaymentId}/anular`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  patchMovimiento: (movementId, payload) =>
    request(`/movimientos/${movementId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getLoanPeopleAdmin: (userId) => request(`/loan-people/${userId}`),
  postLoanPerson: (payload) =>
    request('/loan-people', { method: 'POST', body: JSON.stringify(payload) }),
  patchLoanPerson: (personId, payload) =>
    request(`/loan-people/${personId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  activarLoanPerson: (personId) =>
    request(`/loan-people/${personId}/activar`, { method: 'PATCH' }),
  desactivarLoanPerson: (personId) =>
    request(`/loan-people/${personId}/desactivar`, { method: 'PATCH' }),

  getPeriodoResumen: (userId, params = {}) => {
    const search = new URLSearchParams()
    if (params.date_from) search.set('date_from', params.date_from)
    if (params.date_to) search.set('date_to', params.date_to)
    const qs = search.toString()
    return request(`/dashboard/${userId}/periodo${qs ? `?${qs}` : ''}`)
  },

  patchDeuda: (debtId, payload) =>
    request(`/deudas/${debtId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getSavingsGoals: (userId) => request(`/savings-goals/${userId}`),
  postSavingsGoal: (payload) =>
    request('/savings-goals', { method: 'POST', body: JSON.stringify(payload) }),
  patchSavingsGoal: (goalId, payload) =>
    request(`/savings-goals/${goalId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSavingsGoal: (goalId) =>
    request(`/savings-goals/${goalId}`, { method: 'DELETE' }),

  getTCBalances: (userId) => request(`/tc-balances/${userId}`),
  postTCPayment: (payload) =>
    request('/tc-payments', { method: 'POST', body: JSON.stringify(payload) }),
  anularTCPayment: (paymentId, payload) =>
    request(`/tc-payments/${paymentId}/anular`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Planes de cuotas (Visacuotas)
  getInstallmentPlans: (userId) => request(`/cc-installment-plans/${userId}`),
  postInstallmentPlan: (payload) =>
    request('/cc-installment-plans', { method: 'POST', body: JSON.stringify(payload) }),
  patchInstallmentPlan: (planId, payload) =>
    request(`/cc-installment-plans/${planId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteInstallmentPlan: (planId) =>
    request(`/cc-installment-plans/${planId}`, { method: 'DELETE' }),
  processPendingCharges: (userId) =>
    request(`/cc-installment-plans/process-pending/${userId}`, { method: 'POST' }),
  migrateDebtToTC: (debtId, payload) =>
    request(`/deudas/${debtId}/migrate-to-tc`, { method: 'POST', body: JSON.stringify(payload) }),

  // Registration
  getRegistrationStatus: () => request('/registro/estado'),
  postRegistroInvoice: () =>
    request('/registro/invoice', { method: 'POST' }),

  getAdminUsuarios: () => request('/admin/usuarios'),
  postCrearUsuario: (payload) =>
    request('/admin/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  patchAdminUsuario: (userId, payload) =>
    request(`/admin/usuarios/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // ── Presupuesto mensual ───────────────────────────────────────────────────
  getPresupuesto: (userId) => request(`/presupuesto/${userId}`),
  postPresupuesto: (payload) =>
    request('/presupuesto', { method: 'POST', body: JSON.stringify(payload) }),
  patchPresupuesto: (budgetId, payload) =>
    request(`/presupuesto/${budgetId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePresupuesto: (budgetId, userId) =>
    request(`/presupuesto/${budgetId}?telegram_user_id=${userId}`, { method: 'DELETE' }),

  getHistorial: (userId, params = {}) => {
    const search = new URLSearchParams()
    if (params.date_from) search.set('date_from', params.date_from)
    if (params.date_to) search.set('date_to', params.date_to)
    if (params.movement_type) search.set('movement_type', params.movement_type)
    if (params.category_name) search.set('category_name', params.category_name)
    if (params.payment_method) search.set('payment_method', params.payment_method)
    if (params.note) search.set('note', params.note)
    if (params.amount_min != null && params.amount_min !== '') search.set('amount_min', String(params.amount_min))
    if (params.amount_max != null && params.amount_max !== '') search.set('amount_max', String(params.amount_max))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.offset) search.set('offset', String(params.offset))
    const qs = search.toString()
    return request(`/historial/${userId}${qs ? `?${qs}` : ''}`)
  },

}