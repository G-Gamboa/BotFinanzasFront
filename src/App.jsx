import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import NavTabs from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import { api } from './api/client'
import { useTelegramMiniApp } from './hooks/useTelegramMiniApp'
import { resolvePalette } from './theme/palettes'
import { applyTheme } from './theme/applyTheme'

function normalizeUserLabel(user) {
  if (!user) return ''
  return user.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : `ID ${user.id}`
}

export default function App() {
  const { isTelegram, isReady, user, userId: tgUserId } = useTelegramMiniApp()
  const [manualUserId, setManualUserId] = useState('1282471582')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [catalogos, setCatalogos] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [saldos, setSaldos] = useState(null)
  const [networth, setNetworth] = useState(null)
  const [neto, setNeto] = useState(null)
  const [deudas, setDeudas] = useState(null)
  const [deudasActivas, setDeudasActivas] = useState(null)

  const userId = tgUserId || manualUserId
  const palette = useMemo(() => resolvePalette(userId), [userId])
  const userLabel = tgUserId ? normalizeUserLabel(user) : `Prueba manual · ${manualUserId}`

  useEffect(() => {
    applyTheme(palette)
  }, [palette])

  async function loadAllData() {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const [healthData, catalogosData, resumenData, saldosData, networthData, netoData, deudasData, activasData] = await Promise.all([
        api.getHealth(),
        api.getCatalogos(userId),
        api.getResumen(userId),
        api.getSaldos(userId),
        api.getNetworth(userId),
        api.getNeto(userId),
        api.getDeudas(userId),
        api.getDeudasActivas(userId),
      ])

      setHealth(healthData)
      setCatalogos(catalogosData)
      setResumen(resumenData)
      setSaldos(saldosData)
      setNetworth(networthData)
      setNeto(netoData)
      setDeudas(deudasData)
      setDeudasActivas(activasData)
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
      title="Finanzas"
      subtitle={isTelegram ? 'Mini App conectada a tu bot' : 'Modo web para pruebas y desarrollo'}
      userLabel={userLabel}
      actions={<button className="ghost-btn" onClick={loadAllData}>Recargar</button>}
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

      <NavTabs current={activeTab} onChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <DashboardPage
          loading={loading}
          resumen={resumen}
          saldos={saldos}
          networth={networth}
          neto={neto}
          refresh={loadAllData}
        />
      )}

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
          deudas={deudas}
          deudasActivas={deudasActivas}
          onRefreshData={loadAllData}
        />
      )}
    </Layout>
  )
}
