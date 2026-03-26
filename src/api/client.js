
const API_URL = import.meta.env.VITE_API_URL;

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

export function fetchHealth() {
  return getJson("/health");
}

export function fetchResumen(userId) {
  return getJson(`/resumen/${userId}`);
}

export function fetchSaldos(userId) {
  return getJson(`/saldos/${userId}`);
}

export function fetchNetworth(userId) {
  return getJson(`/networth/${userId}`);
}

export function fetchDeudas(userId) {
  return getJson(`/deudas/${userId}`);
}
