import { useMemo, useState } from "react";
import { api } from "../api/client";
import { getGuatemalaDateString } from "../utils/dates";

export default function MovimientoForm({ palette, userId, catalogos, onSaved }) {
  const [tipo, setTipo] = useState("EGR");
  const [fecha, setFecha] = useState(getGuatemalaDateString());
  const [fuente, setFuente] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const [banco, setBanco] = useState("");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const categorias = useMemo(() => {
    if (tipo === "ING") return catalogos?.CATEG_ING || [];
    if (tipo === "EGR") return catalogos?.CATEG_EGR || [];
    return [];
  }, [tipo, catalogos]);

  const metodos = useMemo(() => {
    if (tipo === "EGR") return ["Efectivo", "Transferencia"];
    return catalogos?.METODOS || [];
  }, [tipo, catalogos]);

  const bancos = useMemo(() => catalogos?.BANCOS || [], [catalogos]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      setLoading(true);

      const payload = {
        user_id: Number(userId),
        tipo,
        fecha,
        fuente: tipo === "ING" ? fuente : "",
        categoria,
        monto: Number(monto),
        metodo,
        banco: metodo === "Transferencia" ? banco : "",
        nota,
      };

      await api.postMovimiento(payload);
      setMsg("Guardado correctamente.");
      setMonto("");
      setNota("");
      setBanco("");

      if (onSaved) onSaved();
    } catch (error) {
      setMsg(error.message || "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "0.9rem",
      }}
    >
      <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle(palette)}>
          <option value="EGR">Egreso</option>
          <option value="ING">Ingreso</option>
        </select>

        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle(palette)} />

        {tipo === "ING" ? (
          <select value={fuente} onChange={(e) => setFuente(e.target.value)} style={inputStyle(palette)}>
            <option value="">Fuente</option>
            {(catalogos?.FUENTES_ING || []).map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        ) : null}

        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle(palette)}>
          <option value="">Categoría</option>
          {categorias.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          style={inputStyle(palette)}
        />

        <select value={metodo} onChange={(e) => setMetodo(e.target.value)} style={inputStyle(palette)}>
          <option value="">Método</option>
          {metodos.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>

        {metodo === "Transferencia" ? (
          <select value={banco} onChange={(e) => setBanco(e.target.value)} style={inputStyle(palette)}>
            <option value="">Banco</option>
            {bancos.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        ) : null}

        <input
          type="text"
          placeholder="Nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          style={inputStyle(palette)}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={loading} style={buttonStyle(palette)}>
          {loading ? "Guardando..." : "Guardar movimiento"}
        </button>

        {msg ? (
          <span style={{ color: msg.toLowerCase().includes("correctamente") ? palette.success : palette.danger, fontWeight: 700 }}>
            {msg}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function inputStyle(palette) {
  return {
    width: "100%",
    border: `1px solid ${palette.border}`,
    background: palette.surface,
    color: palette.text,
    borderRadius: "1rem",
    padding: "0.85rem 1rem",
    outline: "none",
  };
}

function buttonStyle(palette) {
  return {
    background: palette.primary,
    color: "#fff",
    border: "none",
    borderRadius: "1rem",
    padding: "0.9rem 1rem",
    fontWeight: 700,
    cursor: "pointer",
  };
}