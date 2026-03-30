const INVESTMENT_KEYS = new Set(["ugly", "binance", "osmo", "hapi"]);
const EXCLUDED_PAYMENT_KEYS = new Set([
  "ugly",
  "binance",
  "osmo",
  "hapi",
  "prestamos",
  "préstamos",
  "ahorro",
]);

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

export function getEgresoMethods() {
  return ["Efectivo", "Transferencia"];
}

export function getTransferAccounts(catalogos) {
  const source =
    (catalogos?.BANCOS && catalogos.BANCOS.length ? catalogos.BANCOS : catalogos?.CUENTAS) || [];

  return source.filter((item) => {
    const key = norm(item);
    return key !== "efectivo" && !EXCLUDED_PAYMENT_KEYS.has(key);
  });
}

export function getDebtPaymentAccounts(catalogos) {
  return (catalogos?.CUENTAS || []).filter((item) => {
    const key = norm(item);
    return !EXCLUDED_PAYMENT_KEYS.has(key);
  });
}

export function isInvestmentAccount(value) {
  return INVESTMENT_KEYS.has(norm(value));
}