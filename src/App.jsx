import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import NavTabs from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import PrestamosPage from './pages/PrestamosPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import { api } from './api/client'
import { useTelegramMiniApp } from './hooks/useTelegramMiniApp'
import { getPaletteByUser } from './theme'
import { applyTheme } from './theme/applyTheme'
import HistorialPage from './pages/HistorialPage'

function normalizeUserLabel(user) {
  if (!user) return ''
  return user.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : `ID ${user.id}`
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8.75A3.25 3.25 0 1 0 12 15.25A3.25 3.25 0 1 0 12 8.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 15a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 0 1 0 1.7l-1.1 1.1a1.2 1.2 0 0 1-1.7 0l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.91V20a1.2 1.2 0 0 1-1.2 1.2h-1.6A1.2 1.2 0 0 1 10 20v-.06a1 1 0 0 0-.6-.91 1 1 0 0 0-1.1.2l-.04.04a1.2 1.2 0 0 1-1.7 0l-1.1-1.1a1.2 1.2 0 0 1 0-1.7l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.91-.6H4A1.2 1.2 0 0 1 2.8 13.5v-1.6A1.2 1.2 0 0 1 4 10.7h.06a1 1 0 0 0 .91-.6 1 1 0 0 0-.2-1.1l-.04-.04a1.2 1.2 0 0 1 0-1.7l1.1-1.1a1.2 1.2 0 0 1 1.7 0l.04.04a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.91V4A1.2 1.2 0 0 1 10.5 2.8h1.6A1.2 1.2 0 0 1 13.3 4v.06a1 1 0 0 0 .6.91 1 1 0 0 0 1.1-.2l.04-.04a1.2 1.2 0 0 1 1.7 0l1.1 1.1a1.2 1.2 0 0 1 0 1.7l-.04.04a1 1 0 0 0-.2 1.1 1 1 0 0 0 .91.6H20a1.2 1.2 0 0 1 1.2 1.2v1.6A1.2 1.2 0 0 1 20 14.3h-.06a1 1 0 0 0-.91.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const { isTelegram, isReady, user, userId: tgUserId } = useTelegramMiniApp()

  const [manualUserId, setManualUserId] = useState('1282471582')
  const [activeTab, setActiveTab] = useState('movimientos')
  const [showConfig, setShowConfig] = useState(false)
  const [showAmounts, setShowAmounts] = useState(false)
  const [prefsApplied, setPrefsApplied] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)

  const [catalogos, setCatalogos] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [disponibles, setDisponibles] = useState(null)
  const [deudas, setDeudas] = useState(null)
  const [cuentasAdmin, setCuentasAdmin] = useState(null)
  const [categoriasAdmin, setCategoriasAdmin] = useState(null)
  const [preferencias, setPreferencias] = useState(null)

  const userId = tgUserId || manualUserId
  const palette = useMemo(() => getPaletteByUser(userId), [userId])
  const userLabel = tgUserId ? normalizeUserLabel(user) : `Prueba manual · ${manualUserId}`
  const canUsePrestamos = Boolean(catalogos?.user?.can_use_loans)

  useEffect(() => {
    applyTheme(palette)
  }, [palette])

  async function loadAllData() {
    if (!userId) return
    setLoading(true)
    setError('')

    try {
      const [
        healthData,
        catalogosData,
        dashboardData,
        disponiblesData,
        deudasData,
        cuentasData,
        categoriasData,
        preferenciasData,
      ] = await Promise.all([
        api.getHealth(),
        api.getCatalogos(userId),
        api.getDashboard(userId),
        api.getDisponibles(userId),
        api.getDeudas(userId),
        api.getCuentas(userId),
        api.getCategoriasAdmin(userId),
        api.getPreferencias(userId),
      ])

      setHealth(healthData)
      setCatalogos(catalogosData)
      setDashboard(dashboardData)
      setDisponibles(disponiblesData)
      setDeudas(deudasData)
      setCuentasAdmin(cuentasData)
      setCategoriasAdmin(categoriasData)
      setPreferencias(preferenciasData)
    } catch (err) {
      setError(err.message || 'No pude cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isReady) return
    loadAllData()
  }, [isReady, userId])

  useEffect(() => {
    if (!preferencias || prefsApplied) return

    setShowAmounts(Boolean(preferencias.show_amounts_default))

    const prefTab = preferencias.default_tab || 'movimientos'
    const safeTab = prefTab === 'prestamos' && !canUsePrestamos ? 'movimientos' : prefTab
    setActiveTab(safeTab)

    setPrefsApplied(true)
  }, [preferencias, prefsApplied, canUsePrestamos])

  useEffect(() => {
    setPrefsApplied(false)
  }, [userId])

  const deudasActivas = useMemo(() => {
    const items = deudas?.items || []
    return items.filter((item) => (item.status || '').toLowerCase() === 'active' && Number(item.pending_installments || 0) > 0)
  }, [deudas])

  return (
    <Layout
      title="Gestor Finanzas"
      subtitle={isTelegram ? 'Desarrollado por G&G' : 'Modo web para pruebas y desarrollo'}
      userLabel={userLabel}
      userId={userId}
      actions={
        <div className="header-actions">
          <button className="ghost-btn" onClick={() => setShowAmounts((v) => !v)}>
            {showAmounts ? 'Ocultar' : 'Ver montos'}
          </button>

          <button
            className={`icon-btn${showConfig ? ' active' : ''}`}
            onClick={() => setShowConfig((v) => !v)}
            title="Configuración"
            aria-label="Configuración"
          >
            <GearIcon />
          </button>
        </div>
      }
    >
      {!isTelegram && (
        <section className="panel compact-panel">
          <div className="manual-user-row">
            <label>
              <span>User ID</span>
              <input value={manualUserId} onChange={(e) => setManualUserId(e.target.value)} />
            </label>
            <button className="primary-btn" onClick={loadAllData}>Cargar</button>
          </div>
        </section>
      )}

      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      {!loading && health && health.ok === false ? (
        <MessageBanner kind="error">La API no respondió correctamente.</MessageBanner>
      ) : null}

      {showConfig ? (
        <ConfiguracionPage
          userId={userId}
          api={api}
          cuentas={cuentasAdmin}
          categorias={categoriasAdmin}
          preferencias={preferencias}
          canUsePrestamos={canUsePrestamos}
          onRefreshData={loadAllData}
        />
      ) : (
        <>
          <NavTabs current={activeTab} onChange={setActiveTab} showPrestamos={canUsePrestamos} />

          {activeTab === 'movimientos' && (
            <MovimientosPage
              userId={userId}
              api={api}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={loadAllData}
            />
          )}

          {activeTab === 'deudas' && (
            <DeudasPage
              userId={userId}
              api={api}
              catalogos={catalogos}
              disponibles={disponibles}
              deudas={deudas}
              deudasActivas={deudasActivas}
              onRefreshData={loadAllData}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              loading={loading}
              palette={palette}
              dashboard={dashboard}
              showAmounts={showAmounts}
            />
          )}

          {activeTab === 'historial' && (
  <HistorialPage
    userId={userId}
    api={api}
  />
)}

          {activeTab === 'prestamos' && canUsePrestamos && (
            <PrestamosPage
              userId={userId}
              api={api}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={loadAllData}
            />
          )}
        </>
      )}
    </Layout>
  )
}