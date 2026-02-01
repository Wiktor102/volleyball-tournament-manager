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
