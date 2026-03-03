# System zarządzania turniejem siatkówki (LAN)

Aplikacja webowa działająca w sieci lokalnej: **Express + Socket.io + SQLite/Drizzle** (backend) oraz **React + Vite** (frontend). Wszystkie widoki są po polsku.

## Start (dev)

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5174 (health: `/api/health`)

## Docker Compose (prod, LAN)

1. Skopiuj plik środowiskowy i ustaw hasło administratora:

```bash
cp .env.example .env
```

2. Uruchom aplikację:

```bash
docker compose up -d --build
```

3. Sprawdź publiczny adres Cloudflare Quick Tunnel:

```bash
docker compose logs -f cloudflared
```

W logach pojawi się URL `https://<losowy-subdomena>.trycloudflare.com`.

4. Otwórz aplikację:

- `http://localhost:6789`
- z innego urządzenia w LAN: `http://<IP_tego_komputera>:6789`
- z internetu (tymczasowo): URL z logów `cloudflared`

SQLite jest zapisywany w named volume `volleyball_data` (`/app/data/tournament.db`), więc dane pozostają po `docker compose build` i odtworzeniu kontenera.

Zatrzymanie:

```bash
docker compose down
```

## Widoki
- `/admin` – panel administratora (przycisk „Utwórz mecz demo” + sterowanie punktami)
- `/display/fan` – widok dla kibiców (duże wyniki)
- `/overlay?transparent=true` – overlay do OBS (tło przezroczyste)

## Skrypty
- `npm run dev` – uruchamia backend+frontend równolegle
- `npm run db:generate` – generuje migracje Drizzle
- `npm run db:migrate` – aplikuje migracje do `./data/tournament.db`
- `npm run typecheck` / `npm run lint`
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
