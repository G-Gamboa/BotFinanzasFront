import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import NavTabs from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import PrestamosPage from './pages/PrestamosPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import { api } from './api/client'
import {
  cacheSet,
  cacheReadAll,
  cacheInvalidateAll,
  cacheInvalidateFinancial,
} from './lib/cache'
import { useTelegramMiniApp } from './hooks/useTelegramMiniApp'
import { getPaletteByKey } from './theme'
import { applyTheme } from './theme/applyTheme'
import HistorialPage from './pages/HistorialPage'
import TarjetasPage from './pages/TarjetasPage'

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

  const [manualUserId, setManualUserId] = useState(import.meta.env.VITE_DEV_USER_ID || '')
  const [activeTab, setActiveTab] = useState('movimientos')
  const [showConfig, setShowConfig] = useState(false)
  const [showAmounts, setShowAmounts] = useState(false)
  const [prefsApplied, setPrefsApplied] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)

  // Evita lanzar dos revalidaciones simultáneas (ej. visibilitychange + mount)
  const fetchingRef = useRef(false)
  // Timestamp de la última vez que se trajo data fresca del servidor
  const lastFetchRef = useRef(0)

  const [catalogos, setCatalogos] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [disponibles, setDisponibles] = useState(null)
  const [deudas, setDeudas] = useState(null)
  const [cuentasAdmin, setCuentasAdmin] = useState(null)
  const [categoriasAdmin, setCategoriasAdmin] = useState(null)
  const [loanPeopleAdmin, setLoanPeopleAdmin] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [tcBalances, setTcBalances] = useState(null)
  const [installmentPlans, setInstallmentPlans] = useState(null)
  const [autoChargesNotice, setAutoChargesNotice] = useState('')

  const userId = tgUserId || manualUserId
  const canPrivate = Boolean(catalogos?.user?.can_use_private_palettes)
  const palette = useMemo(
    () => getPaletteByKey(preferencias?.theme_key, canPrivate),
    [preferencias?.theme_key, canPrivate]
  )

  const userLabel = tgUserId ? normalizeUserLabel(user) : `Prueba manual · ${manualUserId}`
  const canUsePrestamos = Boolean(catalogos?.user?.can_use_loans)
  const canUseTarjetas  = (tcBalances?.items?.length ?? 0) > 0

  useEffect(() => {
    applyTheme(palette)
  }, [palette])

  const loadAllData = useCallback(
    async ({ invalidateFinancial = false, invalidateAll = false } = {}) => {
      if (!userId) return
      if (fetchingRef.current) return

      // Invalida caché según el tipo de mutación antes de aplicar el stale
      if (invalidateAll) cacheInvalidateAll(userId)
      else if (invalidateFinancial) cacheInvalidateFinancial(userId)

      // ── Paso 1: mostrar datos cacheados al instante ────────────────────────
      const cached = cacheReadAll(userId)
      const hasCached = Object.values(cached).some((v) => v !== null)

      if (hasCached) {
        if (cached.catalogos)        setCatalogos(cached.catalogos)
        if (cached.dashboard)        setDashboard(cached.dashboard)
        if (cached.disponibles)      setDisponibles(cached.disponibles)
        if (cached.deudas)           setDeudas(cached.deudas)
        if (cached.cuentas)          setCuentasAdmin(cached.cuentas)
        if (cached.categorias)       setCategoriasAdmin(cached.categorias)
        if (cached.loanPeople)       setLoanPeopleAdmin(cached.loanPeople)
        if (cached.preferencias)     setPreferencias(cached.preferencias)
        if (cached.tcBalances)       setTcBalances(cached.tcBalances)
        if (cached.installmentPlans) setInstallmentPlans(cached.installmentPlans)
      }

      // Solo muestra spinner si no hay nada en caché (primera vez)
      if (!hasCached) setLoading(true)
      setError('')
      fetchingRef.current = true

      // ── Paso 2: traer datos frescos en segundo plano ───────────────────────
      try {
        const [
          healthData,
          catalogosData,
          dashboardData,
          disponiblesData,
          deudasData,
          cuentasData,
          categoriasData,
          loanPeopleData,
          preferenciasData,
          tcBalancesData,
          installmentPlansData,
        ] = await Promise.all([
          api.getHealth(),
          api.getCatalogos(userId),
          api.getDashboard(userId),
          api.getDisponibles(userId),
          api.getDeudas(userId),
          api.getCuentas(userId),
          api.getCategoriasAdmin(userId),
          api.getLoanPeopleAdmin(userId),
          api.getPreferencias(userId),
          api.getTCBalances(userId),
          api.getInstallmentPlans(userId),
        ])

        setHealth(healthData)
        setCatalogos(catalogosData)
        setDashboard(dashboardData)
        setDisponibles(disponiblesData)
        setDeudas(deudasData)
        setCuentasAdmin(cuentasData)
        setCategoriasAdmin(categoriasData)
        setLoanPeopleAdmin(loanPeopleData)
        setPreferencias(preferenciasData)
        setTcBalances(tcBalancesData)
        setInstallmentPlans(installmentPlansData)

        lastFetchRef.current = Date.now()

        // ── Paso 3: persistir datos frescos al caché ─────────────────────────
        cacheSet('catalogos',        userId, catalogosData)
        cacheSet('dashboard',        userId, dashboardData)
        cacheSet('disponibles',      userId, disponiblesData)
        cacheSet('deudas',           userId, deudasData)
        cacheSet('cuentas',          userId, cuentasData)
        cacheSet('categorias',       userId, categoriasData)
        cacheSet('loanPeople',       userId, loanPeopleData)
        cacheSet('preferencias',     userId, preferenciasData)
        cacheSet('tcBalances',       userId, tcBalancesData)
        cacheSet('installmentPlans', userId, installmentPlansData)

        // ── Paso 4: generar cargos automáticos de visacuotas vencidos ────────
        try {
          const pendingResult = await api.processPendingCharges(userId)
          if (pendingResult?.total_created > 0) {
            setAutoChargesNotice(
              `${pendingResult.total_created} cargo(s) de Visacuotas generados automáticamente.`
            )
            // Actualizar planes y balances TC tras auto-cargo
            const [freshPlans, freshTC] = await Promise.all([
              api.getInstallmentPlans(userId),
              api.getTCBalances(userId),
            ])
            setInstallmentPlans(freshPlans)
            setTcBalances(freshTC)
            cacheSet('installmentPlans', userId, freshPlans)
            cacheSet('tcBalances',       userId, freshTC)
          }
        } catch {
          // Silencioso: el auto-cargo no bloquea la carga principal
        }
      } catch (err) {
        // Si había caché, el usuario ya tiene datos; no mostrar error en pantalla
        if (!hasCached) setError(err.message || 'No pude cargar la información.')
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    },
    [userId]
  )

  useEffect(() => {
    if (!isReady) return
    loadAllData()
  }, [isReady, userId])

  // Revalidar cuando el usuario vuelve a la app (Telegram Mini App backgrounded)
  // Mínimo 60 s entre revalidaciones silenciosas para no saturar la API.
  useEffect(() => {
    if (!isReady || !userId) return

    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const secondsSinceFetch = (Date.now() - lastFetchRef.current) / 1000
      if (secondsSinceFetch > 60) {
        loadAllData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isReady, userId, loadAllData])

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
    return items.filter(
      (item) =>
        (item.status || '').toLowerCase() === 'active' &&
        Number(item.pending_installments || 0) > 0
    )
  }, [deudas])

  return (
    <Layout
      title="Gestor Finanzas"
      subtitle={isTelegram ? 'Desarrollado por G&G' : 'Modo web para pruebas y desarrollo'}
      userLabel={userLabel}
      palette={palette}
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
            <button className="primary-btn" onClick={() => loadAllData({ invalidateAll: true })}>Cargar</button>
          </div>
        </section>
      )}

      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      {autoChargesNotice ? (
        <MessageBanner kind="success">{autoChargesNotice}</MessageBanner>
      ) : null}
      {!loading && health && health.ok === false ? (
        <MessageBanner kind="error">La API no respondió correctamente.</MessageBanner>
      ) : null}

      {showConfig ? (
        <ConfiguracionPage
          userId={userId}
          api={api}
          cuentas={cuentasAdmin}
          categorias={categoriasAdmin}
          loanPeople={loanPeopleAdmin}
          deudas={deudas}
          preferencias={preferencias}
          canUsePrestamos={canUsePrestamos}
          canPrivate={canPrivate}
          isAdmin={Boolean(catalogos?.user?.is_admin)}
          onRefreshData={() => loadAllData({ invalidateAll: true })}
        />
      ) : (
        <>
          <NavTabs
            current={activeTab}
            onChange={setActiveTab}
            showPrestamos={canUsePrestamos}
            showTarjetas={canUseTarjetas}
          />

          {activeTab === 'movimientos' && (
            <MovimientosPage
              userId={userId}
              api={api}
              catalogos={catalogos}
              disponibles={disponibles}
              dashboard={dashboard}
              savingsGoals={dashboard?.savings_goals || []}
              onRefreshData={() => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'tarjetas' && canUseTarjetas && (
            <TarjetasPage
              userId={userId}
              api={api}
              tcBalances={tcBalances?.items || []}
              installmentPlans={installmentPlans?.items || []}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={() => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'deudas' && (
            <DeudasPage
              userId={userId}
              api={api}
              disponibles={disponibles}
              deudas={deudas}
              onRefreshData={() => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              userId={userId}
              api={api}
              loading={loading}
              palette={palette}
              dashboard={dashboard}
              showAmounts={showAmounts}
              tcBalances={tcBalances?.items || []}
            />
          )}

          {activeTab === 'historial' && (
            <HistorialPage
              userId={userId}
              api={api}
              categorias={categoriasAdmin}
              catalogos={catalogos}
              disponibles={disponibles}
              tcBalances={tcBalances?.items || []}
              onRefreshData={() => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'prestamos' && canUsePrestamos && (
            <PrestamosPage
              userId={userId}
              api={api}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={() => loadAllData({ invalidateFinancial: true })}
            />
          )}
        </>
      )}
    </Layout>
  )
}