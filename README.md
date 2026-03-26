# Bot Finanzas Front

Frontend para GitHub Pages + Telegram Mini Apps.

## Variables

Crear una variable del repo en GitHub Actions:

- `VITE_API_URL=https://web-production-43bab.up.railway.app`

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notas

- Detecta usuario desde `Telegram.WebApp.initDataUnsafe.user.id` cuando corre dentro de Telegram.
- Fuera de Telegram permite escribir manualmente un `user_id` para pruebas.
