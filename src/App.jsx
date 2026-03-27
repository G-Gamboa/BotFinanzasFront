import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import NavTabs from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import PrestamosPage from './pages/PrestamosPage'
import { api } from './api/client'
import { useTelegramMiniApp } from './hooks/useTelegramMiniApp'
import { getPaletteByUser } from './theme'
import { applyTheme } from './theme/applyTheme'


function normalizeUserLabel(user) {
  if (!user) return ''
  return user.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : `ID ${user.id}`
}

export default function App() {
  const { isTelegram, isReady, user, userId: tgUserId } = useTelegramMiniApp()
  const [manualUserId, setManualUserId] = useState('1282471582')
  const [activeTab, setActiveTab] = useState('movimientos')
  const [showAmounts, setShowAmounts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [catalogos, setCatalogos] = useState(null)
  const [dashboard, setDashboard] = useState(null)

  const userId = tgUserId || manualUserId
  const palette = useMemo(() => getPaletteByUser(userId), [userId])
  const userLabel = tgUserId ? normalizeUserLabel(user) : `Prueba manual · ${manualUserId}`

  const canUsePrestamos = String(userId) === "1282471582";

  useEffect(() => {
    applyTheme(palette)
  }, [palette])

  async function loadAllData() {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const [healthData, dashboardData] = await Promise.all([
        api.getHealth(),
        api.getDashboard(userId),
      ])

      setHealth(healthData)
      setCatalogos(dashboardData.catalogos || {})
      setDashboard(dashboardData)
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

  return (
    <Layout
      title="Gestor Finanzas"
      subtitle={isTelegram ? 'Desarrollado Por G&G' : 'Modo web para pruebas y desarrollo'}
      userLabel={userLabel}
      userId={userId}
      actions={
        <>
          <button className="ghost-btn" onClick={() => setShowAmounts((v) => !v)}>
            {showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          </button>
        </>
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
      {health ? <MessageBanner kind="success">API conectada correctamente.</MessageBanner> : null}

      <NavTabs current={activeTab} onChange={setActiveTab} showPrestamos={canUsePrestamos} />

      {activeTab === 'movimientos' && (
        <MovimientosPage
          userId={userId}
          api={api}
          catalogos={catalogos}
          onRefreshData={loadAllData}
        />
      )}

      {activeTab === 'deudas' && (
        <DeudasPage
          userId={userId}
          api={api}
          catalogos={catalogos}
          deudas={dashboard?.deudas || []}
          deudasActivas={dashboard?.deudas_activas || []}
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

      {activeTab === 'prestamos' && canUsePrestamos && (
        <PrestamosPage
          userId={userId}
          api={api}
          catalogos={catalogos}
          onRefreshData={loadAllData}
        />
      )}
    </Layout>
  )
}