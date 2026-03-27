import MovimientoForm from "../components/MovimientoForm";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import LoadingBlock from "../components/LoadingBlock";
import EmptyState from "../components/EmptyState";

export default function DashboardPage({ loading, palette, dashboard, refresh, userId }) {
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
        <StatCard palette={palette} title="Networth" value={money(networthQ)} />
        <StatCard palette={palette} title="Neto" value={money(netoQ)} accent />
        <StatCard palette={palette} title="Deudas activas" value={String(deudasActivas)} />
        <StatCard palette={palette} title="Total deudas" value={money(totalDeudas)} accent />
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
          <SectionCard palette={palette} title="Nuevo movimiento" accent>
            <MovimientoForm
              palette={palette}
              userId={userId}
              catalogos={dashboard?.catalogos || {}}
              onSaved={refresh}
            />
          </SectionCard>

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
                  <span style={{ color: palette.primary, fontWeight: 800 }}>{money(saldo)}</span>
                </div>
              ))}
            </div>
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
                      Saldo: {money(deuda.saldo)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard palette={palette} title="Resumen del mes">
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Row label="Ingresos" value={money(dashboard?.resumen_mes?.ingresos || 0)} palette={palette} />
              <Row label="Egresos" value={money(dashboard?.resumen_mes?.egresos || 0)} palette={palette} />
              <Row label="Balance" value={money(dashboard?.resumen_mes?.balance || 0)} palette={palette} />
            </div>
          </SectionCard>

          <SectionCard palette={palette} title="Resumen semanal">
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Row label="Ingresos" value={money(dashboard?.resumen_semana?.ingresos || 0)} palette={palette} />
              <Row label="Egresos" value={money(dashboard?.resumen_semana?.egresos || 0)} palette={palette} />
              <Row label="Balance" value={money(dashboard?.resumen_semana?.balance || 0)} palette={palette} />
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

function money(value) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}