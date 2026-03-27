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
    id: user?.id ? String(user.id) : "1282471582",
    first_name: user?.first_name || "Usuario",
    username: user?.username || "",
  };
}