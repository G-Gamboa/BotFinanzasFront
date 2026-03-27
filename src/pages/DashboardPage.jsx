import { useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import GastosChart from "../components/GastosChart";
import LoadingBlock from "../components/LoadingBlock";
import EmptyState from "../components/EmptyState";

export default function DashboardPage({ loading, palette, dashboard, showAmounts }) {
  const [chartPeriod, setChartPeriod] = useState("mes");

  const chartSource = useMemo(() => {
    if (chartPeriod === "dia") return dashboard?.resumen_dia || {};
    if (chartPeriod === "semana") return dashboard?.resumen_semana || {};
    return dashboard?.resumen_mes || {};
  }, [chartPeriod, dashboard]);

  if (loading) {
    return <LoadingBlock text="Cargando dashboard..." />;
  }

  if (!dashboard) {
    return <EmptyState text="No hay datos para mostrar." />;
  }

  const networthQ = dashboard?.networth?.networth_q ?? 0;
  const netoQ = dashboard?.neto?.neto_q ?? 0;
  const totalDeudas = dashboard?.total_deudas ?? 0;
  const deudasActivas = dashboard?.deudas_activas?.length ?? 0;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        }}
      >
        <StatCard palette={palette} title="Networth" value={money(networthQ, showAmounts)} />
        <StatCard palette={palette} title="Neto" value={money(netoQ, showAmounts)} accent />
        <StatCard palette={palette} title="Deudas activas" value={String(deudasActivas)} />
        <StatCard palette={palette} title="Total deudas" value={money(totalDeudas, showAmounts)} accent />
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionCard palette={palette} title="Saldos por cuenta">
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {Object.entries(dashboard?.saldos || {}).map(([cuenta, saldo]) => (
                <div
                  key={cuenta}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.85rem 1rem",
                    borderRadius: "1rem",
                    border: `1px solid ${palette.borderSoft || palette.border}`,
                    background: palette.cardSoft,
                  }}
                >
                  <span style={{ color: palette.text, fontWeight: 700 }}>{cuenta}</span>
                  <span style={{ color: palette.primary, fontWeight: 800 }}>
                    Q {Number(saldo || 0).toLocaleString("es-GT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Gastos por categoría" accent>
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {["dia", "semana", "mes"].map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  style={{
                    padding: "0.65rem 0.9rem",
                    borderRadius: "999px",
                    border: `1px solid ${chartPeriod === period ? palette.primary : palette.border}`,
                    background: chartPeriod === period ? palette.primary : palette.cardSoft,
                    color: chartPeriod === period ? "#fff" : palette.text,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {period === "dia" ? "Día" : period === "semana" ? "Semana" : "Mes"}
                </button>
              ))}
            </div>

            <GastosChart palette={palette} data={chartSource?.gastos_por_categoria || {}} />
          </SectionCard>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionCard palette={palette} title="Deudas activas" accent>
            {(dashboard?.deudas_activas || []).length === 0 ? (
              <div style={{ color: palette.textSoft }}>No tienes deudas activas.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.8rem" }}>
                {dashboard.deudas_activas.map((deuda) => (
                  <div
                    key={deuda.row}
                    style={{
                      background: palette.cardSoft,
                      border: `1px solid ${palette.borderSoft || palette.border}`,
                      borderRadius: "1rem",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: palette.text }}>
                      {deuda.nombre}
                    </div>
                    <div style={{ fontSize: "0.92rem", color: palette.textSoft, marginTop: "0.2rem" }}>
                      {deuda.acreedor}
                    </div>
                    <div style={{ marginTop: "0.55rem", color: palette.primary, fontWeight: 800 }}>
                      Saldo: Q {Number(deuda.saldo || 0).toLocaleString("es-GT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard palette={palette} title="Resumen del mes">
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Row label="Ingresos" value={moneyVisible(dashboard?.resumen_mes?.ingresos || 0)} palette={palette} />
              <Row label="Egresos" value={moneyVisible(dashboard?.resumen_mes?.egresos || 0)} palette={palette} />
              <Row label="Balance" value={moneyVisible(dashboard?.resumen_mes?.balance || 0)} palette={palette} />
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Resumen semanal">
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Row label="Ingresos" value={moneyVisible(dashboard?.resumen_semana?.ingresos || 0)} palette={palette} />
              <Row label="Egresos" value={moneyVisible(dashboard?.resumen_semana?.egresos || 0)} palette={palette} />
              <Row label="Balance" value={moneyVisible(dashboard?.resumen_semana?.balance || 0)} palette={palette} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, palette }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0.75rem 0.9rem",
        borderRadius: "0.9rem",
        background: palette.cardSoft,
        border: `1px solid ${palette.borderSoft || palette.border}`,
      }}
    >
      <span style={{ color: palette.textSoft, fontWeight: 700 }}>{label}</span>
      <span style={{ color: palette.text, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function money(value, visible) {
  if (!visible) return "Q ••••••";
  return moneyVisible(value);
}

function moneyVisible(value) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}