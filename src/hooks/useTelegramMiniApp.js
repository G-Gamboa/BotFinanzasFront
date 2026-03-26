import { useEffect, useMemo, useState } from 'react'

export function useTelegramMiniApp() {
  const [isReady, setIsReady] = useState(false)

  const tg = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.Telegram?.WebApp ?? null
  }, [])

  useEffect(() => {
    if (!tg) {
      setIsReady(true)
      return
    }
    tg.ready()
    tg.expand()
    try {
      tg.setHeaderColor?.('#0f3d32')
      tg.setBackgroundColor?.('#071b17')
    } catch {
      // noop
    }
    setIsReady(true)
  }, [tg])

  const user = tg?.initDataUnsafe?.user ?? null
  const userId = user?.id ? String(user.id) : ''

  return {
    tg,
    isTelegram: Boolean(tg),
    isReady,
    user,
    userId,
    themeParams: tg?.themeParams ?? {},
    startParam: tg?.initDataUnsafe?.start_param ?? '',
  }
}
