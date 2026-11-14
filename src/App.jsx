import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import NavTabs, { buildTabs } from './components/NavTabs'
import MessageBanner from './components/MessageBanner'
import Icon from './components/Icons'
import GuestBanner from './components/GuestBanner'
import DashboardPage from './pages/DashboardPage'
import MovimientosPage from './pages/MovimientosPage'
import DeudasPage from './pages/DeudasPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import HistorialPage from './pages/HistorialPage'
import TarjetasPage from './pages/TarjetasPage'
import PresupuestoPage from './pages/PresupuestoPage'
import CalendarioPage from './pages/CalendarioPage'
import BirthdayPage from './pages/BirthdayPage'
import { api } from './api/client'
import { createDemoApi } from './api/demoClient'
import {
  demoCatalogos, demoDashboard, demoDisponibles, demoDeudas,
  demoHistorial, demoTcBalances, demoPreferencias,
} from './data/demoData'
import { cacheReadBoot, cacheWriteBoot } from './lib/cache'
import { useTelegramMiniApp } from './hooks/useTelegramMiniApp'
import { useWebSocket } from './hooks/useWebSocket'
import { getTelegramInitData } from './api/client'
import { getPaletteByKey } from './theme'
import { applyTheme } from './theme/applyTheme'

const demoApi = createDemoApi({
  catalogos:    demoCatalogos,
  dashboard:    demoDashboard,
  disponibles:  demoDisponibles,
  deudas:       demoDeudas,
  historial:    demoHistorial,
  tcBalances:   demoTcBalances,
  preferencias: demoPreferencias,
})

const demoBoot = {
  catalogos:        demoCatalogos,
  dashboard:        demoDashboard,
  disponibles:      demoDisponibles,
  deudas:           demoDeudas,
  cuentas:          { items: demoCatalogos.accounts },
  categorias:       { items: demoCatalogos.categories },
  loanPeople:       { items: [] },
  preferencias:     demoPreferencias,
  tcBalances:       demoTcBalances,
  installmentPlans: { items: [] },
  presupuesto:      { items: [] },
  calendario:       null,
}

// Única cuenta que ve la pestaña con los mensajes de cumpleaños
const BIRTHDAY_USER_ID = '5592032215'

