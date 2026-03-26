
import { useMemo, useState } from "react";
import { fetchDeudas, fetchHealth, fetchNetworth, fetchResumen, fetchSaldos } from "./api/client";

const TABS = ["health", "resumen", "saldos", "networth", "deudas"];

export default function App() {
  const [userId, setUserId] = useState("1282471582");
  const [tab, setTab] = useState("health");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    const labels = {
      health: "Health",
      resumen: "Resumen",
      saldos: "Saldos",
      networth: "Networth",
      deudas: "Deudas",
    };
    return labels[tab] ?? "Dashboard";
  }, [tab]);

  async function runFetch(nextTab = tab) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      let result;
      if (nextTab === "health") result = await fetchHealth();
      if (nextTab === "resumen") result = await fetchResumen(userId);
      if (nextTab === "saldos") result = await fetchSaldos(userId);
      if (nextTab === "networth") result = await fetchNetworth(userId);
      if (nextTab === "deudas") result = await fetchDeudas(userId);
      setData(result);
    } catch (err) {
      setError(err.message || "Error consultando la API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Bot Finanzas Front</h1>
        <p className="muted">Base mínima para GitHub Pages conectada a la API.</p>

        <div className="row">
          <label htmlFor="userId">User ID</label>
          <input
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Telegram user id"
          />
        </div>

        <div className="tabs">
          {TABS.map((item) => (
            <button
              key={item}
              className={tab === item ? "tab active" : "tab"}
              onClick={() => {
                setTab(item);
                void runFetch(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="actions">
          <button onClick={() => void runFetch(tab)}>Consultar {title}</button>
        </div>

        {loading && <p>Cargando...</p>}
        {error && <p className="error">{error}</p>}

        <pre className="output">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
