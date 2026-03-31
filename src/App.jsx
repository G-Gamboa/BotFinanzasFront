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

function normalizeUserLabel(user) {
  if (!user) return ''
  return user.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : `ID ${user.id}`
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M10.325 4.317a1 1 0 0 1 .95-.69h1.45a1 1 0 0 1 .95.69l.287.883a1 1 0 0 0 .95.69h.93a1 1 0 0 0 .707-.293l.67-.67a1 1 0 0 1 1.414 0l1.025 1.025a1 1 0 0 1 0 1.414l-.67.67a1 1 0 0 0-.293.707v.93a1 1 0 0 0 .69.95l.883.287a1 1 0 0 1 .69.95v1.45a1 1 0 0 1-.69.95l-.883.287a1 1 0 0 0-.69.95v.93a1 1 0 0 0 .293.707l.67.67a1 1 0 0 1 0 1.414l-1.025 1.025a1 1 0 0 1-1.414 0l-.67-.67a1 1 0 0 0-.707-.293h-.93a1 1 0 0 0-.95.69l-.287.883a1 1 0 0 1-.95.69h-1.45a1 1 0 0 1-.95-.69l-.287-.883a1 1 0 0 0-.95-.69h-.93a1 1 0 0 0-.707.293l-.67.67a1 1 0 0 1-1.414 0L3.61 18.684a1 1 0 0 1 0-1.414l.67-.67a1 1 0 0 0 .293-.707v-.93a1 1 0 0 0-.69-.95l-.883-.287a1 1 0 0 1-.69-.95v-1.45a1 1 0 0 1 .69-.95l.883-.287a1 1 0 0 0 .69-.95v-.93a1 1 0 0 0-.293-.707l-.67-.67a1 1 0 0 1 0-1.414L4.635 4.66a1 1 0 0 1 1.414 0l.67.67a1 1 0 0 0 .707.293h.93a1 1 0 0 0 .95-.69l.287-.883Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function App() {
  const { isTelegram, isReady, user, userId: tgUserId } = useTelegramMiniApp()
  const [manualUserId, setManualUserId] = useState('1282471582')
  const [activeTab, setActiveTab] = useState('movimientos')
  const [showConfig, setShowConfig] = useState(false)
  const [showAmounts, setShowAmounts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [catalogos, setCatalogos] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [disponibles, setDisponibles] = useState(null)
  const [deudas, setDeudas] = useState(null)
  const [cuentasAdmin, setCuentasAdmin] = useState(null)
  const [categoriasAdmin, setCategoriasAdmin] = useState(null)

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
      const [healthData, catalogosData, dashboardData, disponiblesData, deudasData, cuentasData, categoriasData] = await Promise.all([
        api.getHealth(),
        api.getCatalogos(userId),
        api.getDashboard(userId),
        api.getDisponibles(userId),
        api.getDeudas(userId),
        api.getCuentas(userId),
        api.getCategoriasAdmin(userId),
      ])

      setHealth(healthData)
      setCatalogos(catalogosData)
      setDashboard(dashboardData)
      setDisponibles(disponiblesData)
      setDeudas(deudasData)
      setCuentasAdmin(cuentasData)
      setCategoriasAdmin(categoriasData)
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

  const currentTitle = showConfig
    ? 'Configuración'
    : activeTab === 'dashboard'
      ? 'Dashboard'
      : activeTab === 'deudas'
        ? 'Deudas'
        : activeTab === 'prestamos'
          ? 'Préstamos'
          : 'Movimientos'

  return (
    <Layout
      title={currentTitle}
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

      {!showConfig ? (
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
              onRefreshData={loadAllData}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage loading={loading} palette={palette} dashboard={dashboard} showAmounts={showAmounts} />
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
      ) : (
        <ConfiguracionPage
          userId={userId}
          api={api}
          cuentas={cuentasAdmin}
          categorias={categoriasAdmin}
          loading={loading}
          onRefreshData={loadAllData}
        />
      )}
    </Layout>
  )
}