// Pestañas que cambiaron de nombre o se fusionaron
const TAB_ALIASES = { prestamos: 'deudas', vault: 'movimientos' }

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

  const [isGuest, setIsGuest] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [starsPrice, setStarsPrice] = useState(100)

  const [boot, setBoot] = useState(null)
  const [autoChargesNotice, setAutoChargesNotice] = useState('')

  const fetchingRef = useRef(false)
  const pendingRef = useRef(false)
  const hasDataRef = useRef(false)
  const lastFetchRef = useRef(0)

  const userId = tgUserId || manualUserId

  const catalogos        = boot?.catalogos || null
  const dashboard        = boot?.dashboard || null
  const disponibles      = boot?.disponibles || null
  const deudas           = boot?.deudas || null
  const preferencias     = boot?.preferencias || null
  const tcBalances       = boot?.tcBalances || null
  const installmentPlans = boot?.installmentPlans || null

  const canPrivate = Boolean(catalogos?.user?.can_use_private_palettes)
  const palette = useMemo(
    () => getPaletteByKey(preferencias?.theme_key, canPrivate),
    [preferencias?.theme_key, canPrivate]
  )

  const userLabel = tgUserId ? normalizeUserLabel(user) : `Prueba manual · ${manualUserId}`
  const canUsePrestamos   = Boolean(catalogos?.user?.can_use_loans)
  const canUseTarjetas    = (tcBalances?.items?.length ?? 0) > 0
  const canUsePresupuesto = !isGuest
  const canUseCalendario  = !isGuest
  const showCumple        = String(userId) === BIRTHDAY_USER_ID

  const tabs = useMemo(
    () => buildTabs({
      showCalendario: canUseCalendario,
      showTarjetas: canUseTarjetas,
      showPresupuesto: canUsePresupuesto,
      showCumple,
      tabOrder: preferencias?.tab_order,
    }),
    [canUseCalendario, canUseTarjetas, canUsePresupuesto, showCumple, preferencias?.tab_order]
  )

  useEffect(() => {
    applyTheme(palette)
  }, [palette])

  const loadAllData = useCallback(async () => {
    if (!userId) return
    if (fetchingRef.current) {
      // Hay una carga en curso que pudo empezar antes del cambio: se repite al terminar.
      pendingRef.current = true
      return
    }
    fetchingRef.current = true

    if (!hasDataRef.current) {
      const cached = cacheReadBoot(userId)
      if (cached) {
        setBoot(cached)
        hasDataRef.current = true
      } else {
        setLoading(true)
      }
    }
    setError('')

    try {
      const fresh = await api.getBootstrap(userId)

      if (!fresh.registered) {
        setIsGuest(true)
        setDaysRemaining(fresh.days_remaining ?? null)
        setBoot(demoBoot)
        hasDataRef.current = true
        return
      }

      setIsGuest(false)
      setDaysRemaining(fresh.days_remaining ?? null)
      setBoot(fresh)
      hasDataRef.current = true
      cacheWriteBoot(userId, fresh)
      lastFetchRef.current = Date.now()

      if (fresh.auto_charges > 0) {
        setAutoChargesNotice(`${fresh.auto_charges} cargo(s) de Visacuotas generados automáticamente.`)
      }
    } catch (err) {
      // Con datos en pantalla, un fallo de red no debe taparlos con un error
      if (!hasDataRef.current) setError(err.message || 'No pude cargar la información.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        loadAllData()
      }
    }
  }, [userId])

  useEffect(() => {
    if (!isReady) return
    loadAllData()
  }, [isReady, userId])

  // Revalidar al volver a la app, con un mínimo de 60 s entre cargas silenciosas
  useEffect(() => {
    if (!isReady || !userId) return

    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      if ((Date.now() - lastFetchRef.current) / 1000 > 60) loadAllData()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isReady, userId, loadAllData])

  const wsInitData = getTelegramInitData()
  useWebSocket(
    isGuest ? null : userId,
    wsInitData || null,
    useCallback((msg) => {
      if (msg?.event === 'invalidate') loadAllData()
    }, [loadAllData]),
  )

  useEffect(() => {
    if (!preferencias || prefsApplied) return

    setShowAmounts(Boolean(preferencias.show_amounts_default))
    const prefTab = preferencias.default_tab || 'movimientos'
    setActiveTab(TAB_ALIASES[prefTab] || prefTab)
    setPrefsApplied(true)
  }, [preferencias, prefsApplied])

  // Si la pestaña activa deja de existir (ej. sin tarjetas), vuelve a la primera
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.key === activeTab)) setActiveTab(tabs[0].key)
  }, [tabs, activeTab])

  useEffect(() => {
    setPrefsApplied(false)
    setIsGuest(false)
    setDaysRemaining(null)
    setRegisterError('')
    setBoot(null)
    hasDataRef.current = false
  }, [userId])

  async function handleRegister() {
    setRegisterLoading(true)
    setRegisterError('')
    try {
      const { invoice_link, stars_price } = await api.postRegistroInvoice()
      setStarsPrice(stars_price)

      const tg = window?.Telegram?.WebApp
      if (!tg?.openInvoice) {
        window.open(invoice_link, '_blank')
        setRegisterError('Pago abierto en el navegador. Vuelve después de completarlo.')
        return
      }

      tg.openInvoice(invoice_link, (status) => {
        if (status === 'paid') {
          // El webhook crea al usuario; se espera un momento antes de recargar
          setTimeout(() => loadAllData(), 1500)
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

  const pageApi = isGuest ? demoApi : api
  const refresh = isGuest ? () => {} : loadAllData

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
            <button className="primary-btn" onClick={() => loadAllData()}>Cargar</button>
          </div>
        </section>
      )}

      {error ? <MessageBanner kind="error">{error}</MessageBanner> : null}
      {autoChargesNotice ? <MessageBanner kind="success">{autoChargesNotice}</MessageBanner> : null}

      {!isGuest && daysRemaining !== null && daysRemaining <= 3 ? (
        <div className="notice notice-danger">
          <div className="notice-text">
            <Icon name="clock" size={18} />
            <span>
              {daysRemaining === 0
                ? 'Tu suscripción vence hoy.'
                : `Tu suscripción vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}.`}
              {' '}Renueva para no perder el acceso.
            </span>
          </div>
          <button className="primary-btn" onClick={handleRegister} disabled={registerLoading}>
            {registerLoading ? 'Procesando…' : 'Renovar suscripción'}
          </button>
        </div>
      ) : null}

      {isGuest ? (
        <>
          <GuestBanner onRegister={handleRegister} loading={registerLoading} starsPrice={starsPrice} />
          {registerError ? <MessageBanner kind="error">{registerError}</MessageBanner> : null}
        </>
      ) : null}

      {showConfig && !isGuest ? (
        <ConfiguracionPage
          userId={userId}
          api={api}
          cuentas={boot?.cuentas}
          categorias={boot?.categorias}
          loanPeople={boot?.loanPeople}
          deudas={deudas}
          preferencias={preferencias}
          canUsePrestamos={canUsePrestamos}
          canUseTarjetas={canUseTarjetas}
          canPrivate={canPrivate}
          isAdmin={Boolean(catalogos?.user?.is_admin)}
          onRefreshData={loadAllData}
        />
      ) : (
        <>
          <NavTabs tabs={tabs} current={activeTab} onChange={setActiveTab} />

          {activeTab === 'movimientos' && (
            <MovimientosPage
              userId={userId}
              api={pageApi}
              catalogos={catalogos}
              disponibles={disponibles}
              dashboard={dashboard}
              savingsGoals={dashboard?.savings_goals || []}
              showAmounts={showAmounts}
              onRefreshData={refresh}
            />
          )}

          {activeTab === 'calendario' && canUseCalendario && (
            <CalendarioPage
              userId={userId}
              api={api}
              calendario={boot?.calendario}
              catalogos={catalogos}
              disponibles={disponibles}
              tcBalances={tcBalances?.items || []}
              showAmounts={showAmounts}
              loading={loading}
              onRefreshData={refresh}
            />
          )}

          {activeTab === 'historial' && (
            <HistorialPage
              userId={userId}
              api={pageApi}
              categorias={boot?.categorias}
              catalogos={catalogos}
              disponibles={disponibles}
              tcBalances={tcBalances?.items || []}
              showAmounts={showAmounts}
              onRefreshData={refresh}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              loading={loading}
              dashboard={dashboard}
              deudas={deudas}
              tcBalances={tcBalances?.items || []}
              showAmounts={showAmounts}
            />
          )}

          {activeTab === 'tarjetas' && canUseTarjetas && (
            <TarjetasPage
              userId={userId}
              api={pageApi}
              tcBalances={tcBalances?.items || []}
              installmentPlans={installmentPlans?.items || []}
              catalogos={catalogos}
              disponibles={disponibles}
              loanPeople={boot?.loanPeople?.items || []}
              onRefreshData={refresh}
            />
          )}

          {activeTab === 'deudas' && (
            <DeudasPage
              userId={userId}
              api={pageApi}
              catalogos={catalogos}
              disponibles={disponibles}
              deudas={deudas}
              prestamos={dashboard?.prestamos_resumen}
              canUsePrestamos={canUsePrestamos}
              onRefreshData={refresh}
            />
          )}

          {activeTab === 'cumple' && showCumple && <BirthdayPage />}

          {activeTab === 'presupuesto' && canUsePresupuesto && (
            <PresupuestoPage
              userId={userId}
              api={api}
              presupuesto={boot?.presupuesto}
              categorias={boot?.categorias}
              resumenMes={dashboard?.resumen_mes}
              onRefreshData={loadAllData}
            />
          )}
        </>
      )}
    </Layout>
  )
}
