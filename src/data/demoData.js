/**
 * Datos de demostración para usuarios no registrados.
 * Simulan una cuenta real en GTQ para mostrar todas las funciones del gestor.
 */

const today = new Date()
const fmt = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d) }

export const demoCatalogos = {
  user: {
    telegram_user_id: 0,
    can_use_loans: false,
    can_use_private_palettes: false,
    is_admin: false,
    theme_key: null,
  },
  accounts: [
    { id: 1, name: 'Efectivo',          account_type: 'cash',        currency: 'GTQ', is_active: true, sort_order: 0, is_system: false },
    { id: 2, name: 'Banco Industrial',  account_type: 'bank',        currency: 'GTQ', is_active: true, sort_order: 1, is_system: false },
    { id: 3, name: 'Inversión GYT',     account_type: 'investment',  currency: 'GTQ', is_active: true, sort_order: 2, is_system: false },
    { id: 4, name: 'Visa Clásica',      account_type: 'credit_card', currency: 'GTQ', is_active: true, sort_order: 3, is_system: false,
      credit_limit: 10000, billing_close_day: 15, payment_due_day: 5, tc_type: 'GTQ' },
  ],
  categories: [
    { id: 1,  name: 'Alimentación',    kind: 'EGR', is_active: true, sort_order: 0 },
    { id: 2,  name: 'Transporte',      kind: 'EGR', is_active: true, sort_order: 1 },
    { id: 3,  name: 'Servicios',       kind: 'EGR', is_active: true, sort_order: 2 },
    { id: 4,  name: 'Entretenimiento', kind: 'EGR', is_active: true, sort_order: 3 },
    { id: 5,  name: 'Salud',           kind: 'EGR', is_active: true, sort_order: 4 },
    { id: 6,  name: 'Salario',         kind: 'ING', is_active: true, sort_order: 0 },
    { id: 7,  name: 'Freelance',       kind: 'ING', is_active: true, sort_order: 1 },
  ],
  loan_people: [],
  savings_goals: [],
}

export const demoDashboard = {
  networth: {
    total_gtq:        10850.00,
    ahorro_total_gtq:  3200.00,
    cuentas: [
      { cuenta: 'Efectivo',         saldo:   850.00, tipo: 'cash'       },
      { cuenta: 'Banco Industrial', saldo: 12400.00, tipo: 'bank'       },
      { cuenta: 'Inversión GYT',    saldo:  3200.00, tipo: 'investment' },
      { cuenta: 'Visa Clásica',     saldo: -2450.00, tipo: 'credit_card'},
    ],
  },
  neto: {
    neto_gtq:   6250.00,
    ingresos:   8500.00,
    egresos:    2250.00,
    periodo:    'Este mes',
  },
  deudas_resumen: {
    total_pendiente_gtq: 18360.00,
    proximos_pagos: [
      { nombre: 'Préstamo vehículo', monto: 1650.00, fecha: daysAgo(-5)  },
      { nombre: 'Tarjeta Visa',      monto:  850.00, fecha: daysAgo(-10) },
    ],
  },
  savings_goals: [],
}

export const demoDisponibles = {
  items: [
    { account_id: 1, account_name: 'Efectivo',         available:   850.00, currency: 'GTQ' },
    { account_id: 2, account_name: 'Banco Industrial',  available: 12400.00, currency: 'GTQ' },
    { account_id: 3, account_name: 'Inversión GYT',     available:  3200.00, currency: 'GTQ' },
  ],
}

export const demoDeudas = {
  items: [
    {
      id: 1,
      name: 'Préstamo vehículo',
      creditor: 'Banco G&T',
      status: 'active',
      installment_amount: 1650.00,
      total_installments: 36,
      paid_installments: 12,
      pending_installments: 24,
      due_date: daysAgo(-5),
      payment_frequency: 'monthly',
      total_paid: 19800.00,
      remaining_amount: 39600.00,
    },
    {
      id: 2,
      name: 'Tarjeta Visa',
      creditor: 'Banco Industrial',
      status: 'active',
      installment_amount: 850.00,
      total_installments: 12,
      paid_installments: 4,
      pending_installments: 8,
      due_date: daysAgo(-10),
      payment_frequency: 'monthly',
      total_paid: 3400.00,
      remaining_amount: 6800.00,
    },
  ],
}

export const demoHistorial = {
  items: [
    { id: 1, movement_type: 'ING', amount: 8500.00, note: 'Salario quincenal',  movement_date: daysAgo(2),  source_account: 'Banco Industrial', category: 'Salario',         is_void: false },
    { id: 2, movement_type: 'EGR', amount:  380.00, note: 'Supermercado',       movement_date: daysAgo(3),  source_account: 'Efectivo',         category: 'Alimentación',    is_void: false },
    { id: 3, movement_type: 'EGR', amount:  150.00, note: 'Gasolina',           movement_date: daysAgo(4),  source_account: 'Efectivo',         category: 'Transporte',      is_void: false },
    { id: 4, movement_type: 'EGR', amount:   89.00, note: 'Netflix + Spotify',  movement_date: daysAgo(5),  source_account: 'Visa Clásica',     category: 'Entretenimiento', is_void: false },
    { id: 5, movement_type: 'EGR', amount:  450.00, note: 'Agua, luz, internet',movement_date: daysAgo(7),  source_account: 'Banco Industrial', category: 'Servicios',       is_void: false },
    { id: 6, movement_type: 'ING', amount: 1200.00, note: 'Proyecto freelance', movement_date: daysAgo(10), source_account: 'Banco Industrial', category: 'Freelance',       is_void: false },
    { id: 7, movement_type: 'EGR', amount:  280.00, note: 'Farmacia',           movement_date: daysAgo(12), source_account: 'Efectivo',         category: 'Salud',           is_void: false },
  ],
  total: 7,
}

export const demoTcBalances = {
  items: [
    {
      account_id:         4,
      account_name:       'Visa Clásica',
      tc_type:            'GTQ',
      balance_gtq:        2450.00,
      balance_usd:        null,
      credit_limit:       10000.00,
      credit_limit_usd:   null,
      visacuota_remaining:   0.00,
      visacuotas_limit:   null,
    },
  ],
}

export const demoPreferencias = {
  telegram_user_id:     0,
  show_amounts_default: true,
  default_tab:          'movimientos',
  usd_to_gtq:           7.7,
  theme_key:            null,
  tab_order:            null,
}
