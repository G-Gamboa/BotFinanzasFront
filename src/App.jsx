import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import NavTabs from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import PrestamosPage from './pages/PrestamosPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import { api, getTelegramInitData } from './api/client'
import { createDemoApi } from './api/demoClient'
import {
  demoCatalogos, demoDashboard, demoDisponibles, demoDeudas,
  demoHistorial, demoTcBalances, demoPreferencias,
} from './data/demoData'
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
import GuestBanner from './components/GuestBanner'
import BettingPage from './pages/BettingPage'

const demoApi = createDemoApi({
  catalogos:    demoCatalogos,
  dashboard:    demoDashboard,
  disponibles:  demoDisponibles,
  deudas:       demoDeudas,
  historial:    demoHistorial,
  tcBalances:   demoTcBalances,
  preferencias: demoPreferencias,
})

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

  // Betting tracker (admin-only, reemplaza toda la UI)
  const [showTracker, setShowTracker] = useState(false)

  // Guest / registration state
  const [isGuest, setIsGuest] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [starsPrice, setStarsPrice] = useState(100)

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

      // ── Paso 0: verificar si el usuario está registrado ───────────────────
      // Solo aplica en contexto Telegram (hay initData). En dev, se omite.
      if (getTelegramInitData()) {
        try {
          const status = await api.getRegistrationStatus()
          if (!status.registered) {
            // Modo demo: carga datos ficticios y muestra toda la app
            setIsGuest(true)
            setDaysRemaining(status.days_remaining ?? null)
            setCatalogos(demoCatalogos)
            setDashboard(demoDashboard)
            setDisponibles(demoDisponibles)
            setDeudas(demoDeudas)
            setCuentasAdmin({ items: demoCatalogos.accounts })
            setCategoriasAdmin({ items: demoCatalogos.categories })
            setLoanPeopleAdmin({ items: [] })
            setPreferencias(demoPreferencias)
            setTcBalances(demoTcBalances)
            setInstallmentPlans({ items: [] })
            setLoading(false)
            fetchingRef.current = false
            return
          }
          setIsGuest(false)
          setDaysRemaining(status.days_remaining ?? null)
        } catch {
          // Si falla (ej. error de red), continuar con el flujo normal
        }
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
    setIsGuest(false)
    setDaysRemaining(null)
    setRegisterError('')
  }, [userId])

  async function handleRegister() {
    setRegisterLoading(true)
    setRegisterError('')
    try {
      const { invoice_link, stars_price } = await api.postRegistroInvoice()
      setStarsPrice(stars_price)

      const tg = window?.Telegram?.WebApp
      if (!tg?.openInvoice) {
        // Fallback: open in browser (should not happen inside Telegram)
        window.open(invoice_link, '_blank')
        setRegisterError('Pago abierto en el navegador. Vuelve después de completarlo.')
        return
      }

      tg.openInvoice(invoice_link, (status) => {
        if (status === 'paid') {
          // Payment confirmed by Telegram — reload data (webhook will have created the user)
          setTimeout(() => loadAllData({ invalidateAll: true }), 1500)
        } else if (status === 'cancelled') {
          setRegisterError('Pago cancelado.')
        } else if (status === 'failed') {
          setRegisterError('El pago falló. Intenta de nuevo.')
        }
        setRegisterLoading(false)
      })
    } catch (err) {
      setRegisterError(err.message || 'No se pudo iniciar el pago.')
      setRegisterLoading(false)
    }
  }

  const deudasActivas = useMemo(() => {
    const items = deudas?.items || []
    return items.filter(
      (item) =>
        (item.status || '').toLowerCase() === 'active' &&
        Number(item.pending_installments || 0) > 0
    )
  }, [deudas])

  // ── Betting Tracker: reemplaza toda la interfaz ─────────────────────────
  if (showTracker) {
    return (
      <BettingPage
        api={api}
        onClose={() => setShowTracker(false)}
      />
    )
  }

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

      {/* Aviso de suscripción próxima a vencer (≤ 3 días, usuario registrado) */}
      {!isGuest && daysRemaining !== null && daysRemaining <= 3 ? (
        <div style={{
          background: 'color-mix(in srgb, var(--color-danger, #e53e3e) 12%, var(--card-soft))',
          border: '1.5px solid color-mix(in srgb, var(--color-danger, #e53e3e) 35%, transparent)',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontSize: '0.84rem', lineHeight: 1.4 }}>
            {daysRemaining === 0
              ? '⏰ Tu suscripción vence hoy.'
              : `⏰ Tu suscripción vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}.`}
            {' '}Renueva para no perder el acceso.
          </div>
          <button
            className="primary-btn"
            style={{ fontSize: '0.84rem', padding: '0.5rem' }}
            onClick={handleRegister}
            disabled={registerLoading}
          >
            {registerLoading ? 'Procesando…' : '⭐ Renovar suscripción'}
          </button>
        </div>
      ) : null}

      {/* Banner de modo demo — visible solo para guests, encima de toda la app */}
      {isGuest ? (
        <>
          <GuestBanner
            onRegister={handleRegister}
            loading={registerLoading}
            starsPrice={starsPrice}
          />
          {registerError ? (
            <MessageBanner kind="error">{registerError}</MessageBanner>
          ) : null}
        </>
      ) : null}

      {showConfig && !isGuest ? (
        <ConfiguracionPage
          userId={userId}
          api={api}
          cuentas={cuentasAdmin}
          categorias={categoriasAdmin}
          loanPeople={loanPeopleAdmin}
          deudas={deudas}
          preferencias={preferencias}
          canUsePrestamos={canUsePrestamos}
          canUseTarjetas={canUseTarjetas}
          canPrivate={canPrivate}
          isAdmin={Boolean(catalogos?.user?.is_admin)}
          onRefreshData={() => loadAllData({ invalidateAll: true })}
          onOpenTracker={Boolean(catalogos?.user?.is_admin) ? () => { setShowConfig(false); setShowTracker(true) } : undefined}
        />
      ) : (
        <>
          <NavTabs
            current={activeTab}
            onChange={setActiveTab}
            showPrestamos={canUsePrestamos}
            showTarjetas={canUseTarjetas}
            tabOrder={preferencias?.tab_order}
          />

          {activeTab === 'movimientos' && (
            <MovimientosPage
              userId={userId}
              api={isGuest ? demoApi : api}
              catalogos={catalogos}
              disponibles={disponibles}
              dashboard={dashboard}
              savingsGoals={dashboard?.savings_goals || []}
              onRefreshData={isGuest ? () => {} : () => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'tarjetas' && canUseTarjetas && (
            <TarjetasPage
              userId={userId}
              api={isGuest ? demoApi : api}
              tcBalances={tcBalances?.items || []}
              installmentPlans={installmentPlans?.items || []}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={isGuest ? () => {} : () => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'deudas' && (
            <DeudasPage
              userId={userId}
              api={isGuest ? demoApi : api}
              disponibles={disponibles}
              deudas={deudas}
              onRefreshData={isGuest ? () => {} : () => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              userId={userId}
              api={isGuest ? demoApi : api}
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
              api={isGuest ? demoApi : api}
              categorias={categoriasAdmin}
              catalogos={catalogos}
              disponibles={disponibles}
              tcBalances={tcBalances?.items || []}
              onRefreshData={isGuest ? () => {} : () => loadAllData({ invalidateFinancial: true })}
            />
          )}

          {activeTab === 'prestamos' && canUsePrestamos && (
            <PrestamosPage
              userId={userId}
              api={isGuest ? demoApi : api}
              catalogos={catalogos}
              disponibles={disponibles}
              onRefreshData={isGuest ? () => {} : () => loadAllData({ invalidateFinancial: true })}
            />
          )}
        </>
      )}
    </Layout>
  )
}