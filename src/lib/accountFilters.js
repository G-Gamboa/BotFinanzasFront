function sortByName(items = []) {
  return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }))
}

export function getLiquidAccounts(catalogos) {
  return sortByName(catalogos?.accounts?.liquid || [])
}

export function getInvestmentAccounts(catalogos) {
  return sortByName(catalogos?.accounts?.investment || [])
}

export function getIngCategories(catalogos) {
  return sortByName(catalogos?.categories?.ing || [])
}

export function getEgrCategories(catalogos) {
  return sortByName(catalogos?.categories?.egr || [])
}

export function getLoanPeople(catalogos) {
  return sortByName(catalogos?.loan_people || [])
}

export function getDebtPaymentAccounts(catalogos, disponibles) {
  const liquid = getLiquidAccounts(catalogos)
  const balances = new Map((disponibles?.saldos_liquidos || []).map((item) => [item.cuenta, Number(item.saldo || 0)]))

  return liquid
    .filter((item) => (balances.get(item.name) ?? 0) > 0)
    .map((item) => item.name)
}
