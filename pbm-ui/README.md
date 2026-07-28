# pbm-ui

React + Vite + MUI frontend for the Personal Bookmark Manager. Auth0 (Authorization Code +
PKCE) login/logout, and Collections, Bookmarks, and an "All" view bound to the `pbm-service`
API. See the repo root `README.md` for the overall project, `API_DESIGN.md` for the API
contract, and `DECISIONS.md` for ADRs referenced below.

## Stack

React 19, Vite, TypeScript, MUI, `@auth0/auth0-react`, `axios`, `react-router`. Tests:
Vitest + React Testing Library.

## Running locally

```
cp .env.example .env   # fill in Auth0 domain/client id (see below)
npm install
npm run dev             # http://localhost:3000
```

The dev server is fixed to port `3000` because Auth0's app config has a fixed SPA callback
of `http://localhost:3000/callback` (`DECISIONS.md` ADR-010) — `pbm-service` runs on `3001`
to free this port. Start `pbm-service` separately for the UI to have anything to call
against (see the root `README.md`).

## Environment variables

Set in `.env` (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of `pbm-service` (default `http://localhost:3001`) |
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client id |
| `VITE_AUTH0_AUDIENCE` | Must be `https://bbl-candidate-test-api` — an access token audience, not an ID token (`DECISIONS.md` ADR-002) |

The app throws at startup if any of the Auth0 variables are missing rather than falling
back silently — see `src/features/auth/providers/Auth0ProviderWithNavigate.tsx`.

Auth0 is configured with `cacheLocation="localstorage"` so the session survives a full page
reload without depending on a refresh-token grant (`DECISIONS.md` ADR-011).

## Testing

```
npm test          # watch mode
npm run test:run  # single run (CI)
```

No backend or Postgres is required — the service layer is mocked. Coverage includes the
pure utils (`src/utils`), the service layer (`src/features/*/services`,
`src/services/api.service.ts`), Collections/Bookmarks page data-flow (load, empty, error,
create, optimistic delete + rollback), and auth wiring (`ProtectedRoute`'s
loading/authenticated/redirect branches; the token-attachment and 401-handling axios
interceptors).

Other scripts: `npm run lint`, `npm run build`, `npm run preview`.

## Structure

```
src/
  components/layout/    AppShell, Sidebar, MobileBottomNav, nav config
  features/auth/        Auth0 provider, ProtectedRoute, login screen, API auth bridge
  features/collection/  Collections list — interface, service, screen, components
  features/bookmark/    Bookmarks list — interface, service, screen, components
  features/all/         Combined "All" view grouping bookmarks by collection
  services/api.service.ts   axios instance: attaches the Auth0 access token, handles 401
  interfaces/           Shared response shapes
  utils/                 Pure helpers (relative time, URL formatting)
```

Routing (`src/App.tsx`): `/login` is public; `/collections`, `/bookmarks`, and `/all` are
behind `ProtectedRoute` and wrapped in `AppShell`; `/` redirects to `/collections`.
