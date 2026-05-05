export function getTelegramUser() {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch (_) {}
  }

  const user = tg?.initDataUnsafe?.user;

  return {
    id: user?.id ? String(user.id) : (import.meta.env.VITE_DEV_USER_ID || null),
    first_name: user?.first_name || "Usuario",
    username: user?.username || "",
  };
}